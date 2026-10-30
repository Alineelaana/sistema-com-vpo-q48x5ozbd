migrate(
  (app) => {
    // Backfill para garantir que todos os registros existentes em trips tenham dados padrão da Ordem de Transporte
    const trips = app.findRecordsByFilter('trips', '1=1', '', 50, 0)
    for (let i = 0; i < trips.length; i++) {
      const t = trips[i]
      const curStatus = t.get('status')
      const axles = t.getInt('axles_count') || 6
      const vpo = t.getFloat('vpo_value') || 0
      const freight = t.getFloat('freight_value') || 5000

      if (!t.get('sender_name')) {
        t.set('sender_name', 'Distribuidora Logística Central S/A')
      }
      if (!t.get('sender_document')) {
        t.set('sender_document', '23.456.789/0001-11')
      }
      if (!t.get('recipient_name')) {
        t.set('recipient_name', 'Supermercados Sul do Brasil Ltda')
      }
      if (!t.get('recipient_document')) {
        t.set('recipient_document', '34.567.890/0001-22')
      }
      if (!t.get('pickup_address')) {
        t.set(
          'pickup_address',
          `${t.getString('origin_city')}/${t.getString('origin_state')} - Pátio Central`,
        )
      }
      if (!t.get('delivery_address')) {
        t.set(
          'delivery_address',
          `${t.getString('destination_city')}/${t.getString('destination_state')} - CD 01`,
        )
      }
      if (!t.get('carrier_rntrc')) {
        t.set('carrier_rntrc', '49827361')
      }
      if (!t.get('carrier_profile')) {
        t.set('carrier_profile', 'tac_equiparado')
      }
      if (!t.get('transport_mode')) {
        t.set('transport_mode', 'lotacao')
      }
      if (!t.get('payment_terms')) {
        t.set('payment_terms', '70% Adiantamento + 30% Saldo na Entrega')
      }
      if (!t.get('minimum_floor_value')) {
        const floorEst = Math.round((t.getInt('distance_km') || 400) * 6.5)
        t.set('minimum_floor_value', floorEst)
        t.set('minimum_floor_status', freight >= floorEst ? 'validado' : 'abaixo_piso')
      }
      if (!t.get('insurance_policy_number')) {
        t.set('insurance_policy_number', 'POL-2026-PORTO-9841')
      }

      // Inicializar workflow_stages se vazio
      const nowIso = new Date().toISOString()
      const stages = {
        nfe: {
          status: 'concluida',
          updated_at: nowIso,
          message: 'NF-e importada e vinculada à operação.',
        },
        ordem: {
          status: 'concluida',
          updated_at: nowIso,
          message: `Ordem de Transporte ${t.getString('operation_number')} ativa.`,
        },
        veiculo_motorista: {
          status: t.get('vehicle_id') && t.get('driver_id') ? 'concluida' : 'requer_atencao',
          updated_at: nowIso,
          message:
            t.get('vehicle_id') && t.get('driver_id')
              ? 'Veículo e condutor alocados.'
              : 'Requer alocação.',
        },
        roteirizacao: {
          status: 'concluida',
          updated_at: nowIso,
          message: `Rota ${t.getString('origin_city')} ➔ ${t.getString('destination_city')} calculada (${t.get('distance_km')} km).`,
        },
        piso_minimo: {
          status: 'concluida',
          updated_at: nowIso,
          message: 'Piso mínimo ANTT validado conforme Res. 5.867/2019.',
        },
        cte: {
          status:
            curStatus === 'completed' || curStatus === 'in_progress' ? 'concluida' : 'pendente',
          updated_at: nowIso,
          message:
            curStatus === 'completed'
              ? 'CT-e autorizado pela SEFAZ.'
              : 'Aguardando transmissão SEFAZ.',
        },
        contrato: {
          status: 'concluida',
          updated_at: nowIso,
          message: 'CTRB e contrato de frete emitidos.',
        },
        ciot: {
          status:
            curStatus === 'completed' || curStatus === 'in_progress' ? 'concluida' : 'pendente',
          updated_at: nowIso,
          message:
            curStatus === 'completed' ? 'CIOT cadastrado na IPEF.' : 'Pendente de protocolo IPEF.',
        },
        vpo: {
          status: vpo > 0 ? 'concluida' : 'pendente',
          updated_at: nowIso,
          message:
            vpo > 0
              ? `VPO de R$ ${vpo.toFixed(2)} emitido com sucesso.`
              : 'Aguardando provisionamento.',
        },
        mdfe: {
          status:
            curStatus === 'completed' || curStatus === 'in_progress' ? 'concluida' : 'pendente',
          updated_at: nowIso,
          message:
            curStatus === 'completed'
              ? 'MDF-e autorizado perante SEFAZ.'
              : 'Aguardando autorização do CT-e.',
        },
        envio: {
          status: curStatus === 'completed' ? 'concluida' : 'pendente',
          updated_at: nowIso,
          message:
            curStatus === 'completed'
              ? 'Documentos despachados via Agente de Despacho.'
              : 'Aguardando liberação.',
        },
        liberacao: {
          status:
            curStatus === 'completed' || curStatus === 'in_progress' ? 'concluida' : 'pendente',
          updated_at: nowIso,
          message:
            curStatus === 'in_progress'
              ? 'Viagem liberada e em trânsito.'
              : 'Aguardando liberação.',
        },
      }

      t.set('workflow_stages', JSON.stringify(stages))
      app.save(t)
    }
  },
  (app) => {},
)
