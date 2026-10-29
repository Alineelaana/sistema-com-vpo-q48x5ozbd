/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Expandir valores permitidos em audit_logs action
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      const actionField = auditCol.fields.getByName('action')
      if (actionField) {
        const currentValues = actionField.values || []
        const newActions = [
          'dispatch_agent_run',
          'dispatch_agent_config',
          'dispatch_template_create',
          'dispatch_template_update',
          'dispatch_recipient_create',
          'dispatch_recipient_update',
          'dispatch_recipient_toggle',
          'dispatch_send_success',
          'dispatch_send_fail',
          'dispatch_send_retry',
        ]
        const merged = Array.from(new Set([...currentValues, ...newActions]))
        actionField.values = merged
        app.save(auditCol)
      }
    } catch (e) {
      console.warn('Não foi possível atualizar audit_logs action para o agente de envio:', e)
    }

    // 2. Criar coleção document_dispatch_configs (configuração global/operacional do agente de envio)
    let dispatchConfigCol
    try {
      dispatchConfigCol = app.findCollectionByNameOrId('document_dispatch_configs')
    } catch (_) {
      dispatchConfigCol = new Collection({
        name: 'document_dispatch_configs',
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
            name: 'max_retry_attempts',
            type: 'number',
            min: 1,
            max: 10,
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
          { name: 'sent_count_total', type: 'number', onlyInt: true },
          { name: 'failed_count_total', type: 'number', onlyInt: true },
          { name: 'pending_retries_count', type: 'number', onlyInt: true },
          { name: 'connected_accounts_summary', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_dispatch_status ON document_dispatch_configs (status)'],
      })
      app.save(dispatchConfigCol)
    }

    // 3. Criar coleção document_recipients (destinatários por cliente/operação)
    let recipientsCol
    try {
      recipientsCol = app.findCollectionByNameOrId('document_recipients')
    } catch (_) {
      recipientsCol = new Collection({
        name: 'document_recipients',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
        updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'customer_name', type: 'text', required: true },
          { name: 'customer_document', type: 'text' }, // CNPJ / CPF
          { name: 'contact_name', type: 'text' },
          { name: 'email', type: 'email', required: true },
          { name: 'cc_emails', type: 'text' }, // múltiplos e-mails separados por vírgula
          {
            name: 'recipient_role',
            type: 'select',
            values: ['shipper', 'receiver', 'carrier', 'driver', 'broker', 'accountant', 'other'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'allowed_document_types',
            type: 'select',
            values: ['cte', 'mdfe', 'ciot', 'insurance', 'vpo'],
            maxSelect: 5,
            required: true,
          },
          { name: 'is_active', type: 'bool' },
          { name: 'notes', type: 'text' },
          { name: 'sent_count', type: 'number', onlyInt: true },
          { name: 'last_sent_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_recipient_email ON document_recipients (email)',
          'CREATE INDEX idx_recipient_active ON document_recipients (is_active)',
          'CREATE INDEX idx_recipient_doc ON document_recipients (customer_document)',
        ],
      })
      app.save(recipientsCol)
    }

    // 4. Criar coleção document_dispatch_templates (modelos de mensagem configuráveis)
    let templatesCol
    try {
      templatesCol = app.findCollectionByNameOrId('document_dispatch_templates')
    } catch (_) {
      templatesCol = new Collection({
        name: 'document_dispatch_templates',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'name', type: 'text', required: true },
          {
            name: 'document_type',
            type: 'select',
            values: ['cte', 'mdfe', 'ciot', 'insurance', 'vpo', 'bundle'],
            maxSelect: 1,
            required: true,
          },
          { name: 'subject_template', type: 'text', required: true },
          { name: 'body_template', type: 'text', required: true },
          { name: 'is_default', type: 'bool' },
          { name: 'is_active', type: 'bool' },
          { name: 'description', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_tmpl_doc_type ON document_dispatch_templates (document_type)',
          'CREATE INDEX idx_tmpl_active ON document_dispatch_templates (is_active)',
        ],
      })
      app.save(templatesCol)
    }

    // 5. Criar coleção document_dispatch_logs (rastreabilidade completa e anti-duplicidade)
    let dispatchLogsCol
    try {
      dispatchLogsCol = app.findCollectionByNameOrId('document_dispatch_logs')
    } catch (_) {
      dispatchLogsCol = new Collection({
        name: 'document_dispatch_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          // Identificador anti-duplicidade único oficial: `${document_type}_${document_id}_${recipient_email}`
          { name: 'dispatch_key', type: 'text', required: true },
          {
            name: 'document_type',
            type: 'select',
            values: ['cte', 'mdfe', 'ciot', 'insurance', 'vpo', 'bundle'],
            maxSelect: 1,
            required: true,
          },
          { name: 'document_id', type: 'text', required: true },
          { name: 'document_number', type: 'text', required: true },
          { name: 'document_auth_protocol', type: 'text' },
          { name: 'trip_id', type: 'text' },
          { name: 'trip_code', type: 'text' },
          { name: 'recipient_id', type: 'text' },
          { name: 'recipient_name', type: 'text', required: true },
          { name: 'recipient_email', type: 'email', required: true },
          { name: 'recipient_role', type: 'text' },
          { name: 'sender_account', type: 'text' }, // e-mail da caixa do usuário conectada usada no envio
          {
            name: 'provider_used',
            type: 'select',
            values: ['gmail', 'outlook', 'system_email', 'manual'],
            maxSelect: 1,
            required: true,
          },
          { name: 'template_id', type: 'text' },
          { name: 'template_name', type: 'text' },
          { name: 'email_subject', type: 'text', required: true },
          { name: 'email_body_preview', type: 'text' },
          { name: 'attachments_summary', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['sent', 'failed', 'retry_pending', 'cancelled'],
            maxSelect: 1,
            required: true,
          },
          { name: 'sent_at', type: 'date' },
          { name: 'error_reason', type: 'text' },
          { name: 'retry_count', type: 'number', onlyInt: true },
          { name: 'max_retries', type: 'number', onlyInt: true },
          { name: 'next_retry_at', type: 'date' },
          { name: 'notification_sent', type: 'bool' },
          { name: 'dispatched_by', type: 'text' }, // 'Agente Automático' ou nome/e-mail do operador
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_dispatch_key_uniq ON document_dispatch_logs (dispatch_key)',
          'CREATE INDEX idx_dispatch_status_log ON document_dispatch_logs (status)',
          'CREATE INDEX idx_dispatch_doc ON document_dispatch_logs (document_type, document_id)',
          'CREATE INDEX idx_dispatch_recip ON document_dispatch_logs (recipient_email)',
        ],
      })
      app.save(dispatchLogsCol)
    }

    // 6. Seed inicial da configuração do agente de envio
    try {
      const existingConfigs = app.findRecordsByFilter(
        'document_dispatch_configs',
        "name = 'Agente Principal de Envio de Documentos'",
        '',
        1,
        0,
      )
      if (existingConfigs.length === 0) {
        const configRec = new Record(dispatchConfigCol)
        configRec.set('name', 'Agente Principal de Envio de Documentos')
        configRec.set('is_active', true)
        configRec.set('check_interval_minutes', 5)
        configRec.set('max_retry_attempts', 3)
        configRec.set('status', 'active')
        configRec.set('last_run_at', new Date(Date.now() - 3 * 60 * 1000).toISOString())
        configRec.set('next_run_at', new Date(Date.now() + 2 * 60 * 1000).toISOString())
        configRec.set(
          'last_run_status',
          'Sucesso • Monitoramento de documentos autorizados ativo. Pronto para envio.',
        )
        configRec.set('sent_count_total', 6)
        configRec.set('failed_count_total', 1)
        configRec.set('pending_retries_count', 0)
        configRec.set(
          'connected_accounts_summary',
          'Gmail e Outlook conectados via conectores na conta de cada usuário',
        )
        configRec.set(
          'notes',
          'Regra inegociável: Apenas documentos AUTORIZADOS pela SEFAZ ou com protocolo oficial de CIOT/averbação são enviados. Documentos sem confirmação são ignorados.',
        )
        app.save(configRec)
      }
    } catch (e) {
      console.warn('Erro ao criar seed de document_dispatch_configs:', e)
    }

    // 7. Seed de Modelos de Mensagem configuráveis
    const defaultTemplates = [
      {
        name: 'Modelo Padrão - CT-e Autorizado',
        document_type: 'cte',
        is_default: true,
        is_active: true,
        description:
          'Enviado ao tomador e remetente logo após autorização oficial do CT-e na SEFAZ',
        subject_template:
          '{{empresa_emissora}} - CT-e nº {{numero_documento}} Autorizado (Viagem {{viagem}})',
        body_template: `Prezado(a) {{nome_cliente}},

Informamos que o Conhecimento de Transporte Eletrônico (CT-e) nº {{numero_documento}} foi autorizado pela SEFAZ com sucesso sob o protocolo {{protocolo_autorizacao}}.

Resumo da Operação:
- Tipo: Conhecimento de Transporte Rodoviário de Cargas (CT-e)
- Número: {{numero_documento}}
- Emissor: {{empresa_emissora}}
- Data de Emissão: {{data_documento}}
- Chave de Acesso: {{chave_documento}}
- Vale Pedágio Obrigatório (VPO): Destacado em conformidade com a Lei 10.209/01

Os arquivos fiscais digitais (DACTE em PDF e XML autorizado) encontram-se disponíveis no sistema ED Integração.

Atenciosamente,
Equipe Operacional • {{empresa_emissora}}`,
      },
      {
        name: 'Modelo Padrão - MDF-e Autorizado',
        document_type: 'mdfe',
        is_default: true,
        is_active: true,
        description:
          'Enviado ao motorista, transportador e fiscalização com o manifesto eletrônico consolidado',
        subject_template:
          '{{empresa_emissora}} - MDF-e nº {{numero_documento}} Autorizado para a Rota',
        body_template: `Prezado(a) {{nome_cliente}},

O Manifesto Eletrônico de Documentos Fiscais (MDF-e) nº {{numero_documento}} foi devidamente autorizado pela SEFAZ sob o protocolo {{protocolo_autorizacao}}.

Dados do Manifesto:
- MDF-e Nº: {{numero_documento}}
- Emissor: {{empresa_emissora}}
- Percurso / Rota: Viagem {{viagem}}
- Data de Liberação: {{data_documento}}

O DAMDFE e o XML autorizado estão anexados e prontos para acompanhamento da carga em rodovia.

Atenciosamente,
Setor de Expedição e Frota • {{empresa_emissora}}`,
      },
      {
        name: 'Modelo Padrão - Comprovante CIOT e Averbação de Seguro',
        document_type: 'bundle',
        is_default: true,
        is_active: true,
        description: 'Comprovantes de CIOT ANTT e Averbação RCTR-C enviados para compliance',
        subject_template:
          '{{empresa_emissora}} - Comprovantes de Compliance Fiscal (CIOT & Seguro) - Viagem {{viagem}}',
        body_template: `Prezado(a) {{nome_cliente}},

Encaminhamos os comprovantes de regularização da operação de transporte referente à Viagem {{viagem}}:

- Documento / Referência: {{numero_documento}}
- Protocolo Oficial: {{protocolo_autorizacao}}
- Emissor / Contratante: {{empresa_emissora}}
- Data: {{data_documento}}

Em cumprimento às resoluções da ANTT e Lei 14.599/2023 (Seguros RCTR-C).

Atenciosamente,
Departamento Jurídico e Fiscal • {{empresa_emissora}}`,
      },
    ]

    for (const tmpl of defaultTemplates) {
      try {
        const found = app.findRecordsByFilter(
          'document_dispatch_templates',
          `name = '${tmpl.name.replace(/'/g, "\\'")}'`,
          '',
          1,
          0,
        )
        if (found.length === 0) {
          const rec = new Record(templatesCol)
          rec.set('name', tmpl.name)
          rec.set('document_type', tmpl.document_type)
          rec.set('is_default', tmpl.is_default)
          rec.set('is_active', tmpl.is_active)
          rec.set('description', tmpl.description)
          rec.set('subject_template', tmpl.subject_template)
          rec.set('body_template', tmpl.body_template)
          app.save(rec)
        }
      } catch (e) {
        console.warn('Erro ao salvar template padrão:', e)
      }
    }

    // 8. Seed de Destinatários de Documentos (clientes reais reaproveitados da base de entregas)
    const defaultRecipients = [
      {
        customer_name: 'Supermercado Nova Esperança Ltda',
        customer_document: '14.281.940/0001-52',
        contact_name: 'Roberto Alves - Gerente de Recebimento',
        email: 'recebimento@novaesperanca.com.br',
        cc_emails: 'fiscal@novaesperanca.com.br, compras@novaesperanca.com.br',
        recipient_role: 'receiver',
        allowed_document_types: ['cte', 'mdfe', 'vpo'],
        is_active: true,
        sent_count: 3,
        last_sent_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        notes:
          'Cliente de São Paulo / Bela Vista. Exige CT-e com DACTE e XML assim que autorizado.',
      },
      {
        customer_name: 'Distribuidora de Alimentos Pinheiros',
        customer_document: '28.391.029/0001-44',
        contact_name: 'Carlos Portaria / Expedição',
        email: 'expedicao@alimentos-pinheiros.com.br',
        cc_emails: 'contabilidade@alimentos-pinheiros.com.br',
        recipient_role: 'shipper',
        allowed_document_types: ['cte', 'mdfe', 'ciot', 'insurance'],
        is_active: true,
        sent_count: 2,
        last_sent_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        notes: 'Embarcador principal da Rota SP-01. Exige dossiê de seguro e CIOT.',
      },
      {
        customer_name: 'Hospital e Maternidade Santa Clara',
        customer_document: '47.192.384/0001-18',
        contact_name: 'Dra. Márcia - Farmácia Central',
        email: 'suprimentos@hospitalsantaclara.med.br',
        cc_emails: 'farmacia@hospitalsantaclara.med.br',
        recipient_role: 'receiver',
        allowed_document_types: ['cte', 'vpo'],
        is_active: true,
        sent_count: 1,
        last_sent_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        notes: 'Cargas hospitalares refrigeradas.',
      },
      {
        customer_name: 'Metalúrgica Sul S/A',
        customer_document: '12.345.678/0001-90',
        contact_name: 'Faturamento & Logística',
        email: 'faturamento@metalurgicasul.com.br',
        cc_emails: 'logistica@metalurgicasul.com.br',
        recipient_role: 'shipper',
        allowed_document_types: ['cte', 'mdfe', 'ciot', 'insurance', 'vpo'],
        is_active: true,
        sent_count: 0,
        notes: 'Remetente de bobinas de aço via integração de e-mails.',
      },
    ]

    for (const recip of defaultRecipients) {
      try {
        const found = app.findRecordsByFilter(
          'document_recipients',
          `email = '${recip.email}'`,
          '',
          1,
          0,
        )
        if (found.length === 0) {
          const rec = new Record(recipientsCol)
          rec.set('customer_name', recip.customer_name)
          rec.set('customer_document', recip.customer_document)
          rec.set('contact_name', recip.contact_name)
          rec.set('email', recip.email)
          rec.set('cc_emails', recip.cc_emails)
          rec.set('recipient_role', recip.recipient_role)
          rec.set('allowed_document_types', recip.allowed_document_types)
          rec.set('is_active', recip.is_active)
          rec.set('sent_count', recip.sent_count)
          if (recip.last_sent_at) rec.set('last_sent_at', recip.last_sent_at)
          rec.set('notes', recip.notes)
          app.save(rec)
        }
      } catch (e) {
        console.warn('Erro ao salvar destinatário padrão:', e)
      }
    }

    // 9. Seed de Logs Iniciais de Envio (demonstração fiel na Central de Agentes)
    const sampleDispatchLogs = [
      {
        dispatch_key: 'cte_cte_seed_101_recebimento@novaesperanca.com.br',
        document_type: 'cte',
        document_id: 'cte_seed_101',
        document_number: '001048',
        document_auth_protocol: '135260004819284',
        trip_code: 'TRP-2026-001',
        recipient_name: 'Supermercado Nova Esperança Ltda',
        recipient_email: 'recebimento@novaesperanca.com.br',
        recipient_role: 'receiver',
        sender_account: 'alineelaana@gmail.com',
        provider_used: 'gmail',
        template_name: 'Modelo Padrão - CT-e Autorizado',
        email_subject: 'TransConnect Transportes - CT-e nº 001048 Autorizado (Viagem TRP-2026-001)',
        email_body_preview:
          'Prezado(a) Supermercado Nova Esperança Ltda, informamos que o CT-e nº 001048 foi autorizado pela SEFAZ com sucesso...',
        attachments_summary: '2 arquivos: DACTE_001048.pdf (118 KB), CTE_352610001048.xml (22 KB)',
        status: 'sent',
        sent_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        retry_count: 0,
        max_retries: 3,
        notification_sent: false,
        dispatched_by: 'Agente Automático',
      },
      {
        dispatch_key: 'mdfe_mdfe_seed_001_expedicao@alimentos-pinheiros.com.br',
        document_type: 'mdfe',
        document_id: 'mdfe_seed_001',
        document_number: '000128',
        document_auth_protocol: '135260098492011',
        trip_code: 'TRP-2026-001',
        recipient_name: 'Distribuidora de Alimentos Pinheiros',
        recipient_email: 'expedicao@alimentos-pinheiros.com.br',
        recipient_role: 'shipper',
        sender_account: 'alineelaana@gmail.com',
        provider_used: 'gmail',
        template_name: 'Modelo Padrão - MDF-e Autorizado',
        email_subject: 'TransConnect Transportes - MDF-e nº 000128 Autorizado para a Rota',
        email_body_preview:
          'Prezado(a) Distribuidora de Alimentos Pinheiros, o MDF-e nº 000128 foi devidamente autorizado pela SEFAZ sob o protocolo...',
        attachments_summary: '2 arquivos: DAMDFE_000128.pdf (94 KB), MDFE_352610000128.xml (18 KB)',
        status: 'sent',
        sent_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        retry_count: 0,
        max_retries: 3,
        notification_sent: false,
        dispatched_by: 'Agente Automático',
      },
      {
        dispatch_key: 'cte_cte_seed_103_contato@cliente-ausente.com.br',
        document_type: 'cte',
        document_id: 'cte_seed_103',
        document_number: '001050',
        document_auth_protocol: '135260004819286',
        trip_code: 'TRP-2026-002',
        recipient_name: 'Comércio Varejista do Vale',
        recipient_email: 'contato@cliente-ausente.com.br',
        recipient_role: 'receiver',
        sender_account: 'alineelaana@gmail.com',
        provider_used: 'gmail',
        template_name: 'Modelo Padrão - CT-e Autorizado',
        email_subject: 'TransConnect Transportes - CT-e nº 001050 Autorizado',
        email_body_preview:
          'Falha na entrega de mensagem para a caixa de destino: endereço de e-mail rejeitado pelo servidor SMTP externo.',
        attachments_summary: 'DACTE e XML preparados',
        status: 'failed',
        error_reason:
          '550 5.1.1 User unknown: caixa postal destino não existe ou rejeitou a conexão SMTP',
        retry_count: 3,
        max_retries: 3,
        notification_sent: true,
        dispatched_by: 'Agente Automático',
      },
    ]

    for (const logItem of sampleDispatchLogs) {
      try {
        const found = app.findRecordsByFilter(
          'document_dispatch_logs',
          `dispatch_key = '${logItem.dispatch_key}'`,
          '',
          1,
          0,
        )
        if (found.length === 0) {
          const rec = new Record(dispatchLogsCol)
          rec.set('dispatch_key', logItem.dispatch_key)
          rec.set('document_type', logItem.document_type)
          rec.set('document_id', logItem.document_id)
          rec.set('document_number', logItem.document_number)
          rec.set('document_auth_protocol', logItem.document_auth_protocol)
          rec.set('trip_code', logItem.trip_code)
          rec.set('recipient_name', logItem.recipient_name)
          rec.set('recipient_email', logItem.recipient_email)
          rec.set('recipient_role', logItem.recipient_role)
          rec.set('sender_account', logItem.sender_account)
          rec.set('provider_used', logItem.provider_used)
          rec.set('template_name', logItem.template_name)
          rec.set('email_subject', logItem.email_subject)
          rec.set('email_body_preview', logItem.email_body_preview)
          rec.set('attachments_summary', logItem.attachments_summary)
          rec.set('status', logItem.status)
          if (logItem.sent_at) rec.set('sent_at', logItem.sent_at)
          if (logItem.error_reason) rec.set('error_reason', logItem.error_reason)
          rec.set('retry_count', logItem.retry_count)
          rec.set('max_retries', logItem.max_retries)
          rec.set('notification_sent', logItem.notification_sent)
          rec.set('dispatched_by', logItem.dispatched_by)
          app.save(rec)
        }
      } catch (e) {
        console.warn('Erro ao salvar log de envio seed:', e)
      }
    }
  },
  (app) => {
    // Revert
    try {
      const logs = app.findCollectionByNameOrId('document_dispatch_logs')
      if (logs) app.delete(logs)
      const tmpl = app.findCollectionByNameOrId('document_dispatch_templates')
      if (tmpl) app.delete(tmpl)
      const recip = app.findCollectionByNameOrId('document_recipients')
      if (recip) app.delete(recip)
      const cfg = app.findCollectionByNameOrId('document_dispatch_configs')
      if (cfg) app.delete(cfg)
    } catch (_) {}
  },
)
