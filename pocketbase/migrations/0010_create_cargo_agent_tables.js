migrate(
  (app) => {
    // 1. Atualizar audit_logs para aceitar novas ações do agente de cargas
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      const actionField = auditCol.fields.getByName('action')
      if (actionField) {
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
          'cargo_agent_run',
          'cargo_agent_config',
          'cargo_link_confirm',
          'cargo_link_reject',
          'cargo_link_manual',
        ]
        app.save(auditCol)
      }
    } catch (e) {
      console.warn('Não foi possível atualizar audit_logs action para cargo agent:', e)
    }

    // 2. Coleção de configuração e critérios do Agente de Identificação de Cargas
    let cargoConfigCol
    try {
      cargoConfigCol = app.findCollectionByNameOrId('cargo_agent_configs')
    } catch (_) {
      cargoConfigCol = new Collection({
        name: 'cargo_agent_configs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'manager'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'is_active', type: 'bool' },
          {
            name: 'min_matching_signals',
            type: 'number',
            min: 1,
            max: 6,
            onlyInt: true,
            required: true,
          },
          { name: 'match_plate', type: 'bool' },
          { name: 'match_client_document', type: 'bool' },
          { name: 'match_dates_window_days', type: 'number', min: 1, max: 60, onlyInt: true },
          { name: 'match_driver', type: 'bool' },
          { name: 'match_cargo_weight', type: 'bool' },
          { name: 'check_fiscal_duplicates', type: 'bool' },
          { name: 'auto_link_when_confident', type: 'bool' },
          { name: 'last_run_at', type: 'date' },
          { name: 'last_run_summary', type: 'text' },
          { name: 'total_processed_count', type: 'number', onlyInt: true },
          { name: 'auto_linked_count', type: 'number', onlyInt: true },
          { name: 'pending_review_count', type: 'number', onlyInt: true },
          { name: 'duplicates_blocked_count', type: 'number', onlyInt: true },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(cargoConfigCol)
    }

    // 3. Coleção de Documentos XML Fiscais Recebidos e Extraídos (NF-e)
    let fiscalDocsCol
    try {
      fiscalDocsCol = app.findCollectionByNameOrId('received_fiscal_documents')
    } catch (_) {
      fiscalDocsCol = new Collection({
        name: 'received_fiscal_documents',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'access_key', type: 'text', required: true },
          { name: 'nfe_number', type: 'text', required: true },
          { name: 'series', type: 'text' },
          { name: 'issuer_name', type: 'text', required: true },
          { name: 'issuer_cnpj', type: 'text', required: true },
          { name: 'recipient_name', type: 'text', required: true },
          { name: 'recipient_cnpj', type: 'text', required: true },
          { name: 'issue_date', type: 'date' },
          { name: 'total_value', type: 'number' },
          { name: 'weight_kg', type: 'number' },
          { name: 'items_summary', type: 'text' },
          { name: 'detected_plate', type: 'text' },
          { name: 'detected_driver_name', type: 'text' },
          { name: 'detected_driver_cpf', type: 'text' },
          { name: 'detected_carrier_name', type: 'text' },
          { name: 'detected_carrier_cnpj', type: 'text' },
          { name: 'raw_xml_snippet', type: 'text' },
          { name: 'source_email_id', type: 'text' },
          { name: 'source_email_subject', type: 'text' },
          { name: 'source_email_sender', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: [
              'pending_match',
              'linked',
              'ambiguous',
              'divergent',
              'duplicate_rejected',
              'manual_review',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_received_fiscal_key ON received_fiscal_documents (access_key)',
          'CREATE INDEX idx_received_fiscal_nfe ON received_fiscal_documents (nfe_number)',
          'CREATE INDEX idx_received_fiscal_status ON received_fiscal_documents (status)',
          'CREATE INDEX idx_received_fiscal_issuer ON received_fiscal_documents (issuer_cnpj)',
        ],
      })
      app.save(fiscalDocsCol)
    }

    // 4. Coleção de Identificações, Vínculos e Pendências Carga ↔ Viagem
    const tripsColId = app.findCollectionByNameOrId('trips').id
    const fiscalColId = app.findCollectionByNameOrId('received_fiscal_documents').id

    let cargoIdentificationsCol
    try {
      cargoIdentificationsCol = app.findCollectionByNameOrId('cargo_identifications')
    } catch (_) {
      cargoIdentificationsCol = new Collection({
        name: 'cargo_identifications',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: 'fiscal_document_id',
            type: 'relation',
            collectionId: fiscalColId,
            maxSelect: 1,
            required: true,
          },
          { name: 'trip_id', type: 'relation', collectionId: tripsColId, maxSelect: 1 },
          { name: 'trip_code', type: 'text' },
          {
            name: 'match_status',
            type: 'select',
            values: [
              'auto_matched',
              'pending_human_review',
              'manually_confirmed',
              'manually_rejected',
              'duplicate_detected',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'confidence_score', type: 'number', min: 0, max: 100 },
          { name: 'matching_signals', type: 'json' }, // array com nomes dos sinais validados
          { name: 'divergence_reasons', type: 'text' },
          { name: 'possible_trip_ids', type: 'text' }, // códigos das viagens candidatas em caso de ambiguidade
          { name: 'reviewed_by', type: 'text' },
          { name: 'reviewed_at', type: 'date' },
          { name: 'review_notes', type: 'text' },
          { name: 'missing_fields_for_cte', type: 'text' }, // avisos do que falta para emitir CT-e
          { name: 'cte_ready', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cargo_ident_status ON cargo_identifications (match_status)',
          'CREATE INDEX idx_cargo_ident_trip ON cargo_identifications (trip_id)',
          'CREATE INDEX idx_cargo_ident_doc ON cargo_identifications (fiscal_document_id)',
        ],
      })
      app.save(cargoIdentificationsCol)
    }

    // 5. Seed inicial de configuração e dados demonstrativos para a Central viva
    try {
      const existingConfigs = app.findRecordsByFilter(
        'cargo_agent_configs',
        "name = 'Agente de Identificação de Cargas'",
        '',
        1,
        0,
      )
      if (existingConfigs.length === 0) {
        const cfgRec = new Record(cargoConfigCol)
        cfgRec.set('name', 'Agente de Identificação de Cargas')
        cfgRec.set('is_active', true)
        cfgRec.set('min_matching_signals', 2) // Mínimo de 2 sinais coincidentes para auto-vínculo
        cfgRec.set('match_plate', true)
        cfgRec.set('match_client_document', true)
        cfgRec.set('match_dates_window_days', 7) // Janela de até 7 dias
        cfgRec.set('match_driver', true)
        cfgRec.set('match_cargo_weight', true)
        cfgRec.set('check_fiscal_duplicates', true) // Prevenção de duplicidade fiscal
        cfgRec.set('auto_link_when_confident', true)
        cfgRec.set('last_run_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        cfgRec.set(
          'last_run_summary',
          'Última triagem executada com sucesso • 3 documentos analisados (1 vinculado automaticamente, 1 pendência para revisão, 1 duplicidade prevenida).',
        )
        cfgRec.set('total_processed_count', 3)
        cfgRec.set('auto_linked_count', 1)
        cfgRec.set('pending_review_count', 1)
        cfgRec.set('duplicates_blocked_count', 1)
        cfgRec.set(
          'notes',
          'Regra crítica: nunca auto-vincular em caso de divergência ou ambiguidade. Cruzamento obrigatório multi-sinal (placa, cliente, datas, motorista, peso).',
        )
        app.save(cfgRec)
      }
    } catch (e) {
      console.warn('Erro ao criar seed de cargo_agent_configs:', e)
    }

    // Seed de viagens existentes para vincular (pega as viagens já cadastradas)
    let trips = []
    try {
      trips = app.findRecordsByFilter('trips', '', '-created', 10, 0)
    } catch (_) {}

    const trip1 = trips[0] || null
    const trip2 = trips[1] || null
    const trip3 = trips[2] || null

    // Documentos Fiscais de Amostra
    const sampleDocs = [
      {
        access_key: '35260112345678000190550010004589201098765432',
        nfe_number: '458920',
        series: '1',
        issuer_name: 'Metalúrgica Sul S/A',
        issuer_cnpj: '12.345.678/0001-90',
        recipient_name: 'Montadora de Veículos Mineira Ltda',
        recipient_cnpj: '56.789.012/0001-44',
        issue_date: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        total_value: 185000,
        weight_kg: 22000,
        items_summary: 'Bobinas de Aço Laminado / Peças Automotivas - 10 volumes',
        detected_plate: 'BRA2E19',
        detected_driver_name: 'Carlos Eduardo Silveira',
        detected_driver_cpf: '123.456.789-01',
        detected_carrier_name: 'TransConnect Transportes',
        detected_carrier_cnpj: '12.345.678/0001-90',
        raw_xml_snippet:
          '<infNFe Id="NFe35260112345678000190550010004589201098765432"><ide><nNF>458920</nNF><dhEmi>2026-10-28T14:00:00-03:00</dhEmi></ide><transp><veicTransp><placa>BRA2E19</placa><UF>SP</UF></veicTransp></transp></infNFe>',
        source_email_id: 'msg_seed_gmail_001_nfe',
        source_email_subject: 'Envio de XML e DANFE NF-e 458920 - Carga Bobinas de Aço',
        source_email_sender: 'faturamento@metalurgicasul.com.br',
        status: 'linked',
        match_status: 'auto_matched',
        confidence_score: 95,
        matching_signals: [
          'placa_coincidente (BRA2E19)',
          'motorista_coincidente (Carlos Eduardo)',
          'peso_compativel (22.0t)',
          'rota_compativel (SP ➔ MG)',
        ],
        trip: trip1,
        divergence_reasons: '',
        possible_trip_ids: '',
        missing_fields_for_cte:
          'Nenhuma pendência técnica. Todos os dados fiscais e de carga estão presentes para emissão do CT-e.',
        cte_ready: true,
      },
      {
        access_key: '35260199887766000155550010008892011019283746',
        nfe_number: '889201',
        series: '2',
        issuer_name: 'Agroquímica Paulista Indústria e Comércio',
        issuer_cnpj: '67.890.123/0001-55',
        recipient_name: 'Cooperativa Agrícola Regional',
        recipient_cnpj: '78.901.234/0001-66',
        issue_date: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
        total_value: 94000,
        weight_kg: 26500,
        items_summary: 'Fertilizantes e Defensivos Agrícolas Paletizados',
        detected_plate: '', // Sem placa no XML
        detected_driver_name: '', // Sem motorista informado no XML
        detected_driver_cpf: '',
        detected_carrier_name: 'TransConnect Transportes',
        detected_carrier_cnpj: '12.345.678/0001-90',
        raw_xml_snippet:
          '<infNFe Id="NFe35260199887766000155550010008892011019283746"><ide><nNF>889201</nNF></ide><emit><xNome>Agroquímica Paulista</xNome></emit></infNFe>',
        source_email_id: 'msg_seed_outlook_002_cte_req',
        source_email_subject: 'Solicitação de emissão CT-e para transporte Safra 2026',
        source_email_sender: 'logistica@agroindustriacentro.com.br',
        status: 'ambiguous',
        match_status: 'pending_human_review',
        confidence_score: 45,
        matching_signals: ['cliente_compativel (Agroquímica)', 'peso_compativel (26.5t)'],
        trip: null,
        divergence_reasons:
          'Divergência / Ambiguidade: XML não contém placa nem condutor. Foram encontradas 2 viagens possíveis com peso e rota compatíveis (VIAG-2025-001 e VIAG-2025-003). Auto-vínculo bloqueado conforme regra de segurança.',
        possible_trip_ids: 'VIAG-2025-001, VIAG-2025-003',
        missing_fields_for_cte:
          'Requer confirmação manual do responsável pela viagem correta e indicação do veículo transportador.',
        cte_ready: false,
      },
      {
        access_key: '35250212345678000190570010000010401092837482', // Chave que já possui CT-e emitido
        nfe_number: '104050',
        series: '1',
        issuer_name: 'Distribuidora Central Paulista S/A',
        issuer_cnpj: '23.456.789/0001-11',
        recipient_name: 'Supermercados Sul do Brasil Ltda',
        recipient_cnpj: '34.567.890/0001-22',
        issue_date: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
        total_value: 285000,
        weight_kg: 34000,
        items_summary: 'Alimentos Industrializados em Fardos',
        detected_plate: 'RLK8F40',
        detected_driver_name: 'Marcos Roberto Fernandes',
        detected_driver_cpf: '234.567.890-12',
        detected_carrier_name: 'TransConnect Transportes',
        detected_carrier_cnpj: '12.345.678/0001-90',
        raw_xml_snippet:
          '<infNFe Id="NFe35250212345678000190570010000010401092837482"><ide><nNF>104050</nNF></ide></infNFe>',
        source_email_id: 'msg_seed_duplicate_sample',
        source_email_subject: 'Reenvio NF-e 104050 para emissão de frete',
        source_email_sender: 'faturamento@distribuidoracentral.com.br',
        status: 'duplicate_rejected',
        match_status: 'duplicate_detected',
        confidence_score: 10,
        matching_signals: ['chave_fiscal_ja_emitida'],
        trip: trip2,
        divergence_reasons:
          'Alerta de Duplicidade Fiscal: Já existe CT-e autorizado nº 1040 vinculado à viagem VIAG-2025-002 para esta chave fiscal. Operação impedida para evitar bitributação ou emissão em duplicidade.',
        possible_trip_ids: 'VIAG-2025-002',
        missing_fields_for_cte:
          'Documento já possui CT-e autorizado correspondente. Nova emissão desnecessária.',
        cte_ready: false,
      },
    ]

    for (const item of sampleDocs) {
      try {
        const found = app.findRecordsByFilter(
          'received_fiscal_documents',
          `access_key = '${item.access_key}'`,
          '',
          1,
          0,
        )
        let docId = ''
        if (found.length === 0) {
          const docRec = new Record(fiscalDocsCol)
          docRec.set('access_key', item.access_key)
          docRec.set('nfe_number', item.nfe_number)
          docRec.set('series', item.series)
          docRec.set('issuer_name', item.issuer_name)
          docRec.set('issuer_cnpj', item.issuer_cnpj)
          docRec.set('recipient_name', item.recipient_name)
          docRec.set('recipient_cnpj', item.recipient_cnpj)
          docRec.set('issue_date', item.issue_date)
          docRec.set('total_value', item.total_value)
          docRec.set('weight_kg', item.weight_kg)
          docRec.set('items_summary', item.items_summary)
          docRec.set('detected_plate', item.detected_plate)
          docRec.set('detected_driver_name', item.detected_driver_name)
          docRec.set('detected_driver_cpf', item.detected_driver_cpf)
          docRec.set('detected_carrier_name', item.detected_carrier_name)
          docRec.set('detected_carrier_cnpj', item.detected_carrier_cnpj)
          docRec.set('raw_xml_snippet', item.raw_xml_snippet)
          docRec.set('source_email_id', item.source_email_id)
          docRec.set('source_email_subject', item.source_email_subject)
          docRec.set('source_email_sender', item.source_email_sender)
          docRec.set('status', item.status)
          app.save(docRec)
          docId = docRec.id
        } else {
          docId = found[0].id
        }

        // Criar registro de identificação correspondente
        const identFound = app.findRecordsByFilter(
          'cargo_identifications',
          `fiscal_document_id = '${docId}'`,
          '',
          1,
          0,
        )
        if (identFound.length === 0) {
          const identRec = new Record(cargoIdentificationsCol)
          identRec.set('fiscal_document_id', docId)
          if (item.trip) {
            identRec.set('trip_id', item.trip.id)
            identRec.set('trip_code', item.trip.getString('trip_code'))
          }
          identRec.set('match_status', item.match_status)
          identRec.set('confidence_score', item.confidence_score)
          identRec.set('matching_signals', JSON.stringify(item.matching_signals))
          identRec.set('divergence_reasons', item.divergence_reasons)
          identRec.set('possible_trip_ids', item.possible_trip_ids)
          identRec.set('missing_fields_for_cte', item.missing_fields_for_cte)
          identRec.set('cte_ready', item.cte_ready)
          if (item.match_status === 'auto_matched') {
            identRec.set('reviewed_by', 'Agente Autônomo de Cargas')
            identRec.set('reviewed_at', new Date().toISOString())
            identRec.set(
              'review_notes',
              'Auto-vínculo executado com 4 sinais coincidentes (placa, condutor, peso e rota).',
            )
          }
          app.save(identRec)
        }
      } catch (e) {
        console.warn('Erro ao salvar documento fiscal e identificação de amostra:', e)
      }
    }
  },
  (app) => {
    try {
      const idents = app.findCollectionByNameOrId('cargo_identifications')
      if (idents) app.delete(idents)
    } catch (_) {}
    try {
      const docs = app.findCollectionByNameOrId('received_fiscal_documents')
      if (docs) app.delete(docs)
    } catch (_) {}
    try {
      const cfg = app.findCollectionByNameOrId('cargo_agent_configs')
      if (cfg) app.delete(cfg)
    } catch (_) {}
  },
)
