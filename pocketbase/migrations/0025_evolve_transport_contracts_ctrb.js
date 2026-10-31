migrate(
  (app) => {
    // 1. Criar coleção contract_attachments (Anexos de Documentos do Contrato CTRB)
    const contractsCol = app.findCollectionByNameOrId('transport_contracts')

    const attachmentsCol = new Collection({
      name: 'contract_attachments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'contract_id',
          type: 'relation',
          collectionId: contractsCol.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'file_name', type: 'text', required: true },
        { name: 'document_type', type: 'text' }, // 'Comprovante', 'CNH', 'CRLV', 'Contrato Assinado', 'Outro'
        { name: 'description', type: 'text' },
        {
          name: 'file',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
        },
        { name: 'file_size', type: 'number' },
        { name: 'uploaded_by', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_cntr_att_contract ON contract_attachments (contract_id)'],
    })
    app.save(attachmentsCol)

    // 2. Evoluir transport_contracts com novos campos ServiceLogic (CTRB)
    const col = app.findCollectionByNameOrId('transport_contracts')

    const newTextFields = [
      'filial',
      'fleet_type',
      'operation_type',
      'service_type',
      'tax_regime',
      'series',
      'ciot_number',
      'fiscal_operation',
      'quick_charge',
      'responsible_collaborator',
      'integrator_name',
      'integrator_status',
      'trailer_plate_3',
      'vehicle_owner_code',
      'vehicle_owner_name',
      'vehicle_owner_doc',
      'vehicle_category',
      'contractor_code',
      'contracted_carrier_code',
      'driver_code',
      'law_observations',
      'complementary_observations',
      'observations_to_accredited',
      'bank_payment_method',
      'bank_account_type',
      'driver_bank_name',
      'driver_bank_agency',
      'driver_bank_account',
      'driver_bank_pix_key',
      'driver_bank_payment_method',
      'driver_bank_account_type',
    ]

    for (const fName of newTextFields) {
      if (!col.fields.getByName(fName)) {
        col.fields.add(new TextField({ name: fName }))
      }
    }

    const newDateFields = [
      'issue_date',
      'departure_date',
      'end_date',
      'advance_due_date',
      'balance_due_date',
    ]
    for (const fName of newDateFields) {
      if (!col.fields.getByName(fName)) {
        col.fields.add(new DateField({ name: fName }))
      }
    }

    if (!col.fields.getByName('no_tax_calc')) {
      col.fields.add(new BoolField({ name: 'no_tax_calc' }))
    }

    const newJsonFields = [
      'service_prices_json',
      'contracted_services_json',
      'operational_costs_json',
      'fueling_records_json',
      'installments_json',
      'item_dispatches_json',
      'ciot_rectification_json',
    ]
    for (const fName of newJsonFields) {
      if (!col.fields.getByName(fName)) {
        col.fields.add(new JSONField({ name: fName }))
      }
    }

    app.save(col)

    // 3. Adicionar novas ações de auditoria para CTRB
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const actionField = auditCol.fields.getByName('action')
    if (actionField && Array.isArray(actionField.values)) {
      const needed = [
        'ctrb_create',
        'ctrb_save',
        'ctrb_delete',
        'ctrb_attach_doc',
        'ctrb_delete_doc',
      ]
      let updated = false
      for (const val of needed) {
        if (!actionField.values.includes(val)) {
          actionField.values.push(val)
          updated = true
        }
      }
      if (updated) {
        app.save(auditCol)
      }
    }
  },
  (app) => {
    try {
      const attachmentsCol = app.findCollectionByNameOrId('contract_attachments')
      if (attachmentsCol) app.delete(attachmentsCol)
    } catch (_) {}
  },
)
