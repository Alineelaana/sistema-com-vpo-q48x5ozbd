migrate(
  (app) => {
    // 1. Atualizar a coleção audit_logs para permitir novas ações de agentes
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      const actionField = auditCol.fields.getByName('action')
      if (actionField) {
        // Expandir as opções de action aceitas
        actionField.values = [
          'login',
          'logout',
          'create_user',
          'update_user',
          'deactivate_user',
          'activate_user',
          'anonymize_user',
          'export_user_data',
          'privacy_consent',
          'password_change',
          'email_agent_run',
          'email_agent_config',
          'email_agent_rule_create',
          'email_agent_rule_update',
          'email_agent_rule_approve',
          'email_agent_rule_reject',
        ]
        app.save(auditCol)
      }
    } catch (e) {
      console.warn('Não foi possível atualizar audit_logs action:', e)
    }

    // 2. Criar coleção email_agent_configs (configuração global/por usuário do agente de e-mails)
    let agentConfigCol
    try {
      agentConfigCol = app.findCollectionByNameOrId('email_agent_configs')
    } catch (_) {
      agentConfigCol = new Collection({
        name: 'email_agent_configs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'is_active', type: 'bool' },
          {
            name: 'check_interval_minutes',
            type: 'number',
            min: 2,
            max: 1440,
            onlyInt: true,
            required: true,
          },
          {
            name: 'status',
            type: 'select',
            values: ['active', 'paused', 'error'],
            maxSelect: 1,
            required: true,
          },
          { name: 'last_run_at', type: 'date' },
          { name: 'next_run_at', type: 'date' },
          { name: 'last_run_status', type: 'text' },
          { name: 'last_error_message', type: 'text' },
          { name: 'processed_count_total', type: 'number', onlyInt: true },
          { name: 'auto_classified_count', type: 'number', onlyInt: true },
          { name: 'exceptions_count', type: 'number', onlyInt: true },
          { name: 'connected_accounts_summary', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_email_agent_status ON email_agent_configs (status)'],
      })
      app.save(agentConfigCol)
    }

    // 3. Criar coleção email_agent_rules (regras treináveis e aprovadas pelo admin)
    let agentRulesCol
    try {
      agentRulesCol = app.findCollectionByNameOrId('email_agent_rules')
    } catch (_) {
      agentRulesCol = new Collection({
        name: 'email_agent_rules',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
        updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'description', type: 'text' },
          {
            name: 'trigger_type',
            type: 'select',
            values: ['nfe_received', 'cte_request', 'complementary_doc', 'unknown'],
            maxSelect: 1,
            required: true,
          },
          { name: 'subject_keywords', type: 'text' }, // palavras-chave separadas por vírgula
          { name: 'sender_pattern', type: 'text' }, // domínio ou remetente ex: @fornecedor.com
          { name: 'file_extensions', type: 'text' }, // ex: xml,zip,pdf
          {
            name: 'action_type',
            type: 'select',
            values: ['start_process', 'identify_cargo', 'link_operation', 'send_for_analysis'],
            maxSelect: 1,
            required: true,
          },
          { name: 'action_target_process', type: 'text' }, // ex: Processo de conferência NF-e
          {
            name: 'approval_status',
            type: 'select',
            values: ['pending_approval', 'approved', 'rejected'],
            maxSelect: 1,
            required: true,
          },
          { name: 'approved_by', type: 'text' }, // e-mail ou nome do admin
          { name: 'approved_at', type: 'date' },
          { name: 'is_active', type: 'bool' },
          { name: 'order_priority', type: 'number', onlyInt: true },
          { name: 'match_count', type: 'number', onlyInt: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_rules_trigger ON email_agent_rules (trigger_type)',
          'CREATE INDEX idx_rules_approval ON email_agent_rules (approval_status)',
          'CREATE INDEX idx_rules_active ON email_agent_rules (is_active)',
        ],
      })
      app.save(agentRulesCol)
    }

    // 4. Criar coleção email_processing_logs (histórico detalhado com identificação de duplicados)
    let logsCol
    try {
      logsCol = app.findCollectionByNameOrId('email_processing_logs')
    } catch (_) {
      logsCol = new Collection({
        name: 'email_processing_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'message_id', type: 'text', required: true }, // ID externo (Gmail / Outlook)
          {
            name: 'provider',
            type: 'select',
            values: ['gmail', 'outlook', 'manual'],
            maxSelect: 1,
            required: true,
          },
          { name: 'sender', type: 'text', required: true },
          { name: 'recipient', type: 'text' },
          { name: 'subject', type: 'text', required: true },
          { name: 'received_date', type: 'date' },
          { name: 'snippet', type: 'text' },
          { name: 'attachments_summary', type: 'text' }, // resumo legível dos arquivos
          { name: 'attachments_details', type: 'json' }, // lista de {name, type, size}
          {
            name: 'classification',
            type: 'select',
            values: ['nfe_received', 'cte_request', 'complementary_doc', 'unknown'],
            maxSelect: 1,
            required: true,
          },
          { name: 'matched_rule_id', type: 'text' },
          { name: 'matched_rule_name', type: 'text' },
          { name: 'customer_identified', type: 'text' }, // cliente reconhecido
          { name: 'company_identified', type: 'text' }, // empresa envolvida
          { name: 'trip_identified_id', type: 'text' }, // id de viagem se houver vínculo
          { name: 'trip_code', type: 'text' },
          {
            name: 'process_status',
            type: 'select',
            values: ['processed', 'duplicate', 'needs_analysis', 'error'],
            maxSelect: 1,
            required: true,
          },
          { name: 'execution_result', type: 'text' },
          { name: 'exception_details', type: 'text' },
          { name: 'is_duplicate', type: 'bool' },
          { name: 'notification_sent', type: 'bool' },
          { name: 'processed_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_email_msg_id ON email_processing_logs (message_id)',
          'CREATE INDEX idx_email_classif ON email_processing_logs (classification)',
          'CREATE INDEX idx_email_status ON email_processing_logs (process_status)',
          'CREATE INDEX idx_email_received ON email_processing_logs (received_date)',
        ],
      })
      app.save(logsCol)
    }

    // 5. Seed inicial idempotente da configuração e das 4 regras padrão aprovadas
    try {
      const existingConfigs = app.findRecordsByFilter(
        'email_agent_configs',
        "name = 'Agente Principal de E-mails'",
        '',
        1,
        0,
      )
      if (existingConfigs.length === 0) {
        const configRecord = new Record(agentConfigCol)
        configRecord.set('name', 'Agente Principal de E-mails')
        configRecord.set('is_active', true)
        configRecord.set('check_interval_minutes', 15) // Padrão 15 min, configurável inclusive 2 min
        configRecord.set('status', 'active')
        configRecord.set('last_run_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        configRecord.set('next_run_at', new Date(Date.now() + 10 * 60 * 1000).toISOString())
        configRecord.set('last_run_status', 'Sucesso • Monitoramento operacional ativo')
        configRecord.set('processed_count_total', 14)
        configRecord.set('auto_classified_count', 12)
        configRecord.set('exceptions_count', 2)
        configRecord.set(
          'connected_accounts_summary',
          'Gmail e Outlook conectados via conectores autorizados',
        )
        configRecord.set(
          'notes',
          'O agente opera em conformidade estrita com as regras aprovadas. Nunca executa instruções externas contidas no corpo do e-mail.',
        )
        app.save(configRecord)
      }
    } catch (e) {
      console.warn('Erro ao criar seed de email_agent_configs:', e)
    }

    // 4 Regras treináveis pré-definidas aprovadas
    const defaultRules = [
      {
        name: 'Quando receber NF-e → Iniciar processo de conferência e triagem',
        description:
          'Identifica e-mails com XML/PDF de Nota Fiscal Eletrônica e inicia processo de validação de carga sem autorização fiscal.',
        trigger_type: 'nfe_received',
        subject_keywords: 'nfe, nf-e, nota fiscal, danfe, chave de acesso',
        sender_pattern: '',
        file_extensions: 'xml,pdf,zip',
        action_type: 'start_process',
        action_target_process: 'Triagem e Conferência de NF-e',
        approval_status: 'approved',
        approved_by: 'Administrador (alineelaana@gmail.com)',
        approved_at: new Date().toISOString(),
        is_active: true,
        order_priority: 1,
        match_count: 8,
      },
      {
        name: 'Solicitação de CT-e → Identificar carga e transportadora',
        description:
          'Detecta pedidos de emissão/transporte via e-mail e busca viagem e remetente/destinatário compatíveis nos cadastros.',
        trigger_type: 'cte_request',
        subject_keywords: 'solicitacao cte, pedido cte, emitir cte, cotacao frete, carga',
        sender_pattern: '',
        file_extensions: 'pdf,xlsx,csv',
        action_type: 'identify_cargo',
        action_target_process: 'Identificação de Carga e Remetente',
        approval_status: 'approved',
        approved_by: 'Administrador (alineelaana@gmail.com)',
        approved_at: new Date().toISOString(),
        is_active: true,
        order_priority: 2,
        match_count: 4,
      },
      {
        name: 'Documento complementar → Vincular à operação de viagem',
        description:
          'Reconhece canhotos, romaneios, laudos ou comprovantes auxiliares e associa à viagem ou entrega em aberto.',
        trigger_type: 'complementary_doc',
        subject_keywords:
          'canhoto, romaneio, comprovante, laudo, ticket balanca, anexo complementar',
        sender_pattern: '',
        file_extensions: 'pdf,jpg,png,zip,rar',
        action_type: 'link_operation',
        action_target_process: 'Vínculo Operacional de Anexo',
        approval_status: 'approved',
        approved_by: 'Administrador (alineelaana@gmail.com)',
        approved_at: new Date().toISOString(),
        is_active: true,
        order_priority: 3,
        match_count: 2,
      },
      {
        name: 'Solicitação desconhecida → Encaminhar para análise humana',
        description:
          'Qualquer e-mail não categorizado pelas regras anteriores é mantido intacto e notificado para triagem manual na Central.',
        trigger_type: 'unknown',
        subject_keywords: '*',
        sender_pattern: '',
        file_extensions: '',
        action_type: 'send_for_analysis',
        action_target_process: 'Fila de Análise Operacional Humana',
        approval_status: 'approved',
        approved_by: 'Administrador (alineelaana@gmail.com)',
        approved_at: new Date().toISOString(),
        is_active: true,
        order_priority: 99,
        match_count: 2,
      },
    ]

    for (const r of defaultRules) {
      try {
        const found = app.findRecordsByFilter(
          'email_agent_rules',
          `name = '${r.name.replace(/'/g, "\\'")}'`,
          '',
          1,
          0,
        )
        if (found.length === 0) {
          const rec = new Record(agentRulesCol)
          rec.set('name', r.name)
          rec.set('description', r.description)
          rec.set('trigger_type', r.trigger_type)
          rec.set('subject_keywords', r.subject_keywords)
          rec.set('sender_pattern', r.sender_pattern)
          rec.set('file_extensions', r.file_extensions)
          rec.set('action_type', r.action_type)
          rec.set('action_target_process', r.action_target_process)
          rec.set('approval_status', r.approval_status)
          rec.set('approved_by', r.approved_by)
          rec.set('approved_at', r.approved_at)
          rec.set('is_active', r.is_active)
          rec.set('order_priority', r.order_priority)
          rec.set('match_count', r.match_count)
          app.save(rec)
        }
      } catch (e) {
        console.warn('Erro ao salvar regra padrão:', e)
      }
    }

    // 6. Seed representativo de logs de e-mails para demonstrar a Central de Agentes viva
    const sampleLogs = [
      {
        message_id: 'msg_seed_gmail_001_nfe',
        provider: 'gmail',
        sender: 'faturamento@metalurgicasul.com.br',
        recipient: 'operacoes@transconnect.com.br',
        subject: 'Envio de XML e DANFE NF-e 458920 - Carga Bobinas de Aço',
        received_date: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        snippet:
          'Segue em anexo os arquivos XML e DANFE da NF-e nº 458920 para transporte com destino a Curitiba/PR...',
        attachments_summary: '2 arquivos: NFE_458920.xml (18 KB), DANFE_458920.pdf (142 KB)',
        attachments_details: [
          { name: 'NFE_458920.xml', type: 'xml', size: 18432 },
          { name: 'DANFE_458920.pdf', type: 'pdf', size: 145408 },
        ],
        classification: 'nfe_received',
        matched_rule_name: 'Quando receber NF-e → Iniciar processo de conferência e triagem',
        customer_identified: 'Metalúrgica Sul S/A (CNPJ 12.345.678/0001-90)',
        company_identified: 'TransConnect Transportes',
        trip_code: 'TRP-2026-089',
        process_status: 'processed',
        execution_result:
          'NF-e reconhecida com sucesso. Dados organizados para conferência. Validação de peso e destinatário concluída.',
        is_duplicate: false,
        notification_sent: false,
        processed_at: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
      },
      {
        message_id: 'msg_seed_outlook_002_cte_req',
        provider: 'outlook',
        sender: 'logistica@agroindustriacentro.com.br',
        recipient: 'despacho@transconnect.com.br',
        subject: 'Solicitação de emissão CT-e para transporte de grãos Safra 2026',
        received_date: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
        snippet:
          'Solicitamos posicionamento de veículo e emissão de CT-e para o lote 8847 originário de Rondonópolis/MT...',
        attachments_summary: '1 arquivo: Romaneio_Lote8847.pdf (320 KB)',
        attachments_details: [{ name: 'Romaneio_Lote8847.pdf', type: 'pdf', size: 327680 }],
        classification: 'cte_request',
        matched_rule_name: 'Solicitação de CT-e → Identificar carga e transportadora',
        customer_identified: 'Agroindústria Centro-Oeste Ltda',
        company_identified: 'TransConnect Transportes',
        trip_code: 'TRP-2026-092',
        process_status: 'processed',
        execution_result:
          'Solicitação identificada com carga a granel. Aguardando etapa 2 (Identificação e Validação de Carga).',
        is_duplicate: false,
        notification_sent: false,
        processed_at: new Date(Date.now() - 108 * 60 * 1000).toISOString(),
      },
      {
        message_id: 'msg_seed_gmail_003_complementar',
        provider: 'gmail',
        sender: 'balanca@terminalportuario.com.br',
        recipient: 'operacoes@transconnect.com.br',
        subject: 'Ticket de Pesagem e Laudo de Classificação - Placa ABC-1D23',
        received_date: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        snippet:
          'Ticket de pesagem balança nº 99841 e laudo de umidade referente ao descarregamento...',
        attachments_summary: '2 arquivos: Ticket_99841.pdf (85 KB), Laudo_Umidade.pdf (112 KB)',
        attachments_details: [
          { name: 'Ticket_99841.pdf', type: 'pdf', size: 87040 },
          { name: 'Laudo_Umidade.pdf', type: 'pdf', size: 114688 },
        ],
        classification: 'complementary_doc',
        matched_rule_name: 'Documento complementar → Vincular à operação de viagem',
        customer_identified: 'Terminal Portuário de Santos',
        company_identified: 'TransConnect Transportes',
        trip_code: 'TRP-2026-077',
        process_status: 'processed',
        execution_result: 'Documentos anexados ao histórico da viagem TRP-2026-077.',
        is_duplicate: false,
        notification_sent: false,
        processed_at: new Date(Date.now() - 179 * 60 * 1000).toISOString(),
      },
      {
        message_id: 'msg_seed_outlook_004_unknown',
        provider: 'outlook',
        sender: 'compras@novoparceiro.com.br',
        recipient: 'comercial@transconnect.com.br',
        subject: 'Apresentação comercial e catálogo institucional de embalagens 2026',
        received_date: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
        snippet:
          'Prezados, enviamos nosso catálogo em formato ZIP com nova linha de pallets plásticos...',
        attachments_summary: '1 arquivo: Catalogo_2026.zip (4.8 MB)',
        attachments_details: [{ name: 'Catalogo_2026.zip', type: 'zip', size: 5033164 }],
        classification: 'unknown',
        matched_rule_name: 'Solicitação desconhecida → Encaminhar para análise humana',
        customer_identified: 'Novo Parceiro Embalagens',
        company_identified: 'TransConnect Transportes',
        process_status: 'needs_analysis',
        execution_result:
          'Conteúdo não corresponde a NF-e ou CT-e. Encaminhado para a fila de análise manual.',
        exception_details:
          'Assunto ou remetente não associado a operações ativas de transporte. Notificação gerada.',
        is_duplicate: false,
        notification_sent: true,
        processed_at: new Date(Date.now() - 238 * 60 * 1000).toISOString(),
      },
    ]

    for (const log of sampleLogs) {
      try {
        const found = app.findRecordsByFilter(
          'email_processing_logs',
          `message_id = '${log.message_id}'`,
          '',
          1,
          0,
        )
        if (found.length === 0) {
          const rec = new Record(logsCol)
          rec.set('message_id', log.message_id)
          rec.set('provider', log.provider)
          rec.set('sender', log.sender)
          rec.set('recipient', log.recipient)
          rec.set('subject', log.subject)
          rec.set('received_date', log.received_date)
          rec.set('snippet', log.snippet)
          rec.set('attachments_summary', log.attachments_summary)
          rec.set('attachments_details', JSON.stringify(log.attachments_details))
          rec.set('classification', log.classification)
          rec.set('matched_rule_name', log.matched_rule_name)
          rec.set('customer_identified', log.customer_identified)
          rec.set('company_identified', log.company_identified)
          if (log.trip_code) rec.set('trip_code', log.trip_code)
          rec.set('process_status', log.process_status)
          rec.set('execution_result', log.execution_result)
          if (log.exception_details) rec.set('exception_details', log.exception_details)
          rec.set('is_duplicate', log.is_duplicate)
          rec.set('notification_sent', log.notification_sent)
          rec.set('processed_at', log.processed_at)
          app.save(rec)
        }
      } catch (e) {
        console.warn('Erro ao salvar log de amostra:', e)
      }
    }
  },
  (app) => {
    try {
      const logs = app.findCollectionByNameOrId('email_processing_logs')
      if (logs) app.delete(logs)
    } catch (_) {}
    try {
      const rules = app.findCollectionByNameOrId('email_agent_rules')
      if (rules) app.delete(rules)
    } catch (_) {}
    try {
      const config = app.findCollectionByNameOrId('email_agent_configs')
      if (config) app.delete(config)
    } catch (_) {}
  },
)
