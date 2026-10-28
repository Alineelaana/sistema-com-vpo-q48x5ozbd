migrate(
  (app) => {
    const deliveriesCol = app.findCollectionByNameOrId('deliveries')
    const incidentsCol = app.findCollectionByNameOrId('delivery_incidents')
    const vehiclesCol = app.findCollectionByNameOrId('vehicles')
    const driversCol = app.findCollectionByNameOrId('drivers')
    const tripsCol = app.findCollectionByNameOrId('trips')

    // Obter referências dos veículos, motoristas e viagens existentes
    let v1Id = ''
    let v2Id = ''
    try {
      v1Id = app.findFirstRecordByData('vehicles', 'plate', 'BRA2E19').id
    } catch (_) {
      try {
        const v = app.findRecordsByFilter('vehicles', '', '-created', 1, 0)
        if (v.length > 0) v1Id = v[0].id
      } catch (_) {}
    }

    try {
      v2Id = app.findFirstRecordByData('vehicles', 'plate', 'RLK8F40').id
    } catch (_) {
      v2Id = v1Id
    }

    let d1Id = ''
    let d2Id = ''
    try {
      d1Id = app.findFirstRecordByData('drivers', 'cpf', '123.456.789-01').id
    } catch (_) {
      try {
        const d = app.findRecordsByFilter('drivers', '', '-created', 1, 0)
        if (d.length > 0) d1Id = d[0].id
      } catch (_) {}
    }

    try {
      d2Id = app.findFirstRecordByData('drivers', 'cpf', '234.567.890-12').id
    } catch (_) {
      d2Id = d1Id
    }

    let t1Id = ''
    let t2Id = ''
    try {
      t1Id = app.findFirstRecordByData('trips', 'trip_code', 'VIAG-2025-001').id
    } catch (_) {}
    try {
      t2Id = app.findFirstRecordByData('trips', 'trip_code', 'VIAG-2025-002').id
    } catch (_) {}

    // Exemplo de assinatura em SVG data URL simples para POD pré-carregada
    const sampleSignature =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><path d="M20 60 Q 60 20, 100 50 T 180 40 T 260 70" stroke="%231e3a8a" stroke-width="3" fill="none"/></svg>'
    const samplePhoto =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23f1f5f9"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23475569">COMPROVANTE DE ENTREGA ASSINADO</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="12" fill="%230284c7">NF-e 048.291 - CANHOTO DIGITALIZADO</text></svg>'

    // Datas relativas
    const now = new Date()
    const pastHour = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
    const overdueTime = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const futureHour2 = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
    const futureHour4 = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString()

    const sampleDeliveries = [
      {
        type: 'delivery',
        customer_name: 'Supermercado Nova Esperança Ltda',
        customer_document: '14.281.940/0001-52',
        customer_phone: '(11) 98765-1122',
        recipient_contact: 'Gerente Roberto Alves',
        street: 'Av. Paulista',
        number: '1200',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '01310-100',
        latitude: -23.5614,
        longitude: -46.6559,
        invoice_number: 'NF-048291',
        packages_count: 35,
        weight_kg: 840,
        volume_m3: 4.2,
        cargo_value: 32500,
        delivery_window_start: pastHour,
        delivery_window_end: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        status: 'delivered',
        sequence_order: 1,
        route_code: 'ROTA-SP-01',
        vehicle_id: v1Id,
        driver_id: d1Id,
        trip_id: t1Id,
        receiver_name: 'Roberto Alves - Gerente de Recebimento',
        receiver_document: '321.654.987-00',
        signature_base64: sampleSignature,
        pod_photo: samplePhoto,
        completed_at: pastHour,
        expected_freight_value: 1200,
        invoiced_freight_value: 1200,
        audit_difference: 0,
        audit_status: 'ok',
        audit_notes: 'Conferência 100% sem divergências.',
      },
      {
        type: 'delivery',
        customer_name: 'Distribuidora de Alimentos Pinheiros',
        customer_document: '28.391.029/0001-44',
        customer_phone: '(11) 3045-8890',
        recipient_contact: 'Carlos Portaria',
        street: 'Rua dos Pinheiros',
        number: '850',
        neighborhood: 'Pinheiros',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '05422-001',
        latitude: -23.5672,
        longitude: -46.6853,
        invoice_number: 'NF-048292',
        packages_count: 50,
        weight_kg: 1250,
        volume_m3: 6.5,
        cargo_value: 54000,
        // Janela no passado = Atrasada na torre de controle
        delivery_window_start: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        delivery_window_end: overdueTime,
        status: 'in_transit',
        sequence_order: 2,
        route_code: 'ROTA-SP-01',
        vehicle_id: v1Id,
        driver_id: d1Id,
        trip_id: t1Id,
        expected_freight_value: 1800,
        invoiced_freight_value: 2150,
        audit_difference: 350,
        audit_status: 'divergent',
        audit_notes: 'Divergência de R$ 350,00 por taxa de descarga adicional não autorizada.',
      },
      {
        type: 'delivery',
        customer_name: 'Hospital e Maternidade Santa Clara',
        customer_document: '47.192.384/0001-18',
        customer_phone: '(11) 97123-9988',
        recipient_contact: 'Farmácia Central / Dra. Márcia',
        street: 'Rua Vergueiro',
        number: '2150',
        neighborhood: 'Vila Mariana',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '04101-100',
        latitude: -23.5855,
        longitude: -46.6389,
        invoice_number: 'NF-048293',
        packages_count: 12,
        weight_kg: 180,
        volume_m3: 1.5,
        cargo_value: 48900,
        delivery_window_start: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        delivery_window_end: futureHour2,
        status: 'incident',
        sequence_order: 3,
        route_code: 'ROTA-SP-01',
        vehicle_id: v1Id,
        driver_id: d1Id,
        trip_id: t1Id,
        expected_freight_value: 950,
        invoiced_freight_value: 0,
        audit_difference: -950,
        audit_status: 'pending',
        audit_notes: 'Pendente de re-entrega após ocorrência de cliente ausente.',
      },
      {
        type: 'delivery',
        customer_name: 'Rede Farma Mais Santana',
        customer_document: '51.982.110/0001-90',
        customer_phone: '(11) 2281-3344',
        recipient_contact: 'Dona Helena',
        street: 'Rua Voluntários da Pátria',
        number: '3100',
        neighborhood: 'Santana',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '02401-200',
        latitude: -23.4981,
        longitude: -46.6277,
        invoice_number: 'NF-048294',
        packages_count: 22,
        weight_kg: 410,
        volume_m3: 2.1,
        cargo_value: 19800,
        delivery_window_start: futureHour2,
        delivery_window_end: futureHour4,
        status: 'scheduled',
        vehicle_id: v2Id,
        driver_id: d2Id,
        trip_id: t2Id,
        expected_freight_value: 1100,
        invoiced_freight_value: 1100,
        audit_difference: 0,
        audit_status: 'pending',
      },
      {
        type: 'pickup',
        customer_name: 'Centro Logístico Anhanguera (Coleta Reversa)',
        customer_document: '60.334.221/0001-77',
        customer_phone: '(11) 3688-9000',
        recipient_contact: 'Expedição Setor 3',
        street: 'Rodovia Anhanguera',
        number: 'Km 18',
        neighborhood: 'Vila Jaraguá',
        city: 'São Paulo',
        state: 'SP',
        zip_code: '05112-000',
        latitude: -23.489,
        longitude: -46.745,
        invoice_number: 'NF-COL-881',
        packages_count: 15,
        weight_kg: 320,
        volume_m3: 3.0,
        cargo_value: 15000,
        delivery_window_start: futureHour2,
        delivery_window_end: futureHour4,
        status: 'scheduled',
        vehicle_id: v2Id,
        driver_id: d2Id,
        trip_id: t2Id,
        expected_freight_value: 650,
        invoiced_freight_value: 780,
        audit_difference: 130,
        audit_status: 'divergent',
        audit_notes: 'Adicional de permanência em doca informado pelo embarcador.',
      },
    ]

    const createdRecords = []
    for (const d of sampleDeliveries) {
      let rec
      try {
        rec = app.findFirstRecordByData('deliveries', 'invoice_number', d.invoice_number)
      } catch (_) {
        rec = new Record(deliveriesCol)
        for (const k in d) {
          if (d[k] !== undefined) {
            rec.set(k, d[k])
          }
        }
        app.save(rec)
      }
      createdRecords.push(rec)
    }

    // Criar uma ocorrência vinculada à entrega em 'incident'
    const incidentDelivery = createdRecords[2] // Hospital Santa Clara
    if (incidentDelivery) {
      try {
        const incidents = app.findRecordsByFilter(
          'delivery_incidents',
          `delivery_id = '${incidentDelivery.id}'`,
          '',
          1,
          0,
        )
        if (incidents.length === 0) {
          const inc = new Record(incidentsCol)
          inc.set('delivery_id', incidentDelivery.id)
          inc.set('type', 'client_absent')
          inc.set(
            'description',
            'Farmácia do hospital fechada para inventário interno até as 16h. Motorista contatou a coordenação e solicitou reagendamento.',
          )
          inc.set('reported_at', new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString())
          inc.set('resolved', false)
          app.save(inc)
        }
      } catch (_) {}
    }
  },
  (app) => {
    // rollback seed if needed
  },
)
