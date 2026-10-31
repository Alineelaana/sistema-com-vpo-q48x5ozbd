migrate(
  (app) => {
    // 1. Coleção piso_minimo_tabelas (cabeçalho da versão/tabela regulamentar)
    const tabelasCol = new Collection({
      name: 'piso_minimo_tabelas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'version_code', type: 'text', required: true }, // ex: "ANTT-2025.1", "RES-6059-2024"
        { name: 'name', type: 'text', required: true }, // ex: "Tabela Oficial ANTT - Resolução nº 6.059/2024"
        { name: 'legal_act', type: 'text', required: true }, // ex: "Resolução ANTT nº 6.059/2024 (Lei 13.703/2018)"
        { name: 'source_url', type: 'text' }, // link para DOU ou ANTTlegis
        { name: 'effective_from', type: 'date', required: true },
        { name: 'effective_to', type: 'date' },
        { name: 'is_current', type: 'bool' }, // tabela vigente
        {
          name: 'validation_status',
          type: 'select',
          values: ['oficial_validada', 'aguardando_validacao_oficial', 'revogada'],
          maxSelect: 1,
          required: true,
        },
        { name: 'diesel_reference_price', type: 'number' }, // ex: 5.94
        { name: 'ipca_accumulated_percent', type: 'number' }, // ex: 2.84
        { name: 'notes', type: 'text' },
        { name: 'imported_by', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_piso_tabelas_version ON piso_minimo_tabelas (version_code)',
        'CREATE INDEX idx_piso_tabelas_current ON piso_minimo_tabelas (is_current)',
      ],
    })
    app.save(tabelasCol)

    // 2. Coleção piso_minimo_coeficientes (coeficientes CCD e CC por tipo de carga e eixos)
    const coefsCol = new Collection({
      name: 'piso_minimo_coeficientes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'table_id',
          type: 'relation',
          required: true,
          collectionId: tabelasCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'table_type', // Tabela A (Lotação), Tabela B (Apenas Veículo Automotor), Tabela C (Alto Desempenho), Tabela D (Alto Desemp. Apenas Veículo)
          type: 'select',
          values: ['tabela_a', 'tabela_b', 'tabela_c', 'tabela_d'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'cargo_category',
          type: 'select',
          values: [
            'granel_solido',
            'granel_liquido',
            'frigorificada',
            'conteinerizada',
            'carga_geral',
            'neogranel',
            'perigosa_granel_solido',
            'perigosa_granel_liquido',
            'perigosa_frigorificada',
            'perigosa_conteinerizada',
            'perigosa_carga_geral',
            'granel_pressurizada',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'cargo_category_label', type: 'text', required: true },
        { name: 'axles', type: 'number', required: true }, // 2, 3, 4, 5, 6, 7, 9
        { name: 'ccd_cost_per_km', type: 'number', required: true }, // CCD (R$/km) - Coeficiente de Custo de Deslocamento
        { name: 'cc_loading_unloading', type: 'number', required: true }, // CC (R$) - Coeficiente de Carga e Descarga
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_piso_coef_table ON piso_minimo_coeficientes (table_id)',
        'CREATE INDEX idx_piso_coef_lookup ON piso_minimo_coeficientes (table_id, table_type, cargo_category, axles)',
      ],
    })
    app.save(coefsCol)

    // 3. Estender a coleção 'trips' (Ordem de Transporte) com os campos do motor de piso mínimo
    const tripsCol = app.findCollectionByNameOrId('trips')

    if (!tripsCol.fields.getByName('floor_table_version')) {
      tripsCol.fields.add(new TextField({ name: 'floor_table_version' }))
    }
    if (!tripsCol.fields.getByName('floor_table_id')) {
      tripsCol.fields.add(
        new RelationField({
          name: 'floor_table_id',
          collectionId: tabelasCol.id,
          maxSelect: 1,
        }),
      )
    }
    if (!tripsCol.fields.getByName('floor_applicable')) {
      tripsCol.fields.add(new BoolField({ name: 'floor_applicable' }))
    }
    if (!tripsCol.fields.getByName('floor_non_applicable_reason')) {
      tripsCol.fields.add(new TextField({ name: 'floor_non_applicable_reason' }))
    }
    if (!tripsCol.fields.getByName('floor_table_type')) {
      tripsCol.fields.add(new TextField({ name: 'floor_table_type' }))
    }
    if (!tripsCol.fields.getByName('floor_cargo_category')) {
      tripsCol.fields.add(new TextField({ name: 'floor_cargo_category' }))
    }
    if (!tripsCol.fields.getByName('floor_ccd')) {
      tripsCol.fields.add(new NumberField({ name: 'floor_ccd' }))
    }
    if (!tripsCol.fields.getByName('floor_cc')) {
      tripsCol.fields.add(new NumberField({ name: 'floor_cc' }))
    }
    if (!tripsCol.fields.getByName('floor_distance_km')) {
      tripsCol.fields.add(new NumberField({ name: 'floor_distance_km' }))
    }
    if (!tripsCol.fields.getByName('floor_empty_return_applicable')) {
      tripsCol.fields.add(new BoolField({ name: 'floor_empty_return_applicable' }))
    }
    if (!tripsCol.fields.getByName('floor_empty_return_value')) {
      tripsCol.fields.add(new NumberField({ name: 'floor_empty_return_value' }))
    }
    if (!tripsCol.fields.getByName('floor_freight_difference')) {
      tripsCol.fields.add(new NumberField({ name: 'floor_freight_difference' }))
    }
    if (!tripsCol.fields.getByName('floor_regularization_status')) {
      tripsCol.fields.add(
        new SelectField({
          name: 'floor_regularization_status',
          values: [
            'conforme',
            'bloqueado_abaixo_piso',
            'regularizado_frete_ajustado',
            'justificativa_aprovada',
            'nao_aplicavel',
          ],
          maxSelect: 1,
        }),
      )
    }
    if (!tripsCol.fields.getByName('floor_regularization_reason')) {
      tripsCol.fields.add(new TextField({ name: 'floor_regularization_reason' }))
    }
    if (!tripsCol.fields.getByName('floor_regularized_at')) {
      tripsCol.fields.add(new DateField({ name: 'floor_regularized_at' }))
    }
    if (!tripsCol.fields.getByName('floor_regularized_by')) {
      tripsCol.fields.add(new TextField({ name: 'floor_regularized_by' }))
    }
    if (!tripsCol.fields.getByName('floor_calculation_details')) {
      tripsCol.fields.add(new JSONField({ name: 'floor_calculation_details' }))
    }

    app.save(tripsCol)

    // 4. Expandir audit_logs com novas ações de piso mínimo
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
      ]
      app.save(auditCol)
    }
  },
  (app) => {
    try {
      const coefs = app.findCollectionByNameOrId('piso_minimo_coeficientes')
      app.delete(coefs)
    } catch (_) {}
    try {
      const tabs = app.findCollectionByNameOrId('piso_minimo_tabelas')
      app.delete(tabs)
    } catch (_) {}
  },
)
