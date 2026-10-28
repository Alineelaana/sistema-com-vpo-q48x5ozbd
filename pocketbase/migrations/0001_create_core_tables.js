migrate(
  (app) => {
    // 1. company_settings
    const companySettings = new Collection({
      name: 'company_settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'corporate_name', type: 'text', required: true },
        { name: 'trade_name', type: 'text' },
        { name: 'cnpj', type: 'text', required: true },
        { name: 'state_registration', type: 'text' }, // Inscrição Estadual
        { name: 'rntrc', type: 'text' }, // Registro Nacional de Transportadores Rodoviários de Cargas
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'address', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'state', type: 'text' },
        { name: 'certificate_name', type: 'text' },
        { name: 'certificate_validity', type: 'text' },
        {
          name: 'certificate_status',
          type: 'select',
          values: ['configured', 'missing', 'expired'],
          maxSelect: 1,
        },
        {
          name: 'sefaz_environment',
          type: 'select',
          values: ['homologation', 'production'],
          maxSelect: 1,
        },
        { name: 'cte_series', type: 'number' },
        { name: 'cte_current_number', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_company_cnpj ON company_settings (cnpj)'],
    })
    app.save(companySettings)

    // 2. vehicles
    const vehicles = new Collection({
      name: 'vehicles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'plate', type: 'text', required: true },
        { name: 'model', type: 'text', required: true },
        { name: 'brand', type: 'text' },
        { name: 'axles', type: 'number', required: true, min: 2, max: 9 }, // 2 a 9 eixos
        {
          name: 'vehicle_type',
          type: 'select',
          values: ['truck', 'semi_trailer', 'bitrem', 'rodotrem', 'vuc', 'toco'],
          maxSelect: 1,
          required: true,
        },
        { name: 'tare_weight_kg', type: 'number' },
        { name: 'capacity_kg', type: 'number' },
        { name: 'renavam', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['active', 'maintenance', 'inactive'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_vehicles_plate ON vehicles (plate)'],
    })
    app.save(vehicles)

    // 3. drivers
    const drivers = new Collection({
      name: 'drivers',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'cpf', type: 'text', required: true },
        { name: 'cnh', type: 'text', required: true },
        { name: 'cnh_category', type: 'select', values: ['C', 'D', 'E'], maxSelect: 1 },
        { name: 'phone', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['available', 'on_trip', 'vacation', 'inactive'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_drivers_cpf ON drivers (cpf)'],
    })
    app.save(drivers)

    // 4. trips
    const trips = new Collection({
      name: 'trips',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'trip_code', type: 'text', required: true },
        { name: 'origin_city', type: 'text', required: true },
        { name: 'origin_state', type: 'text', required: true },
        { name: 'destination_city', type: 'text', required: true },
        { name: 'destination_state', type: 'text', required: true },
        { name: 'distance_km', type: 'number' },
        { name: 'vehicle_id', type: 'relation', collectionId: vehicles.id, maxSelect: 1 },
        { name: 'driver_id', type: 'relation', collectionId: drivers.id, maxSelect: 1 },
        { name: 'cargo_type', type: 'text' },
        { name: 'weight_kg', type: 'number' },
        { name: 'freight_value', type: 'number', required: true }, // Valor do frete
        { name: 'axles_count', type: 'number', required: true }, // Eixos para pedágio
        { name: 'toll_tollgate_count', type: 'number' }, // Quantidade de praças
        { name: 'toll_rate_per_axle', type: 'number' }, // Tarifa média por eixo
        { name: 'vpo_value', type: 'number', required: true }, // Valor total do Vale Pedágio Obrigatório
        {
          name: 'vpo_responsible',
          type: 'select',
          values: ['embarcador', 'transportador', 'destinatario'],
          maxSelect: 1,
        },
        { name: 'vpo_voucher_number', type: 'text' }, // Número do Vale Pedágio (quando gerado)
        {
          name: 'status',
          type: 'select',
          values: ['planned', 'in_progress', 'completed', 'cancelled'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_trips_code ON trips (trip_code)'],
    })
    app.save(trips)

    // 5. cte_documents
    const cteDocuments = new Collection({
      name: 'cte_documents',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'cte_number', type: 'number', required: true },
        { name: 'series', type: 'number', required: true },
        { name: 'access_key', type: 'text' },
        { name: 'trip_id', type: 'relation', collectionId: trips.id, maxSelect: 1 },
        { name: 'sender_name', type: 'text', required: true },
        { name: 'sender_document', type: 'text', required: true },
        { name: 'recipient_name', type: 'text', required: true },
        { name: 'recipient_document', type: 'text', required: true },
        { name: 'cargo_value', type: 'number' },
        { name: 'freight_value', type: 'number', required: true },
        { name: 'vpo_included', type: 'bool' },
        { name: 'vpo_value', type: 'number' },
        { name: 'total_cte_value', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['draft', 'pending', 'authorized', 'rejected', 'cancelled'],
          maxSelect: 1,
          required: true,
        },
        { name: 'status_message', type: 'text' },
        { name: 'protocol', type: 'text' },
        { name: 'issued_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_cte_number ON cte_documents (cte_number, series)'],
    })
    app.save(cteDocuments)
  },
  (app) => {
    const cte = app.findCollectionByNameOrId('cte_documents')
    if (cte) app.delete(cte)
    const trips = app.findCollectionByNameOrId('trips')
    if (trips) app.delete(trips)
    const drivers = app.findCollectionByNameOrId('drivers')
    if (drivers) app.delete(drivers)
    const vehicles = app.findCollectionByNameOrId('vehicles')
    if (vehicles) app.delete(vehicles)
    const company = app.findCollectionByNameOrId('company_settings')
    if (company) app.delete(company)
  },
)
