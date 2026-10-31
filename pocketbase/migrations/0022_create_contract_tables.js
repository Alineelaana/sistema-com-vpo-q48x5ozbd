migrate(
  (app) => {
    const tripsCol = app.findCollectionByNameOrId('trips')

    // 1. Criar coleção contract_templates (Modelos Contratuais Configuráveis)
    const contractTemplates = new Collection({
      name: 'contract_templates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'title', type: 'text', required: true },
        {
          name: 'carrier_profile',
          type: 'select',
          required: true,
          values: ['tac_independente', 'tac_equiparado', 'etc', 'ctc', 'geral'],
          maxSelect: 1,
        },
        {
          name: 'transport_mode',
          type: 'select',
          required: false,
          values: ['lotacao', 'fracionada', 'dedicado', 'subcontratacao', 'todos'],
          maxSelect: 1,
        },
        { name: 'is_active', type: 'bool' },
        { name: 'is_default', type: 'bool' },
        { name: 'version', type: 'number' },
        { name: 'preamble_template', type: 'text' },
        { name: 'clauses', type: 'json' },
        { name: 'responsibilities_text', type: 'text' },
        { name: 'penalty_terms_text', type: 'text' },
        { name: 'jurisdiction_city', type: 'text' },
        { name: 'jurisdiction_state', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ctmpl_profile ON contract_templates (carrier_profile)',
        'CREATE INDEX idx_ctmpl_active ON contract_templates (is_active)',
      ],
    })
    app.save(contractTemplates)

    // 2. Criar coleção transport_contracts (CTRB / Contrato de Transporte Rodoviário de Bens)
    const transportContracts = new Collection({
      name: 'transport_contracts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'trip_id',
          type: 'relation',
          collectionId: tripsCol.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: false,
        },
        {
          name: 'template_id',
          type: 'relation',
          collectionId: contractTemplates.id,
          maxSelect: 1,
          required: false,
        },
        { name: 'contract_number', type: 'text', required: true },
        { name: 'operation_number', type: 'text' },
        { name: 'trip_code', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['emitido', 'assinado', 'aguardando_assinatura', 'cancelado'],
          maxSelect: 1,
        },
        // Dados do contratante (Empresa emitente / Embarcador)
        { name: 'contractor_name', type: 'text' },
        { name: 'contractor_document', type: 'text' },
        { name: 'contractor_rntrc', type: 'text' },
        { name: 'contractor_address', type: 'text' },
        // Dados do contratado (Transportador / TAC)
        { name: 'contracted_carrier_name', type: 'text' },
        { name: 'contracted_carrier_document', type: 'text' },
        { name: 'contracted_carrier_rntrc', type: 'text' },
        {
          name: 'carrier_profile',
          type: 'select',
          values: ['tac_independente', 'tac_equiparado', 'etc', 'ctc', 'frota_propria'],
          maxSelect: 1,
        },
        { name: 'carrier_address', type: 'text' },
        { name: 'carrier_phone', type: 'text' },
        // Dados bancários do contratado (para liquidação do frete/adiantamento)
        { name: 'bank_name', type: 'text' },
        { name: 'bank_agency', type: 'text' },
        { name: 'bank_account', type: 'text' },
        { name: 'bank_pix_key', type: 'text' },
        { name: 'bank_beneficiary_name', type: 'text' },
        { name: 'bank_beneficiary_doc', type: 'text' },
        // Motorista
        { name: 'driver_name', type: 'text' },
        { name: 'driver_cpf', type: 'text' },
        { name: 'driver_cnh', type: 'text' },
        { name: 'driver_phone', type: 'text' },
        // Veículo e Carga
        { name: 'vehicle_plate', type: 'text' },
        { name: 'trailer_plate', type: 'text' },
        { name: 'trailer_plate_2', type: 'text' },
        { name: 'vehicle_model', type: 'text' },
        { name: 'axles_count', type: 'number' },
        { name: 'cargo_type', type: 'text' },
        { name: 'cargo_weight_kg', type: 'number' },
        { name: 'cargo_value', type: 'number' },
        { name: 'nfe_number', type: 'text' },
        { name: 'nfe_key', type: 'text' },
        // Rota
        { name: 'origin_city', type: 'text' },
        { name: 'origin_state', type: 'text' },
        { name: 'destination_city', type: 'text' },
        { name: 'destination_state', type: 'text' },
        { name: 'distance_km', type: 'number' },
        { name: 'route_highways', type: 'text' },
        { name: 'pickup_address', type: 'text' },
        { name: 'delivery_address', type: 'text' },
        // Frete e Piso Mínimo
        { name: 'freight_value', type: 'number' },
        { name: 'minimum_floor_value', type: 'number' },
        { name: 'minimum_floor_table_version', type: 'text' },
        { name: 'minimum_floor_status', type: 'text' },
        { name: 'payment_terms', type: 'text' },
        { name: 'advance_payment_value', type: 'number' },
        { name: 'balance_payment_value', type: 'number' },
        { name: 'vpo_value', type: 'number' },
        { name: 'vpo_voucher_number', type: 'text' },
        { name: 'vpo_responsible', type: 'text' },
        // Seguro
        { name: 'insurance_policy_number', type: 'text' },
        { name: 'insurance_averbacao_protocol', type: 'text' },
        // Cláusulas e Snapshot completo do documento emitido
        { name: 'clauses_snapshot', type: 'json' },
        { name: 'responsibilities_text', type: 'text' },
        { name: 'penalty_terms_text', type: 'text' },
        { name: 'jurisdiction', type: 'text' },
        // Status de Assinatura Eletrônica (integração real ou aguardando)
        {
          name: 'signature_status',
          type: 'select',
          values: ['aguardando_configuracao', 'pendente_assinatura', 'assinado', 'dispensado'],
          maxSelect: 1,
        },
        { name: 'signature_provider', type: 'text' },
        { name: 'signature_document_id', type: 'text' },
        { name: 'signature_url', type: 'text' },
        { name: 'signed_at', type: 'date' },
        { name: 'signed_by_carrier_at', type: 'date' },
        { name: 'signed_by_contractor_at', type: 'date' },
        // Auditoria e Metadados
        { name: 'generated_by', type: 'text' },
        { name: 'generated_at', type: 'date' },
        { name: 'version', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_contracts_trip ON transport_contracts (trip_id)',
        'CREATE UNIQUE INDEX idx_contracts_num ON transport_contracts (contract_number)',
        'CREATE INDEX idx_contracts_status ON transport_contracts (status)',
      ],
    })
    app.save(transportContracts)

    // 3. Adicionar novas ações de auditoria para Contratos em audit_logs
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
        'cargo_link_confirm',
        'cargo_link_reject',
        'regularization_orchestrate',
        'cte_transmit',
        'mdfe_transmit',
        'mdfe_close',
        'mdfe_cancel',
        'ciot_create',
        'ciot_update',
        'insurance_endorsement_create',
        'insurance_endorsement_update',
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
        'operation_orchestrate',
        'operation_stage_process',
        'operation_release',
        'operation_reprocess',
        'operation_create_from_nfe',
        'route_create',
        'route_update',
        'route_approve',
        'route_calculate_tolls',
        'floor_calculate',
        'floor_regularize',
        'floor_table_import',
        'floor_table_set_current',
        'contract_generate',
        'contract_update',
        'contract_template_create',
        'contract_template_update',
        'contract_signature_request',
      ]
      app.save(auditCol)
    }

    // 4. Seed de Modelos Contratuais Padrão (TAC-Independente, TAC-Equiparado e ETC)
    const templatesCol = app.findCollectionByNameOrId('contract_templates')

    const defaultClausesTac = [
      {
        number: 1,
        title: 'DO OBJETO',
        text: 'O presente Contrato tem por objeto a prestação de serviços de transporte rodoviário de cargas pelo CONTRATADO em favor da CONTRATANTE, em conformidade com as condições, itinerário e especificações operacionais consignadas no preâmbulo e na Ordem de Transporte vinculada.',
      },
      {
        number: 2,
        title: 'DA REMUNERAÇÃO, PISO MÍNIMO E FORMA DE PAGAMENTO',
        text: 'O frete ajustado observa rigorosamente a legislação vigente e a Política Nacional de Pisos Mínimos do Transporte Rodoviário de Cargas (Lei Federal nº 13.703/2018 e Resoluções ANTT nº 5.867/2020 e 6.059/2024). O pagamento será liquidado nas modalidades de adiantamento e saldo na entrega mediante depósito na conta bancária/chave PIX de titularidade exclusiva do CONTRATADO informada neste instrumento.',
      },
      {
        number: 3,
        title: 'DO VALE-PEDÁGIO OBRIGATÓRIO (LEI Nº 10.209/2001)',
        text: 'O Vale-Pedágio Obrigatório é fornecido pela CONTRATANTE de forma antecipada e independente do frete, através de modelo homologado pela ANTT (cartão ou TAG eletrônica), sendo terminantemente vedado o pagamento em moeda corrente ou a sua inclusão na composição do valor do frete.',
      },
      {
        number: 4,
        title: 'DAS RESPONSABILIDADES DO TRANSPORTADOR (TAC / CONTRATADO)',
        text: 'O CONTRATADO responsabiliza-se pela condução prudente do veículo, integridade da carga confiada a partir da expedição até a entrega definitiva, cumprimento dos prazos e rotas acordados, conferência de lacres, manutenção mecânica preventiva e apresentação imediata do canhoto assinado do Conhecimento de Transporte / Comprovante de Entrega.',
      },
      {
        number: 5,
        title: 'DO SEGURO DE TRANSPORTE E AVERBAÇÃO OBRIGATÓRIA',
        text: 'As operações de transporte contam com apólice de seguro de responsabilidade civil do transportador rodoviário de cargas (RCTR-C) devidamente averbada perante a seguradora contratada, respondendo o CONTRATADO por perdas e danos decorrentes de dolo, culpa grave, desvio de rota não autorizado ou recusa de seguir o plano de gerenciamento de riscos (PGR).',
      },
      {
        number: 6,
        title: 'DO FORO DE ELEIÇÃO',
        text: 'Fica eleito o foro da Comarca do estabelecimento da CONTRATANTE com expressa renúncia a qualquer outro, por mais privilegiado que seja, para dirimir eventuais litígios oriundos deste Contrato de Transporte Rodoviário de Bens (CTRB).',
      },
    ]

    const defaultClausesEtc = [
      {
        number: 1,
        title: 'DO OBJETO E NATUREZA EMPRESARIAL',
        text: 'Prestação de serviços de transporte rodoviário de cargas na modalidade de subcontratação comercial entre empresas transportadoras (ETC), nos termos da Lei Federal nº 11.442/2007 e regulamentos da ANTT.',
      },
      {
        number: 2,
        title: 'DO VALOR DO FRETE E REGULARIDADE FISCAL',
        text: 'A CONTRATADA emitirá o correspondente Conhecimento de Transporte Eletrônico (CT-e de Subcontratação) ou fatura comercial conforme legislação tributária, obrigando-se a manter regularidade de RNTRC, CNDs e apólices de seguro.',
      },
      {
        number: 3,
        title: 'DO FORO',
        text: 'Elegem as partes o foro da sede da CONTRATANTE para dirimir dúvidas ou controvérsias decorrentes deste contrato.',
      },
    ]

    // Modelo 1: Padrão TAC-Equiparado
    const tmplTacEquiparado = new Record(templatesCol)
    tmplTacEquiparado.set('title', 'CTRB - Modelo Padrão TAC Equiparado (Lei 11.442/07)')
    tmplTacEquiparado.set('carrier_profile', 'tac_equiparado')
    tmplTacEquiparado.set('transport_mode', 'todos')
    tmplTacEquiparado.set('is_active', true)
    tmplTacEquiparado.set('is_default', true)
    tmplTacEquiparado.set('version', 1)
    tmplTacEquiparado.set(
      'preamble_template',
      'CONTRATO DE TRANSPORTE RODOVIÁRIO DE BENS (CTRB)\nCelebrado entre a CONTRATANTE qualificada e o TRANSPORTADOR AUTÔNOMO DE CARGAS EQUIPARADO (TAC-Equiparado), sob a égide da Lei nº 11.442/2007 e normas da ANTT.',
    )
    tmplTacEquiparado.set('clauses', JSON.stringify(defaultClausesTac))
    tmplTacEquiparado.set(
      'responsibilities_text',
      'O Transportador declara que o veículo atende aos requisitos mecânicos e de segurança, com eixos em conformidade, e se compromete a cumprir a rota aprovada respeitando os tempos de descanso da Lei nº 13.103/2015.',
    )
    tmplTacEquiparado.set(
      'penalty_terms_text',
      'Atrasos injustificados ou avarias decorrentes de negligência ensejarão retenção proporcional do saldo de frete até a devida apuração pericial e securitária.',
    )
    tmplTacEquiparado.set('jurisdiction_city', 'Jundiaí')
    tmplTacEquiparado.set('jurisdiction_state', 'SP')
    tmplTacEquiparado.set(
      'notes',
      'Modelo padrão do sistema para TAC-Equiparado com cumprimento do piso mínimo ANTT e Vale-Pedágio.',
    )
    app.save(tmplTacEquiparado)

    // Modelo 2: Padrão TAC-Independente
    const tmplTacIndep = new Record(templatesCol)
    tmplTacIndep.set('title', 'CTRB - Modelo TAC Independente (Autônomo)')
    tmplTacIndep.set('carrier_profile', 'tac_independente')
    tmplTacIndep.set('transport_mode', 'todos')
    tmplTacIndep.set('is_active', true)
    tmplTacIndep.set('is_default', false)
    tmplTacIndep.set('version', 1)
    tmplTacIndep.set(
      'preamble_template',
      'CONTRATO DE TRANSPORTE RODOVIÁRIO DE BENS (CTRB - TAC INDEPENDENTE)\nInstrumento particular de prestação de serviços de transporte por transportador autônomo pessoa física cadastrado na ANTT.',
    )
    tmplTacIndep.set('clauses', JSON.stringify(defaultClausesTac))
    tmplTacIndep.set(
      'responsibilities_text',
      'O TAC Independente responsabiliza-se pela condução do veículo próprio ou sob sua posse legal, com observância do PGR e comprovante de entrega.',
    )
    tmplTacIndep.set(
      'penalty_terms_text',
      'Multas por excesso de peso ou evasão de pedágio causadas por ato do transportador serão de sua inteira responsabilidade.',
    )
    tmplTacIndep.set('jurisdiction_city', 'Jundiaí')
    tmplTacIndep.set('jurisdiction_state', 'SP')
    app.save(tmplTacIndep)

    // Modelo 3: Padrão ETC (Empresa de Transporte de Cargas / Subcontratação)
    const tmplEtc = new Record(templatesCol)
    tmplEtc.set('title', 'CTRB - Modelo Subcontratação ETC (Pessoa Jurídica)')
    tmplEtc.set('carrier_profile', 'etc')
    tmplEtc.set('transport_mode', 'subcontratacao')
    tmplEtc.set('is_active', true)
    tmplEtc.set('is_default', false)
    tmplEtc.set('version', 1)
    tmplEtc.set(
      'preamble_template',
      'CONTRATO DE TRANSPORTE RODOVIÁRIO DE CARGAS - SUBCONTRATAÇÃO EMPRESARIAL (ETC / PESSOA JURÍDICA)',
    )
    tmplEtc.set('clauses', JSON.stringify(defaultClausesEtc))
    tmplEtc.set(
      'responsibilities_text',
      'A empresa subcontratada assume todas as obrigações trabalhistas, tributárias e operacionais referentes aos seus motoristas e frota empregada.',
    )
    tmplEtc.set(
      'penalty_terms_text',
      'Inadimplemento contratual sujeito a multa de 10% do valor do frete e perdas e danos.',
    )
    tmplEtc.set('jurisdiction_city', 'Jundiaí')
    tmplEtc.set('jurisdiction_state', 'SP')
    app.save(tmplEtc)
  },
  (app) => {
    try {
      const transportContracts = app.findCollectionByNameOrId('transport_contracts')
      if (transportContracts) app.delete(transportContracts)
    } catch (_) {}
    try {
      const contractTemplates = app.findCollectionByNameOrId('contract_templates')
      if (contractTemplates) app.delete(contractTemplates)
    } catch (_) {}
  },
)
