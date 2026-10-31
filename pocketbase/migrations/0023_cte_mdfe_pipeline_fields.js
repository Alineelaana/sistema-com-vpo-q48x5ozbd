migrate(
  (app) => {
    // 1. Campos complementares em cte_documents para preparação completa da Ordem de Transporte
    const cteCol = app.findCollectionByNameOrId('cte_documents')

    // CFOP e Natureza da Operação
    if (!cteCol.fields.getByName('cfop')) {
      cteCol.fields.add(
        new TextField({
          name: 'cfop',
        }),
      )
    }
    if (!cteCol.fields.getByName('nat_op')) {
      cteCol.fields.add(
        new TextField({
          name: 'nat_op',
        }),
      )
    }
    // Chaves de NF-e vinculadas
    if (!cteCol.fields.getByName('linked_nfe_keys')) {
      cteCol.fields.add(
        new TextField({
          name: 'linked_nfe_keys',
        }),
      )
    }
    // Expedidor e Recebedor (quando aplicáveis)
    if (!cteCol.fields.getByName('shipper_name')) {
      cteCol.fields.add(
        new TextField({
          name: 'shipper_name',
        }),
      )
    }
    if (!cteCol.fields.getByName('shipper_document')) {
      cteCol.fields.add(
        new TextField({
          name: 'shipper_document',
        }),
      )
    }
    if (!cteCol.fields.getByName('receiver_name')) {
      cteCol.fields.add(
        new TextField({
          name: 'receiver_name',
        }),
      )
    }
    if (!cteCol.fields.getByName('receiver_document')) {
      cteCol.fields.add(
        new TextField({
          name: 'receiver_document',
        }),
      )
    }
    // Tomador do serviço
    if (!cteCol.fields.getByName('taker_type')) {
      cteCol.fields.add(
        new SelectField({
          name: 'taker_type',
          values: ['remetente', 'expedidor', 'recebedor', 'destinatario', 'outro'],
          maxSelect: 1,
        }),
      )
    }
    // Informações complementares e tributárias
    if (!cteCol.fields.getByName('additional_info')) {
      cteCol.fields.add(
        new TextField({
          name: 'additional_info',
        }),
      )
    }
    if (!cteCol.fields.getByName('icms_cst')) {
      cteCol.fields.add(
        new TextField({
          name: 'icms_cst',
        }),
      )
    }
    if (!cteCol.fields.getByName('payload_json')) {
      cteCol.fields.add(
        new JSONField({
          name: 'payload_json',
        }),
      )
    }
    if (!cteCol.fields.getByName('transmission_attempts')) {
      cteCol.fields.add(
        new NumberField({
          name: 'transmission_attempts',
        }),
      )
    }
    if (!cteCol.fields.getByName('provider_reference')) {
      cteCol.fields.add(
        new TextField({
          name: 'provider_reference',
        }),
      )
    }
    app.save(cteCol)

    // 2. Campos complementares em mdfe_documents (CIOT, IDVPO no grupo de vale-pedágio, seguro, condutor CPF, placas)
    const mdfeCol = app.findCollectionByNameOrId('mdfe_documents')
    if (!mdfeCol.fields.getByName('ciot_number')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'ciot_number',
        }),
      )
    }
    // IDVPO gravado no campo nCompra do grupo de Vale-Pedágio Obrigatório
    if (!mdfeCol.fields.getByName('vpo_idvpo')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'vpo_idvpo',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('vpo_responsible_doc')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'vpo_responsible_doc',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('vpo_value')) {
      mdfeCol.fields.add(
        new NumberField({
          name: 'vpo_value',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('insurance_policy_number')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'insurance_policy_number',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('insurance_averbacao_protocol')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'insurance_averbacao_protocol',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('driver_cpf')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'driver_cpf',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('driver_name')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'driver_name',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('vehicle_plate')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'vehicle_plate',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('trailer_plate')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'trailer_plate',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('trailer_plate_2')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'trailer_plate_2',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('payload_json')) {
      mdfeCol.fields.add(
        new JSONField({
          name: 'payload_json',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('transmission_attempts')) {
      mdfeCol.fields.add(
        new NumberField({
          name: 'transmission_attempts',
        }),
      )
    }
    if (!mdfeCol.fields.getByName('provider_reference')) {
      mdfeCol.fields.add(
        new TextField({
          name: 'provider_reference',
        }),
      )
    }
    app.save(mdfeCol)

    // 3. Atualizar audit_logs para incluir ações fiscais detalhadas
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const actionField = auditCol.fields.getByName('action')
    if (actionField) {
      const existingValues = actionField.values || []
      const newActions = [
        'cte_prepare',
        'cte_rejected',
        'cte_authorized',
        'mdfe_prepare',
        'mdfe_rejected',
        'mdfe_authorized',
      ]
      const merged = Array.from(new Set([...existingValues, ...newActions]))
      actionField.values = merged
      app.save(auditCol)
    }
  },
  (app) => {
    // Reversão
  },
)
