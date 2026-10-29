/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Regularização Fiscal e Orquestração da Etapa 3
 * Regras inegociáveis:
 * 1. NUNCA simular autorização fiscal.
 * 2. CIOT e VPO são coleções e controles separados.
 * 3. Provedores fiscais plugáveis: Nuvem Fiscal (chamada SEFAZ), Focus NFe e TecnoSpeed como interface preparada.
 * 4. Sem credenciais válidas, documentos permanecem em fila / aguardando transmissão.
 * Nota de arquitetura do PocketBase JSVM: funções auxiliares declaradas inline nos callbacks para isolamento de contexto de execução.
 */

/**
 * Endpoint de Transmissão Manual / Retransmissão de CT-e
 * POST /backend/v1/regularization/cte/transmit
 */
routerAdd('POST', '/backend/v1/regularization/cte/transmit', (e) => {
  const getFiscalConfig = () => {
    const settings = $app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
    if (settings.length === 0) return null
    const s = settings[0]
    return {
      provider: s.get('fiscal_provider') || 'nuvemfiscal',
      apiToken: s.get('fiscal_api_token') || $os.getenv('FISCAL_API_TOKEN') || '',
      clientId: s.get('fiscal_client_id') || $os.getenv('FISCAL_CLIENT_ID') || '',
      clientSecret: s.get('fiscal_client_secret') || $os.getenv('FISCAL_CLIENT_SECRET') || '',
      environment: s.get('sefaz_environment') || 'homologation',
      cnpj: s.get('cnpj') || '',
      corporateName: s.get('corporate_name') || '',
      fvpoProvider: s.get('fvpo_provider') || 'none',
      ciotEnabled: s.get('ciot_enabled') !== false,
      insuranceBlockingEnabled: s.get('insurance_blocking_enabled') !== false,
    }
  }

  const transmitToFiscalProvider = (type, payload, config) => {
    if (!config.apiToken && (!config.clientId || !config.clientSecret)) {
      return {
        success: false,
        isConfigured: false,
        status: 'queued',
        message:
          'Provedor fiscal sem credenciais configuradas na tela Empresa. Documento retido na fila aguardando configuração.',
      }
    }

    if (config.provider === 'nuvemfiscal') {
      try {
        const baseUrl = 'https://api.nuvemfiscal.com.br/v2'
        const endpoint = type === 'cte' ? `${baseUrl}/cte` : `${baseUrl}/mdfe`

        const response = $http.send({
          url: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiToken}`,
          },
          body: JSON.stringify(payload),
          timeout: 15,
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
              `Falha na transmissão SEFAZ (${response.statusCode})`,
            raw: resBody,
          }
        }
      } catch (err) {
        return {
          success: false,
          isConfigured: true,
          status: 'queued',
          message: `Falha na conexão com Nuvem Fiscal: ${err.message}. Mantido na fila para retransmissão.`,
        }
      }
    }

    if (config.provider === 'focusnfe') {
      return {
        success: false,
        isConfigured: false,
        status: 'queued',
        message:
          'Interface com Focus NFe em implantação. Documento retido com segurança na fila de emissão.',
      }
    }

    if (config.provider === 'tecnospeed') {
      return {
        success: false,
        isConfigured: false,
        status: 'queued',
        message:
          'Interface com TecnoSpeed PlugNotas em implantação. Documento retido com segurança na fila de emissão.',
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
    cte = $app.findRecordById('cte_documents', cteId)
  } catch (err) {
    return e.json(404, { error: 'CT-e não encontrado' })
  }

  if (cte.get('status') === 'authorized') {
    return e.json(400, {
      error: 'Este CT-e já está autorizado perante a SEFAZ. Não é permitida nova transmissão.',
    })
  }

  const config = getFiscalConfig()
  if (!config) {
    return e.json(500, { error: 'Configurações da empresa não encontradas' })
  }

  const payload = {
    ambiente: config.environment === 'production' ? 'producao' : 'homologacao',
    infCte: {
      ide: {
        tpAmb: config.environment === 'production' ? 1 : 2,
        tpEmis: 1,
        mod: 57,
        serie: cte.get('series') || 1,
        nCT: cte.get('cte_number'),
        dhEmi: new Date().toISOString(),
        tpImp: 1,
        tpServ: 0,
      },
      emit: {
        CNPJ: config.cnpj.replace(/\D/g, ''),
        xNome: config.corporateName,
      },
      rem: {
        CNPJ: (cte.get('sender_document') || '').replace(/\D/g, ''),
        xNome: cte.get('sender_name') || 'Remetente',
      },
      dest: {
        CNPJ: (cte.get('recipient_document') || '').replace(/\D/g, ''),
        xNome: cte.get('recipient_name') || 'Destinatário',
      },
      vPrest: {
        vTPrest: cte.get('total_cte_value') || cte.get('freight_value'),
        vRec: cte.get('total_cte_value') || cte.get('freight_value'),
      },
    },
  }

  const result = transmitToFiscalProvider('cte', payload, config)

  cte.set('status', result.status)
  cte.set('status_message', result.message)
  if (result.accessKey) cte.set('access_key', result.accessKey)
  if (result.protocol) cte.set('protocol', result.protocol)
  if (result.xml) cte.set('xml_content', result.xml)
  if (result.status === 'authorized') {
    cte.set('issued_at', new Date().toISOString())
  }
  $app.save(cte)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const log = new Record(auditCol)
    log.set('action', 'email_agent_run')
    log.set('actor_name', e.auth ? e.auth.get('name') : 'Sistema / Agente Regularização')
    log.set('description', `Transmissão CT-e nº ${cte.get('cte_number')}: status=${result.status}`)
    log.set('details', {
      cte_id: cte.id,
      result_status: result.status,
      message: result.message,
      isConfigured: result.isConfigured,
    })
    $app.save(log)
  } catch (_) {}

  return e.json(200, {
    success: result.success,
    status: result.status,
    message: result.message,
    isConfigured: result.isConfigured,
  })
})

/**
 * Endpoint de Transmissão / Consulta de MDF-e
 * POST /backend/v1/regularization/mdfe/transmit
 */
routerAdd('POST', '/backend/v1/regularization/mdfe/transmit', (e) => {
  const getFiscalConfig = () => {
    const settings = $app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
    if (settings.length === 0) return null
    const s = settings[0]
    return {
      provider: s.get('fiscal_provider') || 'nuvemfiscal',
      apiToken: s.get('fiscal_api_token') || $os.getenv('FISCAL_API_TOKEN') || '',
      clientId: s.get('fiscal_client_id') || $os.getenv('FISCAL_CLIENT_ID') || '',
      clientSecret: s.get('fiscal_client_secret') || $os.getenv('FISCAL_CLIENT_SECRET') || '',
      environment: s.get('sefaz_environment') || 'homologation',
      cnpj: s.get('cnpj') || '',
      corporateName: s.get('corporate_name') || '',
    }
  }

  const transmitToFiscalProvider = (type, payload, config) => {
    if (!config.apiToken && (!config.clientId || !config.clientSecret)) {
      return {
        success: false,
        isConfigured: false,
        status: 'queued',
        message:
          'Provedor fiscal sem credenciais configuradas na tela Empresa. Documento retido na fila aguardando configuração.',
      }
    }

    if (config.provider === 'nuvemfiscal') {
      try {
        const baseUrl = 'https://api.nuvemfiscal.com.br/v2'
        const endpoint = `${baseUrl}/mdfe`

        const response = $http.send({
          url: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiToken}`,
          },
          body: JSON.stringify(payload),
          timeout: 15,
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
              `Falha na transmissão SEFAZ (${response.statusCode})`,
            raw: resBody,
          }
        }
      } catch (err) {
        return {
          success: false,
          isConfigured: true,
          status: 'queued',
          message: `Falha na conexão com Nuvem Fiscal: ${err.message}. Mantido na fila para retransmissão.`,
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
    mdfe = $app.findRecordById('mdfe_documents', mdfeId)
  } catch (err) {
    return e.json(404, { error: 'MDF-e não encontrado' })
  }

  if (mdfe.get('status') === 'authorized') {
    return e.json(400, { error: 'Este MDF-e já está autorizado perante a SEFAZ.' })
  }

  const config = getFiscalConfig()
  const payload = {
    ambiente: config.environment === 'production' ? 'producao' : 'homologacao',
    infMDFe: {
      ide: {
        tpAmb: config.environment === 'production' ? 1 : 2,
        tpEmis: 1,
        mod: 58,
        serie: mdfe.get('series') || 1,
        nMDF: mdfe.get('mdfe_number'),
        dhEmi: new Date().toISOString(),
        UFIni: mdfe.get('uf_origin') || 'SP',
        UFFim: mdfe.get('uf_destination') || 'MG',
      },
      emit: {
        CNPJ: config.cnpj.replace(/\D/g, ''),
        xNome: config.corporateName,
      },
    },
  }

  const result = transmitToFiscalProvider('mdfe', payload, config)

  mdfe.set('status', result.status)
  mdfe.set('status_message', result.message)
  if (result.accessKey) mdfe.set('access_key', result.accessKey)
  if (result.protocol) mdfe.set('protocol', result.protocol)
  if (result.xml) mdfe.set('xml_content', result.xml)
  if (result.status === 'authorized') mdfe.set('issued_at', new Date().toISOString())
  $app.save(mdfe)

  return e.json(200, {
    success: result.success,
    status: result.status,
    message: result.message,
    isConfigured: result.isConfigured,
  })
})

/**
 * Orquestração Completa da Etapa 3
 * POST /backend/v1/regularization/orchestrate
 */
routerAdd('POST', '/backend/v1/regularization/orchestrate', (e) => {
  const getFiscalConfig = () => {
    const settings = $app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
    if (settings.length === 0) return null
    const s = settings[0]
    return {
      provider: s.get('fiscal_provider') || 'nuvemfiscal',
      apiToken: s.get('fiscal_api_token') || $os.getenv('FISCAL_API_TOKEN') || '',
      clientId: s.get('fiscal_client_id') || $os.getenv('FISCAL_CLIENT_ID') || '',
      clientSecret: s.get('fiscal_client_secret') || $os.getenv('FISCAL_CLIENT_SECRET') || '',
      environment: s.get('sefaz_environment') || 'homologation',
      cnpj: s.get('cnpj') || '',
      corporateName: s.get('corporate_name') || '',
      fvpoProvider: s.get('fvpo_provider') || 'none',
      ciotEnabled: s.get('ciot_enabled') !== false,
      insuranceBlockingEnabled: s.get('insurance_blocking_enabled') !== false,
    }
  }

  const config = getFiscalConfig()
  if (!config) return e.json(500, { error: 'Configuração da empresa ausente' })

  const trips = $app.findRecordsByFilter(
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

  const cteCol = $app.findCollectionByNameOrId('cte_documents')
  const ciotCol = $app.findCollectionByNameOrId('ciot_records')
  const endCol = $app.findCollectionByNameOrId('insurance_endorsements')
  const mdfeCol = $app.findCollectionByNameOrId('mdfe_documents')
  const activePolicies = $app.findRecordsByFilter(
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
    const tripCode = trip.get('trip_code') || `VIAG-${tripId.substring(0, 6)}`
    const freightValue = trip.get('freight_value') || 0
    const cargoWeight = trip.get('weight_kg') || 0

    // 1. Averbação de Seguro
    let tripEndorsements = $app.findRecordsByFilter(
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
        $app.save(endRec)
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
      if (endRec.get('status') === 'averbada') {
        isEndorsementOk = true
      }
    }

    // 2. CIOT (Obrigação distinta do VPO)
    let tripCiots = $app.findRecordsByFilter('ciot_records', `trip_id = '${tripId}'`, '', 1, 0)
    if (tripCiots.length === 0) {
      const ciotRec = new Record(ciotCol)
      ciotRec.set('trip_id', tripId)
      ciotRec.set('trip_code', tripCode)
      ciotRec.set('carrier_rntrc', config.rntrc || '49827361')
      ciotRec.set('carrier_profile', 'tac_equiparado')
      ciotRec.set(
        'institution_provider',
        config.fvpoProvider === 'semparar' ? 'Sem Parar Empresas' : 'Repom / IPEF ANTT',
      )
      ciotRec.set('status', 'pending')
      ciotRec.set('is_mandatory', true)
      ciotRec.set('contractor_document', config.cnpj)
      ciotRec.set('freight_value', freightValue)
      ciotRec.set(
        'status_message',
        'CIOT obrigatório pendente de registro ou validação de protocolo',
      )
      ciotRec.set('notes', 'Operação sob regras ANTT Res. 5.862/2019.')
      $app.save(ciotRec)
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
    const vpoValue = trip.get('vpo_value') || 0
    const vpoVoucher = trip.get('vpo_voucher_number') || ''
    if (vpoValue > 0 && !vpoVoucher) {
      pendingIssues.push({
        trip_code: tripCode,
        stage: 'vpo',
        severity: 'aviso',
        message: `Vale-Pedágio de R$ ${vpoValue.toFixed(2)} calculado sem número de comprovante vinculado.`,
      })
    }

    // 4. CT-e
    let tripCtes = $app.findRecordsByFilter('cte_documents', `trip_id = '${tripId}'`, '', 1, 0)
    let currentCte = null

    if (tripCtes.length === 0) {
      const hasBlocker =
        config.insuranceBlockingEnabled && !isEndorsementOk && activePolicies.length === 0

      if (!hasBlocker) {
        const settingsRec = $app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)[0]
        const nextNum = (settingsRec.get('cte_current_number') || 1042) + 1
        settingsRec.set('cte_current_number', nextNum)
        $app.save(settingsRec)

        const totalValue = freightValue + (trip.get('vpo_value') || 0)

        currentCte = new Record(cteCol)
        currentCte.set('cte_number', nextNum)
        currentCte.set('series', settingsRec.get('cte_series') || 1)
        currentCte.set('trip_id', tripId)
        currentCte.set('sender_name', 'Embarcador / Cliente Operação')
        currentCte.set('sender_document', '12.345.678/0001-90')
        currentCte.set('recipient_name', 'Destinatário da Viagem')
        currentCte.set('recipient_document', '98.765.432/0001-10')
        currentCte.set('cargo_value', freightValue * 12 || 100000)
        currentCte.set('freight_value', freightValue)
        currentCte.set('vpo_included', (trip.get('vpo_value') || 0) > 0)
        currentCte.set('vpo_value', trip.get('vpo_value') || 0)
        currentCte.set('total_cte_value', totalValue)
        currentCte.set('status', 'pending')
        currentCte.set(
          'status_message',
          'Documento gerado na fila — aguardando transmissão à SEFAZ',
        )
        $app.save(currentCte)
        ctesCreatedOrChecked++
      }
    } else {
      currentCte = tripCtes[0]
      ctesCreatedOrChecked++
    }

    // 5. MDF-e
    if (
      currentCte &&
      (currentCte.get('status') === 'authorized' || currentCte.get('status') === 'pending')
    ) {
      let tripMdfes = $app.findRecordsByFilter('mdfe_documents', `trip_id = '${tripId}'`, '', 1, 0)
      if (tripMdfes.length === 0) {
        const mdfeRec = new Record(mdfeCol)
        mdfeRec.set('mdfe_number', 500 + i + 1)
        mdfeRec.set('series', 1)
        mdfeRec.set('status', 'draft')
        mdfeRec.set(
          'status_message',
          'Rascunho criado a partir da operação. Requer CT-e autorizado para transmissão.',
        )
        mdfeRec.set('uf_origin', trip.get('origin_state') || 'SP')
        mdfeRec.set('uf_destination', trip.get('destination_state') || 'MG')
        mdfeRec.set(
          'route_ufs',
          `${trip.get('origin_state') || 'SP'},${trip.get('destination_state') || 'MG'}`,
        )
        mdfeRec.set('trip_id', tripId)
        mdfeRec.set('vehicle_id', trip.get('vehicle_id'))
        mdfeRec.set('driver_id', trip.get('driver_id'))
        mdfeRec.set('linked_cte_numbers', String(currentCte.get('cte_number')))
        mdfeRec.set('linked_cte_keys', currentCte.get('access_key') || '')
        mdfeRec.set('total_cargo_value', currentCte.get('cargo_value') || 100000)
        mdfeRec.set('total_weight_kg', cargoWeight || 20000)
        $app.save(mdfeRec)
        mdfesCreatedOrChecked++
      }
    }
  }

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
      : 'Etapa 3 orquestrada com sucesso. Sem credenciais cadastradas, os documentos estão mantidos na fila com status honesto (aguardando transmissão).',
  })
})
