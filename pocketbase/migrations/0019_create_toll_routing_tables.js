migrate(
  (app) => {
    // 1. Coleção toll_plazas (praças de pedágio)
    const tollPlazas = new Collection({
      name: 'toll_plazas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'concessionaire', type: 'text', required: true },
        { name: 'highway', type: 'text', required: true },
        { name: 'km', type: 'number', required: true },
        { name: 'city', type: 'text', required: true },
        { name: 'state', type: 'text', required: true },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'is_active', type: 'bool' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_toll_plazas_highway ON toll_plazas (highway)',
        'CREATE INDEX idx_toll_plazas_state ON toll_plazas (state)',
      ],
    })
    app.save(tollPlazas)

    // 2. Coleção toll_tariffs (tarifas versionadas por praça e categoria/eixos)
    const tollTariffs = new Collection({
      name: 'toll_tariffs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'plaza_id',
          type: 'relation',
          required: true,
          collectionId: tollPlazas.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'vehicle_category', type: 'text', required: true }, // ex: "comercial_2_eixos", "comercial_6_eixos", "eixo_comercial"
        { name: 'axles', type: 'number', required: true }, // 2, 3, 4, 5, 6, 7, 9...
        { name: 'rate_per_axle', type: 'number', required: true }, // tarifa unitária base por eixo
        { name: 'total_amount', type: 'number', required: true }, // valor total para a categoria
        { name: 'effective_from', type: 'date', required: true }, // início vigência
        { name: 'effective_to', type: 'date' }, // fim da vigência (opcional/vazio se vigente)
        { name: 'tariff_version', type: 'text', required: true }, // ex: "ANTT-2026.1", "ARTESP-2026.02"
        { name: 'source', type: 'text', required: true }, // ex: "Portaria ANTT nº 412/2026"
        { name: 'is_current', type: 'bool' }, // indicador de vigência atual
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_toll_tariffs_plaza ON toll_tariffs (plaza_id)',
        'CREATE INDEX idx_toll_tariffs_version ON toll_tariffs (tariff_version)',
        'CREATE INDEX idx_toll_tariffs_axles ON toll_tariffs (axles)',
      ],
    })
    app.save(tollTariffs)

    // 3. Estender a coleção 'trips' com campos detalhados de rota do Roteirizador Inteligente
    const tripsCol = app.findCollectionByNameOrId('trips')

    if (!tripsCol.fields.getByName('waypoints')) {
      tripsCol.fields.add(new JSONField({ name: 'waypoints' }))
    }
    if (!tripsCol.fields.getByName('highways')) {
      tripsCol.fields.add(new TextField({ name: 'highways' }))
    }
    if (!tripsCol.fields.getByName('estimated_duration_hours')) {
      tripsCol.fields.add(new NumberField({ name: 'estimated_duration_hours' }))
    }
    if (!tripsCol.fields.getByName('route_approved')) {
      tripsCol.fields.add(new BoolField({ name: 'route_approved' }))
    }
    if (!tripsCol.fields.getByName('route_approved_at')) {
      tripsCol.fields.add(new DateField({ name: 'route_approved_at' }))
    }
    if (!tripsCol.fields.getByName('route_approved_by')) {
      tripsCol.fields.add(new TextField({ name: 'route_approved_by' }))
    }
    if (!tripsCol.fields.getByName('tariff_version_used')) {
      tripsCol.fields.add(new TextField({ name: 'tariff_version_used' }))
    }
    if (!tripsCol.fields.getByName('selected_plazas_details')) {
      tripsCol.fields.add(new JSONField({ name: 'selected_plazas_details' }))
    }
    if (!tripsCol.fields.getByName('routing_provider')) {
      tripsCol.fields.add(new TextField({ name: 'routing_provider' }))
    }
    if (!tripsCol.fields.getByName('routing_distance_source')) {
      tripsCol.fields.add(
        new SelectField({
          name: 'routing_distance_source',
          values: ['manual_rodoviaria', 'provedor_externo', 'roteirizador_connect'],
          maxSelect: 1,
        }),
      )
    }

    app.save(tripsCol)

    // 4. Expandir audit_logs com novas ações de rota
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
      ]
      app.save(auditCol)
    }

    // 5. Seed inicial de praças de pedágio e tarifas versionadas realistas
    // Exemplo nas principais rodovias de integração (BR-116 Régis Bittencourt, BR-381 Fernão Dias, BR-050, SP-160 Imigrantes/Anchieta)
    const seedPlazas = [
      {
        name: 'Praça São Lourenço da Serra',
        concessionaire: 'Arteris Régis Bittencourt',
        highway: 'BR-116',
        km: 298.5,
        city: 'São Lourenço da Serra',
        state: 'SP',
        lat: -23.856,
        lng: -46.945,
        rate_axle: 4.0,
      },
      {
        name: 'Praça Miracatu',
        concessionaire: 'Arteris Régis Bittencourt',
        highway: 'BR-116',
        km: 370.2,
        city: 'Miracatu',
        state: 'SP',
        lat: -24.282,
        lng: -47.46,
        rate_axle: 4.0,
      },
      {
        name: 'Praça Juquiá',
        concessionaire: 'Arteris Régis Bittencourt',
        highway: 'BR-116',
        km: 426.0,
        city: 'Juquiá',
        state: 'SP',
        lat: -24.321,
        lng: -47.632,
        rate_axle: 4.0,
      },
      {
        name: 'Praça Cajati',
        concessionaire: 'Arteris Régis Bittencourt',
        highway: 'BR-116',
        km: 485.8,
        city: 'Cajati',
        state: 'SP',
        lat: -24.736,
        lng: -48.122,
        rate_axle: 4.0,
      },
      {
        name: 'Praça Barra do Turvo',
        concessionaire: 'Arteris Régis Bittencourt',
        highway: 'BR-116',
        km: 542.4,
        city: 'Barra do Turvo',
        state: 'SP',
        lat: -24.757,
        lng: -48.503,
        rate_axle: 4.0,
      },
      {
        name: 'Praça Campina Grande do Sul',
        concessionaire: 'Arteris Régis Bittencourt',
        highway: 'BR-116',
        km: 57.0,
        city: 'Campina Grande do Sul',
        state: 'PR',
        lat: -25.305,
        lng: -49.053,
        rate_axle: 4.0,
      },
      // Fernão Dias (BR-381)
      {
        name: 'Praça Mairiporã',
        concessionaire: 'Arteris Fernão Dias',
        highway: 'BR-381',
        km: 65.7,
        city: 'Mairiporã',
        state: 'SP',
        lat: -23.318,
        lng: -46.586,
        rate_axle: 3.1,
      },
      {
        name: 'Praça Vargem',
        concessionaire: 'Arteris Fernão Dias',
        highway: 'BR-381',
        km: 7.2,
        city: 'Vargem',
        state: 'SP',
        lat: -22.889,
        lng: -46.414,
        rate_axle: 3.1,
      },
      {
        name: 'Praça Cambuí',
        concessionaire: 'Arteris Fernão Dias',
        highway: 'BR-381',
        km: 900.5,
        city: 'Cambuí',
        state: 'MG',
        lat: -22.612,
        lng: -46.057,
        rate_axle: 3.1,
      },
      {
        name: 'Praça Careaçu',
        concessionaire: 'Arteris Fernão Dias',
        highway: 'BR-381',
        km: 805.2,
        city: 'Careaçu',
        state: 'MG',
        lat: -22.189,
        lng: -45.698,
        rate_axle: 3.1,
      },
      {
        name: 'Praça Carmo da Cachoeira',
        concessionaire: 'Arteris Fernão Dias',
        highway: 'BR-381',
        km: 728.8,
        city: 'Carmo da Cachoeira',
        state: 'MG',
        lat: -21.468,
        lng: -45.187,
        rate_axle: 3.1,
      },
      {
        name: 'Praça Santo Antônio do Amparo',
        concessionaire: 'Arteris Fernão Dias',
        highway: 'BR-381',
        km: 658.3,
        city: 'Santo Antônio do Amparo',
        state: 'MG',
        lat: -20.947,
        lng: -44.918,
        rate_axle: 3.1,
      },
      {
        name: 'Praça Carmópolis de Minas',
        concessionaire: 'Arteris Fernão Dias',
        highway: 'BR-381',
        km: 597.5,
        city: 'Carmópolis de Minas',
        state: 'MG',
        lat: -20.539,
        lng: -44.636,
        rate_axle: 3.1,
      },
      {
        name: 'Praça Itatiaiuçu',
        concessionaire: 'Arteris Fernão Dias',
        highway: 'BR-381',
        km: 535.1,
        city: 'Itatiaiuçu',
        state: 'MG',
        lat: -20.198,
        lng: -44.421,
        rate_axle: 3.1,
      },
      // Via Dutra (BR-116 RJ-SP)
      {
        name: 'Praça Arujá',
        concessionaire: 'CCR RioSP',
        highway: 'BR-116',
        km: 204.0,
        city: 'Arujá',
        state: 'SP',
        lat: -23.398,
        lng: -46.321,
        rate_axle: 4.8,
      },
      {
        name: 'Praça Jacareí',
        concessionaire: 'CCR RioSP',
        highway: 'BR-116',
        km: 165.0,
        city: 'Jacareí',
        state: 'SP',
        lat: -23.305,
        lng: -45.965,
        rate_axle: 8.2,
      },
      {
        name: 'Praça Moreira César',
        concessionaire: 'CCR RioSP',
        highway: 'BR-116',
        km: 88.0,
        city: 'Pindamonhangaba',
        state: 'SP',
        lat: -22.924,
        lng: -45.312,
        rate_axle: 16.4,
      },
      {
        name: 'Praça Itatiaia',
        concessionaire: 'CCR RioSP',
        highway: 'BR-116',
        km: 318.0,
        city: 'Itatiaia',
        state: 'RJ',
        lat: -22.496,
        lng: -44.562,
        rate_axle: 16.4,
      },
      {
        name: 'Praça Viúva Graça',
        concessionaire: 'CCR RioSP',
        highway: 'BR-116',
        km: 207.0,
        city: 'Seropédica',
        state: 'RJ',
        lat: -22.748,
        lng: -43.708,
        rate_axle: 16.4,
      },
      // Sistema Anchieta-Imigrantes (SP-150 / SP-160)
      {
        name: 'Praça Piratininga (Imigrantes)',
        concessionaire: 'Ecovias dos Imigrantes',
        highway: 'SP-160',
        km: 32.4,
        city: 'São Bernardo do Campo',
        state: 'SP',
        lat: -23.821,
        lng: -46.541,
        rate_axle: 17.7,
      },
      {
        name: 'Praça Riacho Grande (Anchieta)',
        concessionaire: 'Ecovias dos Imigrantes',
        highway: 'SP-150',
        km: 31.0,
        city: 'São Bernardo do Campo',
        state: 'SP',
        lat: -23.784,
        lng: -46.529,
        rate_axle: 17.7,
      },
    ]

    const axleCategories = [
      { axles: 2, label: 'Comercial 2 Eixos (VUC/Toco)', factor: 2 },
      { axles: 3, label: 'Comercial 3 Eixos (Truck 6x2)', factor: 3 },
      { axles: 4, label: 'Comercial 4 Eixos (Bitruck/Carreta 1E)', factor: 4 },
      { axles: 5, label: 'Comercial 5 Eixos (Cavalo 2E + Carreta 3E)', factor: 5 },
      { axles: 6, label: 'Comercial 6 Eixos (Cavalo 3E + Carreta 3E - LS)', factor: 6 },
      { axles: 7, label: 'Comercial 7 Eixos (Bitrem 7E)', factor: 7 },
      { axles: 9, label: 'Comercial 9 Eixos (Rodotrem 9E)', factor: 9 },
    ]

    const tariffVersion = 'ANTT-2026.1'
    const tariffSource = 'Portaria ANTT nº 412/2026 e Concessionárias Reguladas'
    const effectiveDate = '2026-01-01T00:00:00.000Z'

    for (let p of seedPlazas) {
      const plazaRec = new Record(tollPlazas)
      plazaRec.set('name', p.name)
      plazaRec.set('concessionaire', p.concessionaire)
      plazaRec.set('highway', p.highway)
      plazaRec.set('km', p.km)
      plazaRec.set('city', p.city)
      plazaRec.set('state', p.state)
      plazaRec.set('lat', p.lat)
      plazaRec.set('lng', p.lng)
      plazaRec.set('is_active', true)
      plazaRec.set('notes', `Praça ativa no km ${p.km} da ${p.highway}`)
      app.save(plazaRec)

      // Criar tarifas para cada categoria de eixos
      for (let cat of axleCategories) {
        const tariffRec = new Record(tollTariffs)
        tariffRec.set('plaza_id', plazaRec.id)
        tariffRec.set('vehicle_category', cat.label)
        tariffRec.set('axles', cat.axles)
        tariffRec.set('rate_per_axle', p.rate_axle)
        tariffRec.set('total_amount', Number((p.rate_axle * cat.axles).toFixed(2)))
        tariffRec.set('effective_from', effectiveDate)
        tariffRec.set('tariff_version', tariffVersion)
        tariffRec.set('source', tariffSource)
        tariffRec.set('is_current', true)
        app.save(tariffRec)
      }
    }
  },
  (app) => {
    // Reversão
    try {
      const tollTariffs = app.findCollectionByNameOrId('toll_tariffs')
      app.delete(tollTariffs)
    } catch (_) {}
    try {
      const tollPlazas = app.findCollectionByNameOrId('toll_plazas')
      app.delete(tollPlazas)
    } catch (_) {}
  },
)
