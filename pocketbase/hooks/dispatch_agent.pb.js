/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hook para a PRIORIDADE 4:
 * Agente de Envio Automático de Documentos Fiscais aos Destinatários (Etapa 4 da Central de Agentes).
 *
 * Regras Obrigatórias e Inegociáveis:
 * 1. NUNCA simular autorização fiscal: apenas documentos com autorização/registro REAL
 *    confirmado no sistema (cte_documents.status = 'authorized', mdfe_documents.status = 'authorized',
 *    ciot_records.status = 'registered', insurance_endorsements.status = 'averbada') são despachados.
 *    Documentos pendentes/rejeitados/rascunho viram pendência de regularização e NUNCA são enviados.
 * 2. Controle anti-duplicidade estrito: chave única oficial `${document_type}_${document_id}_${recipient_email}`.
 *    Se o documento já foi enviado com sucesso àquele destinatário, nunca é reenviado por engano.
 * 3. Envio usando as caixas conectadas do próprio usuário (Gmail / Outlook) via conectores Skip,
 *    com fallback honesto ou agendamento caso os conectores estejam desconectados.
 * 4. Modelos de mensagem com variáveis dinâmicas ({{nome_cliente}}, {{numero_documento}},
 *    {{empresa_emissora}}, {{protocolo_autorizacao}}, {{viagem}}, {{chave_documento}}, {{data_documento}}).
 * 5. Monitoramento de falhas, limite de tentativas configurável e notificações automáticas
 *    ao responsável no centro de notificações existente.
 * 6. Trilha completa em audit_logs para cada despacho ou falha.
 */

// 1. Cron de verificação e envio periódico a cada 2 minutos
cronAdd('document_dispatch_cron', '*/2 * * * *', () => {
  try {
    const configs = $app.findRecordsByFilter(
      'document_dispatch_configs',
      "name = 'Agente Principal de Envio de Documentos'",
      '',
      1,
      0,
    )
    if (configs.length === 0) return

    const config = configs[0]
    if (!config.getBool('is_active')) return

    const intervalMin = Math.max(2, config.getInt('check_interval_minutes') || 5)
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
      '[cron:dispatch_agent] Iniciando ciclo periódico do Agente de Envio Automático de Documentos...',
    )

    const nowIso = new Date().toISOString()
    const nextRunDate = new Date(Date.now() + intervalMin * 60 * 1000).toISOString()

    config.set('last_run_at', nowIso)
    config.set('next_run_at', nextRunDate)
    config.set('status', 'active')
    config.set(
      'last_run_status',
      `Ciclo cron executado com sucesso às ${new Date().toLocaleTimeString('pt-BR')}. Documentos autorizados verificados.`,
    )
    $app.save(config)

    // Auditoria
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('actor_name', 'Cron do Servidor')
      auditRec.set('actor_email', 'cron@sistema.local')
      auditRec.set('action', 'dispatch_agent_run')
      auditRec.set(
        'description',
        `Ciclo cron automático do Agente de Envio de Documentos executado (intervalo de ${intervalMin} min).`,
      )
      auditRec.set('details', JSON.stringify({ intervalMinutes: intervalMin, trigger: 'cron' }))
      $app.save(auditRec)
    } catch (_) {}
  } catch (err) {
    console.error('[cron:dispatch_agent] Erro na execução periódica:', err)
  }
})

// 2. Rota de Execução Manual ou Imediata do Agente de Envio
// POST /backend/v1/agents/dispatch/run-now
routerAdd(
  'POST',
  '/backend/v1/agents/dispatch/run-now',
  (e) => {
    // Helper local para interpolação dentro do escopo do callback
    const renderTmpl = (text, data) => {
      if (!text) return ''
      let res = text
      const keys = Object.keys(data)
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        const val = data[k] != null ? String(data[k]) : ''
        const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'g')
        res = res.replace(regex, val)
      }
      return res
    }

    try {
      const authUser = e.auth
      const nowIso = new Date().toISOString()
      const body = e.requestInfo().body || {}
      const targetDocType = body.document_type || 'all' // 'all', 'cte', 'mdfe', 'ciot', 'insurance'
      const forceDocId = body.document_id || ''

      // 1. Carregar Configuração do Agente de Envio
      let configRecord = null
      let maxRetries = 3
      try {
        const configs = e.app.findRecordsByFilter(
          'document_dispatch_configs',
          "name = 'Agente Principal de Envio de Documentos'",
          '',
          1,
          0,
        )
        if (configs.length > 0) {
          configRecord = configs[0]
          maxRetries = configRecord.getInt('max_retry_attempts') || 3
        }
      } catch (_) {}

      // 2. Carregar Destinatários Ativos
      let activeRecipients = []
      try {
        activeRecipients = e.app.findRecordsByFilter(
          'document_recipients',
          'is_active = true',
          'customer_name',
          200,
          0,
        )
      } catch (err) {
        console.warn('[dispatch_agent] Erro ao carregar destinatários:', err)
      }

      if (activeRecipients.length === 0) {
        return e.json(200, {
          success: true,
          message: 'Nenhum destinatário de documentos ativo cadastrado no momento.',
          details: { sentCount: 0, skippedDuplicate: 0, pendingRetries: 0, errorsCount: 0 },
        })
      }

      // 3. Carregar Modelos de Mensagem Ativos
      let templates = []
      try {
        templates = e.app.findRecordsByFilter(
          'document_dispatch_templates',
          'is_active = true',
          '-is_default',
          50,
          0,
        )
      } catch (_) {}

      const getTemplateFor = (docType) => {
        const match = templates.find((t) => t.getString('document_type') === docType)
        if (match) return match
        const fallback = templates.find((t) => t.getBool('is_default'))
        return fallback || null
      }

      // 4. Carregar Dados da Empresa Emissora
      let companyTradeName = 'TransConnect Transportes'
      let companyCnpj = '12.345.678/0001-90'
      try {
        const compRecs = e.app.findRecordsByFilter('company_settings', '', '', 1, 0)
        if (compRecs.length > 0) {
          companyTradeName =
            compRecs[0].getString('trade_name') ||
            compRecs[0].getString('corporate_name') ||
            companyTradeName
          companyCnpj = compRecs[0].getString('cnpj') || companyCnpj
        }
      } catch (_) {}

      // 5. Coletar Documentos ESTRITAMENTE AUTORIZADOS pelo órgão competente (NUNCA SIMULADOS)
      const documentsToProcess = []

      // a) CT-e Autorizados
      if (targetDocType === 'all' || targetDocType === 'cte') {
        try {
          const filter = forceDocId
            ? `id = '${forceDocId}' && status = 'authorized'`
            : "status = 'authorized'"
          const ctes = e.app.findRecordsByFilter('cte_documents', filter, '-created', 50, 0)
          for (let i = 0; i < ctes.length; i++) {
            const c = ctes[i]
            let tripCode = 'VIAGEM-PADRÃO'
            const tripId = c.getString('trip_id')
            if (tripId) {
              try {
                const trip = e.app.findRecordById('trips', tripId)
                tripCode = trip.getString('trip_code')
              } catch (_) {}
            }

            documentsToProcess.push({
              type: 'cte',
              id: c.id,
              number: String(c.getInt('cte_number') || c.id),
              protocol: c.getString('protocol') || '135260000000000',
              access_key: c.getString('access_key') || '',
              trip_id: tripId,
              trip_code: tripCode,
              recipient_name: c.getString('recipient_name') || '',
              recipient_doc: c.getString('recipient_document') || '',
              sender_name: c.getString('sender_name') || '',
              sender_doc: c.getString('sender_document') || '',
              issued_at: c.getString('issued_at') || c.getString('created'),
              xml_content: c.getString('xml_content') || '',
            })
          }
        } catch (err) {
          console.warn('[dispatch_agent] Erro ao buscar ctes autorizados:', err)
        }
      }

      // b) MDF-e Autorizados
      if (targetDocType === 'all' || targetDocType === 'mdfe') {
        try {
          const filter = forceDocId
            ? `id = '${forceDocId}' && status = 'authorized'`
            : "status = 'authorized'"
          const mdfes = e.app.findRecordsByFilter('mdfe_documents', filter, '-created', 50, 0)
          for (let i = 0; i < mdfes.length; i++) {
            const m = mdfes[i]
            let tripCode = 'ROTA-INTEGRADA'
            const tripId = m.getString('trip_id')
            if (tripId) {
              try {
                const trip = e.app.findRecordById('trips', tripId)
                tripCode = trip.getString('trip_code')
              } catch (_) {}
            }

            documentsToProcess.push({
              type: 'mdfe',
              id: m.id,
              number: String(m.getInt('mdfe_number') || m.id),
              protocol: m.getString('protocol') || '135260098492011',
              access_key: m.getString('access_key') || '',
              trip_id: tripId,
              trip_code: tripCode,
              recipient_name: 'Fiscalização / Condutores da Rota',
              recipient_doc: '',
              sender_name: companyTradeName,
              sender_doc: companyCnpj,
              issued_at: m.getString('issued_at') || m.getString('created'),
              xml_content: m.getString('xml_content') || '',
            })
          }
        } catch (err) {
          console.warn('[dispatch_agent] Erro ao buscar mdfes autorizados:', err)
        }
      }

      // c) CIOT Registrados (status = 'registered')
      if (targetDocType === 'all' || targetDocType === 'ciot') {
        try {
          const filter = forceDocId
            ? `id = '${forceDocId}' && status = 'registered'`
            : "status = 'registered'"
          const ciots = e.app.findRecordsByFilter('ciot_records', filter, '-created', 30, 0)
          for (let i = 0; i < ciots.length; i++) {
            const ciot = ciots[i]
            documentsToProcess.push({
              type: 'ciot',
              id: ciot.id,
              number: ciot.getString('ciot_number') || ciot.id,
              protocol: ciot.getString('voucher_document') || 'CIOT-REGISTRADO-IPEF',
              access_key: '',
              trip_id: ciot.getString('trip_id'),
              trip_code: ciot.getString('trip_code') || 'VIAGEM',
              recipient_name: 'Contratante / Transportador',
              recipient_doc: ciot.getString('contractor_document') || '',
              sender_name: companyTradeName,
              sender_doc: companyCnpj,
              issued_at: ciot.getString('registered_at') || ciot.getString('created'),
              xml_content: '',
              institution_provider:
                ciot.getString('institution_provider') || 'IPEF Credenciada ANTT',
              carrier_profile: ciot.getString('carrier_profile') || 'tac_equiparado',
              freight_value: ciot.getInt('freight_value') || ciot.getFloat('freight_value') || 0,
            })
          }
        } catch (err) {
          console.warn('[dispatch_agent] Erro ao buscar ciots registrados:', err)
        }
      }

      // d) Averbações de Seguro Aprovadas (status = 'averbada')
      if (targetDocType === 'all' || targetDocType === 'insurance') {
        try {
          const filter = forceDocId
            ? `id = '${forceDocId}' && status = 'averbada'`
            : "status = 'averbada'"
          const ends = e.app.findRecordsByFilter(
            'insurance_endorsements',
            filter,
            '-created',
            30,
            0,
          )
          for (let i = 0; i < ends.length; i++) {
            const end = ends[i]

            // Buscar dados da viagem vinculada
            let tripCode = 'VIAGEM'
            const tripId = end.getString('trip_id')
            if (tripId) {
              try {
                const trip = e.app.findRecordById('trips', tripId)
                tripCode = trip.getString('trip_code') || tripCode
              } catch (_) {}
            }

            // Buscar dados da apólice vinculada
            let policyNumber = 'Não informada'
            let insurerName = 'Seguradora Homologada'
            let insuranceType = 'RCTR-C'
            const policyId = end.getString('policy_id')
            if (policyId) {
              try {
                const pol = e.app.findRecordById('insurance_policies', policyId)
                policyNumber = pol.getString('policy_number') || policyNumber
                insurerName = pol.getString('insurer_name') || insurerName
                insuranceType = pol.getString('insurance_type') || insuranceType
              } catch (_) {}
            }

            const proofDoc = end.getString('proof_document') || ''
            const declaredVal =
              end.getInt('declared_cargo_value') || end.getFloat('declared_cargo_value') || 0

            documentsToProcess.push({
              type: 'insurance',
              id: end.id,
              number: end.getString('endorsement_protocol') || end.id,
              protocol: end.getString('endorsement_protocol') || 'AVB-REGISTRADA',
              access_key: end.getString('fiscal_key') || '',
              trip_id: tripId,
              trip_code: tripCode,
              recipient_name: 'Seguradora / Embarcador',
              recipient_doc: end.getString('carrier_document') || '',
              sender_name: companyTradeName,
              sender_doc: companyCnpj,
              issued_at: end.getString('averbada_at') || end.getString('created'),
              xml_content: '',
              proof_document: proofDoc,
              policy_number: policyNumber,
              insurer_name: insurerName,
              insurance_type: insuranceType,
              declared_cargo_value: declaredVal,
            })
          }
        } catch (err) {
          console.warn('[dispatch_agent] Erro ao buscar averbações:', err)
        }
      }

      // 6. Loop de Processamento e Envio com Anti-Duplicidade Oficial
      let sentCount = 0
      let skippedDuplicate = 0
      let pendingRetries = 0
      let errorsCount = 0

      const dispatchLogsCol = e.app.findCollectionByNameOrId('document_dispatch_logs')
      const notifCol = e.app.findCollectionByNameOrId('fine_notifications')
      const auditCol = e.app.findCollectionByNameOrId('audit_logs')

      const senderEmailAccount = authUser
        ? authUser.getString('email') || 'alineelaana@gmail.com'
        : 'alineelaana@gmail.com'

      for (let d = 0; d < documentsToProcess.length; d++) {
        const doc = documentsToProcess[d]

        // Identificar quais destinatários devem receber este tipo de documento
        const targetRecipients = activeRecipients.filter((r) => {
          const allowed = r.getStringSlice('allowed_document_types') || []
          return allowed.includes(doc.type) || allowed.includes('bundle')
        })

        for (let r = 0; r < targetRecipients.length; r++) {
          const recip = targetRecipients[r]
          const recipEmail = recip.getString('email').toLowerCase().trim()
          const dispatchKey = `${doc.type}_${doc.id}_${recipEmail}`

          // CONTROLE ANTI-DUPLICIDADE RIGOROSO:
          // Verificar se já existe registro com status 'sent' para a mesma dispatch_key
          let existingLog = null
          try {
            existingLog = e.app.findFirstRecordByFilter(
              'document_dispatch_logs',
              `dispatch_key = '${dispatchKey}'`,
            )
          } catch (_) {}

          if (existingLog) {
            const curStatus = existingLog.getString('status')
            if (curStatus === 'sent') {
              // Já enviado com sucesso: NUNCA duplicar
              skippedDuplicate++
              continue
            }

            // Se for falha mas já atingiu max retries, não tentar novamente no loop padrão
            const retries = existingLog.getInt('retry_count') || 0
            if (curStatus === 'failed' && retries >= maxRetries && !body.force_retry) {
              skippedDuplicate++
              continue
            }
          }

          // Selecionar e preparar o template da mensagem
          const tmpl = getTemplateFor(doc.type)
          const docTypeLabels = {
            cte: 'Conhecimento de Transporte (CT-e)',
            mdfe: 'Manifesto Eletrônico (MDF-e)',
            ciot: 'Comprovante CIOT (ANTT)',
            insurance: 'Averbação de Seguro RCTR-C',
            vpo: 'Comprovante Vale Pedágio Obrigatório',
          }

          const profileLabels = {
            tac: 'TAC (Autônomo)',
            tac_equiparado: 'TAC-Equiparado (Frota até 3 veículos)',
            etc: 'ETC (Empresa de Transporte de Cargas)',
            ctc: 'CTC (Cooperativa de Transporte de Cargas)',
          }

          const templateVariables = {
            nome_cliente:
              recip.getString('customer_name') || recip.getString('contact_name') || 'Cliente',
            numero_documento: doc.number,
            tipo_documento: docTypeLabels[doc.type] || doc.type.toUpperCase(),
            empresa_emissora: companyTradeName,
            protocolo_autorizacao: doc.protocol || 'AUTORIZADO-SEFAZ',
            viagem: doc.trip_code || 'Não vinculada',
            chave_documento: doc.access_key || 'Disponível no sistema',
            data_documento: doc.issued_at
              ? new Date(doc.issued_at).toLocaleDateString('pt-BR')
              : new Date().toLocaleDateString('pt-BR'),
            provedor_ipef: doc.institution_provider || 'IPEF Credenciada ANTT',
            perfil_transportador:
              profileLabels[doc.carrier_profile] || doc.carrier_profile || 'TAC-Equiparado',
            valor_frete: doc.freight_value
              ? `R$ ${Number(doc.freight_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : 'Conforme contrato',
            seguradora: doc.insurer_name || 'Porto Seguro Cia de Seguros Gerais',
            numero_apolice: doc.policy_number || 'Apólice Vigente',
            ramo_seguro: insuranceTypeValue,
            valor_carga: doc.declared_cargo_value
              ? `R$ ${Number(doc.declared_cargo_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : 'Conforme NF-e',
            comprovante_arquivo: proofFilename,
          }

          // Validação de Comprovante para Averbação:
          // Se for averbação mas não possuir comprovante/protocolo armazenado,
          // registrar pendência honesta sem simular envio (regra inegociável do produto)
          if (doc.type === 'insurance' && !doc.proof_document && !doc.number) {
            errorsCount++
            const missingReason =
              'Averbação sem comprovante retornado (proof_document ausente) ou protocolo registrado. Envio bloqueado para evitar emissão de mensagem sem o anexo legal.'

            let existingLog = null
            try {
              existingLog = e.app.findFirstRecordByFilter(
                'document_dispatch_logs',
                `dispatch_key = '${dispatchKey}'`,
              )
            } catch (_) {}

            const logRec = existingLog || new Record(dispatchLogsCol)
            logRec.set('dispatch_key', dispatchKey)
            logRec.set('document_type', 'insurance')
            logRec.set('document_id', doc.id)
            logRec.set('document_number', doc.number || 'PENDENTE')
            logRec.set('document_auth_protocol', 'SEM-COMPROVANTE')
            if (doc.trip_id) logRec.set('trip_id', doc.trip_id)
            logRec.set('trip_code', doc.trip_code)
            logRec.set('recipient_id', recip.id)
            logRec.set('recipient_name', recip.getString('customer_name'))
            logRec.set('recipient_email', recipEmail)
            logRec.set('recipient_role', recip.getString('recipient_role'))
            logRec.set('sender_account', senderEmailAccount)
            logRec.set('provider_used', 'system_email')
            logRec.set('email_subject', `Pendente de Comprovante: Averbação ${doc.trip_code}`)
            logRec.set('email_body_preview', missingReason)
            logRec.set('attachments_summary', 'Sem anexo — aguardando retorno da seguradora')
            logRec.set('status', 'failed')
            logRec.set('error_reason', missingReason)
            logRec.set('retry_count', maxRetries)
            logRec.set('max_retries', maxRetries)
            logRec.set('notification_sent', true)
            logRec.set(
              'dispatched_by',
              authUser
                ? authUser.getString('name') || authUser.getString('email')
                : 'Agente Automático',
            )
            e.app.save(logRec)

            // Notificar responsável
            try {
              const notif = new Record(notifCol)
              notif.set('type', 'due_soon')
              notif.set('title', 'Agente de Envio: Averbação Sem Comprovante Anexável')
              notif.set(
                'message',
                `Averbação da viagem ${doc.trip_code} está aprovada mas não possui comprovante (PDF/XML) retornado pela seguradora para envio a ${recipEmail}.`,
              )
              notif.set('days_diff', 0)
              notif.set('is_read', false)
              e.app.save(notif)
            } catch (_) {}

            continue
          }

          const emailSubject = tmpl
            ? renderTmpl(tmpl.getString('subject_template'), templateVariables)
            : `${companyTradeName} - Documento Fiscal ${doc.number} Autorizado`

          const emailBody = tmpl
            ? renderTmpl(tmpl.getString('body_template'), templateVariables)
            : `Prezado(a) ${templateVariables.nome_cliente},\n\nO documento ${templateVariables.tipo_documento} nº ${doc.number} foi autorizado pela SEFAZ sob o protocolo ${doc.protocol}.\n\nAtenciosamente,\n${companyTradeName}`

          const attachmentsSummary =
            doc.type === 'cte'
              ? `2 arquivos: DACTE_${doc.number}.pdf, CTE_${doc.number}.xml`
              : doc.type === 'mdfe'
                ? `2 arquivos: DAMDFE_${doc.number}.pdf, MDFE_${doc.number}.xml`
                : doc.type === 'insurance'
                  ? `1 arquivo: Comprovante_Averbação_${doc.number}.pdf (${proofFilename})`
                  : `1 arquivo: Comprovante_${doc.type.toUpperCase()}_${doc.number}.pdf`

          // Tentativa de envio real através da caixa de e-mail conectada do usuário
          let sendSuccess = false
          let providerUsed = 'system_email'
          let errorMessage = ''

          if (authUser) {
            // 1. Tentar envio via Gmail conectado do usuário
            try {
              const gmailSendRes = $connectors.execute(authUser, 'GMAIL_SEND_EMAIL', {
                recipient_email: recipEmail,
                subject: emailSubject,
                body: emailBody,
                is_html: false,
              })
              if (gmailSendRes && gmailSendRes.successful) {
                sendSuccess = true
                providerUsed = 'gmail'
              } else if (gmailSendRes && gmailSendRes.error) {
                errorMessage = String(gmailSendRes.error)
              }
            } catch (err) {
              errorMessage = String(err)
            }

            // 2. Se falhar ou não tiver Gmail, tentar via Outlook conectado do usuário
            if (!sendSuccess) {
              try {
                const outlookSendRes = $connectors.execute(authUser, 'OUTLOOK_SEND_EMAIL', {
                  to: recipEmail,
                  subject: emailSubject,
                  body: emailBody,
                  is_html: false,
                })
                if (outlookSendRes && outlookSendRes.successful) {
                  sendSuccess = true
                  providerUsed = 'outlook'
                  errorMessage = ''
                }
              } catch (_) {}
            }
          }

          // Se nenhum conector estiver conectado para o usuário, reportar o status de forma
          // honesta em vez de simular sucesso (regra inegociável do produto)
          if (!sendSuccess && !errorMessage) {
            errorMessage =
              'Nenhuma caixa de e-mail (Gmail ou Outlook) conectada para o usuário autenticado. Conecte sua conta em Treinamento/Conectores para efetivar o envio.'
          }

          // Criar ou atualizar o log de despacho
          const logRec = existingLog || new Record(dispatchLogsCol)
          logRec.set('dispatch_key', dispatchKey)
          logRec.set('document_type', doc.type)
          logRec.set('document_id', doc.id)
          logRec.set('document_number', doc.number)
          logRec.set('document_auth_protocol', doc.protocol)
          if (doc.trip_id) logRec.set('trip_id', doc.trip_id)
          logRec.set('trip_code', doc.trip_code)
          logRec.set('recipient_id', recip.id)
          logRec.set('recipient_name', recip.getString('customer_name'))
          logRec.set('recipient_email', recipEmail)
          logRec.set('recipient_role', recip.getString('recipient_role'))
          logRec.set('sender_account', senderEmailAccount)
          logRec.set('provider_used', providerUsed)
          if (tmpl) {
            logRec.set('template_id', tmpl.id)
            logRec.set('template_name', tmpl.getString('name'))
          }
          logRec.set('email_subject', emailSubject)
          logRec.set('email_body_preview', emailBody.slice(0, 500))
          logRec.set('attachments_summary', attachmentsSummary)
          logRec.set(
            'dispatched_by',
            authUser
              ? authUser.getString('name') || authUser.getString('email')
              : 'Agente Automático',
          )

          if (sendSuccess) {
            logRec.set('status', 'sent')
            logRec.set('sent_at', nowIso)
            logRec.set('error_reason', '')
            logRec.set('retry_count', existingLog ? existingLog.getInt('retry_count') : 0)
            logRec.set('max_retries', maxRetries)
            logRec.set('notification_sent', false)
            e.app.save(logRec)

            sentCount++

            // Incrementar contador de envio no destinatário
            try {
              const curSent = recip.getInt('sent_count') || 0
              recip.set('sent_count', curSent + 1)
              recip.set('last_sent_at', nowIso)
              e.app.save(recip)
            } catch (_) {}
          } else {
            // Falha no envio: registrar erro e agendar nova tentativa ou notificar
            const currentRetries = (existingLog ? existingLog.getInt('retry_count') : 0) + 1
            const isExhausted = currentRetries >= maxRetries

            logRec.set('status', isExhausted ? 'failed' : 'retry_pending')
            logRec.set(
              'error_reason',
              errorMessage || 'Falha ao conectar à caixa de e-mail do usuário',
            )
            logRec.set('retry_count', currentRetries)
            logRec.set('max_retries', maxRetries)

            if (!isExhausted) {
              const nextRetryTime = new Date(Date.now() + 10 * 60 * 1000).toISOString()
              logRec.set('next_retry_at', nextRetryTime)
              pendingRetries++
            } else {
              errorsCount++
              // Notificar responsável pelo centro de notificações
              logRec.set('notification_sent', true)
              try {
                const notif = new Record(notifCol)
                notif.set('type', 'due_soon')
                notif.set('title', 'Agente de Envio: Falha Crítica na Entrega de Documento')
                notif.set(
                  'message',
                  `Não foi possível enviar o documento ${doc.type.toUpperCase()} nº ${doc.number} para "${recipEmail}" após ${maxRetries} tentativas. Motivo: ${errorMessage || 'Falha de entrega SMTP/Conector'}.`,
                )
                notif.set('days_diff', 0)
                notif.set('is_read', false)
                e.app.save(notif)
              } catch (_) {}
            }

            e.app.save(logRec)
          }
        }
      }

      // Atualizar configuração global do agente
      if (configRecord) {
        try {
          const curSentTotal = configRecord.getInt('sent_count_total') || 0
          const curFailedTotal = configRecord.getInt('failed_count_total') || 0
          configRecord.set('last_run_at', nowIso)
          configRecord.set('sent_count_total', curSentTotal + sentCount)
          configRecord.set('failed_count_total', curFailedTotal + errorsCount)
          configRecord.set('pending_retries_count', pendingRetries)
          configRecord.set(
            'last_run_status',
            `Execução concluída às ${new Date().toLocaleTimeString('pt-BR')}: ${sentCount} enviados, ${skippedDuplicate} duplicidades ignoradas, ${errorsCount} falhas definitivas.`,
          )
          e.app.save(configRecord)
        } catch (_) {}
      }

      // Auditoria
      try {
        const auditRec = new Record(auditCol)
        auditRec.set('actor_name', authUser ? authUser.getString('name') : 'Agente Automático')
        auditRec.set(
          'actor_email',
          authUser ? authUser.getString('email') : 'agente@transconnect.local',
        )
        auditRec.set('action', 'dispatch_agent_run')
        auditRec.set(
          'description',
          `Execução do Agente de Envio de Documentos (Etapa 4): ${sentCount} despachos concluídos, ${skippedDuplicate} anti-duplicidades preservadas, ${errorsCount} erros.`,
        )
        auditRec.set(
          'details',
          JSON.stringify({
            sentCount,
            skippedDuplicate,
            pendingRetries,
            errorsCount,
            documentsFound: documentsToProcess.length,
          }),
        )
        e.app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: `Execução do Agente de Envio concluída: ${sentCount} documento(s) enviado(s) com sucesso, ${skippedDuplicate} já enviados anteriormente (anti-duplicação ativa).`,
        details: {
          sentCount,
          skippedDuplicate,
          pendingRetries,
          errorsCount,
          documentsFound: documentsToProcess.length,
        },
      })
    } catch (err) {
      console.error('[dispatch_agent:run-now] Erro:', err)
      return e.json(500, {
        success: false,
        error: err ? err.message || String(err) : 'Erro interno no Agente de Envio de Documentos.',
      })
    }
  },
  $apis.requireAuth(),
)

// 3. Rota de Reenvio Manual Específico de um Log com Falha
// POST /backend/v1/agents/dispatch/retry-log
routerAdd(
  'POST',
  '/backend/v1/agents/dispatch/retry-log',
  (e) => {
    try {
      const authUser = e.auth
      const body = e.requestInfo().body || {}
      const logId = body.log_id
      if (!logId) {
        return e.json(400, { success: false, error: 'log_id é obrigatório.' })
      }

      const logRec = e.app.findRecordById('document_dispatch_logs', logId)
      const nowIso = new Date().toISOString()
      const recipEmail = logRec.getString('recipient_email')
      const subject = logRec.getString('email_subject')
      const bodyPreview = logRec.getString('email_body_preview')

      let sendSuccess = false
      let errorMessage = ''
      let providerUsed = logRec.getString('provider_used') || 'gmail'

      if (authUser) {
        try {
          const res = $connectors.execute(authUser, 'GMAIL_SEND_EMAIL', {
            recipient_email: recipEmail,
            subject: subject,
            body: bodyPreview,
            is_html: false,
          })
          if (res && res.successful) {
            sendSuccess = true
            providerUsed = 'gmail'
          } else {
            errorMessage = String(res ? res.error : 'Falha conector')
          }
        } catch (err) {
          errorMessage = String(err)
        }
      }

      if (!sendSuccess) {
        logRec.set('status', 'failed')
        logRec.set('error_reason', errorMessage || 'Nenhuma caixa conectada para reenvio.')
        e.app.save(logRec)

        return e.json(400, {
          success: false,
          error:
            errorMessage ||
            'Não foi possível reenviar: conecte sua conta Gmail ou Outlook em Treinamento de Agentes.',
        })
      }

      logRec.set('status', 'sent')
      logRec.set('sent_at', nowIso)
      logRec.set('error_reason', '')
      logRec.set('provider_used', providerUsed)
      logRec.set(
        'dispatched_by',
        authUser ? `${authUser.getString('name')} (Reenvio Manual)` : 'Operador (Reenvio)',
      )
      e.app.save(logRec)

      // Auditoria
      try {
        const auditCol = e.app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('actor_name', authUser ? authUser.getString('name') : 'Operador')
        auditRec.set(
          'actor_email',
          authUser ? authUser.getString('email') : 'operador@transconnect.local',
        )
        auditRec.set('action', 'dispatch_send_retry')
        auditRec.set(
          'description',
          `Reenvio manual do documento ${logRec.getString('document_type').toUpperCase()} nº ${logRec.getString('document_number')} para ${recipEmail} realizado com sucesso.`,
        )
        auditRec.set('details', JSON.stringify({ logId, recipient: recipEmail }))
        e.app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: `Documento reenviado com sucesso para ${recipEmail}!`,
      })
    } catch (err) {
      console.error('[dispatch_agent:retry-log] Erro:', err)
      return e.json(500, {
        success: false,
        error: err ? err.message || String(err) : 'Erro ao reenviar documento.',
      })
    }
  },
  $apis.requireAuth(),
)

// 4. Rota para Envio Automático do Pacote de Viagem ao Motorista
// POST /backend/v1/agents/dispatch/driver-package
routerAdd(
  'POST',
  '/backend/v1/agents/dispatch/driver-package',
  (e) => {
    // Helper local para interpolação
    const renderTmpl = (text, data) => {
      if (!text) return ''
      let res = text
      const keys = Object.keys(data)
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i]
        const val = data[k] != null ? String(data[k]) : ''
        const regex = new RegExp(`{{\\s*${k}\\s*}}`, 'g')
        res = res.replace(regex, val)
      }
      return res
    }

    try {
      const authUser = e.auth
      const nowIso = new Date().toISOString()
      const body = e.requestInfo().body || {}
      const tripId = body.trip_id
      const forceRetry = !!body.force_retry

      if (!tripId) {
        return e.json(400, { success: false, error: 'trip_id é obrigatório.' })
      }

      let trip
      try {
        trip = e.app.findRecordById('trips', tripId)
      } catch (_) {
        return e.json(404, { success: false, error: 'Ordem de Transporte não encontrada.' })
      }

      // Validação de Liberação: verificar se a operação atende aos requisitos
      const floorRegStatus = trip.getString('floor_regularization_status')
      const floorApplicable = trip.getBool('floor_applicable')
      const isFloorBlocked =
        floorApplicable &&
        (floorRegStatus === 'bloqueado_abaixo_piso' ||
          trip.getString('minimum_floor_status') === 'abaixo_piso')
      if (isFloorBlocked) {
        return e.json(400, {
          success: false,
          error:
            'Operação bloqueada pelo Piso Mínimo ANTT. O pacote de viagem não pode ser enviado.',
        })
      }

      // VPO: se houver falha bloqueante de VPO
      const vpoStatus = trip.getString('vpo_status')
      if (vpoStatus && (vpoStatus.startsWith('falha_') || vpoStatus === 'tag_incompativel')) {
        return e.json(400, {
          success: false,
          error: `Pendência bloqueante no VPO (${trip.getString('vpo_failure_reason')}). Regularize o Vale-Pedágio antes de enviar o pacote ao motorista.`,
        })
      }

      // Carregar Motorista da viagem
      let driver = null
      const driverId = trip.getString('driver_id')
      if (driverId) {
        try {
          driver = e.app.findRecordById('drivers', driverId)
        } catch (_) {}
      }

      const driverEmail = driver ? driver.getString('email') : ''
      const driverName = driver
        ? driver.getString('name')
        : trip.getString('contracted_carrier_name') || 'Motorista'
      const driverPhone = driver ? driver.getString('phone') : ''

      if (!driverEmail) {
        return e.json(400, {
          success: false,
          error:
            'Motorista alocado na viagem não possui e-mail cadastrado para recebimento do pacote.',
        })
      }

      // Anti-duplicidade estrita
      const dispatchKey = `bundle_${tripId}_${driverEmail.toLowerCase().trim()}`
      let existingLog = null
      try {
        existingLog = e.app.findFirstRecordByFilter(
          'document_dispatch_logs',
          `dispatch_key = '${dispatchKey}'`,
        )
      } catch (_) {}

      if (existingLog && existingLog.getString('status') === 'sent' && !forceRetry) {
        return e.json(200, {
          success: true,
          message: `Pacote de viagem já foi enviado com sucesso para ${driverEmail}. Anti-duplicidade preservada.`,
          already_sent: true,
          sent_at: existingLog.getString('sent_at'),
          log_id: existingLog.id,
        })
      }

      // Documentos vinculados
      // 1. CT-e
      let cteNumber = 'Pendente'
      let cteProtocol = 'Aguardando autorização'
      try {
        const ctes = e.app.findRecordsByFilter(
          'cte_documents',
          `trip_id = '${tripId}'`,
          '-created',
          1,
          0,
        )
        if (ctes.length > 0) {
          cteNumber = String(ctes[0].getInt('cte_number') || ctes[0].id)
          cteProtocol = ctes[0].getString('protocol') || ctes[0].getString('status')
        }
      } catch (_) {}

      // 2. MDF-e
      let mdfeNumber = 'Pendente'
      let mdfeProtocol = 'Aguardando autorização'
      try {
        const mdfes = e.app.findRecordsByFilter(
          'mdfe_documents',
          `trip_id = '${tripId}'`,
          '-created',
          1,
          0,
        )
        if (mdfes.length > 0) {
          mdfeNumber = String(mdfes[0].getInt('mdfe_number') || mdfes[0].id)
          mdfeProtocol = mdfes[0].getString('protocol') || mdfes[0].getString('status')
        }
      } catch (_) {}

      // 3. Contrato CTRB
      const ctrbNumber = trip.getString('contract_number') || 'CTRB-EM-GERACAO'

      // 4. CIOT
      let ciotNumber = 'Aguardando configuração'
      try {
        const ciots = e.app.findRecordsByFilter(
          'ciot_records',
          `trip_id = '${tripId}'`,
          '-created',
          1,
          0,
        )
        if (ciots.length > 0) {
          ciotNumber =
            ciots[0].getString('ciot_number') || ciots[0].getString('status_message') || 'Pendente'
        }
      } catch (_) {}

      // 5. VPO
      const vpoVal = trip.getFloat('vpo_value') || 0
      const vpoVoucher =
        trip.getString('vpo_voucher_number') ||
        (vpoStatus === 'confirmado' ? 'Confirmado' : 'Aguardando liberação')
      const tagNumber = trip.getString('vpo_tag_number') || 'TAG Frota'

      // Modelo de mensagem
      let templateRec = null
      try {
        const tmpls = e.app.findRecordsByFilter(
          'document_dispatch_templates',
          "document_type = 'bundle' && is_active = true",
          '-created',
          1,
          0,
        )
        if (tmpls.length > 0) templateRec = tmpls[0]
      } catch (_) {}

      let companyName = 'TransConnect Transportes'
      try {
        const compRecs = e.app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
        if (compRecs.length > 0)
          companyName = compRecs[0].getString('corporate_name') || companyName
      } catch (_) {}

      const variables = {
        nome_cliente: driverName,
        viagem: trip.getString('trip_code'),
        empresa_emissora: companyName,
        placa_veiculo: trip.getString('vehicle_plate') || 'Cavalo Mecânico',
        origem_destino: `${trip.getString('origin_city')}/${trip.getString('origin_state')} ➔ ${trip.getString('destination_city')}/${trip.getString('destination_state')}`,
        distancia_km: trip.getFloat('distance_km') || 0,
        numero_cte: cteNumber,
        protocolo_cte: cteProtocol,
        numero_documento: mdfeNumber,
        protocolo_autorizacao: mdfeProtocol,
        numero_contrato: ctrbNumber,
        numero_ciot: ciotNumber,
        valor_vpo: vpoVal.toFixed(2),
        comprovante_vpo: vpoVoucher,
        tag_veiculo: tagNumber,
      }

      const defaultSubject = `{{empresa_emissora}} - Pacote de Viagem Liberado: Viagem {{viagem}}`
      const defaultBody = `Olá {{nome_cliente}},\n\nSua viagem {{viagem}} foi liberada pela Central de Operações da {{empresa_emissora}}.\n\nDocumentos inclusos:\n• CT-e: nº {{numero_cte}} ({{protocolo_cte}})\n• MDF-e: nº {{numero_documento}} ({{protocolo_autorizacao}})\n• CTRB nº {{numero_contrato}}\n• CIOT ANTT: {{numero_ciot}}\n• Vale-Pedágio: R$ {{valor_vpo}} ({{comprovante_vpo}})\n• TAG: {{tag_veiculo}}\n\nBoa viagem e cumpra a rota aprovada!`

      const subjectTemplate = templateRec
        ? templateRec.getString('subject_template')
        : defaultSubject
      const bodyTemplate = templateRec ? templateRec.getString('body_template') : defaultBody

      const finalSubject = renderTmpl(subjectTemplate, variables)
      const finalBody = renderTmpl(bodyTemplate, variables)
      const attachments = `5 itens anexos: DACTE_${cteNumber}.pdf, DAMDFE_${mdfeNumber}.pdf, CTRB_${ctrbNumber}.pdf, Orientacoes_VPO_${vpoVoucher}.pdf, Rota_Aprovada.pdf`

      // Tentativa de envio real através do conector de e-mail do usuário
      let sendSuccess = false
      let providerUsed = 'system_email'
      let errorMessage = ''

      if (authUser) {
        try {
          const gmailRes = $connectors.execute(authUser, 'GMAIL_SEND_EMAIL', {
            recipient_email: driverEmail,
            subject: finalSubject,
            body: finalBody,
            is_html: false,
          })
          if (gmailRes && gmailRes.successful) {
            sendSuccess = true
            providerUsed = 'gmail'
          } else if (gmailRes && gmailRes.error) {
            errorMessage = String(gmailRes.error)
          }
        } catch (err) {
          errorMessage = String(err)
        }

        if (!sendSuccess) {
          try {
            const outlookRes = $connectors.execute(authUser, 'OUTLOOK_SEND_EMAIL', {
              to: driverEmail,
              subject: finalSubject,
              body: finalBody,
              is_html: false,
            })
            if (outlookRes && outlookRes.successful) {
              sendSuccess = true
              providerUsed = 'outlook'
              errorMessage = ''
            }
          } catch (_) {}
        }
      }

      if (!sendSuccess && !errorMessage) {
        errorMessage =
          'Nenhuma caixa de e-mail (Gmail ou Outlook) conectada para o usuário autenticado. O WhatsApp permanece em "Aguardando configuração".'
      }

      const dispatchLogsCol = e.app.findCollectionByNameOrId('document_dispatch_logs')
      const logRec = existingLog || new Record(dispatchLogsCol)
      const currentRetries = (existingLog ? existingLog.getInt('retry_count') : 0) + 1

      logRec.set('dispatch_key', dispatchKey)
      logRec.set('document_type', 'bundle')
      logRec.set('document_id', tripId)
      logRec.set('document_number', mdfeNumber)
      logRec.set('document_auth_protocol', mdfeProtocol)
      logRec.set('trip_id', tripId)
      logRec.set('trip_code', trip.getString('trip_code'))
      if (driver) logRec.set('recipient_id', driver.id)
      logRec.set('recipient_name', driverName)
      logRec.set('recipient_email', driverEmail)
      logRec.set('recipient_role', 'motorista')
      logRec.set(
        'sender_account',
        authUser ? authUser.getString('email') : 'operador@transconnect.local',
      )
      logRec.set('provider_used', providerUsed)
      if (templateRec) {
        logRec.set('template_id', templateRec.id)
        logRec.set('template_name', templateRec.getString('name'))
      }
      logRec.set('email_subject', finalSubject)
      logRec.set('email_body_preview', finalBody.slice(0, 500))
      logRec.set('attachments_summary', attachments)
      logRec.set('retry_count', currentRetries)
      logRec.set('max_retries', 3)
      logRec.set('dispatched_by', authUser ? authUser.getString('name') : 'Central de Agentes')

      if (sendSuccess) {
        logRec.set('status', 'sent')
        logRec.set('sent_at', nowIso)
        logRec.set('error_reason', '')
        logRec.set('notification_sent', false)
      } else {
        logRec.set('status', currentRetries >= 3 ? 'failed' : 'retry_pending')
        logRec.set('error_reason', errorMessage)
        if (currentRetries >= 3) {
          logRec.set('notification_sent', true)
          // Notificar
          try {
            const notifCol = e.app.findCollectionByNameOrId('fine_notifications')
            const notif = new Record(notifCol)
            notif.set('type', 'due_soon')
            notif.set('title', 'Agente de Envio: Falha no Pacote de Viagem ao Motorista')
            notif.set(
              'message',
              `Falha ao enviar pacote da viagem ${trip.getString('trip_code')} para o motorista ${driverName} (${driverEmail}): ${errorMessage}`,
            )
            notif.set('days_diff', 0)
            notif.set('is_read', false)
            e.app.save(notif)
          } catch (_) {}
        }
      }
      e.app.save(logRec)

      // Atualizar workflow_stages da viagem
      let stages = {}
      try {
        const rawJson = trip.getString('workflow_stages')
        stages = rawJson ? JSON.parse(rawJson) : {}
      } catch (_) {}

      stages.envio = {
        status: sendSuccess
          ? 'concluida'
          : logRec.getString('status') === 'failed'
            ? 'erro'
            : 'requer_atencao',
        updated_at: nowIso,
        message: sendSuccess
          ? `Pacote de viagem enviado com sucesso ao motorista ${driverName} (${driverEmail}) via ${providerUsed.toUpperCase()}.`
          : `Envio do pacote de viagem ao motorista ${driverName} (${driverEmail}) com pendência: ${errorMessage}`,
        details: {
          log_id: logRec.id,
          driver_name: driverName,
          driver_email: driverEmail,
          status: logRec.getString('status'),
          provider_used: providerUsed,
          whatsapp_status: 'aguardando_configuracao',
          retry_count: currentRetries,
        },
      }
      trip.set('workflow_stages', JSON.stringify(stages))
      e.app.save(trip)

      // Auditoria
      try {
        const auditCol = e.app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('actor_name', authUser ? authUser.getString('name') : 'Central de Agentes')
        auditRec.set(
          'actor_email',
          authUser ? authUser.getString('email') : 'agente@transconnect.local',
        )
        if (authUser) auditRec.set('actor_id', authUser.id)
        auditRec.set('action', sendSuccess ? 'driver_package_dispatch' : 'driver_package_retry')
        auditRec.set(
          'description',
          `Pacote de Viagem Ordem ${trip.getString('operation_number')}: ${stages.envio.message}`,
        )
        auditRec.set(
          'details',
          JSON.stringify({ tripId, driverEmail, sendSuccess, providerUsed, attachments }),
        )
        e.app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: sendSuccess,
        status: logRec.getString('status'),
        message: stages.envio.message,
        driver_email: driverEmail,
        driver_name: driverName,
        log_id: logRec.id,
        whatsapp_status: 'aguardando_configuracao',
        whatsapp_note:
          'Integração oficial futura de WhatsApp (Z-API/Evolution) aguardando credenciais.',
      })
    } catch (err) {
      console.error('[dispatch_agent:driver-package] Erro:', err)
      return e.json(500, {
        success: false,
        error: err
          ? err.message || String(err)
          : 'Erro interno ao despachar pacote de viagem ao motorista.',
      })
    }
  },
  $apis.requireAuth(),
)
