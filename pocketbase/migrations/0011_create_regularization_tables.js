migrate(
  (app) => {
    // 1. Adicionar campos de provedor fiscal e provedor FVPO na company_settings
    const companyCol = app.findCollectionByNameOrId('company_settings')
    if (!companyCol.fields.getByName('fiscal_provider')) {
      companyCol.fields.add(
        new SelectField({
          name: 'fiscal_provider',
          values: ['nuvemfiscal', 'focusnfe', 'tecnospeed', 'none'],
          maxSelect: 1,
        }),
      )
    }
    if (!companyCol.fields.getByName('fiscal_api_token')) {
      companyCol.fields.add(
        new TextField({
          name: 'fiscal_api_token',
        }),
      )
    }
    if (!companyCol.fields.getByName('fiscal_client_id')) {
      companyCol.fields.add(
        new TextField({
          name: 'fiscal_client_id',
        }),
      )
    }
    if (!companyCol.fields.getByName('fiscal_client_secret')) {
      companyCol.fields.add(
        new TextField({
          name: 'fiscal_client_secret',
        }),
      )
    }
    if (!companyCol.fields.getByName('fvpo_provider')) {
      companyCol.fields.add(
        new SelectField({
          name: 'fvpo_provider',
          values: ['semparar', 'repom', 'conectcar', 'veloe', 'movemais', 'none'],
          maxSelect: 1,
        }),
      )
    }
    if (!companyCol.fields.getByName('ciot_enabled')) {
      companyCol.fields.add(
        new BoolField({
          name: 'ciot_enabled',
        }),
      )
    }
    if (!companyCol.fields.getByName('insurance_blocking_enabled')) {
      companyCol.fields.add(
        new BoolField({
          name: 'insurance_blocking_enabled',
        }),
      )
    }
    app.save(companyCol)

    // 2. Criar coleção mdfe_documents
    const tripsId = app.findCollectionByNameOrId('trips').id
    const vehiclesId = app.findCollectionByNameOrId('vehicles').id
    const driversId = app.findCollectionByNameOrId('drivers').id

    const mdfeCol = new Collection({
      name: 'mdfe_documents',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'mdfe_number', type: 'number', required: true },
        { name: 'series', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['draft', 'queued', 'pending', 'authorized', 'rejected', 'closed', 'cancelled'],
          maxSelect: 1,
        },
        { name: 'access_key', type: 'text' },
        { name: 'protocol', type: 'text' },
        { name: 'status_message', type: 'text' },
        { name: 'xml_content', type: 'text' },
        { name: 'uf_origin', type: 'text' },
        { name: 'uf_destination', type: 'text' },
        { name: 'route_ufs', type: 'text' }, // UFs do percurso separadas por vírgula (ex: SP,RJ,MG)
        { name: 'trip_id', type: 'relation', collectionId: tripsId, maxSelect: 1 },
        { name: 'vehicle_id', type: 'relation', collectionId: vehiclesId, maxSelect: 1 },
        { name: 'driver_id', type: 'relation', collectionId: driversId, maxSelect: 1 },
        { name: 'linked_cte_numbers', type: 'text' }, // Números dos CT-es vinculados
        { name: 'linked_cte_keys', type: 'text' }, // Chaves dos CT-es
        { name: 'total_cargo_value', type: 'number' },
        { name: 'total_weight_kg', type: 'number' },
        { name: 'issued_at', type: 'date' },
        { name: 'closed_at', type: 'date' },
        { name: 'cancelled_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mdfe_status ON mdfe_documents (status)',
        'CREATE INDEX idx_mdfe_trip ON mdfe_documents (trip_id)',
        'CREATE INDEX idx_mdfe_number ON mdfe_documents (mdfe_number)',
      ],
    })
    app.save(mdfeCol)

    // 3. Criar coleção ciot_records
    const ciotCol = new Collection({
      name: 'ciot_records',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'trip_id', type: 'relation', collectionId: tripsId, maxSelect: 1, required: true },
        { name: 'trip_code', type: 'text' },
        { name: 'carrier_rntrc', type: 'text', required: true },
        {
          name: 'carrier_profile',
          type: 'select',
          values: ['etc', 'tac_equiparado', 'tac_independente', 'ctc'],
          maxSelect: 1,
          required: true,
        },
        { name: 'ciot_number', type: 'text' }, // Código identificador ANTT (16 dígitos)
        { name: 'institution_provider', type: 'text' }, // IPEF / Instituição homologada (ex: Repom, Sem Parar, PagBem, Pamcard)
        {
          name: 'status',
          type: 'select',
          values: ['pending', 'registering', 'registered', 'failed', 'cancelled'],
          maxSelect: 1,
          required: true,
        },
        { name: 'voucher_document', type: 'text' }, // Comprovante / Hash / Código de protocolo
        { name: 'is_mandatory', type: 'bool' }, // Obrigatoriedade legal verificada
        { name: 'contractor_document', type: 'text' }, // CPF/CNPJ do contratante
        { name: 'freight_value', type: 'number' },
        { name: 'registered_at', type: 'date' },
        { name: 'status_message', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ciot_trip ON ciot_records (trip_id)',
        'CREATE INDEX idx_ciot_status ON ciot_records (status)',
        'CREATE INDEX idx_ciot_number ON ciot_records (ciot_number)',
      ],
    })
    app.save(ciotCol)

    // 4. Criar coleção insurance_policies (apólices de seguro de carga)
    const insurancePolicyCol = new Collection({
      name: 'insurance_policies',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'insurer_name', type: 'text', required: true },
        { name: 'insurer_cnpj', type: 'text' },
        { name: 'policy_number', type: 'text', required: true },
        {
          name: 'insurance_type',
          type: 'select',
          values: ['rctr_c', 'rc_dc', 'rcta_c', 'rctrc_estipulado', 'outro'],
          maxSelect: 1,
          required: true,
        },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date', required: true },
        { name: 'insured_cnpjs', type: 'text' }, // CNPJs cobertos pela apólice
        { name: 'broker_name', type: 'text' },
        { name: 'atm_provider', type: 'text' }, // Provedor de averbação (AT&M, Porto Seguro, Tokio Marine, etc.)
        { name: 'is_mandatory_all_trips', type: 'bool' },
        { name: 'is_active', type: 'bool' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_insurance_active ON insurance_policies (is_active)',
        'CREATE INDEX idx_insurance_policy ON insurance_policies (policy_number)',
      ],
    })
    app.save(insurancePolicyCol)

    // 5. Criar coleção insurance_endorsements (dossiês e pedidos de averbação)
    const insuranceColId = app.findCollectionByNameOrId('insurance_policies').id
    const cteColId = app.findCollectionByNameOrId('cte_documents').id

    const endorsementCol = new Collection({
      name: 'insurance_endorsements',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'trip_id', type: 'relation', collectionId: tripsId, maxSelect: 1, required: true },
        { name: 'cte_id', type: 'relation', collectionId: cteColId, maxSelect: 1 },
        {
          name: 'policy_id',
          type: 'relation',
          collectionId: insuranceColId,
          maxSelect: 1,
          required: true,
        },
        { name: 'endorsement_protocol', type: 'text' }, // Número / protocolo de averbação emitido
        {
          name: 'status',
          type: 'select',
          values: ['pending', 'queued', 'averbada', 'falhou', 'dispensada'],
          maxSelect: 1,
          required: true,
        },
        { name: 'declared_cargo_value', type: 'number', required: true },
        { name: 'fiscal_key', type: 'text' },
        { name: 'carrier_document', type: 'text' },
        { name: 'status_message', type: 'text' },
        { name: 'proof_document', type: 'text' },
        { name: 'averbada_at', type: 'date' },
        { name: 'is_mandatory', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_endorsement_trip ON insurance_endorsements (trip_id)',
        'CREATE INDEX idx_endorsement_status ON insurance_endorsements (status)',
      ],
    })
    app.save(endorsementCol)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('insurance_endorsements'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('insurance_policies'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ciot_records'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mdfe_documents'))
    } catch (_) {}
  },
)
