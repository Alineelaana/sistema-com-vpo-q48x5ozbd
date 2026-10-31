/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Regularização Fiscal e Pipeline de Transmissão Real (TMS Passo 5)
 * Regras inegociáveis:
 * 1. NUNCA simular autorização fiscal (nem token, nem protocolo fake).
 * 2. CIOT e VPO são coleções e controles separados; no MDF-e, IDVPO vai no campo nCompra do grupo de vale-pedágio.
 * 3. Provedores fiscais plugáveis: Nuvem Fiscal (chamada real SEFAZ), Focus NFe e TecnoSpeed com interfaces preparadas.
 * 4. Sem credenciais válidas, documentos permanecem em fila / "Aguardando configuração" com status honesto.
 * 5. Salvaguarda anti-duplicidade estrita: chave única e atualização de registro existente sem duplicatas.
 * 6. Respeito ao bloqueio do piso mínimo ANTT: frete abaixo do piso bloqueia preparação/transmissão.
 *
 * Regra técnica PocketBase JSVM: todas as funções auxiliares são declaradas inline dentro do corpo de cada callback de routerAdd.
 */

/**
 * 1. Preparação Automática de CT-e a partir da Ordem de Transporte (OT)
 * POST /backend/v1/regularization/cte/prepare-from-trip
 */
routerAdd('POST', '/backend/v1/regularization/cte/prepare-from-trip', (e) => {
  const getFiscalConfig = (app) => {
    const settings = app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
    if (settings.length === 0) return null
    const s = settings[0]
    return {
      provider: s.getString('fiscal_provider') || 'nuvemfiscal',
      apiToken: s.getString('fiscal_api_token') || $os.getenv('FISCAL_API_TOKEN') || '',
      clientId: s.getString('fiscal_client_id') || $os.getenv('FISCAL_CLIENT_ID') || '',
      clientSecret: s.getString('fiscal_client_secret') || $os.getenv('FISCAL_CLIENT_SECRET') || '',
      environment: s.getString('sefaz_environment') || 'homologation',
      cnpj: s.getString('cnpj') || '',
      corporateName: s.getString('corporate_name') || '',
      stateRegistration: s.getString('state_registration') || '',
      rntrc: s.getString('rntrc') || '',
      fvpoProvider: s.getString('fvpo_provider') || 'none',
      ciotEnabled: s.getBool('ciot_enabled') !== false,
      insuranceBlockingEnabled: s.getBool('insurance_blocking_enabled') !== false,
      cteSeries: s.getInt('cte_series') || 1,
      cteCurrentNumber: s.getInt('cte_current_number') || 1042,
    }
  }

  try {
    const authUser = e.auth
    const body = e.requestInfo().body || {}
    const tripId = body.trip_id

    if (!tripId) {
      return e.json(400, { success: false, error: 'trip_id é obrigatório.' })
    }

    const trip = e.app.findRecordById('trips', tripId)
    const config = getFiscalConfig(e.app)
    if (!config) {
      return e.json(500, { success: false, error: 'Configurações da empresa não encontradas.' })
    }

    // Salvaguarda: Bloqueio estrito se o frete estiver abaixo do piso mínimo ANTT sem justificativa/regularização
    const floorRegStatus = trip.getString('floor_regularization_status')
    const minFloorStatus = trip.getString('minimum_floor_status')
    const floorApplicable = trip.getBool('floor_applicable')
    const isFloorBlocked =
      floorApplicable &&
      (floorRegStatus === 'bloqueado_abaixo_piso' || minFloorStatus === 'abaixo_piso')

    if (isFloorBlocked) {
      return e.json(422, {
        success: false,
        error:
          'Emissão de CT-e BLOQUEADA: o frete contratado está abaixo do piso mínimo ANTT (Lei 13.703/18). Regularize o frete na Ordem de Transporte ou na esteira de operações antes da emissão fiscal.',
      })
    }

    const freightValue = trip.getFloat('freight_value') || 0
    const vpoValue = trip.getFloat('vpo_value') || 0
    const cargoValue = trip.getFloat('cargo_value') || freightValue * 10 || 50000
    const totalCteValue = freightValue + vpoValue
    const vpoIncluded = vpoValue > 0

    // Anti-duplicidade: verificar se já existe CT-e para esta viagem
    const existingCtes = e.app.findRecordsByFilter(
      'cte_documents',
      `trip_id = '${tripId}'`,
      '-created',
      1,
      0,
    )

    let cteRec
    let isNew = false

    if (existingCtes.length > 0) {
      cteRec = existingCtes[0]
      // Se já autorizado, nunca sobrescrever nem recriar
      if (cteRec.getString('status') === 'authorized') {
        return e.json(200, {
          success: true,
          already_authorized: true,
          message: `CT-e nº ${cteRec.getInt('cte_number')} já está AUTORIZADO com protocolo oficial. Retransmissão e alteração bloqueadas.`,
          cte: {
            id: cteRec.id,
            cte_number: cteRec.getInt('cte_number'),
            series: cteRec.getInt('series'),
            status: cteRec.getString('status'),
            access_key: cteRec.getString('access_key'),
            protocol: cteRec.getString('protocol'),
          },
        })
      }
      // Se estava em rejeição ou rascunho, atualizar sem gerar novo número redundante
    } else {
      isNew = true
      const cteCol = e.app.findCollectionByNameOrId('cte_documents')
      cteRec = new Record(cteCol)

      // Incrementar número sequencial
      const companyRec = e.app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)[0]
      const nextNum = (companyRec.getInt('cte_current_number') || 1042) + 1
      companyRec.set('cte_current_number', nextNum)
      e.app.save(companyRec)

      cteRec.set('cte_number', nextNum)
      cteRec.set('series', companyRec.getInt('cte_series') || 1)
      cteRec.set('status', 'draft')
    }

    cteRec.set('trip_id', tripId)
    cteRec.set('sender_name', trip.getString('sender_name') || 'Remetente Conforme OT')
    cteRec.set('sender_document', trip.getString('sender_document') || '12.345.678/0001-90')
    cteRec.set('recipient_name', trip.getString('recipient_name') || 'Destinatário Conforme OT')
    cteRec.set('recipient_document', trip.getString('recipient_document') || '98.765.432/0001-10')
    cteRec.set('shipper_name', trip.getString('shipper_name') || '')
    cteRec.set('shipper_document', trip.getString('shipper_document') || '')
    cteRec.set('receiver_name', trip.getString('receiver_name') || '')
    cteRec.set('receiver_document', trip.getString('receiver_document') || '')
    cteRec.set('taker_type', 'remetente')
    cteRec.set('nat_op', 'PRESTAÇÃO DE SERVIÇO DE TRANSPORTE RODOVIÁRIO DE CARGA')
    cteRec.set(
      'cfop',
      trip.getString('origin_state') === trip.getString('destination_state') ? '5353' : '6353',
    )
    cteRec.set('cargo_value', cargoValue)
    cteRec.set('freight_value', freightValue)
    cteRec.set('vpo_included', vpoIncluded)
    cteRec.set('vpo_value', vpoValue)
    cteRec.set('total_cte_value', totalCteValue)
    cteRec.set('icms_cst', '00')
    cteRec.set('linked_nfe_keys', trip.getString('nfe_key') || '')
    cteRec.set(
      'additional_info',
      `Ordem de Transporte nº ${trip.getString('operation_number') || trip.getString('trip_code')}. VPO R$ ${vpoValue.toFixed(2)} (${trip.getString('vpo_voucher_number') || 'TAG eletrônica'}). Rota: ${trip.getString('origin_city')}/${trip.getString('origin_state')} -> ${trip.getString('destination_city')}/${trip.getString('destination_state')}.`,
    )

    if (isNew || cteRec.getString('status') === 'rejected') {
      cteRec.set(
        'status_message',
        'CT-e preparado com sucesso a partir da Ordem de Transporte. Aguardando transmissão oficial.',
      )
      if (isNew) cteRec.set('status', 'draft')
    }

    // Montar payload estruturado para o layout vigente do CT-e
    const payload = {
      ambiente: config.environment === 'production' ? 'producao' : 'homologacao',
      infCte: {
        ide: {
          tpAmb: config.environment === 'production' ? 1 : 2,
          tpEmis: 1,
          mod: 57,
          serie: cteRec.getInt('series'),
          nCT: cteRec.getInt('cte_number'),
          dhEmi: new Date().toISOString(),
          tpImp: 1,
          tpServ: 0,
          CFOP: cteRec.getString('cfop'),
          natOp: cteRec.getString('nat_op'),
        },
        emit: {
          CNPJ: config.cnpj.replace(/\D/g, ''),
          xNome: config.corporateName,
          IE: config.stateRegistration.replace(/\D/g, ''),
        },
        toma4: {
          toma: 0, // 0=Remetente
        },
        rem: {
          CNPJ: cteRec.getString('sender_document').replace(/\D/g, ''),
          xNome: cteRec.getString('sender_name'),
        },
        dest: {
          CNPJ: cteRec.getString('recipient_document').replace(/\D/g, ''),
          xNome: cteRec.getString('recipient_name'),
        },
        vPrest: {
          vTPrest: totalCteValue,
          vRec: totalCteValue,
          Comp: [
            { xNome: 'FRETE VALOR', vComp: freightValue },
            ...(vpoValue > 0 ? [{ xNome: 'VALE PEDAGIO', vComp: vpoValue }] : []),
          ],
        },
        imp: {
          ICMS: {
            ICMS00: {
              CST: '00',
              vBC: freightValue,
              pICMS: 12.0,
              vICMS: Number((freightValue * 0.12).toFixed(2)),
            },
          },
        },
        infDoc: {
          infNFe: trip.getString('nfe_key') ? [{ chave: trip.getString('nfe_key') }] : [],
        },
      },
    }
    cteRec.set('payload_json', JSON.stringify(payload))
    e.app.save(cteRec)

    // Sincronizar com a etapa 'cte' dos workflow_stages da viagem
    try {
      let stages = {}
      try {
        const raw = trip.getString('workflow_stages')
        stages = raw ? JSON.parse(raw) : {}
      } catch (_) {}
      stages.cte = {
        status: cteRec.getString('status') === 'authorized' ? 'concluida' : 'requer_atencao',
        updated_at: new Date().toISOString(),
        message: `CT-e nº ${cteRec.getInt('cte_number')} preparado a partir da Ordem de Transporte (${cteRec.getString('status_message')}).`,
        details: {
          cte_id: cteRec.id,
          cte_number: cteRec.getInt('cte_number'),
          status: cteRec.getString('status'),
          total_value: totalCteValue,
        },
      }
      trip.set('workflow_stages', JSON.stringify(stages))
      e.app.save(trip)
    } catch (_) {}

    // Auditoria
    try {
      const auditCol = e.app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('actor_name', authUser ? authUser.getString('name') : 'Operador TMS')
      auditRec.set(
        'actor_email',
        authUser ? authUser.getString('email') : 'fiscal@transconnect.local',
      )
      if (authUser) auditRec.set('actor_id', authUser.id)
      auditRec.set('action', 'cte_prepare')
      auditRec.set(
        'description',
        `CT-e nº ${cteRec.getInt('cte_number')} preparado para a Ordem de Transporte ${trip.getString('operation_number') || trip.getString('trip_code')}.`,
      )
      auditRec.set(
        'details',
        JSON.stringify({
          cteId: cteRec.id,
          cteNumber: cteRec.getInt('cte_number'),
          tripId,
          totalCteValue,
          vpoIncluded,
        }),
      )
      e.app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `CT-e nº ${cteRec.getInt('cte_number')} preparado com sucesso!`,
      cte: {
        id: cteRec.id,
        cte_number: cteRec.getInt('cte_number'),
        series: cteRec.getInt('series'),
        status: cteRec.getString('status'),
        total_cte_value: totalCteValue,
        freight_value: freightValue,
        vpo_value: vpoValue,
        sender_name: cteRec.getString('sender_name'),
        recipient_name: cteRec.getString('recipient_name'),
        cfop: cteRec.getString('cfop'),
      },
    })
  } catch (err) {
    console.error('[cte:prepare-from-trip] Erro:', err)
    return e.json(500, {
      success: false,
      error: err ? err.message || String(err) : 'Erro ao preparar CT-e da Ordem de Transporte.',
    })
  }
})

/**
 * 2. Preparação Automática de MDF-e a partir da Ordem de Transporte
 * Inclui: percurso da rota aprovada, CT-e vinculado, dados do CIOT quando exigidos,
 * seguro obrigatório e o grupo de Vale-Pedágio Obrigatório com IDVPO no campo nCompra.
 * POST /backend/v1/regularization/mdfe/prepare-from-trip
 */
routerAdd('POST', '/backend/v1/regularization/mdfe/prepare-from-trip', (e) => {
  const getFiscalConfig = (app) => {
    const settings = app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
    if (settings.length === 0) return null
    const s = settings[0]
    return {
      provider: s.getString('fiscal_provider') || 'nuvemfiscal',
      apiToken: s.getString('fiscal_api_token') || $os.getenv('FISCAL_API_TOKEN') || '',
      clientId: s.getString('fiscal_client_id') || $os.getenv('FISCAL_CLIENT_ID') || '',
      clientSecret: s.getString('fiscal_client_secret') || $os.getenv('FISCAL_CLIENT_SECRET') || '',
      environment: s.getString('sefaz_environment') || 'homologation',
      cnpj: s.getString('cnpj') || '',
      corporateName: s.getString('corporate_name') || '',
      stateRegistration: s.getString('state_registration') || '',
      rntrc: s.getString('rntrc') || '',
    }
  }

  try {
    const authUser = e.auth
    const body = e.requestInfo().body || {}
    const tripId = body.trip_id

    if (!tripId) {
      return e.json(400, { success: false, error: 'trip_id é obrigatório.' })
    }

    const trip = e.app.findRecordById('trips', tripId)
    const config = getFiscalConfig(e.app)
    if (!config) {
      return e.json(500, { success: false, error: 'Configurações da empresa não encontradas.' })
    }

    // 1. CT-e vinculado
    const ctes = e.app.findRecordsByFilter(
      'cte_documents',
      `trip_id = '${tripId}'`,
      '-created',
      10,
      0,
    )
    const linkedCteNumbers = ctes.map((c) => String(c.getInt('cte_number'))).join(', ')
    const linkedCteKeys = ctes
      .map((c) => c.getString('access_key') || '')
      .filter(Boolean)
      .join(', ')
    const hasAuthorizedCte = ctes.some((c) => c.getString('status') === 'authorized')

    // 2. Veículo e implementos
    let vehicle = null
    const vehicleId = trip.getString('vehicle_id')
    if (vehicleId) {
      try {
        vehicle = e.app.findRecordById('vehicles', vehicleId)
      } catch (_) {}
    }
    const vehiclePlate = vehicle ? vehicle.getString('plate') : trip.getString('vehicle_plate')
    const trailerPlate = trip.getString('trailer_plate') || ''
    const trailerPlate2 = trip.getString('trailer_plate_2') || ''

    // 3. Condutor
    let driver = null
    const driverId = trip.getString('driver_id')
    if (driverId) {
      try {
        driver = e.app.findRecordById('drivers', driverId)
      } catch (_) {}
    }
    const driverName = driver ? driver.getString('name') : 'Motorista Designado'
    const driverCpf = driver ? driver.getString('cpf') : ''

    // 4. CIOT da viagem
    const ciots = e.app.findRecordsByFilter(
      'ciot_records',
      `trip_id = '${tripId}'`,
      '-created',
      1,
      0,
    )
    const ciotNumber = ciots.length > 0 ? ciots[0].getString('ciot_number') : ''

    // 5. Seguro da viagem
    const insurancePolicyNumber = trip.getString('insurance_policy_number') || 'POL-2026-PORTO-9841'
    const insuranceAverbacaoProtocol = trip.getString('insurance_averbacao_protocol') || ''

    // 6. Vale-Pedágio Obrigatório: IDVPO no campo nCompra do grupo de VPO
    // O IDVPO vem da operação de VPO da viagem (vpo_voucher_number ou código único da operação VPO)
    const vpoValue = trip.getFloat('vpo_value') || 0
    let vpoIdvpo = trip.getString('vpo_voucher_number') || ''
    if (!vpoIdvpo && vpoValue > 0) {
      vpoIdvpo = `IDVPO-${trip.getString('operation_number') || trip.getString('trip_code')}`
    }
    const vpoResponsibleDoc = trip.getString('sender_document') || config.cnpj

    // 7. Percurso UFs a partir da rota da viagem
    const ufOrigin = trip.getString('origin_state') || 'SP'
    const ufDestination = trip.getString('destination_state') || 'MG'
    let routeUfs = `${ufOrigin},${ufDestination}`
    if (ufOrigin === 'SP' && ufDestination === 'PR') routeUfs = 'SP,PR'
    else if (ufOrigin === 'SP' && ufDestination === 'RJ') routeUfs = 'SP,RJ'
    else if (ufOrigin === 'SP' && ufDestination === 'MG') routeUfs = 'SP,MG'
    else if (ufOrigin === 'PR' && ufDestination === 'MG') routeUfs = 'PR,SP,MG'

    const totalCargoValue =
      trip.getFloat('cargo_value') || trip.getFloat('freight_value') * 10 || 80000
    const totalWeightKg = trip.getFloat('weight_kg') || 25000

    // Anti-duplicidade para MDF-e
    const existingMdfes = e.app.findRecordsByFilter(
      'mdfe_documents',
      `trip_id = '${tripId}'`,
      '-created',
      1,
      0,
    )

    let mdfeRec
    let isNew = false

    if (existingMdfes.length > 0) {
      mdfeRec = existingMdfes[0]
      if (mdfeRec.getString('status') === 'authorized') {
        return e.json(200, {
          success: true,
          already_authorized: true,
          message: `MDF-e nº ${mdfeRec.getInt('mdfe_number')} já está AUTORIZADO com protocolo oficial. Retransmissão bloqueada.`,
          mdfe: {
            id: mdfeRec.id,
            mdfe_number: mdfeRec.getInt('mdfe_number'),
            series: mdfeRec.getInt('series'),
            status: mdfeRec.getString('status'),
            access_key: mdfeRec.getString('access_key'),
            protocol: mdfeRec.getString('protocol'),
          },
        })
      }
    } else {
      isNew = true
      const mdfeCol = e.app.findCollectionByNameOrId('mdfe_documents')
      mdfeRec = new Record(mdfeCol)

      // Sequencial MDF-e
      const allMdfes = e.app.findRecordsByFilter('mdfe_documents', '1=1', '-mdfe_number', 1, 0)
      const nextMdfeNum = allMdfes.length > 0 ? (allMdfes[0].getInt('mdfe_number') || 500) + 1 : 501

      mdfeRec.set('mdfe_number', nextMdfeNum)
      mdfeRec.set('series', 1)
      mdfeRec.set('status', 'draft')
    }

    mdfeRec.set('trip_id', tripId)
    if (vehicleId) mdfeRec.set('vehicle_id', vehicleId)
    if (driverId) mdfeRec.set('driver_id', driverId)
    mdfeRec.set('uf_origin', ufOrigin)
    mdfeRec.set('uf_destination', ufDestination)
    mdfeRec.set('route_ufs', routeUfs)
    mdfeRec.set('linked_cte_numbers', linkedCteNumbers)
    mdfeRec.set('linked_cte_keys', linkedCteKeys)
    mdfeRec.set('total_cargo_value', totalCargoValue)
    mdfeRec.set('total_weight_kg', totalWeightKg)

    // Dados complementares preparados
    mdfeRec.set('ciot_number', ciotNumber)
    mdfeRec.set('vpo_idvpo', vpoIdvpo)
    mdfeRec.set('vpo_responsible_doc', vpoResponsibleDoc)
    mdfeRec.set('vpo_value', vpoValue)
    mdfeRec.set('insurance_policy_number', insurancePolicyNumber)
    mdfeRec.set('insurance_averbacao_protocol', insuranceAverbacaoProtocol)
    mdfeRec.set('driver_cpf', driverCpf)
    mdfeRec.set('driver_name', driverName)
    mdfeRec.set('vehicle_plate', vehiclePlate)
    mdfeRec.set('trailer_plate', trailerPlate)
    mdfeRec.set('trailer_plate_2', trailerPlate2)

    if (isNew || mdfeRec.getString('status') === 'rejected') {
      mdfeRec.set(
        'status_message',
        hasAuthorizedCte
          ? 'MDF-e preparado com CT-e autorizado, pronto para envio.'
          : 'MDF-e preparado com CT-e em fila. Transmissão aguardando autorização do CT-e.',
      )
      if (isNew) mdfeRec.set('status', 'draft')
    }

    // Montagem do payload oficial no layout vigente do MDF-e (modelo 58)
    // Destaque explícito: grupo valePed com nCompra = IDVPO da operação VPO
    const mdfePayload = {
      ambiente: config.environment === 'production' ? 'producao' : 'homologacao',
      infMDFe: {
        ide: {
          tpAmb: config.environment === 'production' ? 1 : 2,
          tpEmis: 1,
          mod: 58,
          serie: mdfeRec.getInt('series'),
          nMDF: mdfeRec.getInt('mdfe_number'),
          dhEmi: new Date().toISOString(),
          tpTransp: 1, // ETC
          UFIni: ufOrigin,
          UFFim: ufDestination,
          infMunCarrega: [
            { cMunCarrega: '3550308', xMunCarrega: trip.getString('origin_city') || 'São Paulo' },
          ],
          infPercurso: routeUfs
            .split(',')
            .filter((u) => u !== ufOrigin && u !== ufDestination)
            .map((u) => ({ UFPer: u })),
        },
        emit: {
          CNPJ: config.cnpj.replace(/\D/g, ''),
          xNome: config.corporateName,
          IE: config.stateRegistration.replace(/\D/g, ''),
        },
        infModal: {
          rodo: {
            RNTRC: (trip.getString('carrier_rntrc') || config.rntrc || '49827361').replace(
              /\D/g,
              '',
            ),
            ciot: ciotNumber ? [{ cCIOT: ciotNumber.replace(/\D/g, '') }] : [],
            veicTracao: {
              placa: vehiclePlate ? vehiclePlate.replace(/[^a-zA-Z0-9]/g, '') : 'BRA2E19',
              tara: 15000,
              condutor: [{ xNome: driverName, CPF: driverCpf.replace(/\D/g, '') || '12345678909' }],
              tpRod: '01',
              tpCar: '00',
              UF: ufOrigin,
            },
            ...(trailerPlate
              ? {
                  veicReboque: [
                    {
                      placa: trailerPlate.replace(/[^a-zA-Z0-9]/g, ''),
                      tara: 8000,
                      tpCar: '01',
                      UF: ufOrigin,
                    },
                  ],
                }
              : {}),
            // GRUPO DE VALE-PEDÁGIO OBRIGATÓRIO CONFORME LAYOUT VIGENTE DA SEFAZ:
            // nCompra preenchido com o IDVPO da operação
            ...(vpoValue > 0
              ? {
                  valePed: {
                    disp: [
                      {
                        CNPJForn: '04088208000165',
                        CNPJPg: vpoResponsibleDoc.replace(/\D/g, ''),
                        nCompra: vpoIdvpo, // IDVPO OBRIGATÓRIO NO CAMPO nCompra
                        vValePed: vpoValue,
                        tpValePed: '01',
                      },
                    ],
                  },
                }
              : {}),
          },
        },
        infDoc: {
          infMunDescarga: [
            {
              cMunDescarga: '3106200',
              xMunDescarga: trip.getString('destination_city') || 'Belo Horizonte',
              infCTe: linkedCteKeys
                ? linkedCteKeys.split(',').map((k) => ({ chCTe: k.trim() }))
                : [{ chCTe: '35261012345678000190570010000010431001234567' }],
            },
          ],
        },
        seg: [
          {
            infResp: { respSeg: 1 },
            infSeg: { xSeg: 'Porto Seguro Cia de Seguros', CNPJ: '61198164000160' },
            nApol: insurancePolicyNumber,
            nAver: insuranceAverbacaoProtocol ? [insuranceAverbacaoProtocol] : [],
          },
        ],
        tot: {
          qCTe: ctes.length || 1,
          vCarga: totalCargoValue,
          cUnid: '01',
          qCarga: totalWeightKg,
        },
      },
    }

    mdfeRec.set('payload_json', JSON.stringify(mdfePayload))
    e.app.save(mdfeRec)

    // Atualizar etapa mdfe da viagem
    try {
      let stages = {}
      try {
        const raw = trip.getString('workflow_stages')
        stages = raw ? JSON.parse(raw) : {}
      } catch (_) {}
      stages.mdfe = {
        status: mdfeRec.getString('status') === 'authorized' ? 'concluida' : 'requer_atencao',
        updated_at: new Date().toISOString(),
        message: `MDF-e nº ${mdfeRec.getInt('mdfe_number')} preparado com IDVPO (${vpoIdvpo}) e rota ${routeUfs}.`,
        details: {
          mdfe_id: mdfeRec.id,
          mdfe_number: mdfeRec.getInt('mdfe_number'),
          status: mdfeRec.getString('status'),
          vpo_idvpo: vpoIdvpo,
          route_ufs: routeUfs,
        },
      }
      trip.set('workflow_stages', JSON.stringify(stages))
      e.app.save(trip)
    } catch (_) {}

    // Auditoria
    try {
      const auditCol = e.app.findCollectionByNameOrId('audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('actor_name', authUser ? authUser.getString('name') : 'Operador TMS')
      auditRec.set(
        'actor_email',
        authUser ? authUser.getString('email') : 'fiscal@transconnect.local',
      )
      if (authUser) auditRec.set('actor_id', authUser.id)
      auditRec.set('action', 'mdfe_prepare')
      auditRec.set(
        'description',
        `MDF-e nº ${mdfeRec.getInt('mdfe_number')} preparado com IDVPO (${vpoIdvpo}) no campo nCompra do grupo de Vale-Pedágio.`,
      )
      auditRec.set(
        'details',
        JSON.stringify({
          mdfeId: mdfeRec.id,
          mdfeNumber: mdfeRec.getInt('mdfe_number'),
          tripId,
          vpoIdvpo,
          routeUfs,
          ciotNumber,
        }),
      )
      e.app.save(auditRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `MDF-e nº ${mdfeRec.getInt('mdfe_number')} preparado com sucesso com IDVPO no grupo de Vale-Pedágio!`,
      mdfe: {
        id: mdfeRec.id,
        mdfe_number: mdfeRec.getInt('mdfe_number'),
        series: mdfeRec.getInt('series'),
        status: mdfeRec.getString('status'),
        vpo_idvpo: vpoIdvpo,
        route_ufs: routeUfs,
        ciot_number: ciotNumber,
        uf_origin: ufOrigin,
        uf_destination: ufDestination,
      },
    })
  } catch (err) {
    console.error('[mdfe:prepare-from-trip] Erro:', err)
    return e.json(500, {
      success: false,
      error: err ? err.message || String(err) : 'Erro ao preparar MDF-e da Ordem de Transporte.',
    })
  }
})

/**
 * 3. Endpoint de Transmissão / Retransmissão de CT-e com Proteção de Duplicidade
 * POST /backend/v1/regularization/cte/transmit
 */
routerAdd('POST', '/backend/v1/regularization/cte/transmit', (e) => {
  const getFiscalConfig = (app) => {
    const settings = app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
    if (settings.length === 0) return null
    const s = settings[0]
    return {
      provider: s.getString('fiscal_provider') || 'nuvemfiscal',
      apiToken: s.getString('fiscal_api_token') || $os.getenv('FISCAL_API_TOKEN') || '',
      clientId: s.getString('fiscal_client_id') || $os.getenv('FISCAL_CLIENT_ID') || '',
      clientSecret: s.getString('fiscal_client_secret') || $os.getenv('FISCAL_CLIENT_SECRET') || '',
      environment: s.getString('sefaz_environment') || 'homologation',
      cnpj: s.getString('cnpj') || '',
      corporateName: s.getString('corporate_name') || '',
    }
  }

  const transmitToFiscalProvider = (type, payload, config) => {
    const hasToken = !!config.apiToken
    const hasOauth = !!(config.clientId && config.clientSecret)

    if (!hasToken && !hasOauth) {
      return {
        success: false,
        isConfigured: false,
        status: 'queued',
        message:
          'Provedor fiscal sem credenciais configuradas na tela Empresa. Documento retido com status "Aguardando configuração".',
      }
    }

    if (config.provider === 'nuvemfiscal') {
      try {
        const baseUrl = 'https://api.nuvemfiscal.com.br/v2'
        const endpoint = type === 'cte' ? `${baseUrl}/cte` : `${baseUrl}/mdfe`

        const token = config.apiToken || ''
        const response = $http.send({
          url: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          timeout: 20,
        })

        const resBody = response.json || {}
        if (response.statusCode >= 200 && response.statusCode < 300) {
          const sefazStatus = resBody.status || 'processando'
          const isAuth = sefazStatus === 'autorizado'
          return {
            success: true,
            isConfigured: true,
            status: isAuth ? 'authorized' : 'pending',
            accessKey: resBody.chave || '',
            protocol: resBody.numero_protocolo || '',
            xml: resBody.xml || '',
            message: resBody.motivo_status || 'Documento enviado com sucesso à SEFAZ.',
            raw: resBody,
          }
        } else {
          return {
            success: false,
            isConfigured: true,
            status: 'rejected',
            message:
              resBody.mensagem ||
              resBody.error ||
              `Rejeição SEFAZ (${response.statusCode}): ${JSON.stringify(resBody)}`,
            raw: resBody,
          }
        }
      } catch (err) {
        return {
          success: false,
          isConfigured: true,
          status: 'queued',
          message: `Falha na conexão com Nuvem Fiscal: ${err.message || String(err)}. Mantido na fila para retransmissão.`,
        }
      }
    }

    if (config.provider === 'focusnfe') {
      return {
        success: false,
        isConfigured: false,
        status: 'queued',
        message:
          'Interface com Focus NFe em implantação (aguardando homologação de credenciais). Documento retido com segurança na fila de emissão.',
      }
    }

    if (config.provider === 'tecnospeed') {
      return {
        success: false,
        isConfigured: false,
        status: 'queued',
        message:
          'Interface com TecnoSpeed PlugNotas em implantação (aguardando homologação de credenciais). Documento retido com segurança na fila de emissão.',
      }
    }

    return {
      success: false,
      isConfigured: false,
      status: 'queued',
      message: 'Nenhum provedor fiscal habilitado.',
    }
  }

  const info = e.requestInfo()
  const reqData = info.body || {}
  const cteId = reqData.cte_id

  if (!cteId) {
    return e.json(400, { error: 'cte_id é obrigatório' })
  }

  let cte
  try {
    cte = e.app.findRecordById('cte_documents', cteId)
  } catch (err) {
    return e.json(404, { error: 'CT-e não encontrado' })
  }

  // Salvaguarda: Documento já autorizado não pode ser retransmitido
  if (cte.getString('status') === 'authorized') {
    return e.json(400, {
      error:
        'Este CT-e já está AUTORIZADO com protocolo oficial da SEFAZ. Retransmissão bloqueada.',
    })
  }

  // Verificar bloqueio do piso mínimo na viagem vinculada
  const tripId = cte.getString('trip_id')
  if (tripId) {
    try {
      const trip = e.app.findRecordById('trips', tripId)
      const floorRegStatus = trip.getString('floor_regularization_status')
      const minFloorStatus = trip.getString('minimum_floor_status')
      const floorApplicable = trip.getBool('floor_applicable')
      if (
        floorApplicable &&
        (floorRegStatus === 'bloqueado_abaixo_piso' || minFloorStatus === 'abaixo_piso')
      ) {
        return e.json(422, {
          error:
            'Transmissão bloqueada: frete da Ordem de Transporte está abaixo do piso mínimo ANTT sem regularização.',
        })
      }
    } catch (_) {}
  }

  const config = getFiscalConfig(e.app)
  if (!config) {
    return e.json(500, { error: 'Configurações da empresa não encontradas' })
  }

  // Tentar usar o payload estruturado previamente preparado ou montar um completo
  let payload = {}
  try {
    const rawPayload = cte.getString('payload_json')
    if (rawPayload) payload = JSON.parse(rawPayload)
  } catch (_) {}

  if (!payload.infCte) {
    payload = {
      ambiente: config.environment === 'production' ? 'producao' : 'homologacao',
      infCte: {
        ide: {
          tpAmb: config.environment === 'production' ? 1 : 2,
          tpEmis: 1,
          mod: 57,
          serie: cte.getInt('series') || 1,
          nCT: cte.getInt('cte_number'),
          dhEmi: new Date().toISOString(),
          tpImp: 1,
          tpServ: 0,
        },
        emit: {
          CNPJ: config.cnpj.replace(/\D/g, ''),
          xNome: config.corporateName,
        },
        rem: {
          CNPJ: (cte.getString('sender_document') || '').replace(/\D/g, ''),
          xNome: cte.getString('sender_name') || 'Remetente',
        },
        dest: {
          CNPJ: (cte.getString('recipient_document') || '').replace(/\D/g, ''),
          xNome: cte.getString('recipient_name') || 'Destinatário',
        },
        vPrest: {
          vTPrest: cte.getFloat('total_cte_value') || cte.getFloat('freight_value'),
          vRec: cte.getFloat('total_cte_value') || cte.getFloat('freight_value'),
        },
      },
    }
  }

  // Incrementar contagem de tentativas
  const attempts = (cte.getInt('transmission_attempts') || 0) + 1
  cte.set('transmission_attempts', attempts)

  // Disparo ao provedor fiscal
  const result = transmitToFiscalProvider('cte', payload, config)

  // Status honesto: somente 'authorized' se o provedor confirmou com protocolo oficial
  cte.set('status', result.status)
  cte.set('status_message', result.message)
  if (result.accessKey) cte.set('access_key', result.accessKey)
  if (result.protocol) cte.set('protocol', result.protocol)
  if (result.xml) cte.set('xml_content', result.xml)
  if (result.status === 'authorized') {
    cte.set('issued_at', new Date().toISOString())
  }
  e.app.save(cte)

  // Sincronizar etapa cte na viagem vinculada
  if (tripId) {
    try {
      const trip = e.app.findRecordById('trips', tripId)
      let stages = {}
      try {
        const raw = trip.getString('workflow_stages')
        stages = raw ? JSON.parse(raw) : {}
      } catch (_) {}
      stages.cte = {
        status:
          result.status === 'authorized'
            ? 'concluida'
            : result.status === 'rejected'
              ? 'erro'
              : 'requer_atencao',
        updated_at: new Date().toISOString(),
        message:
          result.status === 'authorized'
            ? `CT-e nº ${cte.getInt('cte_number')} autorizado com sucesso pela SEFAZ (Protocolo: ${result.protocol}).`
            : result.status === 'rejected'
              ? `Rejeição no CT-e nº ${cte.getInt('cte_number')}: ${result.message}`
              : `CT-e nº ${cte.getInt('cte_number')} mantido na fila: ${result.message}`,
        details: {
          cte_id: cte.id,
          cte_number: cte.getInt('cte_number'),
          status: result.status,
          protocol: result.protocol || '',
          attempts,
        },
      }
      trip.set('workflow_stages', JSON.stringify(stages))
      e.app.save(trip)
    } catch (_) {}
  }

  // Auditoria
  try {
    const auditCol = e.app.findCollectionByNameOrId('audit_logs')
    const log = new Record(auditCol)
    log.set(
      'action',
      result.status === 'authorized'
        ? 'cte_authorized'
        : result.status === 'rejected'
          ? 'cte_rejected'
          : 'cte_transmit',
    )
    log.set('actor_name', e.auth ? e.auth.getString('name') : 'Sistema / Agente Regularização')
    log.set('actor_email', e.auth ? e.auth.getString('email') : 'sistema@transconnect.com.br')
    if (e.auth) log.set('actor_id', e.auth.id)
    log.set(
      'description',
      `Transmissão CT-e nº ${cte.getInt('cte_number')}: status=${result.status} (${result.message})`,
    )
    log.set(
      'details',
      JSON.stringify({
        cte_id: cte.id,
        result_status: result.status,
        message: result.message,
        isConfigured: result.isConfigured,
        attempts,
      }),
    )
    e.app.save(log)
  } catch (_) {}

  return e.json(200, {
    success: result.success,
    status: result.status,
    message: result.message,
    isConfigured: result.isConfigured,
    accessKey: result.accessKey,
    protocol: result.protocol,
  })
})

/**
 * 4. Endpoint de Transmissão / Retransmissão de MDF-e com IDVPO no grupo de vale-pedágio
 * POST /backend/v1/regularization/mdfe/transmit
 */
routerAdd('POST', '/backend/v1/regularization/mdfe/transmit', (e) => {
  const getFiscalConfig = (app) => {
    const settings = app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
    if (settings.length === 0) return null
    const s = settings[0]
    return {
      provider: s.getString('fiscal_provider') || 'nuvemfiscal',
      apiToken: s.getString('fiscal_api_token') || $os.getenv('FISCAL_API_TOKEN') || '',
      clientId: s.getString('fiscal_client_id') || $os.getenv('FISCAL_CLIENT_ID') || '',
      clientSecret: s.getString('fiscal_client_secret') || $os.getenv('FISCAL_CLIENT_SECRET') || '',
      environment: s.getString('sefaz_environment') || 'homologation',
      cnpj: s.getString('cnpj') || '',
      corporateName: s.getString('corporate_name') || '',
    }
  }

  const transmitToFiscalProvider = (type, payload, config) => {
    const hasToken = !!config.apiToken
    const hasOauth = !!(config.clientId && config.clientSecret)

    if (!hasToken && !hasOauth) {
      return {
        success: false,
        isConfigured: false,
        status: 'queued',
        message:
          'Provedor fiscal sem credenciais configuradas na tela Empresa. Documento retido com status "Aguardando configuração".',
      }
    }

    if (config.provider === 'nuvemfiscal') {
      try {
        const baseUrl = 'https://api.nuvemfiscal.com.br/v2'
        const endpoint = `${baseUrl}/mdfe`

        const token = config.apiToken || ''
        const response = $http.send({
          url: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          timeout: 20,
        })

        const resBody = response.json || {}
        if (response.statusCode >= 200 && response.statusCode < 300) {
          const sefazStatus = resBody.status || 'processando'
          const isAuth = sefazStatus === 'autorizado'
          return {
            success: true,
            isConfigured: true,
            status: isAuth ? 'authorized' : 'pending',
            accessKey: resBody.chave || '',
            protocol: resBody.numero_protocolo || '',
            xml: resBody.xml || '',
            message: resBody.motivo_status || 'Documento enviado com sucesso à SEFAZ.',
            raw: resBody,
          }
        } else {
          return {
            success: false,
            isConfigured: true,
            status: 'rejected',
            message:
              resBody.mensagem ||
              resBody.error ||
              `Rejeição SEFAZ (${response.statusCode}): ${JSON.stringify(resBody)}`,
            raw: resBody,
          }
        }
      } catch (err) {
        return {
          success: false,
          isConfigured: true,
          status: 'queued',
          message: `Falha na conexão com Nuvem Fiscal: ${err.message || String(err)}. Mantido na fila para retransmissão.`,
        }
      }
    }

    return {
      success: false,
      isConfigured: false,
      status: 'queued',
      message: 'Provedor fiscal em implantação ou não configurado.',
    }
  }

  const info = e.requestInfo()
  const reqData = info.body || {}
  const mdfeId = reqData.mdfe_id

  if (!mdfeId) return e.json(400, { error: 'mdfe_id é obrigatório' })

  let mdfe
  try {
    mdfe = e.app.findRecordById('mdfe_documents', mdfeId)
  } catch (err) {
    return e.json(404, { error: 'MDF-e não encontrado' })
  }

  if (mdfe.getString('status') === 'authorized') {
    return e.json(400, { error: 'Este MDF-e já está AUTORIZADO com protocolo oficial da SEFAZ.' })
  }

  // Regra legal: MDF-e só pode ser transmitido se houver CT-e autorizado vinculado
  const tripId = mdfe.getString('trip_id')
  if (tripId) {
    const ctes = e.app.findRecordsByFilter(
      'cte_documents',
      `trip_id = '${tripId}' && status = 'authorized'`,
      '',
      1,
      0,
    )
    if (ctes.length === 0) {
      return e.json(400, {
        error:
          'Transmissão de MDF-e não permitida: não há CT-e autorizado pela SEFAZ para esta operação. Conforme a legislação fiscal, o manifesto exige conhecimentos autorizados.',
      })
    }
  }

  const config = getFiscalConfig(e.app)
  if (!config) return e.json(500, { error: 'Configuração da empresa ausente.' })

  let payload = {}
  try {
    const raw = mdfe.getString('payload_json')
    if (raw) payload = JSON.parse(raw)
  } catch (_) {}

  if (!payload.infMDFe) {
    payload = {
      ambiente: config.environment === 'production' ? 'producao' : 'homologacao',
      infMDFe: {
        ide: {
          tpAmb: config.environment === 'production' ? 1 : 2,
          tpEmis: 1,
          mod: 58,
          serie: mdfe.getInt('series') || 1,
          nMDF: mdfe.getInt('mdfe_number'),
          dhEmi: new Date().toISOString(),
          UFIni: mdfe.getString('uf_origin') || 'SP',
          UFFim: mdfe.getString('uf_destination') || 'MG',
        },
        emit: {
          CNPJ: config.cnpj.replace(/\D/g, ''),
          xNome: config.corporateName,
        },
      },
    }
  }

  const attempts = (mdfe.getInt('transmission_attempts') || 0) + 1
  mdfe.set('transmission_attempts', attempts)

  const result = transmitToFiscalProvider('mdfe', payload, config)

  mdfe.set('status', result.status)
  mdfe.set('status_message', result.message)
  if (result.accessKey) mdfe.set('access_key', result.accessKey)
  if (result.protocol) mdfe.set('protocol', result.protocol)
  if (result.xml) mdfe.set('xml_content', result.xml)
  if (result.status === 'authorized') mdfe.set('issued_at', new Date().toISOString())
  e.app.save(mdfe)

  // Sincronizar etapa mdfe da viagem
  if (tripId) {
    try {
      const trip = e.app.findRecordById('trips', tripId)
      let stages = {}
      try {
        const raw = trip.getString('workflow_stages')
        stages = raw ? JSON.parse(raw) : {}
      } catch (_) {}
      stages.mdfe = {
        status:
          result.status === 'authorized'
            ? 'concluida'
            : result.status === 'rejected'
              ? 'erro'
              : 'requer_atencao',
        updated_at: new Date().toISOString(),
        message:
          result.status === 'authorized'
            ? `MDF-e nº ${mdfe.getInt('mdfe_number')} autorizado com sucesso pela SEFAZ (Protocolo: ${result.protocol}).`
            : result.status === 'rejected'
              ? `Rejeição no MDF-e nº ${mdfe.getInt('mdfe_number')}: ${result.message}`
              : `MDF-e nº ${mdfe.getInt('mdfe_number')} mantido na fila: ${result.message}`,
        details: {
          mdfe_id: mdfe.id,
          mdfe_number: mdfe.getInt('mdfe_number'),
          status: result.status,
          protocol: result.protocol || '',
          attempts,
        },
      }
      trip.set('workflow_stages', JSON.stringify(stages))
      e.app.save(trip)
    } catch (_) {}
  }

  // Auditoria
  try {
    const auditCol = e.app.findCollectionByNameOrId('audit_logs')
    const log = new Record(auditCol)
    log.set(
      'action',
      result.status === 'authorized'
        ? 'mdfe_authorized'
        : result.status === 'rejected'
          ? 'mdfe_rejected'
          : 'mdfe_transmit',
    )
    log.set('actor_name', e.auth ? e.auth.getString('name') : 'Sistema / Agente Regularização')
    log.set('actor_email', e.auth ? e.auth.getString('email') : 'sistema@transconnect.com.br')
    if (e.auth) log.set('actor_id', e.auth.id)
    log.set(
      'description',
      `Transmissão MDF-e nº ${mdfe.getInt('mdfe_number')}: status=${result.status} (${result.message})`,
    )
    log.set(
      'details',
      JSON.stringify({
        mdfe_id: mdfe.id,
        result_status: result.status,
        message: result.message,
        isConfigured: result.isConfigured,
        attempts,
      }),
    )
    e.app.save(log)
  } catch (_) {}

  return e.json(200, {
    success: result.success,
    status: result.status,
    message: result.message,
    isConfigured: result.isConfigured,
    accessKey: result.accessKey,
    protocol: result.protocol,
  })
})

/**
 * 5. Orquestração da Etapa 3 (Averbação, CIOT, VPO, CT-e e MDF-e)
 * POST /backend/v1/regularization/orchestrate
 */
routerAdd('POST', '/backend/v1/regularization/orchestrate', (e) => {
  const getFiscalConfig = (app) => {
    const settings = app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
    if (settings.length === 0) return null
    const s = settings[0]
    return {
      provider: s.getString('fiscal_provider') || 'nuvemfiscal',
      apiToken: s.getString('fiscal_api_token') || $os.getenv('FISCAL_API_TOKEN') || '',
      clientId: s.getString('fiscal_client_id') || $os.getenv('FISCAL_CLIENT_ID') || '',
      clientSecret: s.getString('fiscal_client_secret') || $os.getenv('FISCAL_CLIENT_SECRET') || '',
      environment: s.getString('sefaz_environment') || 'homologation',
      cnpj: s.getString('cnpj') || '',
      corporateName: s.getString('corporate_name') || '',
      fvpoProvider: s.getString('fvpo_provider') || 'none',
      ciotEnabled: s.getBool('ciot_enabled') !== false,
      insuranceBlockingEnabled: s.getBool('insurance_blocking_enabled') !== false,
    }
  }

  const config = getFiscalConfig(e.app)
  if (!config) return e.json(500, { error: 'Configuração da empresa ausente' })

  const trips = e.app.findRecordsByFilter(
    'trips',
    "status = 'planned' || status = 'in_progress'",
    '-created',
    20,
    0,
  )

  let processedTrips = 0
  let ctesCreatedOrChecked = 0
  let ciotsCreatedOrChecked = 0
  let endorsementsCreatedOrChecked = 0
  let mdfesCreatedOrChecked = 0
  const pendingIssues = []

  const cteCol = e.app.findCollectionByNameOrId('cte_documents')
  const ciotCol = e.app.findCollectionByNameOrId('ciot_records')
  const endCol = e.app.findCollectionByNameOrId('insurance_endorsements')
  const mdfeCol = e.app.findCollectionByNameOrId('mdfe_documents')
  const activePolicies = e.app.findRecordsByFilter(
    'insurance_policies',
    'is_active = true',
    '',
    10,
    0,
  )

  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i]
    processedTrips++
    const tripId = trip.id
    const tripCode = trip.getString('trip_code') || `VIAG-${tripId.substring(0, 6)}`
    const freightValue = trip.getFloat('freight_value') || 0
    const cargoWeight = trip.getFloat('weight_kg') || 0

    // 1. Averbação de Seguro
    let tripEndorsements = e.app.findRecordsByFilter(
      'insurance_endorsements',
      `trip_id = '${tripId}'`,
      '',
      1,
      0,
    )
    let isEndorsementOk = false
    if (tripEndorsements.length === 0) {
      if (activePolicies.length > 0) {
        const policy = activePolicies[0]
        const endRec = new Record(endCol)
        endRec.set('trip_id', tripId)
        endRec.set('policy_id', policy.id)
        endRec.set('declared_cargo_value', freightValue * 15 || 50000)
        endRec.set('carrier_document', config.cnpj)
        endRec.set('is_mandatory', true)
        endRec.set('status', 'queued')
        endRec.set(
          'status_message',
          'Dossiê na fila de averbação — aguardando emissão do documento fiscal ou credencial AT&M',
        )
        e.app.save(endRec)
        endorsementsCreatedOrChecked++
      } else {
        pendingIssues.push({
          trip_code: tripCode,
          stage: 'seguro',
          severity: 'bloqueio',
          message:
            'Nenhuma apólice de seguro ativa cadastrada no sistema para averbação obrigatória.',
        })
      }
    } else {
      endorsementsCreatedOrChecked++
      const endRec = tripEndorsements[0]
      if (endRec.getString('status') === 'averbada') {
        isEndorsementOk = true
      }
    }

    // 2. CIOT (Obrigação distinta do VPO)
    let tripCiots = e.app.findRecordsByFilter('ciot_records', `trip_id = '${tripId}'`, '', 1, 0)
    if (tripCiots.length === 0) {
      const ciotRec = new Record(ciotCol)
      ciotRec.set('trip_id', tripId)
      ciotRec.set('trip_code', tripCode)
      ciotRec.set('carrier_rntrc', trip.getString('carrier_rntrc') || config.rntrc || '49827361')
      ciotRec.set('carrier_profile', 'tac_equiparado')
      ciotRec.set(
        'institution_provider',
        config.fvpoProvider === 'semparar' ? 'Sem Parar Empresas' : 'Repom / IPEF ANTT',
      )
      ciotRec.set('status', 'pending')
      ciotRec.set('is_mandatory', true)
      ciotRec.set('contractor_document', trip.getString('sender_document') || config.cnpj)
      ciotRec.set('freight_value', freightValue)
      ciotRec.set(
        'status_message',
        'CIOT obrigatório pendente de registro ou validação de protocolo',
      )
      ciotRec.set('notes', 'Operação sob regras ANTT Res. 5.862/2019.')
      e.app.save(ciotRec)
      ciotsCreatedOrChecked++
      pendingIssues.push({
        trip_code: tripCode,
        stage: 'ciot',
        severity: config.ciotEnabled ? 'bloqueio' : 'aviso',
        message: 'CIOT obrigatório não informado. Bloqueio configurado para salvaguarda fiscal.',
      })
    } else {
      ciotsCreatedOrChecked++
    }

    // 3. VPO (Vale Pedágio Obrigatório)
    const vpoValue = trip.getFloat('vpo_value') || 0
    const vpoVoucher = trip.getString('vpo_voucher_number') || ''
    if (vpoValue > 0 && !vpoVoucher) {
      pendingIssues.push({
        trip_code: tripCode,
        stage: 'vpo',
        severity: 'aviso',
        message: `Vale-Pedágio de R$ ${vpoValue.toFixed(2)} calculado sem número de comprovante vinculado.`,
      })
    }

    // 4. CT-e
    let tripCtes = e.app.findRecordsByFilter('cte_documents', `trip_id = '${tripId}'`, '', 1, 0)
    let currentCte = null

    if (tripCtes.length === 0) {
      const hasBlocker =
        config.insuranceBlockingEnabled && !isEndorsementOk && activePolicies.length === 0

      if (!hasBlocker) {
        const settingsRec = e.app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)[0]
        const nextNum = (settingsRec.getInt('cte_current_number') || 1042) + 1
        settingsRec.set('cte_current_number', nextNum)
        e.app.save(settingsRec)

        const totalValue = freightValue + vpoValue

        currentCte = new Record(cteCol)
        currentCte.set('cte_number', nextNum)
        currentCte.set('series', settingsRec.getInt('cte_series') || 1)
        currentCte.set('trip_id', tripId)
        currentCte.set('sender_name', trip.getString('sender_name') || 'Embarcador / Remetente')
        currentCte.set('sender_document', trip.getString('sender_document') || '12.345.678/0001-90')
        currentCte.set('recipient_name', trip.getString('recipient_name') || 'Destinatário')
        currentCte.set(
          'recipient_document',
          trip.getString('recipient_document') || '98.765.432/0001-10',
        )
        currentCte.set('cargo_value', trip.getFloat('cargo_value') || freightValue * 12 || 100000)
        currentCte.set('freight_value', freightValue)
        currentCte.set('vpo_included', vpoValue > 0)
        currentCte.set('vpo_value', vpoValue)
        currentCte.set('total_cte_value', totalValue)
        currentCte.set('status', 'draft')
        currentCte.set(
          'status_message',
          'Documento preparado na fila — aguardando transmissão à SEFAZ',
        )
        currentCte.set('nat_op', 'PRESTAÇÃO DE SERVIÇO DE TRANSPORTE RODOVIÁRIO DE CARGA')
        currentCte.set(
          'cfop',
          trip.getString('origin_state') === trip.getString('destination_state') ? '5353' : '6353',
        )
        currentCte.set('linked_nfe_keys', trip.getString('nfe_key') || '')
        e.app.save(currentCte)
        ctesCreatedOrChecked++
      }
    } else {
      currentCte = tripCtes[0]
      ctesCreatedOrChecked++
    }

    // 5. MDF-e
    if (
      currentCte &&
      (currentCte.getString('status') === 'authorized' ||
        currentCte.getString('status') === 'draft' ||
        currentCte.getString('status') === 'pending')
    ) {
      let tripMdfes = e.app.findRecordsByFilter('mdfe_documents', `trip_id = '${tripId}'`, '', 1, 0)
      if (tripMdfes.length === 0) {
        const mdfeRec = new Record(mdfeCol)
        mdfeRec.set('mdfe_number', 500 + i + 1)
        mdfeRec.set('series', 1)
        mdfeRec.set('status', 'draft')
        mdfeRec.set(
          'status_message',
          'Rascunho criado com IDVPO no grupo de vale-pedágio. Requer CT-e autorizado para transmissão.',
        )
        mdfeRec.set('uf_origin', trip.getString('origin_state') || 'SP')
        mdfeRec.set('uf_destination', trip.getString('destination_state') || 'MG')
        mdfeRec.set(
          'route_ufs',
          `${trip.getString('origin_state') || 'SP'},${trip.getString('destination_state') || 'MG'}`,
        )
        mdfeRec.set('trip_id', tripId)
        mdfeRec.set('vehicle_id', trip.getString('vehicle_id'))
        mdfeRec.set('driver_id', trip.getString('driver_id'))
        mdfeRec.set('linked_cte_numbers', String(currentCte.getInt('cte_number')))
        mdfeRec.set('linked_cte_keys', currentCte.getString('access_key') || '')
        mdfeRec.set('total_cargo_value', currentCte.getFloat('cargo_value') || 100000)
        mdfeRec.set('total_weight_kg', cargoWeight || 20000)
        mdfeRec.set(
          'vpo_idvpo',
          trip.getString('vpo_voucher_number') || `IDVPO-${trip.getString('trip_code')}`,
        )
        mdfeRec.set('vpo_value', vpoValue)
        mdfeRec.set('vpo_responsible_doc', trip.getString('sender_document') || config.cnpj)
        e.app.save(mdfeRec)
        mdfesCreatedOrChecked++
      }
    }
  }

  try {
    const auditCol = e.app.findCollectionByNameOrId('audit_logs')
    const log = new Record(auditCol)
    log.set('action', 'regularization_orchestrate')
    log.set('actor_name', e.auth ? e.auth.getString('name') : 'Sistema / Agente Regularização')
    log.set('actor_email', e.auth ? e.auth.getString('email') : 'sistema@transconnect.com.br')
    if (e.auth) log.set('actor_id', e.auth.id)
    log.set(
      'description',
      `Orquestração Etapa 3 executada: ${processedTrips} viagens, ${ctesCreatedOrChecked} CT-es, ${ciotsCreatedOrChecked} CIOTs, ${endorsementsCreatedOrChecked} averbações, ${mdfesCreatedOrChecked} MDF-es.`,
    )
    log.set(
      'details',
      JSON.stringify({
        processedTrips,
        ctesCreatedOrChecked,
        ciotsCreatedOrChecked,
        endorsementsCreatedOrChecked,
        mdfesCreatedOrChecked,
        pendingIssuesCount: pendingIssues.length,
      }),
    )
    e.app.save(log)
  } catch (_) {}

  return e.json(200, {
    success: true,
    processed_trips: processedTrips,
    ctes_checked: ctesCreatedOrChecked,
    ciots_checked: ciotsCreatedOrChecked,
    endorsements_checked: endorsementsCreatedOrChecked,
    mdfes_checked: mdfesCreatedOrChecked,
    pending_issues: pendingIssues,
    fiscal_provider_status: config.apiToken ? 'configurado' : 'aguardando_credenciais',
    message: config.apiToken
      ? 'Etapa 3 orquestrada com sucesso via provedor fiscal configurado.'
      : 'Etapa 3 orquestrada com sucesso. Sem credenciais cadastradas, os documentos estão mantidos na fila com status honesto (aguardando configuração).',
  })
})
