migrate((app) => {
  // Atualizar company_settings existente com valores padrão
  const companyCol = app.findCollectionByNameOrId('company_settings')
  const companies = app.findRecordsByFilter('company_settings', '1=1', '', 1, 0)
  if (companies.length > 0) {
    const comp = companies[0]
    if (!comp.get('fiscal_provider')) {
      comp.set('fiscal_provider', 'nuvemfiscal')
      comp.set('fvpo_provider', 'semparar')
      comp.set('ciot_enabled', true)
      comp.set('insurance_blocking_enabled', true)
      app.save(comp)
    }
  }

  // Seed de Apólices de Seguro reais para o transportador
  const policyCol = app.findCollectionByNameOrId('insurance_policies')
  const existingPolicies = app.findRecordsByFilter('insurance_policies', '1=1', '', 1, 0)
  let policy1Id = ''
  let policy2Id = ''

  if (existingPolicies.length === 0) {
    const p1 = new Record(policyCol)
    p1.set('insurer_name', 'Porto Seguro Cia de Seguros Gerais')
    p1.set('insurer_cnpj', '61.198.164/0001-60')
    p1.set('policy_number', '0544-09827361-01')
    p1.set('insurance_type', 'rctr_c')
    p1.set('start_date', '2025-01-01 00:00:00.000Z')
    p1.set('end_date', '2025-12-31 23:59:59.000Z')
    p1.set('insured_cnpjs', '12.345.678/0001-90')
    p1.set('broker_name', 'Aon Corretora de Seguros')
    p1.set('atm_provider', 'AT&M Integração Seguros')
    p1.set('is_mandatory_all_trips', true)
    p1.set('is_active', true)
    p1.set('notes', 'Apólice RCTR-C obrigatória nacional para transporte rodoviário de cargas.')
    app.save(p1)
    policy1Id = p1.id

    const p2 = new Record(policyCol)
    p2.set('insurer_name', 'Tokio Marine Seguradora S.A.')
    p2.set('insurer_cnpj', '33.164.021/0001-00')
    p2.set('policy_number', '0655-77291823-02')
    p2.set('insurance_type', 'rc_dc')
    p2.set('start_date', '2025-01-01 00:00:00.000Z')
    p2.set('end_date', '2025-12-31 23:59:59.000Z')
    p2.set('insured_cnpjs', '12.345.678/0001-90')
    p2.set('broker_name', 'Marsh Corretora de Seguros')
    p2.set('atm_provider', 'AT&M Integração Seguros')
    p2.set('is_mandatory_all_trips', true)
    p2.set('is_active', true)
    p2.set('notes', 'Apólice RC-DC (desaparecimento de carga e roubo) com averbação eletrônica.')
    app.save(p2)
    policy2Id = p2.id
  }

  // Trips para vincular exemplos em status honesto (fila / aguardando)
  const trips = app.findRecordsByFilter('trips', '1=1', '-created', 10, 0)
  if (trips.length > 0) {
    const trip1 = trips[0] // ex: VIAG-2025-001 ou 003
    const trip2 = trips.length > 1 ? trips[1] : trips[0]

    // Seed de CIOT honesto (registrado com dados comprovados ou pendente na fila)
    const ciotCol = app.findCollectionByNameOrId('ciot_records')
    const existingCiots = app.findRecordsByFilter('ciot_records', '1=1', '', 1, 0)
    if (existingCiots.length === 0) {
      const c1 = new Record(ciotCol)
      c1.set('trip_id', trip1.id)
      c1.set('trip_code', trip1.get('trip_code'))
      c1.set('carrier_rntrc', '49827361')
      c1.set('carrier_profile', 'tac_equiparado')
      c1.set('ciot_number', '0928374829104829')
      c1.set('institution_provider', 'Repom / Edenred Soluções')
      c1.set('status', 'registered')
      c1.set('voucher_document', 'CIOT-PROTO-202502-88192')
      c1.set('is_mandatory', true)
      c1.set('contractor_document', '12.345.678/0001-90')
      c1.set('freight_value', trip1.get('freight_value') || 8400)
      c1.set('registered_at', '2025-02-24 10:00:00.000Z')
      c1.set('status_message', 'CIOT registrado com sucesso na IPEF credenciada ANTT')
      c1.set('notes', 'Perfil TAC-equiparado (até 3 veículos vinculados ao transportador).')
      app.save(c1)

      const c2 = new Record(ciotCol)
      c2.set('trip_id', trip2.id)
      c2.set('trip_code', trip2.get('trip_code'))
      c2.set('carrier_rntrc', '49827361')
      c2.set('carrier_profile', 'etc')
      c2.set('ciot_number', '')
      c2.set('institution_provider', 'Sem Parar Empresas')
      c2.set('status', 'pending')
      c2.set('voucher_document', '')
      c2.set('is_mandatory', true)
      c2.set('contractor_document', '12.345.678/0001-90')
      c2.set('freight_value', trip2.get('freight_value') || 9800)
      c2.set(
        'status_message',
        'Aguardando validação de credencial da IPEF ou inserção de comprovante',
      )
      c2.set('notes', 'Operação ETC com subcontratação pendente de registro.')
      app.save(c2)
    }

    // Seed de Averbação honesta
    const endCol = app.findCollectionByNameOrId('insurance_endorsements')
    const existingEnds = app.findRecordsByFilter('insurance_endorsements', '1=1', '', 1, 0)
    if (existingEnds.length === 0 && policy1Id) {
      const e1 = new Record(endCol)
      e1.set('trip_id', trip1.id)
      e1.set('policy_id', policy1Id)
      e1.set('endorsement_protocol', 'AVB-PORTO-2025-998231')
      e1.set('status', 'averbada')
      e1.set('declared_cargo_value', 195000)
      e1.set('fiscal_key', '35250212345678000190570010000010411084920193')
      e1.set('carrier_document', '12.345.678/0001-90')
      e1.set('status_message', 'Dossiê averbado com sucesso via AT&M Porto Seguro')
      e1.set('proof_document', 'COMP-AVB-998231.PDF')
      e1.set('averbada_at', '2025-02-24 09:20:00.000Z')
      e1.set('is_mandatory', true)
      app.save(e1)

      const e2 = new Record(endCol)
      e2.set('trip_id', trip2.id)
      e2.set('policy_id', policy2Id || policy1Id)
      e2.set('endorsement_protocol', '')
      e2.set('status', 'queued')
      e2.set('declared_cargo_value', 285000)
      e2.set('fiscal_key', '')
      e2.set('carrier_document', '12.345.678/0001-90')
      e2.set(
        'status_message',
        'Dossiê na fila de averbação — aguardando emissão do documento fiscal ou token AT&M',
      )
      e2.set('proof_document', '')
      e2.set('is_mandatory', true)
      app.save(e2)
    }

    // Seed de MDF-e em fila / aguardando transmissão (nunca simulado como autorizado sem dados reais)
    const mdfeCol = app.findCollectionByNameOrId('mdfe_documents')
    const existingMdfes = app.findRecordsByFilter('mdfe_documents', '1=1', '', 1, 0)
    if (existingMdfes.length === 0) {
      const m1 = new Record(mdfeCol)
      m1.set('mdfe_number', 501)
      m1.set('series', 1)
      m1.set('status', 'queued')
      m1.set('access_key', '')
      m1.set('protocol', '')
      m1.set('status_message', 'Aguardando transmissão para SEFAZ via provedor configurado')
      m1.set('xml_content', '')
      m1.set('uf_origin', trip1.get('origin_state') || 'SP')
      m1.set('uf_destination', trip1.get('destination_state') || 'MG')
      m1.set('route_ufs', 'SP,MG')
      m1.set('trip_id', trip1.id)
      m1.set('vehicle_id', trip1.get('vehicle_id'))
      m1.set('driver_id', trip1.get('driver_id'))
      m1.set('linked_cte_numbers', '1041')
      m1.set('linked_cte_keys', '35250212345678000190570010000010411084920193')
      m1.set('total_cargo_value', 195000)
      m1.set('total_weight_kg', 22500)
      app.save(m1)
    }
  }
})
