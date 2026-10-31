migrate(
  (app) => {
    // 1. Coleção leve para vinculação de TAG/meio eletrônico ao veículo e motorista: vehicle_tags
    if (!app.hasTable('vehicle_tags')) {
      const vehiclesCol = app.findCollectionByNameOrId('vehicles')
      const driversCol = app.findCollectionByNameOrId('drivers')

      const collection = new Collection({
        name: 'vehicle_tags',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'tag_number', type: 'text', required: true },
          {
            name: 'provider',
            type: 'select',
            required: true,
            values: ['semparar', 'repom', 'conectcar', 'veloe', 'movemais', 'outra'],
            maxSelect: 1,
          },
          {
            name: 'vehicle_id',
            type: 'relation',
            collectionId: vehiclesCol.id,
            maxSelect: 1,
          },
          {
            name: 'driver_id',
            type: 'relation',
            collectionId: driversCol.id,
            maxSelect: 1,
          },
          { name: 'vehicle_plate', type: 'text' },
          { name: 'driver_name', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['active', 'blocked', 'inactive'],
            maxSelect: 1,
          },
          { name: 'balance_available', type: 'number' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_tag_number ON vehicle_tags (tag_number)',
          'CREATE INDEX idx_tag_plate ON vehicle_tags (vehicle_plate)',
          'CREATE INDEX idx_tag_status ON vehicle_tags (status)',
        ],
      })
      app.save(collection)

      // Seed inicial de tags conhecidas para frota/veículos existentes
      try {
        const sampleVehicles = app.findRecordsByFilter('vehicles', 'status = "active"', '', 3, 0)
        const sampleDrivers = app.findRecordsByFilter('drivers', 'status = "available"', '', 3, 0)
        const tags = [
          { tag: 'TAG-SP-9821841', prov: 'semparar', bal: 850.0 },
          { tag: 'TAG-CC-5129034', prov: 'conectcar', bal: 420.0 },
          { tag: 'TAG-VL-7731209', prov: 'veloe', bal: 610.0 },
        ]
        for (let i = 0; i < tags.length; i++) {
          const rec = new Record(collection)
          rec.set('tag_number', tags[i].tag)
          rec.set('provider', tags[i].prov)
          rec.set('status', 'active')
          rec.set('balance_available', tags[i].bal)
          if (sampleVehicles[i]) {
            rec.set('vehicle_id', sampleVehicles[i].id)
            rec.set('vehicle_plate', sampleVehicles[i].getString('plate'))
          }
          if (sampleDrivers[i]) {
            rec.set('driver_id', sampleDrivers[i].id)
            rec.set('driver_name', sampleDrivers[i].getString('name'))
          }
          app.save(rec)
        }
      } catch (err) {
        console.warn('Erro ao semear tags iniciais:', err)
      }
    }

    // 2. Adicionar campos de credenciais de IPEF e FVPO na company_settings
    const companyCol = app.findCollectionByNameOrId('company_settings')
    if (!companyCol.fields.getByName('ipef_provider')) {
      companyCol.fields.add(
        new SelectField({
          name: 'ipef_provider',
          values: ['semparar', 'repom', 'efrete', 'ndd', 'none'],
          maxSelect: 1,
        }),
      )
    }
    if (!companyCol.fields.getByName('ipef_api_token')) {
      companyCol.fields.add(
        new TextField({
          name: 'ipef_api_token',
        }),
      )
    }
    if (!companyCol.fields.getByName('fvpo_api_token')) {
      companyCol.fields.add(
        new TextField({
          name: 'fvpo_api_token',
        }),
      )
    }
    app.save(companyCol)

    // 3. Adicionar campos de status de integração detalhados em trips
    const tripsCol = app.findCollectionByNameOrId('trips')
    if (!tripsCol.fields.getByName('vpo_status')) {
      tripsCol.fields.add(
        new SelectField({
          name: 'vpo_status',
          values: [
            'pendente',
            'solicitado',
            'confirmado',
            'falha_saldo',
            'falha_comunicacao',
            'tag_incompativel',
            'aguardando_configuracao',
          ],
          maxSelect: 1,
        }),
      )
    }
    if (!tripsCol.fields.getByName('vpo_tag_number')) {
      tripsCol.fields.add(
        new TextField({
          name: 'vpo_tag_number',
        }),
      )
    }
    if (!tripsCol.fields.getByName('vpo_provider')) {
      tripsCol.fields.add(
        new TextField({
          name: 'vpo_provider',
        }),
      )
    }
    if (!tripsCol.fields.getByName('vpo_requested_at')) {
      tripsCol.fields.add(
        new DateField({
          name: 'vpo_requested_at',
        }),
      )
    }
    if (!tripsCol.fields.getByName('vpo_confirmed_at')) {
      tripsCol.fields.add(
        new DateField({
          name: 'vpo_confirmed_at',
        }),
      )
    }
    if (!tripsCol.fields.getByName('vpo_failure_reason')) {
      tripsCol.fields.add(
        new TextField({
          name: 'vpo_failure_reason',
        }),
      )
    }
    if (!tripsCol.fields.getByName('vpo_idempotency_key')) {
      tripsCol.fields.add(
        new TextField({
          name: 'vpo_idempotency_key',
        }),
      )
    }
    app.save(tripsCol)

    // 4. Adicionar ações no enum de audit_logs
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const actionField = auditCol.fields.getByName('action')
    if (actionField) {
      const existingValues = actionField.values || []
      const newActions = [
        'ciot_request',
        'ciot_registered',
        'ciot_failed',
        'vpo_calculate',
        'vpo_request',
        'vpo_confirmed',
        'vpo_failed',
        'driver_package_dispatch',
        'driver_package_retry',
      ]
      const merged = Array.from(new Set([...existingValues, ...newActions]))
      actionField.values = merged
      app.save(auditCol)
    }

    // 5. Semear modelo de mensagem de Pacote de Viagem ao Motorista em document_dispatch_templates
    const tmplCol = app.findCollectionByNameOrId('document_dispatch_templates')
    const existingDriverTmpl = app.findRecordsByFilter(
      'document_dispatch_templates',
      "name ~ 'Pacote de Viagem' || name ~ 'Motorista'",
      '',
      1,
      0,
    )
    if (existingDriverTmpl.length === 0) {
      const tmpl = new Record(tmplCol)
      tmpl.set('name', 'Modelo Padrão - Pacote de Viagem ao Motorista')
      tmpl.set('document_type', 'bundle')
      tmpl.set('is_active', true)
      tmpl.set('is_default', false)
      tmpl.set(
        'description',
        'Enviado automaticamente ao motorista com DACTE, DAMDFE, CTRB em PDF, orientações de VPO/TAG e resumo da rota quando a operação for liberada.',
      )
      tmpl.set(
        'subject_template',
        '{{empresa_emissora}} - Pacote de Viagem Liberado: Viagem {{viagem}} (MDF-e {{numero_documento}})',
      )
      tmpl.set(
        'body_template',
        'Olá, {{nome_cliente}}!\n\nSua viagem {{viagem}} foi devidamente liberada pela Central de Operações de Transporte da {{empresa_emissora}}.\n\nSeguem os dados operacionais e os documentos de porte obrigatório anexos:\n\n• Veículo: {{placa_veiculo}}\n• Origem / Destino: {{origem_destino}}\n• Distância Rodoviária: {{distancia_km}} km\n• CT-e: nº {{numero_cte}} (Protocolo: {{protocolo_cte}})\n• MDF-e: nº {{numero_documento}} (Protocolo: {{protocolo_autorizacao}})\n• CTRB (Contrato de Frete): nº {{numero_contrato}}\n• CIOT ANTT: {{numero_ciot}}\n• Vale-Pedágio (VPO): R$ {{valor_vpo}} ({{comprovante_vpo}})\n• TAG / Meio Eletrônico: {{tag_veiculo}}\n\nPor favor, confirme o recebimento e cumpra rigorosamente a rota rodoviária aprovada e os tempos de descanso da Lei nº 13.103/2015.\n\nBoa viagem!\n{{empresa_emissora}}',
      )
      app.save(tmpl)
    }
  },
  (app) => {
    // Reversão
  },
)
