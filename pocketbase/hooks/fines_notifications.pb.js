/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks para notificações de vencimento de multas e rotinas diárias.
 * Observação do JSVM do PocketBase: cada callback executa em uma pool separada,
 * portanto toda a lógica de cada hook deve ficar inline no corpo do callback.
 */

// 1. Cron diário agendado para rodar todo dia às 06:00
cronAdd('daily_fines_due_check', '0 6 * * *', () => {
  try {
    const notifCol = $app.findCollectionByNameOrId('fine_notifications')
    const now = new Date()
    const todayMs = now.getTime()

    const pendingFines = $app.findRecordsByFilter(
      'traffic_fines',
      "status = 'pending'",
      'due_date',
      500,
      0,
    )

    let count = 0

    for (let i = 0; i < pendingFines.length; i++) {
      const fine = pendingFines[i]
      const dueDateStr = fine.getString('due_date')
      if (!dueDateStr) continue

      const dueDate = new Date(dueDateStr)
      const diffMs = dueDate.getTime() - todayMs
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      const isOverdue = diffDays < 0
      const isDueSoon = diffDays >= 0 && diffDays <= 7

      if (!isOverdue && !isDueSoon) continue

      const notifType = isOverdue ? 'overdue' : 'due_soon'

      let existingNotif = null
      try {
        existingNotif = $app.findFirstRecordByFilter(
          'fine_notifications',
          `fine_id = '${fine.id}' && type = '${notifType}'`,
        )
      } catch (_) {}

      if (existingNotif) continue

      let vehiclePlate = '—'
      let driverName = 'Não identificado'
      const vehicleId = fine.getString('vehicle_id')
      const driverId = fine.getString('driver_id')

      if (vehicleId) {
        try {
          const v = $app.findRecordById('vehicles', vehicleId)
          vehiclePlate = v.getString('plate')
        } catch (_) {}
      }

      if (driverId) {
        try {
          const d = $app.findRecordById('drivers', driverId)
          driverName = d.getString('name')
        } catch (_) {}
      }

      const noticeNumber = fine.getString('notice_number')
      const amountVal = fine.getFloat('amount')
      const absDays = Math.abs(diffDays)
      const daysText = isOverdue
        ? `vencida há ${absDays} dia(s)`
        : `vence em ${diffDays === 0 ? 'hoje' : diffDays + ' dia(s)'}`

      const title = isOverdue
        ? `Multa Vencida (${noticeNumber})`
        : `Vencimento Próximo (${noticeNumber})`

      const message = `Auto ${noticeNumber} • Placa ${vehiclePlate} • Motorista: ${driverName} • Valor: R$ ${amountVal.toFixed(
        2,
      )} • Situação: ${daysText}.`

      const rec = new Record(notifCol)
      rec.set('fine_id', fine.id)
      rec.set('type', notifType)
      rec.set('title', title)
      rec.set('message', message)
      rec.set('days_diff', absDays)
      rec.set('is_read', false)
      $app.save(rec)
      count++
    }

    console.log(
      `[cron:daily_fines_due_check] Verificação diária concluída. ${count} notificações geradas.`,
    )
  } catch (err) {
    console.error(`[cron:daily_fines_due_check] Erro:`, err)
  }
})

// 2. Rota personalizada para verificação de notificações sob demanda
routerAdd('POST', '/backend/v1/fines/check-notifications', (e) => {
  try {
    const notifCol = e.app.findCollectionByNameOrId('fine_notifications')
    const now = new Date()
    const todayMs = now.getTime()

    const pendingFines = e.app.findRecordsByFilter(
      'traffic_fines',
      "status = 'pending'",
      'due_date',
      500,
      0,
    )

    let count = 0

    for (let i = 0; i < pendingFines.length; i++) {
      const fine = pendingFines[i]
      const dueDateStr = fine.getString('due_date')
      if (!dueDateStr) continue

      const dueDate = new Date(dueDateStr)
      const diffMs = dueDate.getTime() - todayMs
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      const isOverdue = diffDays < 0
      const isDueSoon = diffDays >= 0 && diffDays <= 7

      if (!isOverdue && !isDueSoon) continue

      const notifType = isOverdue ? 'overdue' : 'due_soon'

      let existingNotif = null
      try {
        existingNotif = e.app.findFirstRecordByFilter(
          'fine_notifications',
          `fine_id = '${fine.id}' && type = '${notifType}'`,
        )
      } catch (_) {}

      if (existingNotif) continue

      let vehiclePlate = '—'
      let driverName = 'Não identificado'
      const vehicleId = fine.getString('vehicle_id')
      const driverId = fine.getString('driver_id')

      if (vehicleId) {
        try {
          const v = e.app.findRecordById('vehicles', vehicleId)
          vehiclePlate = v.getString('plate')
        } catch (_) {}
      }

      if (driverId) {
        try {
          const d = e.app.findRecordById('drivers', driverId)
          driverName = d.getString('name')
        } catch (_) {}
      }

      const noticeNumber = fine.getString('notice_number')
      const amountVal = fine.getFloat('amount')
      const absDays = Math.abs(diffDays)
      const daysText = isOverdue
        ? `vencida há ${absDays} dia(s)`
        : `vence em ${diffDays === 0 ? 'hoje' : diffDays + ' dia(s)'}`

      const title = isOverdue
        ? `Multa Vencida (${noticeNumber})`
        : `Vencimento Próximo (${noticeNumber})`

      const message = `Auto ${noticeNumber} • Placa ${vehiclePlate} • Motorista: ${driverName} • Valor: R$ ${amountVal.toFixed(
        2,
      )} • Situação: ${daysText}.`

      const rec = new Record(notifCol)
      rec.set('fine_id', fine.id)
      rec.set('type', notifType)
      rec.set('title', title)
      rec.set('message', message)
      rec.set('days_diff', absDays)
      rec.set('is_read', false)
      e.app.save(rec)
      count++
    }

    return e.json(200, {
      success: true,
      generated: count,
      message: `Verificação de multas realizada com sucesso. ${count} novas notificações criadas.`,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: err ? err.message || String(err) : 'Erro desconhecido',
    })
  }
})

// 3. Quando o status da multa mudar para 'paid' ou 'appealed' ou 'cancelled', remover/resolver notificações pendentes dela
onRecordAfterUpdateSuccess((e) => {
  try {
    const status = e.record.getString('status')
    if (status === 'paid' || status === 'appealed' || status === 'cancelled') {
      const fineId = e.record.id
      const notifications = e.app.findRecordsByFilter(
        'fine_notifications',
        `fine_id = '${fineId}'`,
        '-created',
        100,
        0,
      )
      let removed = 0
      for (let i = 0; i < notifications.length; i++) {
        try {
          e.app.delete(notifications[i])
          removed++
        } catch (_) {}
      }
      if (removed > 0) {
        console.log(
          `[fine_notifications] ${removed} notificação(ões) removida(s) para a multa ${fineId} (status: ${status}).`,
        )
      }
    }
  } catch (err) {
    console.error(`[fine_notifications] Erro no hook onRecordAfterUpdateSuccess:`, err)
  }
  e.next()
}, 'traffic_fines')

// 4. Quando uma multa for excluída, limpar notificações vinculadas
onRecordAfterDeleteSuccess((e) => {
  try {
    const fineId = e.record.id
    const notifications = e.app.findRecordsByFilter(
      'fine_notifications',
      `fine_id = '${fineId}'`,
      '-created',
      100,
      0,
    )
    for (let i = 0; i < notifications.length; i++) {
      try {
        e.app.delete(notifications[i])
      } catch (_) {}
    }
  } catch (err) {
    console.error(`[fine_notifications] Erro no hook onRecordAfterDeleteSuccess:`, err)
  }
  e.next()
}, 'traffic_fines')
