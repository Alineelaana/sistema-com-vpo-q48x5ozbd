migrate(
  (app) => {
    try {
      const contractsCol = app.findCollectionByNameOrId('transport_contracts')
      // Encontra a primeira trip para vincular
      let trip = null
      try {
        trip = app.findFirstRecordByFilter('trips', 'trip_code != ""')
      } catch (_) {}

      if (!trip) return

      let existing = null
      try {
        existing = app.findFirstRecordByFilter(
          'transport_contracts',
          `trip_id = "${trip.id}" || contract_number = "97316"`,
        )
      } catch (_) {}

      if (!existing) {
        const record = new Record(contractsCol, {
          contract_number: '97316',
          series: '1',
          trip_id: trip.id,
          operation_number: trip.get('operation_number') || 'OT-2026-0001',
          trip_code: trip.get('trip_code') || 'VIAG-2025-001',
          filial: 'COOPROVES GO',
          fleet_type: 'Não Própria',
          operation_type: 'Carga Lotação',
          service_type: 'transporte geral',
          tax_regime: 'Pessoa Física',
          fiscal_operation: 'Entrada de Contrato de Transporte',
          quick_charge: '',
          issue_date: '2026-10-31 10:32:00.000Z',
          departure_date: '2026-10-31 11:32:00.000Z',
          end_date: '2026-11-04 00:00:00.000Z',
          advance_due_date: '2026-10-31 10:32:00.000Z',
          balance_due_date: '2026-10-31 10:32:00.000Z',
          responsible_collaborator: 'Operador TransConnect',
          no_tax_calc: false,

          integrator_name: 'PX Bank',
          integrator_status: 'Aguardando configuração',

          contractor_code: '2049',
          contractor_name: 'COMIGO',
          contractor_document: '02.077.618/0002-66',
          contractor_rntrc: '49827361',
          contractor_address: 'Rio Verde - GO',

          contracted_carrier_code: '865',
          contracted_carrier_name: 'RODRIGO GUIMARAES FERREIRA',
          contracted_carrier_document: '034.283.641-20',
          contracted_carrier_rntrc: '46032259',
          carrier_profile: 'tac_equiparado',

          driver_code: '13199',
          driver_name: 'LUCIONE DE OLIVEIRA',
          driver_cpf: '957.036.321-53',
          driver_cnh: '04829104821',

          vehicle_plate: 'NKR-2A03',
          trailer_plate: 'OQG-4629',
          trailer_plate_2: 'OQG-4609',
          vehicle_model: 'Scania R 450',
          axles_count: 9,
          vehicle_category:
            'Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 9 eixos - rod. dupla )',
          vehicle_owner_code: '865',
          vehicle_owner_name: 'RODRIGO GUIMARAES FERREIRA',
          vehicle_owner_doc: '034.283.641-20',

          freight_value: 4897.5,
          advance_payment_value: 1469.25,
          balance_payment_value: 3428.25,
          payment_terms: 'Adiantamento na saída e saldo no encerramento',
          vpo_value: 422.4,

          bank_payment_method: 'Conta Depósito Manual',
          bank_account_type: 'Conta Corrente',
          bank_name: 'SICOOB (756)',
          bank_agency: '3258',
          bank_account: '12845-6',
          bank_pix_key: 'rodrigogui113@gmail.com',
          bank_beneficiary_name: 'RODRIGO GUIMARAES FERREIRA',
          bank_beneficiary_doc: '034.283.641-20',

          driver_bank_name: 'BANCO DO BRASIL (001)',
          driver_bank_agency: '1234-5',
          driver_bank_account: '98765-4',
          driver_bank_pix_key: '95703632153',
          driver_bank_payment_method: 'Conta Depósito Manual',
          driver_bank_account_type: 'Conta Corrente',

          origin_city: 'Rio Verde',
          origin_state: 'GO',
          destination_city: 'Santos',
          destination_state: 'SP',
          distance_km: 840,
          cargo_type: 'Soja em Grãos a Granel',
          cargo_weight_kg: 37500,
          cargo_value: 145000,
          nfe_number: '000.084.219',

          law_observations:
            'LEI 13.103/2015: MAX. 8H/DIA + 2H EXTRAS, 5H30 SEGUIDAS COM PAUSA DE 30MIN, 11H DE DESCANSO POR 24H. CONTRATANTE CIENTE DAS PAUSAS E OBRIGACOES LEGAIS.______CHAVE PIX: rodrigogui113@gmail.com',
          status: 'emitido',
          signature_status: 'aguardando_configuracao',
          version: 1,
        })
        app.save(record)
      }
    } catch (e) {
      console.log('Seed inicial CTRB ignorado:', e)
    }
  },
  (app) => {},
)
