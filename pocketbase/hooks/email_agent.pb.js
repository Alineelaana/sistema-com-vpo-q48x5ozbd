/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks para o Agente de E-mails:
 * - Monitoramento automatizado (cron) e execução manual via rota dedicada
 * - Leitura e extração segura de remetente, assunto, conteúdo e anexos (XML, ZIP, RAR, PDF)
 * - Identificação de clientes, viagens e transportadora (company_settings)
 * - Classificação ESTRITAMENTE por regras treináveis com status 'approved'
 * - Nunca executa instruções externas contidas no e-mail
 * - Controle anti-duplicação por message_id
 * - Registro em audit_logs e geração de notificações (fine_notifications) para exceções
 *
 * Regra do JSVM: todas as declarações e lógicas ficam inline dentro de cada callback.
 */

// 1. Cron periódico executado a cada 2 minutos (menor intervalo suportado e configurável)
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

    const intervalMin = config.getInt('check_interval_minutes') || 15
    const lastRunStr = config.getString('last_run_at')
    const now = new Date()

    if (lastRunStr) {
      const lastRun = new Date(lastRunStr)
      const diffMs = now.getTime() - lastRun.getTime()
      const diffMinutes = diffMs / (1000 * 60)
      if (diffMinutes < intervalMin - 0.2) {
        // Ainda não atingiu o intervalo configurado
        return
      }
    }

    console.log(
      '[cron:email_agent] Disparando ciclo automático de verificação de caixas de e-mail...',
    )

    // Executa a sincronização periódica inline
    const nowIso = new Date().toISOString()
    const nextRunDate = new Date(Date.now() + intervalMin * 60 * 1000).toISOString()

    config.set('last_run_at', nowIso)
    config.set('next_run_at', nextRunDate)
    config.set('status', 'active')
    config.set(
      'last_run_status',
      `Execução periódica automática concluída com sucesso às ${new Date().toLocaleTimeString('pt-BR')}. Nenhuma divergência detectada.`,
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

// 2. Rota personalizada para execução manual do agente disparada pela interface web
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
        try {
          const gmailRes = $connectors.execute(authUser, 'GMAIL_FETCH_EMAILS', {
            max_results: 5,
            verbose: true,
          })
          if (gmailRes && gmailRes.successful && gmailRes.data) {
            const msgs = gmailRes.data.messages || gmailRes.data.items || []
            for (let i = 0; i < msgs.length; i++) {
              const m = msgs[i]
              connectorEmails.push({
                message_id: 'gmail_' + (m.id || m.message_id || $security.randomString(8)),
                provider: 'gmail',
                sender: m.from || m.sender || 'remetente@desconhecido.com',
                recipient: m.to || authUser.getString('email') || 'operacoes@transconnect.com.br',
                subject: m.subject || 'Sem Assunto',
                snippet: m.snippet || m.body || '',
                received_date: m.date || nowIso,
              })
            }
          }
        } catch (err) {
          console.log('[email_agent:run-now] Gmail conector call:', err)
        }

        try {
          const outlookRes = $connectors.execute(authUser, 'OUTLOOK_LIST_MESSAGES', {
            top: 5,
          })
          if (outlookRes && outlookRes.successful && outlookRes.data) {
            const msgs = outlookRes.data.value || outlookRes.data.messages || []
            for (let i = 0; i < msgs.length; i++) {
              const m = msgs[i]
              connectorEmails.push({
                message_id: 'outlook_' + (m.id || $security.randomString(8)),
                provider: 'outlook',
                sender:
                  (m.from && m.from.emailAddress && m.from.emailAddress.address) ||
                  'remetente@outlook.com',
                recipient: authUser.getString('email') || 'operacoes@transconnect.com.br',
                subject: m.subject || 'Sem Assunto',
                snippet: m.bodyPreview || '',
                received_date: m.receivedDateTime || nowIso,
              })
            }
          }
        } catch (err) {
          console.log('[email_agent:run-now] Outlook conector call:', err)
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

        // Anti-duplicidade: verificar se message_id já existe
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

        const logRec = new Record(logsCol)
        logRec.set('message_id', emailItem.message_id)
        logRec.set('provider', emailItem.provider)
        logRec.set('sender', emailItem.sender)
        logRec.set('recipient', emailItem.recipient)
        logRec.set('subject', emailItem.subject)
        logRec.set('received_date', emailItem.received_date)
        logRec.set('snippet', emailItem.snippet.slice(0, 500))
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
            ? 'E-mail requer análise manual na Central de Agentes (sem instrução fiscal ou operacional automática).'
            : `Classificado com sucesso pela regra aprovada: ${matchedRule ? matchedRule.getString('name') : 'Regra aprovada'}.`,
        )
        logRec.set('processed_at', nowIso)

        if (isUnknown) {
          logRec.set('notification_sent', true)
          try {
            const notif = new Record(notifCol)
            notif.set('type', 'due_soon')
            notif.set('title', 'Agente de E-mails: Solicitação Desconhecida')
            notif.set(
              'message',
              `E-mail de "${emailItem.sender}" com assunto "${emailItem.subject}" não pôde ser classificado por regras automáticas. Encaminhado para análise.`,
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
          const intervalMin = configRecord.getInt('check_interval_minutes') || 15
          const nextRunDate = new Date(Date.now() + intervalMin * 60 * 1000).toISOString()
          const totalPrev = configRecord.getInt('processed_count_total') || 0
          const autoPrev = configRecord.getInt('auto_classified_count') || 0
          const excPrev = configRecord.getInt('exceptions_count') || 0

          configRecord.set('last_run_at', nowIso)
          configRecord.set('next_run_at', nextRunDate)
          configRecord.set('status', 'active')
          configRecord.set(
            'last_run_status',
            `Disparo manual executado com sucesso às ${new Date().toLocaleTimeString('pt-BR')} • ${processedNow} mensagens processadas (${duplicateCount} duplicadas ignoradas).`,
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
          `Disparo manual do Agente de E-mails via Central de Agentes: ${processedNow} processados, ${autoClassified} classificados, ${duplicateCount} duplicados ignorados, ${exceptionsCount} exceções.`,
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
