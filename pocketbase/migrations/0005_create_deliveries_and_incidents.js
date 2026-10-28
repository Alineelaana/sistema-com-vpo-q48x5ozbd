migrate(
  (app) => {
    // Obter referências para coleções existentes
    const vehiclesCol = app.findCollectionByNameOrId('vehicles')
    const driversCol = app.findCollectionByNameOrId('drivers')
    const tripsCol = app.findCollectionByNameOrId('trips')

    // 1. deliveries (Entregas e Coletas)
    const deliveries = new Collection({
      name: 'deliveries',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'type',
          type: 'select',
          values: ['delivery', 'pickup'],
          maxSelect: 1,
          required: true,
        },
        { name: 'customer_name', type: 'text', required: true },
        { name: 'customer_document', type: 'text' },
        { name: 'customer_phone', type: 'text' },
        { name: 'recipient_contact', type: 'text' },
        // Endereço
        { name: 'street', type: 'text', required: true },
        { name: 'number', type: 'text', required: true },
        { name: 'neighborhood', type: 'text' },
        { name: 'city', type: 'text', required: true },
        { name: 'state', type: 'text', required: true },
        { name: 'zip_code', type: 'text' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        // Carga
        { name: 'invoice_number', type: 'text' }, // NF vinculada
        { name: 'packages_count', type: 'number', min: 1 },
        { name: 'weight_kg', type: 'number', min: 0 },
        { name: 'volume_m3', type: 'number' },
        { name: 'cargo_value', type: 'number' },
        // Janela prevista
        { name: 'delivery_window_start', type: 'date' },
        { name: 'delivery_window_end', type: 'date' },
        // Status do ciclo de vida Fusion
        {
          name: 'status',
          type: 'select',
          values: ['scheduled', 'in_transit', 'delivered', 'incident', 'cancelled'],
          maxSelect: 1,
          required: true,
        },
        // Roteirização
        { name: 'sequence_order', type: 'number' },
        { name: 'route_code', type: 'text' },
        // Vínculos
        { name: 'vehicle_id', type: 'relation', collectionId: vehiclesCol.id, maxSelect: 1 },
        { name: 'driver_id', type: 'relation', collectionId: driversCol.id, maxSelect: 1 },
        { name: 'trip_id', type: 'relation', collectionId: tripsCol.id, maxSelect: 1 },
        // Comprovação de entrega (POD - Proof of Delivery)
        { name: 'receiver_name', type: 'text' },
        { name: 'receiver_document', type: 'text' },
        { name: 'signature_base64', type: 'text', maxSize: 500000 }, // Canvas assinatura
        { name: 'pod_photo', type: 'text', maxSize: 500000 }, // Imagem / base64 foto comprovante
        { name: 'completed_at', type: 'date' },
        // Auditoria de frete
        { name: 'expected_freight_value', type: 'number' }, // Frete previsto
        { name: 'invoiced_freight_value', type: 'number' }, // Frete faturado / informado
        { name: 'audit_difference', type: 'number' }, // faturado - previsto
        {
          name: 'audit_status',
          type: 'select',
          values: ['pending', 'ok', 'divergent'],
          maxSelect: 1,
        },
        { name: 'audit_notes', type: 'text' },
        // Sistema
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_deliveries_status ON deliveries (status)',
        'CREATE INDEX idx_deliveries_vehicle ON deliveries (vehicle_id)',
        'CREATE INDEX idx_deliveries_driver ON deliveries (driver_id)',
        'CREATE INDEX idx_deliveries_trip ON deliveries (trip_id)',
        'CREATE INDEX idx_deliveries_audit ON deliveries (audit_status)',
      ],
    })
    app.save(deliveries)

    // 2. delivery_incidents (Ocorrências de entregas / Torre de Controle)
    const deliveryIncidents = new Collection({
      name: 'delivery_incidents',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'delivery_id',
          type: 'relation',
          collectionId: deliveries.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: 'type',
          type: 'select',
          values: [
            'client_absent', // Cliente ausente
            'wrong_address', // Endereço incorreto
            'cargo_damage', // Avaria de mercadoria
            'customer_refused', // Recusa de recebimento
            'traffic_delay', // Trânsito / quebra de veículo
            'payment_issue', // Falta de pagamento/desacordo
            'bad_weather', // Intempéries
            'other', // Outros
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'reported_at', type: 'date', required: true },
        { name: 'resolved', type: 'bool' },
        { name: 'resolution_notes', type: 'text' },
        { name: 'resolved_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_incidents_delivery ON delivery_incidents (delivery_id)'],
    })
    app.save(deliveryIncidents)
  },
  (app) => {
    try {
      const incidents = app.findCollectionByNameOrId('delivery_incidents')
      if (incidents) app.delete(incidents)
    } catch (_) {}

    try {
      const deliveries = app.findCollectionByNameOrId('deliveries')
      if (deliveries) app.delete(deliveries)
    } catch (_) {}
  },
)
