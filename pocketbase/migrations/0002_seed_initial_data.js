migrate(
  (app) => {
    // 1. Seed user if not exists
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let adminUserId = ''
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'alineelaana@gmail.com')
      adminUserId = admin.id
    } catch (_) {
      const record = new Record(users)
      record.setEmail('alineelaana@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Operador Connect')
      app.save(record)
      adminUserId = record.id
    }

    // 2. Seed company_settings
    const companyCol = app.findCollectionByNameOrId('company_settings')
    try {
      app.findFirstRecordByData('company_settings', 'cnpj', '12.345.678/0001-90')
    } catch (_) {
      const comp = new Record(companyCol)
      comp.set('corporate_name', 'TransConnect Logística e Transportes Rodoviários Ltda')
      comp.set('trade_name', 'TransConnect Transportes')
      comp.set('cnpj', '12.345.678/0001-90')
      comp.set('state_registration', '123.456.789.000')
      comp.set('rntrc', '49827361')
      comp.set('phone', '(11) 4002-8922')
      comp.set('email', 'fiscal@transconnect.com.br')
      comp.set('address', 'Rodovia dos Bandeirantes, Km 68, Galpão 4')
      comp.set('city', 'Jundiaí')
      comp.set('state', 'SP')
      comp.set('certificate_name', 'CERT_TRANSCONNECT_A1.pfx')
      comp.set('certificate_validity', '15/12/2026')
      comp.set('certificate_status', 'configured')
      comp.set('sefaz_environment', 'homologation')
      comp.set('cte_series', 1)
      comp.set('cte_current_number', 1042)
      app.save(comp)
    }

    // 3. Seed vehicles
    const vehiclesCol = app.findCollectionByNameOrId('vehicles')
    const seededVehicles = [
      {
        plate: 'BRA2E19',
        model: 'Scania R 450 6x2',
        brand: 'Scania',
        axles: 6,
        vehicle_type: 'truck',
        tare_weight_kg: 8500,
        capacity_kg: 32000,
        renavam: '98765432101',
        status: 'active',
      },
      {
        plate: 'RLK8F40',
        model: 'Volvo FH 540 6x4 Bitrem',
        brand: 'Volvo',
        axles: 7,
        vehicle_type: 'bitrem',
        tare_weight_kg: 14000,
        capacity_kg: 57000,
        renavam: '87654321092',
        status: 'active',
      },
      {
        plate: 'FTX4A72',
        model: 'Mercedes-Benz Actros 2651',
        brand: 'Mercedes-Benz',
        axles: 5,
        vehicle_type: 'semi_trailer',
        tare_weight_kg: 9200,
        capacity_kg: 41500,
        renavam: '76543210983',
        status: 'active',
      },
      {
        plate: 'QPR9C15',
        model: 'VW Constellation 24.280',
        brand: 'Volkswagen',
        axles: 3,
        vehicle_type: 'toco',
        tare_weight_kg: 6800,
        capacity_kg: 16000,
        renavam: '65432109874',
        status: 'maintenance',
      },
    ]

    const vehicleRecords = []
    for (const v of seededVehicles) {
      let rec
      try {
        rec = app.findFirstRecordByData('vehicles', 'plate', v.plate)
      } catch (_) {
        rec = new Record(vehiclesCol)
        for (const k in v) {
          rec.set(k, v[k])
        }
        app.save(rec)
      }
      vehicleRecords.push(rec)
    }

    // 4. Seed drivers
    const driversCol = app.findCollectionByNameOrId('drivers')
    const seededDrivers = [
      {
        name: 'Carlos Eduardo Silveira',
        cpf: '123.456.789-01',
        cnh: '04829104821',
        cnh_category: 'E',
        phone: '(11) 98765-4321',
        status: 'available',
      },
      {
        name: 'Marcos Roberto Fernandes',
        cpf: '234.567.890-12',
        cnh: '03918274910',
        cnh_category: 'E',
        phone: '(19) 99123-5567',
        status: 'on_trip',
      },
      {
        name: 'Julio Cesar de Almeida',
        cpf: '345.678.901-23',
        cnh: '05829104712',
        cnh_category: 'D',
        phone: '(31) 98456-1122',
        status: 'available',
      },
      {
        name: 'Antonio Pereira Lima',
        cpf: '456.789.012-34',
        cnh: '02819401723',
        cnh_category: 'E',
        phone: '(41) 99781-3344',
        status: 'vacation',
      },
    ]

    const driverRecords = []
    for (const d of seededDrivers) {
      let rec
      try {
        rec = app.findFirstRecordByData('drivers', 'cpf', d.cpf)
      } catch (_) {
        rec = new Record(driversCol)
        for (const k in d) {
          rec.set(k, d[k])
        }
        app.save(rec)
      }
      driverRecords.push(rec)
    }

    // 5. Seed trips
    const tripsCol = app.findCollectionByNameOrId('trips')
    const v1 = vehicleRecords[0]
    const v2 = vehicleRecords[1]
    const d1 = driverRecords[0]
    const d2 = driverRecords[1]

    const seededTrips = [
      {
        trip_code: 'VIAG-2025-001',
        origin_city: 'São Paulo',
        origin_state: 'SP',
        destination_city: 'Belo Horizonte',
        destination_state: 'MG',
        distance_km: 585,
        vehicle_id: v1.id,
        driver_id: d1.id,
        cargo_type: 'Peças Automotivas / Paletes',
        weight_kg: 22500,
        freight_value: 8400,
        axles_count: 6,
        toll_tollgate_count: 8,
        toll_rate_per_axle: 8.8,
        vpo_value: 422.4, // 8 * 6 * 8.80
        vpo_responsible: 'embarcador',
        vpo_voucher_number: 'VP-849201940',
        status: 'in_progress',
      },
      {
        trip_code: 'VIAG-2025-002',
        origin_city: 'Campinas',
        origin_state: 'SP',
        destination_city: 'Curitiba',
        destination_state: 'PR',
        distance_km: 470,
        vehicle_id: v2.id,
        driver_id: d2.id,
        cargo_type: 'Alimentos Industrializados',
        weight_kg: 34000,
        freight_value: 9800,
        axles_count: 7,
        toll_tollgate_count: 6,
        toll_rate_per_axle: 9.4,
        vpo_value: 394.8, // 6 * 7 * 9.40
        vpo_responsible: 'embarcador',
        vpo_voucher_number: 'VP-712894103',
        status: 'completed',
      },
      {
        trip_code: 'VIAG-2025-003',
        origin_city: 'Santos',
        origin_state: 'SP',
        destination_city: 'Ribeirão Preto',
        destination_state: 'SP',
        distance_km: 380,
        vehicle_id: v1.id,
        driver_id: d1.id,
        cargo_type: 'Insumos Agrícolas / Adubo',
        weight_kg: 27000,
        freight_value: 6200,
        axles_count: 6,
        toll_tollgate_count: 5,
        toll_rate_per_axle: 10.2,
        vpo_value: 306.0,
        vpo_responsible: 'embarcador',
        vpo_voucher_number: 'VP-910482015',
        status: 'planned',
      },
    ]

    const tripRecords = []
    for (const t of seededTrips) {
      let rec
      try {
        rec = app.findFirstRecordByData('trips', 'trip_code', t.trip_code)
      } catch (_) {
        rec = new Record(tripsCol)
        for (const k in t) {
          rec.set(k, t[k])
        }
        app.save(rec)
      }
      tripRecords.push(rec)
    }

    // 6. Seed cte_documents
    const cteCol = app.findCollectionByNameOrId('cte_documents')
    const seededCtes = [
      {
        cte_number: 1040,
        series: 1,
        access_key: '35250212345678000190570010000010401092837482',
        trip_id: tripRecords[1].id,
        sender_name: 'Distribuidora Central Paulista S/A',
        sender_document: '23.456.789/0001-11',
        recipient_name: 'Supermercados Sul do Brasil Ltda',
        recipient_document: '34.567.890/0001-22',
        cargo_value: 285000,
        freight_value: 9800,
        vpo_included: true,
        vpo_value: 394.8,
        total_cte_value: 10194.8,
        status: 'authorized',
        status_message: 'Autorizado o uso do CT-e (SEFAZ-SP)',
        protocol: '135250009847123',
        issued_at: '2025-02-20 14:30:00.000Z',
      },
      {
        cte_number: 1041,
        series: 1,
        access_key: '35250212345678000190570010000010411084920193',
        trip_id: tripRecords[0].id,
        sender_name: 'Metalúrgica Autopeças Brasil S/A',
        sender_document: '45.678.901/0001-33',
        recipient_name: 'Montadora de Veículos Mineira Ltda',
        recipient_document: '56.789.012/0001-44',
        cargo_value: 195000,
        freight_value: 8400,
        vpo_included: true,
        vpo_value: 422.4,
        total_cte_value: 8822.4,
        status: 'authorized',
        status_message: 'Autorizado o uso do CT-e (SEFAZ-MG)',
        protocol: '135250009918234',
        issued_at: '2025-02-24 09:15:00.000Z',
      },
      {
        cte_number: 1042,
        series: 1,
        access_key: '35250212345678000190570010000010421073829104',
        trip_id: tripRecords[2].id,
        sender_name: 'AgroQuímica Paulista Indústria',
        sender_document: '67.890.123/0001-55',
        recipient_name: 'Cooperativa Agrícola do Interior',
        recipient_document: '78.901.234/0001-66',
        cargo_value: 140000,
        freight_value: 6200,
        vpo_included: true,
        vpo_value: 306.0,
        total_cte_value: 6506.0,
        status: 'pending',
        status_message: 'Aguardando validação com SEFAZ',
        protocol: '',
        issued_at: '2025-02-25 11:00:00.000Z',
      },
    ]

    for (const c of seededCtes) {
      try {
        app.findFirstRecordByData('cte_documents', 'cte_number', c.cte_number)
      } catch (_) {
        const rec = new Record(cteCol)
        for (const k in c) {
          rec.set(k, c[k])
        }
        app.save(rec)
      }
    }
  },
  (app) => {
    // rollback logic if needed
  },
)
