migrate(
  (app) => {
    // 1. Criar collection fine_notifications
    const trafficFinesCol = app.findCollectionByNameOrId('traffic_fines')

    const fineNotifications = new Collection({
      name: 'fine_notifications',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'fine_id',
          type: 'relation',
          required: true,
          collectionId: trafficFinesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['due_soon', 'overdue'],
          maxSelect: 1,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'message',
          type: 'text',
          required: true,
        },
        {
          name: 'days_diff',
          type: 'number',
          required: false,
        },
        {
          name: 'is_read',
          type: 'bool',
          required: false,
        },
        {
          name: 'read_at',
          type: 'date',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notif_fine ON fine_notifications (fine_id)',
        'CREATE INDEX idx_notif_read ON fine_notifications (is_read)',
        'CREATE INDEX idx_notif_type ON fine_notifications (type)',
      ],
    })
    app.save(fineNotifications)

    // 2. Seed de multas críticas adicionais (vencendo em breve e vencida recente)
    // para garantir demonstração imediata no preview
    const vehiclesCol = app.findCollectionByNameOrId('vehicles')
    const driversCol = app.findCollectionByNameOrId('drivers')
    const finesCol = app.findCollectionByNameOrId('traffic_fines')
    const notifCol = app.findCollectionByNameOrId('fine_notifications')

    let v1Id = ''
    try {
      const v = app.findFirstRecordByData('vehicles', 'plate', 'BRA2E19')
      v1Id = v.id
    } catch (_) {}

    let v2Id = ''
    try {
      const v = app.findFirstRecordByData('vehicles', 'plate', 'RLK8F40')
      v2Id = v.id
    } catch (_) {}

    let d1Id = ''
    try {
      const d = app.findFirstRecordByData('drivers', 'cpf', '123.456.789-01')
      d1Id = d.id
    } catch (_) {}

    let d2Id = ''
    try {
      const d = app.findFirstRecordByData('drivers', 'cpf', '234.567.890-12')
      d2Id = d.id
    } catch (_) {}

    const now = new Date()

    // Data daqui a 4 dias (vencendo em breve - alerta de 7 dias)
    const in4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)
    // Data de 3 dias atrás (vencida)
    const ago3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    const extraFines = [
      {
        vehicle_id: v1Id || v2Id || '',
        driver_id: d1Id || '',
        infraction_date: new Date(now.getTime() - 20 * 86400000).toISOString(),
        description: 'Transitar em velocidade superior à máxima em mais de 20% até 50%',
        location: 'Rodovia dos Imigrantes (SP-160), Km 28 - São Bernardo/SP',
        infraction_type: 'speeding',
        severity: 'grave',
        points: 5,
        amount: 195.23,
        notice_number: 'DER-SP-9014281',
        issuing_body: 'DER-SP',
        due_date: in4Days.toISOString(),
        status: 'pending',
        notes: 'AIT gerado por radar móvel. Vencimento próximo em 4 dias.',
      },
      {
        vehicle_id: v2Id || v1Id || '',
        driver_id: d2Id || d1Id || '',
        infraction_date: new Date(now.getTime() - 35 * 86400000).toISOString(),
        description: 'Ultrapassagem pela contramão em linha dupla contínua amarela',
        location: 'BR-101, Km 205 - Joinville/SC',
        infraction_type: 'overtaking',
        severity: 'very_grave',
        points: 7,
        amount: 1467.35,
        notice_number: 'PRF-SC-5529103',
        issuing_body: 'PRF',
        due_date: ago3Days.toISOString(),
        status: 'pending',
        notes: 'Multa vencida há 3 dias sem comprovante de pagamento.',
      },
    ]

    for (const fineData of extraFines) {
      if (!fineData.vehicle_id) continue
      let fineRec = null
      try {
        fineRec = app.findFirstRecordByData(
          'traffic_fines',
          'notice_number',
          fineData.notice_number,
        )
      } catch (_) {
        fineRec = new Record(finesCol)
        for (const k in fineData) {
          if (fineData[k] !== undefined && fineData[k] !== '') {
            fineRec.set(k, fineData[k])
          }
        }
        app.save(fineRec)
      }

      if (fineRec) {
        // Criar notificação inicial correspondente se ainda não houver
        const fineDueDate = new Date(fineRec.getString('due_date'))
        const diffDays = Math.round((fineDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const isOverdue = diffDays < 0
        const notifType = isOverdue ? 'overdue' : 'due_soon'

        let existingNotif = null
        try {
          existingNotif = app.findFirstRecordByFilter(
            'fine_notifications',
            `fine_id = '${fineRec.id}' && type = '${notifType}'`,
          )
        } catch (_) {}

        if (!existingNotif) {
          const rec = new Record(notifCol)
          rec.set('fine_id', fineRec.id)
          rec.set('type', notifType)
          rec.set(
            'title',
            isOverdue
              ? `Multa Vencida (${fineRec.getString('notice_number')})`
              : `Vencimento Próximo (${fineRec.getString('notice_number')})`,
          )
          const daysText = isOverdue
            ? `vencida há ${Math.abs(diffDays)} dia(s)`
            : `vence em ${diffDays} dia(s)`
          const plate = fineData.vehicle_id === v1Id ? 'BRA2E19' : 'RLK8F40'
          rec.set(
            'message',
            `Auto ${fineRec.getString('notice_number')} • Placa ${plate} • Valor: R$ ${fineRec.getFloat('amount').toFixed(2)} • ${daysText}.`,
          )
          rec.set('days_diff', Math.abs(diffDays))
          rec.set('is_read', false)
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('fine_notifications')
    if (col) app.delete(col)
  },
)
