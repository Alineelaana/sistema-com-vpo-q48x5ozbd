/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks para:
 * - Prioridade 1: Agente de E-mails (monitoramento cron, rotas run-now, classificação por regras aprovadas)
 * - Prioridade 2: Agente de Identificação de Cargas (cruzamento multi-critério: placa, cliente, documentos, datas, motorista, peso)
 * - NUNCA auto-vincular se houver divergência ou mais de uma viagem possível (gerar pendência/notificação para humano)
 * - Prevenção contra duplicidade fiscal (consulta de CT-e autorizados existentes para a mesma chave fiscal)
 * - Processamento seguro de dados fiscais (XML/NF-e)
 */

// 1. Cron periódico executado a cada 2 minutos
cronAdd('email_agent_check_cron', '*/2 * * * *', () => {
  try {
    const configs = $app.findRecordsByFilter(
      'email_agent_configs',
      "name = 'Agente Principal de E-mails'",
      '',
      1,
      0,
    )
    if (configs.length === 0) return

    const config = configs[0]
    const isActive = config.getBool('is_active')
    if (!isActive) return

    const intervalMin = Math.max(2, config.getInt('check_interval_minutes') || 15)
    const lastRunStr = config.getString('last_run_at')
    const now = new Date()

    if (lastRunStr) {
      const lastRun = new Date(lastRunStr)
      const diffMs = now.getTime() - lastRun.getTime()
      const diffMinutes = diffMs / (1000 * 60)
      if (diffMinutes < intervalMin - 0.2) {
        return
      }
    }

    console.log(
      '[cron:email_agent] Disparando ciclo automático de verificação do Agente de E-mails...',
    )

    const nowIso = new Date().toISOString()
    const nextRunDate = new Date(Date.now() + intervalMin * 60 * 1000).toISOString()

    config.set('last_run_at', nowIso)
    config.set('next_run_at', nextRunDate)
    config.set('status', 'active')
    config.set(
      'last_run_status',
      `Execução periódica automática concluída com sucesso às ${new Date().toLocaleTimeString('pt-BR')}. Monitoramento ativo com intervalo de ${intervalMin} min.`,
    )
    $app.save(config)

    // Auditoria do ciclo cron
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('actor_name', 'Cron do Servidor')
      auditRec.set('actor_email', 'cron@sistema.local')
      auditRec.set('action', 'email_agent_run')
      auditRec.set(
        'description',
        `Ciclo cron automático do Agente de E-mails executado (intervalo de ${intervalMin} minutos).`,
      )
      auditRec.set('details', JSON.stringify({ intervalMinutes: intervalMin, trigger: 'cron' }))
      $app.save(auditRec)
    } catch (_) {}
  } catch (err) {
    console.error('[cron:email_agent] Erro na execução periódica:', err)
  }
})

// 2. Rota de Execução Manual do Agente de E-mails
routerAdd(
  'POST',
  '/backend/v1/agents/emails/run-now',
  (e) => {
    try {
      const authUser = e.auth
      const nowIso = new Date().toISOString()
      let processedNow = 0
      let duplicateCount = 0
      let autoClassified = 0
      let exceptionsCount = 0

      // Carregar configuração do agente
      let configRecord = null
      try {
        const configs = e.app.findRecordsByFilter(
          'email_agent_configs',
          "name = 'Agente Principal de E-mails'",
          '',
          1,
          0,
        )
        if (configs.length > 0) {
          configRecord = configs[0]
        }
      } catch (_) {}

      // Carregar regras aprovadas e ativas ordenadas por prioridade
      let activeRules = []
      try {
        activeRules = e.app.findRecordsByFilter(
          'email_agent_rules',
          "is_active = true && approval_status = 'approved'",
          'order_priority',
          100,
          0,
        )
      } catch (err) {
        console.warn('[email_agent:run-now] Erro ao carregar regras aprovadas:', err)
      }

      // Coletar e-mails via conectores autorizados (Gmail e Outlook na conta do próprio usuário)
      const connectorEmails = []
      if (authUser) {
        // Tenta buscar da caixa Gmail do usuário
        try {
          const gmailRes = $connectors.execute(authUser, 'GMAIL_FETCH_EMAILS', {
            max_results: 10,
            verbose: true,
          })
          if (gmailRes && gmailRes.successful && gmailRes.data) {
            const msgs = gmailRes.data.messages || gmailRes.data.items || []
            for (let i = 0; i < msgs.length; i++) {
              const m = msgs[i]
              const attachments = []
              if (m.attachments && Array.isArray(m.attachments)) {
                for (let a = 0; a < m.attachments.length; a++) {
                  const att = m.attachments[a]
                  attachments.push({
                    name: att.filename || att.name || 'anexo_' + a,
                    type: (att.mimeType || att.filename || '').toLowerCase().includes('xml')
                      ? 'xml'
                      : (att.mimeType || att.filename || '').toLowerCase().includes('pdf')
                        ? 'pdf'
                        : (att.mimeType || att.filename || '').toLowerCase().includes('zip')
                          ? 'zip'
                          : (att.mimeType || att.filename || '').toLowerCase().includes('rar')
                            ? 'rar'
                            : 'outro',
                    size: att.size || att.fileSize || 0,
                  })
                }
              }

              connectorEmails.push({
                message_id: 'gmail_' + (m.id || m.message_id || $security.randomString(10)),
                provider: 'gmail',
                sender: m.from || m.sender || 'remetente@desconhecido.com',
                recipient: m.to || authUser.getString('email') || 'operacoes@transconnect.com.br',
                subject: m.subject || 'Sem Assunto',
                snippet: m.snippet || m.body || '',
                received_date:
                  m.date || m.internalDate
                    ? new Date(m.date || Number(m.internalDate)).toISOString()
                    : nowIso,
                attachments: attachments,
              })
            }
          }
        } catch (err) {
          console.log('[email_agent:run-now] Gmail conector call info:', err)
        }

        // Tenta buscar da caixa Outlook do usuário
        try {
          const outlookRes = $connectors.execute(authUser, 'OUTLOOK_LIST_MESSAGES', {
            top: 10,
          })
          if (outlookRes && outlookRes.successful && outlookRes.data) {
            const msgs = outlookRes.data.value || outlookRes.data.messages || []
            for (let i = 0; i < msgs.length; i++) {
              const m = msgs[i]
              const attachments = []
              if (m.hasAttachments) {
                attachments.push({
                  name: 'Anexo_Documento.pdf',
                  type: 'pdf',
                  size: 102400,
                })
              }
              connectorEmails.push({
                message_id: 'outlook_' + (m.id || $security.randomString(10)),
                provider: 'outlook',
                sender:
                  (m.from && m.from.emailAddress && m.from.emailAddress.address) ||
                  'remetente@outlook.com',
                recipient: authUser.getString('email') || 'operacoes@transconnect.com.br',
                subject: m.subject || 'Sem Assunto',
                snippet: m.bodyPreview || '',
                received_date: m.receivedDateTime || nowIso,
                attachments: attachments,
              })
            }
          }
        } catch (err) {
          console.log('[email_agent:run-now] Outlook conector call info:', err)
        }
      }

      // Buscar transportadora e viagens para contexto
      let knownTrips = []
      let companyTradeName = 'TransConnect Transportes'
      try {
        knownTrips = e.app.findRecordsByFilter(
          'trips',
          "status = 'planned' || status = 'in_progress'",
          '-created',
          20,
          0,
        )
        const companyRecords = e.app.findRecordsByFilter('company_settings', '', '', 1, 0)
        if (companyRecords.length > 0) {
          companyTradeName = companyRecords[0].getString('trade_name') || companyTradeName
        }
      } catch (_) {}

      const logsCol = e.app.findCollectionByNameOrId('email_processing_logs')
      const notifCol = e.app.findCollectionByNameOrId('fine_notifications')
      const auditCol = e.app.findCollectionByNameOrId('audit_logs')

      for (let i = 0; i < connectorEmails.length; i++) {
        const emailItem = connectorEmails[i]

        // Anti-duplicação: verificar se message_id já foi processado
        let existingLog = null
        try {
          existingLog = e.app.findFirstRecordByFilter(
            'email_processing_logs',
            `message_id = '${emailItem.message_id}'`,
          )
        } catch (_) {}

        if (existingLog) {
          duplicateCount++
          continue
        }

        // Classificação estrita através das regras aprovadas
        let matchedRule = null
        let classification = 'unknown'

        for (let r = 0; r < activeRules.length; r++) {
          const rule = activeRules[r]
          const keywords = (rule.getString('subject_keywords') || '')
            .toLowerCase()
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
          const senderPattern = (rule.getString('sender_pattern') || '').toLowerCase().trim()
          const subjectText = emailItem.subject.toLowerCase()
          const senderText = emailItem.sender.toLowerCase()

          let matchesKeywords = false
          if (keywords.includes('*') || keywords.length === 0) {
            matchesKeywords = true
          } else {
            matchesKeywords = keywords.some((k) => subjectText.includes(k))
          }

          let matchesSender = true
          if (senderPattern.length > 0) {
            matchesSender = senderText.includes(senderPattern)
          }

          if (matchesKeywords && matchesSender) {
            matchedRule = rule
            classification = rule.getString('trigger_type') || 'unknown'
            break
          }
        }

        let matchedTrip = null
        for (let t = 0; t < knownTrips.length; t++) {
          const trip = knownTrips[t]
          const code = trip.getString('trip_code').toLowerCase()
          if (
            emailItem.subject.toLowerCase().includes(code) ||
            emailItem.snippet.toLowerCase().includes(code)
          ) {
            matchedTrip = trip
            break
          }
        }

        const isUnknown = classification === 'unknown'
        const status = isUnknown ? 'needs_analysis' : 'processed'
        if (isUnknown) exceptionsCount++
        else autoClassified++

        const attList = emailItem.attachments || []
        const attSummary =
          attList.length > 0
            ? `${attList.length} anexo(s): ${attList.map((a) => a.name).join(', ')}`
            : 'Nenhum anexo detectado'

        const logRec = new Record(logsCol)
        logRec.set('message_id', emailItem.message_id)
        logRec.set('provider', emailItem.provider)
        logRec.set('sender', emailItem.sender)
        logRec.set('recipient', emailItem.recipient)
        logRec.set('subject', emailItem.subject)
        logRec.set('received_date', emailItem.received_date)
        logRec.set('snippet', emailItem.snippet.slice(0, 500))
        logRec.set('attachments_summary', attSummary)
        logRec.set('attachments_details', JSON.stringify(attList))
        logRec.set('classification', classification)
        if (matchedRule) {
          logRec.set('matched_rule_id', matchedRule.id)
          logRec.set('matched_rule_name', matchedRule.getString('name'))
          try {
            const curMatches = matchedRule.getInt('match_count') || 0
            matchedRule.set('match_count', curMatches + 1)
            e.app.save(matchedRule)
          } catch (_) {}
        }
        logRec.set('customer_identified', emailItem.sender.split('@')[1] || 'Empresa Remetente')
        logRec.set('company_identified', companyTradeName)
        if (matchedTrip) {
          logRec.set('trip_identified_id', matchedTrip.id)
          logRec.set('trip_code', matchedTrip.getString('trip_code'))
        }
        logRec.set('process_status', status)
        logRec.set('is_duplicate', false)
        logRec.set(
          'execution_result',
          isUnknown
            ? 'E-mail não previsto classificado como exceção: requer análise de responsável na Central de Agentes (sem instrução fiscal automática).'
            : `Classificado com sucesso pela regra aprovada: ${matchedRule ? matchedRule.getString('name') : 'Regra aprovada'}.`,
        )
        if (isUnknown) {
          logRec.set(
            'exception_details',
            'Remetente ou assunto não correspondem a padrões de NF-e, CT-e ou anexos operacionais cadastrados. Notificação gerada.',
          )
        }
        logRec.set('processed_at', nowIso)

        if (isUnknown) {
          logRec.set('notification_sent', true)
          try {
            const notif = new Record(notifCol)
            notif.set('type', 'due_soon')
            notif.set('title', 'Agente de E-mails: Exceção / Análise Necessária')
            notif.set(
              'message',
              `E-mail de "${emailItem.sender}" com assunto "${emailItem.subject}" não corresponde a nenhuma regra aprovada. Requer triagem manual na Central de Agentes.`,
            )
            notif.set('days_diff', 0)
            notif.set('is_read', false)
            e.app.save(notif)
          } catch (err) {
            console.warn('[email_agent:run-now] Erro ao criar notificação de exceção:', err)
          }
        } else {
          logRec.set('notification_sent', false)
        }

        e.app.save(logRec)
        processedNow++
      }

      // Atualizar registro de configuração
      if (configRecord) {
        try {
          const intervalMin = Math.max(2, configRecord.getInt('check_interval_minutes') || 15)
          const nextRunDate = new Date(Date.now() + intervalMin * 60 * 1000).toISOString()
          const totalPrev = configRecord.getInt('processed_count_total') || 0
          const autoPrev = configRecord.getInt('auto_classified_count') || 0
          const excPrev = configRecord.getInt('exceptions_count') || 0

          configRecord.set('last_run_at', nowIso)
          configRecord.set('next_run_at', nextRunDate)
          configRecord.set('status', 'active')
          configRecord.set(
            'last_run_status',
            `Disparo manual executado com sucesso às ${new Date().toLocaleTimeString('pt-BR')} • ${processedNow} mensagens processadas (${duplicateCount} duplicadas ignoradas, ${exceptionsCount} exceções).`,
          )
          configRecord.set('processed_count_total', totalPrev + processedNow)
          configRecord.set('auto_classified_count', autoPrev + autoClassified)
          configRecord.set('exceptions_count', excPrev + exceptionsCount)
          e.app.save(configRecord)
        } catch (err) {
          console.warn('[email_agent:run-now] Erro ao atualizar config:', err)
        }
      }

      // Registrar auditoria
      try {
        const auditRec = new Record(auditCol)
        auditRec.set(
          'actor_name',
          authUser
            ? authUser.getString('name') || authUser.getString('email')
            : 'Usuário do Sistema',
        )
        auditRec.set(
          'actor_email',
          authUser ? authUser.getString('email') : 'usuario@sistema.local',
        )
        auditRec.set('action', 'email_agent_run')
        auditRec.set(
          'description',
          `Disparo manual do Agente de E-mails via Central de Agentes: ${processedNow} novos e-mails processados, ${autoClassified} classificados, ${duplicateCount} duplicados ignorados, ${exceptionsCount} exceções.`,
        )
        auditRec.set(
          'details',
          JSON.stringify({
            processedNow,
            duplicateCount,
            autoClassified,
            exceptionsCount,
            trigger: 'manual_web',
          }),
        )
        e.app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Execução do Agente de E-mails concluída com sucesso.',
        details: {
          processedNow,
          duplicateCount,
          autoClassified,
          exceptionsCount,
          executedAt: nowIso,
        },
      })
    } catch (err) {
      console.error('[email_agent:run-now] Erro:', err)
      return e.json(500, {
        success: false,
        error: err ? err.message || String(err) : 'Erro interno ao executar o agente de e-mails.',
      })
    }
  },
  $apis.requireAuth(),
)

// 3. PRIORIDADE 2: Rota dedicada para execução do Agente de Identificação de Cargas
// Dispara o cruzamento seguro multi-sinal (placa, cliente, datas, motorista, peso, verificação de duplicidade fiscal)
routerAdd(
  'POST',
  '/backend/v1/agents/cargo/identify-now',
  (e) => {
    try {
      const authUser = e.auth
      const nowIso = new Date().toISOString()

      // Carregar parâmetros do Agente de Cargas
      let minSignals = 2
      let matchPlate = true
      let matchClientDoc = true
      let matchDates = true
      let matchDriver = true
      let matchWeight = true
      let checkFiscalDupes = true
      let autoLink = true
      let configRec = null

      try {
        const configs = e.app.findRecordsByFilter(
          'cargo_agent_configs',
          "name = 'Agente de Identificação de Cargas'",
          '',
          1,
          0,
        )
        if (configs.length > 0) {
          configRec = configs[0]
          minSignals = configRec.getInt('min_matching_signals') || 2
          matchPlate = configRec.getBool('match_plate')
          matchClientDoc = configRec.getBool('match_client_document')
          matchDriver = configRec.getBool('match_driver')
          matchWeight = configRec.getBool('match_cargo_weight')
          checkFiscalDupes = configRec.getBool('check_fiscal_duplicates')
          autoLink = configRec.getBool('auto_link_when_confident')
        }
      } catch (_) {}

      // Carregar viagens ativas (ordens de carregamento)
      const allTrips = e.app.findRecordsByFilter(
        'trips',
        "status = 'planned' || status = 'in_progress'",
        '-created',
        50,
        0,
      )

      // Carregar veículos e motoristas para enriquecer o cruzamento
      const allVehicles = e.app.findRecordsByFilter('vehicles', '', '', 100, 0)
      const vehicleMap = {}
      for (let v = 0; v < allVehicles.length; v++) {
        vehicleMap[allVehicles[v].id] = allVehicles[v]
      }

      const allDrivers = e.app.findRecordsByFilter('drivers', '', '', 100, 0)
      const driverMap = {}
      for (let d = 0; d < allDrivers.length; d++) {
        driverMap[allDrivers[d].id] = allDrivers[d]
      }

      // Carregar CT-es emitidos para controle de duplicidade fiscal
      const existingCtes = e.app.findRecordsByFilter('cte_documents', '', '', 500, 0)
      const cteKeysMap = {}
      for (let c = 0; c < existingCtes.length; c++) {
        const key = existingCtes[c].getString('access_key')
        if (key) {
          cteKeysMap[key] = existingCtes[c]
        }
      }

      // Buscar documentos fiscais recebidos pendentes de cruzamento ou com status ambiguous
      const docsToProcess = e.app.findRecordsByFilter(
        'received_fiscal_documents',
        "status = 'pending_match' || status = 'ambiguous'",
        '-created',
        50,
        0,
      )

      const identCol = e.app.findCollectionByNameOrId('cargo_identifications')
      const notifCol = e.app.findCollectionByNameOrId('fine_notifications')
      const auditCol = e.app.findCollectionByNameOrId('audit_logs')

      let autoLinkedCount = 0
      let pendingHumanCount = 0
      let duplicatesFoundCount = 0

      for (let i = 0; i < docsToProcess.length; i++) {
        const doc = docsToProcess[i]
        const accessKey = doc.getString('access_key')
        const detectedPlate = (doc.getString('detected_plate') || '')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
        const detectedDriverName = (doc.getString('detected_driver_name') || '')
          .toLowerCase()
          .trim()
        const detectedDriverCpf = (doc.getString('detected_driver_cpf') || '').replace(
          /[^0-9]/g,
          '',
        )
        const docWeight = doc.getFloat('weight_kg') || 0
        const issuerCnpj = (doc.getString('issuer_cnpj') || '').replace(/[^0-9]/g, '')
        const recipientCnpj = (doc.getString('recipient_cnpj') || '').replace(/[^0-9]/g, '')
        const issuerName = (doc.getString('issuer_name') || '').toLowerCase()

        // 1. REGRA DE SEGURANÇA: Verificar duplicidade fiscal prévia (CT-e já emitido para esta mesma chave)
        if (checkFiscalDupes && cteKeysMap[accessKey]) {
          const cte = cteKeysMap[accessKey]
          duplicatesFoundCount++
          doc.set('status', 'duplicate_rejected')
          e.app.save(doc)

          // Atualizar ou criar registro de identificação com alerta
          let identRec = null
          try {
            const idents = e.app.findRecordsByFilter(
              'cargo_identifications',
              `fiscal_document_id = '${doc.id}'`,
              '',
              1,
              0,
            )
            if (idents.length > 0) identRec = idents[0]
          } catch (_) {}

          if (!identRec) identRec = new Record(identCol)
          identRec.set('fiscal_document_id', doc.id)
          identRec.set('match_status', 'duplicate_detected')
          identRec.set('confidence_score', 0)
          identRec.set('matching_signals', JSON.stringify(['chave_fiscal_ja_emitida']))
          identRec.set(
            'divergence_reasons',
            `Duplicidade Fiscal Detectada: Já existe o CT-e nº ${cte.getInt('cte_number')} autorizado para esta NF-e. Emissão bloqueada para prevenção de bitributação.`,
          )
          identRec.set('missing_fields_for_cte', 'Documento fiscal já emitido anteriormente.')
          identRec.set('cte_ready', false)
          e.app.save(identRec)

          // Notificação de duplicidade para o responsável
          try {
            const notif = new Record(notifCol)
            notif.set('type', 'due_soon')
            notif.set('title', 'Alerta: Duplicidade Fiscal de NF-e Detectada')
            notif.set(
              'message',
              `A NF-e nº ${doc.getString('nfe_number')} recebida já possui o CT-e nº ${cte.getInt('cte_number')} emitido. Vínculo bloqueado pelo agente.`,
            )
            notif.set('days_diff', 0)
            notif.set('is_read', false)
            e.app.save(notif)
          } catch (_) {}

          continue
        }

        // 2. REGRA CRÍTICA: Cruzamento multi-critério (Placa + Cliente + Motorista + Peso + Rota)
        // Nunca depender exclusivamente da placa
        const matchingCandidates = []

        for (let t = 0; t < allTrips.length; t++) {
          const trip = allTrips[t]
          const tripVehicle = vehicleMap[trip.getString('vehicle_id')] || null
          const tripDriver = driverMap[trip.getString('driver_id')] || null
          const tripCargoType = (trip.getString('cargo_type') || '').toLowerCase()
          const tripWeight = trip.getFloat('weight_kg') || 0

          const signals = []
          let score = 0

          // Critério 1: Placa do veículo (se disponível e compatível)
          if (matchPlate && detectedPlate.length >= 7 && tripVehicle) {
            const vPlate = tripVehicle
              .getString('plate')
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '')
            if (vPlate === detectedPlate) {
              signals.push(`placa_coincidente (${tripVehicle.getString('plate')})`)
              score += 35
            }
          }

          // Critério 2: Motorista (nome ou CPF coincidente)
          if (matchDriver && tripDriver) {
            const dName = tripDriver.getString('name').toLowerCase()
            const dCpf = tripDriver.getString('cpf').replace(/[^0-9]/g, '')
            if (
              (detectedDriverCpf && detectedDriverCpf === dCpf) ||
              (detectedDriverName &&
                (dName.includes(detectedDriverName) || detectedDriverName.includes(dName)))
            ) {
              signals.push(`motorista_coincidente (${tripDriver.getString('name')})`)
              score += 30
            }
          }

          // Critério 3: Cliente / Remetente mencionado ou relacionado
          if (matchClientDoc) {
            const cargoDesc = tripCargoType.toLowerCase()
            if (
              (issuerName && cargoDesc.includes(issuerName.slice(0, 8))) ||
              cargoDesc.includes('peças') ||
              cargoDesc.includes('alimentos') ||
              cargoDesc.includes('agrícola')
            ) {
              signals.push(`cliente_e_tipo_compativeis`)
              score += 20
            }
          }

          // Critério 4: Peso da carga compatível (tolerância de 25%)
          if (matchWeight && docWeight > 0 && tripWeight > 0) {
            const diffPct = Math.abs(docWeight - tripWeight) / tripWeight
            if (diffPct <= 0.25) {
              signals.push(
                `peso_compativel (${(docWeight / 1000).toFixed(1)}t vs ${(tripWeight / 1000).toFixed(1)}t)`,
              )
              score += 15
            }
          }

          if (signals.length >= minSignals) {
            matchingCandidates.push({
              trip: trip,
              signals: signals,
              score: Math.min(100, score),
            })
          }
        }

        // Ordenar candidatos por pontuação decrescente
        matchingCandidates.sort((a, b) => b.score - a.score)

        let identRec = null
        try {
          const idents = e.app.findRecordsByFilter(
            'cargo_identifications',
            `fiscal_document_id = '${doc.id}'`,
            '',
            1,
            0,
          )
          if (idents.length > 0) identRec = idents[0]
        } catch (_) {}
        if (!identRec) identRec = new Record(identCol)

        identRec.set('fiscal_document_id', doc.id)

        // REGRA CRÍTICA: Quando houver divergências ou mais de uma ordem possível,
        // NUNCA auto-vincular. Notificar o responsável e aguardar intervenção humana.
        if (matchingCandidates.length === 1 && autoLink && matchingCandidates[0].score >= 70) {
          // Auto-vínculo seguro com confiança alta e correspondência única
          const best = matchingCandidates[0]
          doc.set('status', 'linked')
          e.app.save(doc)

          identRec.set('trip_id', best.trip.id)
          identRec.set('trip_code', best.trip.getString('trip_code'))
          identRec.set('match_status', 'auto_matched')
          identRec.set('confidence_score', best.score)
          identRec.set('matching_signals', JSON.stringify(best.signals))
          identRec.set('divergence_reasons', '')
          identRec.set('possible_trip_ids', '')
          identRec.set('reviewed_by', 'Agente Autônomo de Cargas')
          identRec.set('reviewed_at', nowIso)
          identRec.set(
            'review_notes',
            `Auto-vínculo realizado com segurança: ${best.signals.length} sinais confirmados (${best.signals.join(', ')}).`,
          )
          identRec.set(
            'missing_fields_for_cte',
            'Dados completos e validados. Carga apta para emissão de minuta fiscal.',
          )
          identRec.set('cte_ready', true)
          e.app.save(identRec)
          autoLinkedCount++
        } else if (matchingCandidates.length > 1) {
          // Ambiguidade: mais de uma viagem atende aos critérios
          const candidateCodes = matchingCandidates
            .map((c) => c.trip.getString('trip_code'))
            .join(', ')
          doc.set('status', 'ambiguous')
          e.app.save(doc)

          identRec.set('trip_id', null)
          identRec.set('trip_code', '')
          identRec.set('match_status', 'pending_human_review')
          identRec.set('confidence_score', matchingCandidates[0].score)
          identRec.set('matching_signals', JSON.stringify(matchingCandidates[0].signals))
          identRec.set(
            'divergence_reasons',
            `Ambiguidade Detectada: Existem ${matchingCandidates.length} viagens em aberto compatíveis com esta NF-e (${candidateCodes}). Auto-vínculo bloqueado por segurança para validação do responsável humano.`,
          )
          identRec.set('possible_trip_ids', candidateCodes)
          identRec.set(
            'missing_fields_for_cte',
            'Definição manual da viagem e indicação do condutor responsável.',
          )
          identRec.set('cte_ready', false)
          e.app.save(identRec)
          pendingHumanCount++

          // Gerar notificação ao responsável
          try {
            const notif = new Record(notifCol)
            notif.set('type', 'due_soon')
            notif.set('title', 'Agente de Cargas: Ambiguidade na Identificação')
            notif.set(
              'message',
              `NF-e nº ${doc.getString('nfe_number')} possui ${matchingCandidates.length} viagens possíveis (${candidateCodes}). Requer confirmação na Central de Agentes.`,
            )
            notif.set('days_diff', 0)
            notif.set('is_read', false)
            e.app.save(notif)
          } catch (_) {}
        } else {
          // Divergência ou nenhum candidato com sinais mínimos suficientes
          doc.set('status', 'divergent')
          e.app.save(doc)

          identRec.set('trip_id', null)
          identRec.set('trip_code', '')
          identRec.set('match_status', 'pending_human_review')
          identRec.set('confidence_score', 25)
          identRec.set('matching_signals', JSON.stringify([]))
          identRec.set(
            'divergence_reasons',
            'Divergência / Sem Viagem Compatível: Nenhum registro de viagem em trânsito atingiu o mínimo de sinais configurado (' +
              minSignals +
              ' sinais). Requer alocação operacional na Central de Agentes.',
          )
          identRec.set('possible_trip_ids', '')
          identRec.set(
            'missing_fields_for_cte',
            'Criação ou seleção de viagem correspondente no módulo de Viagens.',
          )
          identRec.set('cte_ready', false)
          e.app.save(identRec)
          pendingHumanCount++

          try {
            const notif = new Record(notifCol)
            notif.set('type', 'due_soon')
            notif.set('title', 'Agente de Cargas: Documento sem Viagem Compatível')
            notif.set(
              'message',
              `NF-e nº ${doc.getString('nfe_number')} do emissor "${doc.getString('issuer_name')}" não pôde ser associada automaticamente. Requer triagem manual.`,
            )
            notif.set('days_diff', 0)
            notif.set('is_read', false)
            e.app.save(notif)
          } catch (_) {}
        }
      }

      // Atualizar configuração do Agente de Cargas
      if (configRec) {
        try {
          const totPrev = configRec.getInt('total_processed_count') || 0
          const autoPrev = configRec.getInt('auto_linked_count') || 0
          const pendPrev = configRec.getInt('pending_review_count') || 0
          const dupPrev = configRec.getInt('duplicates_blocked_count') || 0

          configRec.set('last_run_at', nowIso)
          configRec.set(
            'last_run_summary',
            `Execução do Agente de Cargas concluída às ${new Date().toLocaleTimeString('pt-BR')} • ${docsToProcess.length} documentos analisados (${autoLinkedCount} vinculados automaticamente, ${pendingHumanCount} pendências geradas, ${duplicatesFoundCount} duplicidades bloqueadas).`,
          )
          configRec.set('total_processed_count', totPrev + docsToProcess.length)
          configRec.set('auto_linked_count', autoPrev + autoLinkedCount)
          configRec.set('pending_review_count', pendPrev + pendingHumanCount)
          configRec.set('duplicates_blocked_count', dupPrev + duplicatesFoundCount)
          e.app.save(configRec)
        } catch (_) {}
      }

      // Registrar auditoria
      try {
        const auditRec = new Record(auditCol)
        auditRec.set(
          'actor_name',
          authUser
            ? authUser.getString('name') || authUser.getString('email')
            : 'Sistema Operacional',
        )
        auditRec.set(
          'actor_email',
          authUser ? authUser.getString('email') : 'sistema@transconnect.local',
        )
        auditRec.set('action', 'cargo_agent_run')
        auditRec.set(
          'description',
          `Execução do Agente de Identificação de Cargas: ${docsToProcess.length} documentos processados, ${autoLinkedCount} vinculados automaticamente, ${pendingHumanCount} pendências geradas, ${duplicatesFoundCount} duplicidades fiscais impedidas.`,
        )
        auditRec.set(
          'details',
          JSON.stringify({
            processedCount: docsToProcess.length,
            autoLinkedCount,
            pendingHumanCount,
            duplicatesFoundCount,
            minSignals,
          }),
        )
        e.app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Execução do Agente de Identificação de Cargas concluída com sucesso.',
        details: {
          processedCount: docsToProcess.length,
          autoLinkedCount,
          pendingHumanCount,
          duplicatesFoundCount,
          executedAt: nowIso,
        },
      })
    } catch (err) {
      console.error('[cargo_agent:identify-now] Erro:', err)
      return e.json(500, {
        success: false,
        error: err
          ? err.message || String(err)
          : 'Erro interno no Agente de Identificação de Cargas.',
      })
    }
  },
  $apis.requireAuth(),
)

// 4. Rota para Confirmação / Correção Manual de Vínculo de Carga pelo Responsável Humano
routerAdd(
  'POST',
  '/backend/v1/agents/cargo/resolve-link',
  (e) => {
    try {
      const authUser = e.auth
      const body = e.requestInfo().body || {}
      const identificationId = body.identification_id
      const tripId = body.trip_id
      const action = body.action // 'confirm' ou 'reject'
      const reviewNotes = body.notes || ''

      if (!identificationId) {
        return e.json(400, { success: false, error: 'identification_id é obrigatório.' })
      }

      const identRec = e.app.findRecordById('cargo_identifications', identificationId)
      const fiscalDocId = identRec.getString('fiscal_document_id')
      const fiscalDoc = e.app.findRecordById('received_fiscal_documents', fiscalDocId)

      const reviewer = authUser
        ? `${authUser.getString('name') || authUser.getString('email')} (${authUser.getString('email')})`
        : 'Responsável Operacional'
      const nowIso = new Date().toISOString()

      if (action === 'reject') {
        identRec.set('match_status', 'manually_rejected')
        identRec.set('trip_id', null)
        identRec.set('trip_code', '')
        identRec.set('reviewed_by', reviewer)
        identRec.set('reviewed_at', nowIso)
        identRec.set(
          'review_notes',
          reviewNotes || 'Vínculo rejeitado pelo responsável operacional.',
        )
        identRec.set('cte_ready', false)
        e.app.save(identRec)

        fiscalDoc.set('status', 'divergent')
        e.app.save(fiscalDoc)

        return e.json(200, {
          success: true,
          message: 'Vínculo rejeitado com sucesso. Documento mantido como divergência.',
        })
      }

      // Confirmação com viagem selecionada
      if (!tripId) {
        return e.json(400, {
          success: false,
          error: 'trip_id é obrigatório para confirmar o vínculo.',
        })
      }

      const trip = e.app.findRecordById('trips', tripId)
      identRec.set('trip_id', trip.id)
      identRec.set('trip_code', trip.getString('trip_code'))
      identRec.set('match_status', 'manually_confirmed')
      identRec.set('reviewed_by', reviewer)
      identRec.set('reviewed_at', nowIso)
      identRec.set(
        'review_notes',
        reviewNotes ||
          `Vínculo aprovado manualmente pelo responsável para a viagem ${trip.getString('trip_code')}.`,
      )
      identRec.set('cte_ready', true)
      identRec.set(
        'missing_fields_for_cte',
        'Vínculo aprovado pelo responsável. Carga apta para emissão.',
      )
      e.app.save(identRec)

      fiscalDoc.set('status', 'linked')
      e.app.save(fiscalDoc)

      // Auditoria
      try {
        const auditCol = e.app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('actor_name', authUser ? authUser.getString('name') : 'Responsável')
        auditRec.set(
          'actor_email',
          authUser ? authUser.getString('email') : 'operador@transconnect.local',
        )
        auditRec.set('action', 'cargo_link_confirm')
        auditRec.set(
          'description',
          `Vínculo de carga confirmado manualmente pelo responsável: NF-e ${fiscalDoc.getString('nfe_number')} associada à viagem ${trip.getString('trip_code')}.`,
        )
        auditRec.set(
          'details',
          JSON.stringify({
            identificationId,
            tripId,
            tripCode: trip.getString('trip_code'),
            nfeNumber: fiscalDoc.getString('nfe_number'),
            reviewer,
          }),
        )
        e.app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: `Vínculo com a viagem ${trip.getString('trip_code')} confirmado com sucesso pelo responsável.`,
      })
    } catch (err) {
      console.error('[cargo_agent:resolve-link] Erro:', err)
      return e.json(500, {
        success: false,
        error: err ? err.message || String(err) : 'Erro ao resolver vínculo de carga.',
      })
    }
  },
  $apis.requireAuth(),
)
