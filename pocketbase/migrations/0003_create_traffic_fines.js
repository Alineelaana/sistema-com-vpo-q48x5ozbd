migrate(
  (app) => {
    // 1. Criar collection traffic_fines
    const vehiclesCol = app.findCollectionByNameOrId('vehicles')
    const driversCol = app.findCollectionByNameOrId('drivers')

    const trafficFines = new Collection({
      name: 'traffic_fines',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'vehicle_id',
          type: 'relation',
          required: true,
          collectionId: vehiclesCol.id,
          maxSelect: 1,
        },
        {
          name: 'driver_id',
          type: 'relation',
          required: false,
          collectionId: driversCol.id,
          maxSelect: 1,
        },
        {
          name: 'infraction_date',
          type: 'date',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          required: true,
        },
        {
          name: 'location',
          type: 'text',
        },
        {
          name: 'infraction_type',
          type: 'select',
          required: true,
          values: [
            'speeding',
            'weight_scale',
            'red_light',
            'parking',
            'overtaking',
            'seatbelt',
            'phone_usage',
            'tachograph',
            'other',
          ],
          maxSelect: 1,
        },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['light', 'medium', 'grave', 'very_grave'],
          maxSelect: 1,
        },
        {
          name: 'points',
          type: 'number',
          required: false,
          min: 0,
          max: 20,
        },
        {
          name: 'amount',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'notice_number',
          type: 'text',
          required: true,
        },
        {
          name: 'issuing_body',
          type: 'text',
          required: true,
        },
        {
          name: 'due_date',
          type: 'date',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'paid', 'appealed', 'cancelled'],
          maxSelect: 1,
        },
        {
          name: 'payment_date',
          type: 'date',
        },
        {
          name: 'appeal_number',
          type: 'text',
        },
        {
          name: 'notes',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_fines_notice ON traffic_fines (notice_number)',
        'CREATE INDEX idx_fines_status ON traffic_fines (status)',
        'CREATE INDEX idx_fines_vehicle ON traffic_fines (vehicle_id)',
      ],
    })
    app.save(trafficFines)

    // 2. Seed inicial idempotente de multas para demonstração imediata
    const finesCol = app.findCollectionByNameOrId('traffic_fines')

    // Buscar veículos e motoristas existentes para relacionar
    let vehicle1Id = ''
    let vehicle2Id = ''
    try {
      const v1 = app.findFirstRecordByData('vehicles', 'plate', 'BRA2E19')
      vehicle1Id = v1.id
    } catch (_) {}

    try {
      const v2 = app.findFirstRecordByData('vehicles', 'plate', 'RLK8F40')
      vehicle2Id = v2.id
    } catch (_) {}

    let driver1Id = ''
    let driver2Id = ''
    try {
      const d1 = app.findFirstRecordByData('drivers', 'cpf', '123.456.789-01')
      driver1Id = d1.id
    } catch (_) {}

    try {
      const d2 = app.findFirstRecordByData('drivers', 'cpf', '234.567.890-12')
      driver2Id = d2.id
    } catch (_) {}

    if (vehicle1Id) {
      const seedFines = [
        {
          vehicle_id: vehicle1Id,
          driver_id: driver1Id || '',
          infraction_date: '2025-02-14 10:25:00.000Z',
          description: 'Transitar em velocidade superior à máxima permitida em até 20%',
          location: 'Rodovia dos Bandeirantes, Km 72 - Itupeva/SP',
          infraction_type: 'speeding',
          severity: 'medium',
          points: 4,
          amount: 130.16,
          notice_number: 'DER-SP-8941029',
          issuing_body: 'DER-SP',
          due_date: '2025-03-20 23:59:59.000Z',
          status: 'pending',
          notes: 'Radar fixo no sentido capital/interior. Notificação recebida em 20/02.',
        },
        {
          vehicle_id: vehicle2Id || vehicle1Id,
          driver_id: driver2Id || '',
          infraction_date: '2025-02-18 14:40:00.000Z',
          description: 'Evasão ou não adentramento no posto de pesagem veicular obrigatório',
          location: 'BR-116, Km 114 - Curitiba/PR',
          infraction_type: 'weight_scale',
          severity: 'grave',
          points: 5,
          amount: 195.23,
          notice_number: 'PRF-PR-7482910',
          issuing_body: 'PRF',
          due_date: '2025-03-15 23:59:59.000Z',
          status: 'appealed',
          appeal_number: 'REC-2025-0491',
          notes:
            'Motorista alega sinalização de pesagem apagada pela chuva forte. Recurso em 1ª instância no JARI PRF.',
        },
        {
          vehicle_id: vehicle1Id,
          driver_id: driver1Id || '',
          infraction_date: '2025-01-10 08:15:00.000Z',
          description: 'Deixar de manter acesa luz baixa de dia em rodovias',
          location: 'SP-348, Km 45 - Jundiaí/SP',
          infraction_type: 'other',
          severity: 'medium',
          points: 4,
          amount: 130.16,
          notice_number: 'PMRV-SP-6192841',
          issuing_body: 'Polícia Militar Rodoviária SP',
          due_date: '2025-02-10 23:59:59.000Z',
          status: 'paid',
          payment_date: '2025-02-05 11:30:00.000Z',
          notes: 'Pago com desconto de 20% pelo SNE.',
        },
      ]

      for (const fine of seedFines) {
        try {
          app.findFirstRecordByData('traffic_fines', 'notice_number', fine.notice_number)
        } catch (_) {
          const rec = new Record(finesCol)
          for (const k in fine) {
            if (fine[k] !== undefined && fine[k] !== '') {
              rec.set(k, fine[k])
            }
          }
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    const fines = app.findCollectionByNameOrId('traffic_fines')
    if (fines) app.delete(fines)
  },
)
