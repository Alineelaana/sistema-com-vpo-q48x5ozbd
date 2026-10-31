// pocketbase/hooks/minimum_floor_engine.pb.js
/**
 * Motor do Piso Mínimo do Frete ANTT — Resolução ANTT nº 5.867/2020 e nº 6.059/2024 (Lei nº 13.703/2018).
 *
 * Funcionalidades:
 * 1. POST /backend/v1/minimum-floor/calculate:
 *    - Calcula o piso mínimo oficial da operação rodoviária considerando:
 *      * Distância rodoviária aprovada da rota (nunca linha reta nem inventada)
 *      * Tipo de carga (granel sólido, líquido, frigorificada, carga geral, neogranel, perigosas, etc.)
 *      * Configuração do veículo e eixos carregados (2 a 9 eixos)
 *      * Modalidade de contratação (Tabela A - Lotação completa; Tabela B - Apenas veículo automotor/tração)
 *      * Regras de retorno vazio (quando aplicável, ex: carga exclusiva sem retorno garantido)
 *      * Verificação de sujeição à política (cargas próprias ou TAC com carga própria dispensados)
 *    - Salva na trip: floor_table_version, floor_table_id, floor_applicable, floor_non_applicable_reason,
 *      minimum_floor_value, floor_ccd, floor_cc, floor_distance_km, floor_empty_return_applicable,
 *      floor_empty_return_value, floor_freight_difference, floor_regularization_status, floor_calculation_details.
 *    - Atualiza a etapa 'piso_minimo' em workflow_stages e bloqueia liberação se abaixo do piso.
 *    - Anti-duplicação: se os parâmetros e valores resultantes forem idênticos ao cálculo gravado,
 *      não recria logs repetidos e preserva histórico.
 *    - Trilha de auditoria em audit_logs.
 *
 * 2. POST /backend/v1/minimum-floor/regularize:
 *    - Permite regularizar uma ordem bloqueada:
 *      Opção A: Ajustar frete para igual ou superior ao piso mínimo oficial.
 *      Opção B: Registrar justificativa legal aprovada (ex: transporte de carga própria, retorno não remunerado com amparo legal).
 *    - Atualiza floor_regularization_status e a etapa do workflow, auditando a aprovação.
 *
 * 3. GET /backend/v1/minimum-floor/tables:
 *    - Lista versões cadastradas com seus coeficientes e indicação de vigência.
 *
 * 4. POST /backend/v1/minimum-floor/tables/import:
 *    - Importa nova versão de coeficientes com número de resolução, fonte oficial e data de vigência.
 *
 * 5. POST /backend/v1/minimum-floor/tables/set-current:
 *    - Define uma versão como a vigente para novos cálculos.
 */

// 1. Rota de cálculo do piso mínimo para uma Ordem de Transporte (trip)
// POST /backend/v1/minimum-floor/calculate
routerAdd(
  'POST',
  '/backend/v1/minimum-floor/calculate',
  (e) => {
    try {
      const authUser = e.auth
      const body = e.requestInfo().body || {}
      const tripId = body.trip_id
      if (!tripId) {
        return e.json(400, { success: false, error: 'trip_id é obrigatório.' })
      }

      let trip
      try {
        trip = e.app.findRecordById('trips', tripId)
      } catch (_) {
        return e.json(404, { success: false, error: 'Ordem de Transporte não encontrada.' })
      }

      // 1.1 Verificar distância rodoviária da rota
      // Regra rígida: usar a distância rodoviária aprovada no Roteirizador (Passo 2) ou informada explicitamente
      let distanceKm =
        body.distance_km !== undefined ? Number(body.distance_km) : trip.getFloat('distance_km')
      if (!distanceKm || distanceKm <= 0) {
        return e.json(400, {
          success: false,
          error:
            'A Ordem de Transporte precisa de distância rodoviária real válida (> 0 km). Não é permitido calcular piso mínimo sobre distância zerada ou linha reta.',
        })
      }

      // 1.2 Verificar aplicabilidade da Lei 13.703/2018
      // Regra de ouro: Primeiro verificar se a operação está sujeita à política de pisos mínimos!
      // Isenções legais:
      // - Transporte de carga própria em veículo próprio / comodato (Lei 13.703/2018, art. 3º)
      // - Transporte internacional sujeito a tratados bilaterais específicos
      // - Veículo de carga própria da empresa compradora/vendedora sem contratação de frete de terceiro
      const isApplicableParam = body.is_applicable !== undefined ? !!body.is_applicable : null
      const nonApplicableReasonParam = body.non_applicable_reason || ''
      const carrierProfile =
        body.carrier_profile || trip.getString('carrier_profile') || 'tac_equiparado'

      // Se explicitamente marcado como não aplicável ou se for 'frota_propria'
      const isExempt =
        isApplicableParam === false ||
        carrierProfile === 'frota_propria' ||
        body.is_own_cargo === true

      const nowIso = new Date().toISOString()
      const freightValue =
        body.freight_value !== undefined
          ? Number(body.freight_value)
          : trip.getFloat('freight_value') || 0

      // Ler workflow_stages atuais
      let stages = {}
      try {
        const rawStages = trip.getString('workflow_stages')
        stages = rawStages ? JSON.parse(rawStages) : {}
      } catch (_) {
        stages = {}
      }

      if (isExempt) {
        // OPERAÇÃO NÃO SUJEITA À POLÍTICA DE PISO MÍNIMO
        const reason =
          nonApplicableReasonParam ||
          (carrierProfile === 'frota_propria'
            ? 'Transporte rodoviário executado com frota própria (Lei 13.703/2018, art. 3º — dispensa de piso mínimo tabelado).'
            : 'Operação legalmente dispensada da tabela de piso mínimo ANTT.')

        const previousStatus = trip.getString('floor_regularization_status')
        const isIdentical =
          previousStatus === 'nao_aplicavel' &&
          trip.getBool('floor_applicable') === false &&
          trip.getString('floor_non_applicable_reason') === reason

        trip.set('floor_applicable', false)
        trip.set('floor_non_applicable_reason', reason)
        trip.set('floor_regularization_status', 'nao_aplicavel')
        trip.set('minimum_floor_status', 'nao_aplicavel')
        trip.set('minimum_floor_value', 0)
        trip.set('floor_freight_difference', 0)
        trip.set(
          'floor_calculation_details',
          JSON.stringify({
            applicable: false,
            reason,
            calculated_at: nowIso,
            distance_km: distanceKm,
            freight_value: freightValue,
          }),
        )

        // Na esteira de 12 etapas, piso_minimo fica 'concluida' com observação de isenção
        stages.piso_minimo = {
          status: 'concluida',
          updated_at: nowIso,
          message: `Operação dispensada do piso mínimo ANTT: ${reason}`,
          details: {
            applicable: false,
            reason,
            freight_value: freightValue,
            calculated_at: nowIso,
          },
        }
        trip.set('workflow_stages', JSON.stringify(stages))
        e.app.save(trip)

        // Trilha de auditoria (com anti-duplicação: não grava repetido se dados idênticos)
        if (!isIdentical) {
          try {
            const auditCol = e.app.findCollectionByNameOrId('audit_logs')
            const auditRec = new Record(auditCol)
            auditRec.set(
              'actor_name',
              authUser ? authUser.getString('name') : 'Sistema Automático TMS',
            )
            auditRec.set(
              'actor_email',
              authUser ? authUser.getString('email') : 'operador@transconnect.local',
            )
            if (authUser) auditRec.set('actor_id', authUser.id)
            auditRec.set('action', 'floor_calculate')
            auditRec.set(
              'description',
              `Piso mínimo verificado para Ordem ${trip.getString('operation_number')}: Operação NÃO SUJEITA (${reason}). Viagem liberada para etapa seguinte.`,
            )
            auditRec.set(
              'details',
              JSON.stringify({
                tripId: trip.id,
                operationNumber: trip.getString('operation_number'),
                applicable: false,
                reason,
              }),
            )
            e.app.save(auditRec)
          } catch (_) {}
        }

        return e.json(200, {
          success: true,
          applicable: false,
          status: 'nao_aplicavel',
          status_label: 'Não Aplicável (Isenta Legalmente)',
          reason,
          minimum_floor_value: 0,
          freight_value: freightValue,
          difference: 0,
          table_version: 'N/A (Dispensado)',
          is_compliant: true,
          workflow_stages: stages,
        })
      }

      // 1.3 Operação SUJEITA ao piso mínimo: calcular conforme coeficientes
      // Obter parâmetros da carga
      let tableType = body.table_type || trip.getString('floor_table_type') || 'tabela_a' // tabela_a (Lotação) ou tabela_b (Apenas Cavalo)
      let cargoCategory =
        body.cargo_category || trip.getString('floor_cargo_category') || 'carga_geral'
      let axles = body.axles !== undefined ? Number(body.axles) : trip.getInt('axles_count') || 6
      const emptyReturnApplicable =
        body.empty_return_applicable !== undefined
          ? !!body.empty_return_applicable
          : trip.getBool('floor_empty_return_applicable')

      // Mapear se vier categoria de texto livre da trip
      const validCategories = [
        'granel_solido',
        'granel_liquido',
        'frigorificada',
        'conteinerizada',
        'carga_geral',
        'neogranel',
        'perigosa_granel_solido',
        'perigosa_granel_liquido',
        'perigosa_frigorificada',
        'perigosa_conteinerizada',
        'perigosa_carga_geral',
        'granel_pressurizada',
      ]
      if (!validCategories.includes(cargoCategory)) {
        cargoCategory = 'carga_geral'
      }

      // Buscar tabela vigente ou tabela especificada
      const tableId = body.table_id || trip.getString('floor_table_id')
      let tableRec = null
      if (tableId) {
        try {
          tableRec = e.app.findRecordById('piso_minimo_tabelas', tableId)
        } catch (_) {}
      }
      if (!tableRec) {
        const currentTables = e.app.findRecordsByFilter(
          'piso_minimo_tabelas',
          'is_current = true',
          '-effective_from',
          1,
          0,
        )
        if (currentTables.length > 0) {
          tableRec = currentTables[0]
        } else {
          const fallback = e.app.findRecordsByFilter(
            'piso_minimo_tabelas',
            '1=1',
            '-effective_from',
            1,
            0,
          )
          if (fallback.length > 0) tableRec = fallback[0]
        }
      }

      if (!tableRec) {
        return e.json(500, {
          success: false,
          error:
            'Nenhuma tabela de piso mínimo ANTT ativa encontrada no banco de dados. Cadastre ou ative uma versão na tela de Administração.',
        })
      }

      // Buscar coeficientes CCD e CC inline
      let coefs = e.app.findRecordsByFilter(
        'piso_minimo_coeficientes',
        `table_id = '${tableRec.id}' && table_type = '${tableType}' && cargo_category = '${cargoCategory}' && axles = ${axles}`,
        '',
        1,
        0,
      )
      if (coefs.length === 0) {
        coefs = e.app.findRecordsByFilter(
          'piso_minimo_coeficientes',
          `table_id = '${tableRec.id}' && table_type = '${tableType}' && cargo_category = 'carga_geral' && axles = ${axles}`,
          '',
          1,
          0,
        )
      }
      if (coefs.length === 0) {
        coefs = e.app.findRecordsByFilter(
          'piso_minimo_coeficientes',
          `table_id = '${tableRec.id}' && table_type = '${tableType}' && cargo_category = '${cargoCategory}'`,
          'axles',
          1,
          0,
        )
      }
      if (coefs.length === 0) {
        coefs = e.app.findRecordsByFilter(
          'piso_minimo_coeficientes',
          `table_id = '${tableRec.id}'`,
          '',
          1,
          0,
        )
      }

      const coefRec = coefs.length > 0 ? coefs[0] : null
      if (!coefRec) {
        return e.json(500, {
          success: false,
          error: `Não foram encontrados coeficientes para a combinação: tabela ${tableType}, categoria ${cargoCategory}, ${axles} eixos.`,
        })
      }

      const ccd = coefRec.getFloat('ccd_cost_per_km')
      const cc = coefRec.getFloat('cc_loading_unloading')

      // FÓRMULA OFICIAL ANTT (Resolução nº 5.867/2020 e 6.059/2024):
      // Frete Mínimo = (Distância × CCD) + CC
      let baseFloor = Number((distanceKm * ccd + cc).toFixed(2))

      // Regra de Retorno Vazio (art. 10 da Resolução ANTT nº 5.867/2020):
      // Na impossibilidade ou impedimento de retorno com carga (ex: carretas tanque especializadas, granéis líquidos, veículos dedicados),
      // o coeficiente de deslocamento (CCD) é acrescido da distância de retorno (ou 100% do custo de deslocamento de volta).
      let emptyReturnValue = 0
      if (emptyReturnApplicable) {
        emptyReturnValue = Number((distanceKm * ccd).toFixed(2))
      }
      const totalFloor = Number((baseFloor + emptyReturnValue).toFixed(2))

      // Comparação com o frete acordado
      const difference = Number((freightValue - totalFloor).toFixed(2))
      const isUnderFloor = freightValue < totalFloor

      // Status de regularização
      let floorStatus = 'conforme'
      let minFloorLegacyStatus = 'validado'
      if (isUnderFloor) {
        const prevRegularization = trip.getString('floor_regularization_status')
        if (prevRegularization === 'justificativa_aprovada') {
          floorStatus = 'justificativa_aprovada'
          minFloorLegacyStatus = 'regularizado'
        } else {
          floorStatus = 'bloqueado_abaixo_piso'
          minFloorLegacyStatus = 'abaixo_piso'
        }
      }

      // Detalhes completos do cálculo para auditoria e exibição técnica
      const calculationDetails = {
        table_version: tableRec.getString('version_code'),
        table_name: tableRec.getString('name'),
        legal_act: tableRec.getString('legal_act'),
        source_url: tableRec.getString('source_url'),
        validation_status: tableRec.getString('validation_status'),
        table_type: tableType,
        table_type_label:
          tableType === 'tabela_b' ? 'Tabela B - Apenas Tração' : 'Tabela A - Carga Lotação',
        cargo_category: cargoCategory,
        cargo_category_label: coefRec.getString('cargo_category_label') || cargoCategory,
        axles: axles,
        distance_km: distanceKm,
        ccd_cost_per_km: ccd,
        cc_loading_unloading: cc,
        displacement_cost: Number((distanceKm * ccd).toFixed(2)),
        loading_unloading_cost: cc,
        empty_return_applicable: emptyReturnApplicable,
        empty_return_value: emptyReturnValue,
        base_floor: baseFloor,
        total_minimum_floor: totalFloor,
        freight_negotiated: freightValue,
        difference: difference,
        percentage_difference:
          totalFloor > 0 ? Number(((difference / totalFloor) * 100).toFixed(1)) : 0,
        status: floorStatus,
        calculated_at: nowIso,
      }

      // Anti-duplicação: verificar se este cálculo é rigorosamente idêntico ao já gravado
      const prevDetailsRaw = trip.getString('floor_calculation_details')
      let isIdentical = false
      try {
        if (prevDetailsRaw) {
          const prevDetails = JSON.parse(prevDetailsRaw)
          if (
            prevDetails.table_version === calculationDetails.table_version &&
            prevDetails.axles === calculationDetails.axles &&
            prevDetails.distance_km === calculationDetails.distance_km &&
            prevDetails.cargo_category === calculationDetails.cargo_category &&
            prevDetails.total_minimum_floor === calculationDetails.total_minimum_floor &&
            prevDetails.freight_negotiated === calculationDetails.freight_negotiated &&
            prevDetails.empty_return_applicable === calculationDetails.empty_return_applicable
          ) {
            isIdentical = true
          }
        }
      } catch (_) {}

      // Atualizar campos da trip
      trip.set('floor_applicable', true)
      trip.set('floor_non_applicable_reason', '')
      trip.set('floor_table_version', tableRec.getString('version_code'))
      trip.set('floor_table_id', tableRec.id)
      trip.set('floor_table_type', tableType)
      trip.set('floor_cargo_category', cargoCategory)
      trip.set('axles_count', axles)
      trip.set('floor_ccd', ccd)
      trip.set('floor_cc', cc)
      trip.set('floor_distance_km', distanceKm)
      trip.set('floor_empty_return_applicable', emptyReturnApplicable)
      trip.set('floor_empty_return_value', emptyReturnValue)
      trip.set('floor_freight_difference', difference)
      trip.set('floor_regularization_status', floorStatus)
      trip.set('minimum_floor_value', totalFloor)
      trip.set('minimum_floor_status', minFloorLegacyStatus)
      trip.set('floor_calculation_details', JSON.stringify(calculationDetails))

      // Atualizar a etapa piso_minimo na esteira do workflow
      if (floorStatus === 'conforme' || floorStatus === 'justificativa_aprovada') {
        stages.piso_minimo = {
          status: 'concluida',
          updated_at: nowIso,
          message:
            floorStatus === 'justificativa_aprovada'
              ? `Frete regularizado com justificativa aprovada: R$ ${freightValue.toFixed(2)} (Piso ANTT ${tableRec.getString('version_code')}: R$ ${totalFloor.toFixed(2)}).`
              : `Frete acordado de R$ ${freightValue.toFixed(2)} cumpre o piso mínimo oficial ANTT (${tableRec.getString('version_code')}: R$ ${totalFloor.toFixed(2)}).`,
          details: calculationDetails,
        }
      } else {
        stages.piso_minimo = {
          status: 'requer_atencao',
          updated_at: nowIso,
          message: `Frete negociado (R$ ${freightValue.toFixed(2)}) abaixo do piso mínimo oficial ANTT (R$ ${totalFloor.toFixed(2)} — diferença de R$ ${Math.abs(difference).toFixed(2)}). Operação bloqueada para regularização.`,
          details: calculationDetails,
        }
        if (trip.getString('operation_status') === 'liberada') {
          trip.set('operation_status', 'requer_atencao')
        }
      }

      trip.set('workflow_stages', JSON.stringify(stages))
      e.app.save(trip)

      // Gravar na auditoria somente se houver mudança de fato (anti-duplicação)
      if (!isIdentical) {
        try {
          const auditCol = e.app.findCollectionByNameOrId('audit_logs')
          const auditRec = new Record(auditCol)
          auditRec.set(
            'actor_name',
            authUser ? authUser.getString('name') : 'Sistema Automático TMS',
          )
          auditRec.set(
            'actor_email',
            authUser ? authUser.getString('email') : 'operador@transconnect.local',
          )
          if (authUser) auditRec.set('actor_id', authUser.id)
          auditRec.set('action', 'floor_calculate')
          auditRec.set(
            'description',
            `Piso mínimo calculado para Ordem ${trip.getString('operation_number')}: R$ ${totalFloor.toFixed(2)} (${distanceKm} km, ${axles} eixos, ${tableRec.getString('version_code')}). Status: ${floorStatus}.`,
          )
          auditRec.set(
            'details',
            JSON.stringify({
              tripId: trip.id,
              operationNumber: trip.getString('operation_number'),
              tableVersion: tableRec.getString('version_code'),
              distanceKm,
              axles,
              totalFloor,
              freightValue,
              difference,
              floorStatus,
              emptyReturnApplicable,
            }),
          )
          e.app.save(auditRec)
        } catch (_) {}
      }

      return e.json(200, {
        success: true,
        applicable: true,
        status: floorStatus,
        status_label:
          floorStatus === 'conforme'
            ? 'Conforme Piso Mínimo'
            : floorStatus === 'justificativa_aprovada'
              ? 'Regularizado com Justificativa'
              : 'Abaixo do Piso Mínimo (Bloqueado)',
        is_compliant: !isUnderFloor || floorStatus === 'justificativa_aprovada',
        minimum_floor_value: totalFloor,
        freight_value: freightValue,
        difference: difference,
        table_version: tableRec.getString('version_code'),
        table_name: tableRec.getString('name'),
        calculation: calculationDetails,
        workflow_stages: stages,
        is_duplicate_avoided: isIdentical,
      })
    } catch (err) {
      console.error('[minimum-floor:calculate] Erro:', err)
      return e.json(500, {
        success: false,
        error: err ? err.message || String(err) : 'Erro ao calcular piso mínimo da operação.',
      })
    }
  },
  $apis.requireAuth(),
)

// 2. Rota para regularizar contrato/frete abaixo do piso
// POST /backend/v1/minimum-floor/regularize
routerAdd(
  'POST',
  '/backend/v1/minimum-floor/regularize',
  (e) => {
    try {
      const authUser = e.auth
      const body = e.requestInfo().body || {}
      const tripId = body.trip_id
      const actionType = body.action_type // 'adjust_freight' ou 'legal_justification'
      const newFreightValue = Number(body.new_freight_value) || 0
      const justification = (body.justification || '').trim()

      if (!tripId) {
        return e.json(400, { success: false, error: 'trip_id é obrigatório.' })
      }

      let trip
      try {
        trip = e.app.findRecordById('trips', tripId)
      } catch (_) {
        return e.json(404, { success: false, error: 'Ordem de Transporte não encontrada.' })
      }

      const minFloor = trip.getFloat('minimum_floor_value') || 0
      const nowIso = new Date().toISOString()
      const actorName = authUser ? authUser.getString('name') : 'Administrador TMS'

      let stages = {}
      try {
        const rawStages = trip.getString('workflow_stages')
        stages = rawStages ? JSON.parse(rawStages) : {}
      } catch (_) {
        stages = {}
      }

      if (actionType === 'adjust_freight') {
        if (newFreightValue < minFloor) {
          return e.json(400, {
            success: false,
            error: `O novo valor de frete (R$ ${newFreightValue.toFixed(2)}) continua inferior ao piso mínimo obrigatório de R$ ${minFloor.toFixed(2)}.`,
          })
        }

        const oldFreight = trip.getFloat('freight_value')
        trip.set('freight_value', newFreightValue)
        trip.set('floor_freight_difference', Number((newFreightValue - minFloor).toFixed(2)))
        trip.set('floor_regularization_status', 'regularizado_frete_ajustado')
        trip.set('minimum_floor_status', 'validado')
        trip.set(
          'floor_regularization_reason',
          `Frete ajustado de R$ ${oldFreight.toFixed(2)} para R$ ${newFreightValue.toFixed(2)}.`,
        )
        trip.set('floor_regularized_at', nowIso)
        trip.set('floor_regularized_by', actorName)

        stages.piso_minimo = {
          status: 'concluida',
          updated_at: nowIso,
          message: `Frete ajustado para R$ ${newFreightValue.toFixed(2)}, cumprindo o piso mínimo oficial ANTT (R$ ${minFloor.toFixed(2)}).`,
          details: {
            old_freight: oldFreight,
            new_freight: newFreightValue,
            minimum_floor: minFloor,
            regularized_by: actorName,
            regularized_at: nowIso,
          },
        }
      } else if (actionType === 'legal_justification') {
        if (!justification || justification.length < 10) {
          return e.json(400, {
            success: false,
            error:
              'Justificativa legal detalhada é obrigatória (mínimo 10 caracteres) para regularização por exceção.',
          })
        }

        trip.set('floor_regularization_status', 'justificativa_aprovada')
        trip.set('minimum_floor_status', 'regularizado')
        trip.set('floor_regularization_reason', justification)
        trip.set('floor_regularized_at', nowIso)
        trip.set('floor_regularized_by', actorName)

        stages.piso_minimo = {
          status: 'concluida',
          updated_at: nowIso,
          message: `Operação liberada mediante justificativa legal aprovada por ${actorName}: "${justification}".`,
          details: {
            justification,
            minimum_floor: minFloor,
            freight_value: trip.getFloat('freight_value'),
            regularized_by: actorName,
            regularized_at: nowIso,
          },
        }
      } else {
        return e.json(400, {
          success: false,
          error: "action_type inválido. Escolha 'adjust_freight' ou 'legal_justification'.",
        })
      }

      trip.set('workflow_stages', JSON.stringify(stages))
      e.app.save(trip)

      // Registrar auditoria da regularização
      try {
        const auditCol = e.app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('actor_name', actorName)
        auditRec.set(
          'actor_email',
          authUser ? authUser.getString('email') : 'operador@transconnect.local',
        )
        if (authUser) auditRec.set('actor_id', authUser.id)
        auditRec.set('action', 'floor_regularize')
        auditRec.set(
          'description',
          `Ordem ${trip.getString('operation_number')} regularizada no Piso Mínimo ANTT via ${actionType === 'adjust_freight' ? 'ajuste de frete' : 'justificativa legal'}. Responsável: ${actorName}.`,
        )
        auditRec.set(
          'details',
          JSON.stringify({
            tripId: trip.id,
            actionType,
            newFreightValue,
            justification,
            minFloor,
          }),
        )
        e.app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Piso mínimo da Ordem de Transporte regularizado com sucesso!',
        floor_regularization_status: trip.getString('floor_regularization_status'),
        freight_value: trip.getFloat('freight_value'),
        workflow_stages: stages,
      })
    } catch (err) {
      console.error('[minimum-floor:regularize] Erro:', err)
      return e.json(500, {
        success: false,
        error: err ? err.message || String(err) : 'Erro ao regularizar piso mínimo.',
      })
    }
  },
  $apis.requireAuth(),
)

// 3. Listar tabelas e histórico de versões do Piso Mínimo ANTT
// GET /backend/v1/minimum-floor/tables
routerAdd(
  'GET',
  '/backend/v1/minimum-floor/tables',
  (e) => {
    try {
      const tables = e.app.findRecordsByFilter(
        'piso_minimo_tabelas',
        '1=1',
        '-effective_from',
        100,
        0,
      )

      const result = []
      for (let t of tables) {
        const coefs = e.app.findRecordsByFilter(
          'piso_minimo_coeficientes',
          `table_id = '${t.id}'`,
          'table_type,cargo_category,axles',
          200,
          0,
        )

        const coefsList = coefs.map((c) => ({
          id: c.id,
          table_type: c.getString('table_type'),
          cargo_category: c.getString('cargo_category'),
          cargo_category_label: c.getString('cargo_category_label'),
          axles: c.getInt('axles'),
          ccd_cost_per_km: c.getFloat('ccd_cost_per_km'),
          cc_loading_unloading: c.getFloat('cc_loading_unloading'),
        }))

        result.push({
          id: t.id,
          version_code: t.getString('version_code'),
          name: t.getString('name'),
          legal_act: t.getString('legal_act'),
          source_url: t.getString('source_url'),
          effective_from: t.getString('effective_from'),
          effective_to: t.getString('effective_to'),
          is_current: t.getBool('is_current'),
          validation_status: t.getString('validation_status'),
          diesel_reference_price: t.getFloat('diesel_reference_price'),
          ipca_accumulated_percent: t.getFloat('ipca_accumulated_percent'),
          notes: t.getString('notes'),
          imported_by: t.getString('imported_by'),
          coefficients_count: coefsList.length,
          coefficients: coefsList,
        })
      }

      return e.json(200, {
        success: true,
        tables: result,
        count: result.length,
        current_version: result.find((t) => t.is_current) || result[0] || null,
      })
    } catch (err) {
      console.error('[minimum-floor:tables] Erro:', err)
      return e.json(500, {
        success: false,
        error: err ? err.message || String(err) : 'Erro ao listar tabelas do piso mínimo.',
      })
    }
  },
  $apis.requireAuth(),
)

// 4. Importar / cadastrar nova versão da tabela oficial de coeficientes
// POST /backend/v1/minimum-floor/tables/import
routerAdd(
  'POST',
  '/backend/v1/minimum-floor/tables/import',
  (e) => {
    try {
      const authUser = e.auth
      const body = e.requestInfo().body || {}

      const versionCode = (body.version_code || '').trim()
      const name = (body.name || '').trim()
      const legalAct = (body.legal_act || '').trim()
      const sourceUrl = (body.source_url || '').trim()
      const effectiveFrom = body.effective_from || new Date().toISOString()
      const isCurrent = !!body.is_current
      const validationStatus = body.validation_status || 'aguardando_validacao_oficial'
      const dieselPrice = Number(body.diesel_reference_price) || 0
      const ipcaPercent = Number(body.ipca_accumulated_percent) || 0
      const notes = body.notes || ''
      const coefficients = Array.isArray(body.coefficients) ? body.coefficients : []

      if (!versionCode || !name || !legalAct) {
        return e.json(400, {
          success: false,
          error: 'Campos obrigatórios: version_code, name e legal_act.',
        })
      }

      if (isCurrent) {
        const currentTables = e.app.findRecordsByFilter(
          'piso_minimo_tabelas',
          'is_current = true',
          '',
          100,
          0,
        )
        for (let oldTab of currentTables) {
          oldTab.set('is_current', false)
          e.app.save(oldTab)
        }
      }

      const tabelasCol = e.app.findCollectionByNameOrId('piso_minimo_tabelas')
      const coefsCol = e.app.findCollectionByNameOrId('piso_minimo_coeficientes')

      const existing = e.app.findRecordsByFilter(
        'piso_minimo_tabelas',
        `version_code = '${versionCode}'`,
        '',
        1,
        0,
      )

      const tableRec = existing.length > 0 ? existing[0] : new Record(tabelasCol)
      tableRec.set('version_code', versionCode)
      tableRec.set('name', name)
      tableRec.set('legal_act', legalAct)
      tableRec.set('source_url', sourceUrl)
      tableRec.set('effective_from', effectiveFrom)
      tableRec.set('is_current', isCurrent)
      tableRec.set('validation_status', validationStatus)
      tableRec.set('diesel_reference_price', dieselPrice)
      tableRec.set('ipca_accumulated_percent', ipcaPercent)
      tableRec.set('notes', notes)
      tableRec.set('imported_by', authUser ? authUser.getString('name') : 'Administrador TMS')
      e.app.save(tableRec)

      let coefSavedCount = 0
      if (coefficients.length > 0) {
        for (let item of coefficients) {
          if (!item.cargo_category || !item.axles) continue
          const coefRec = new Record(coefsCol)
          coefRec.set('table_id', tableRec.id)
          coefRec.set('table_type', item.table_type || 'tabela_a')
          coefRec.set('cargo_category', item.cargo_category)
          coefRec.set('cargo_category_label', item.cargo_category_label || item.cargo_category)
          coefRec.set('axles', Number(item.axles))
          coefRec.set('ccd_cost_per_km', Number(item.ccd_cost_per_km) || 0)
          coefRec.set('cc_loading_unloading', Number(item.cc_loading_unloading) || 0)
          e.app.save(coefRec)
          coefSavedCount++
        }
      }

      try {
        const auditCol = e.app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('actor_name', authUser ? authUser.getString('name') : 'Administrador TMS')
        auditRec.set(
          'actor_email',
          authUser ? authUser.getString('email') : 'operador@transconnect.local',
        )
        if (authUser) auditRec.set('actor_id', authUser.id)
        auditRec.set('action', 'floor_table_import')
        auditRec.set(
          'description',
          `Nova versão da Tabela de Piso Mínimo ANTT importada/atualizada: ${versionCode} - ${name} (${coefSavedCount} coeficientes).`,
        )
        auditRec.set(
          'details',
          JSON.stringify({
            tableId: tableRec.id,
            versionCode,
            legalAct,
            isCurrent,
            validationStatus,
            coefSavedCount,
          }),
        )
        e.app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: `Versão ${versionCode} salva com sucesso!`,
        table_id: tableRec.id,
        version_code: versionCode,
        coefficients_saved: coefSavedCount,
      })
    } catch (err) {
      console.error('[minimum-floor:tables:import] Erro:', err)
      return e.json(500, {
        success: false,
        error: err ? err.message || String(err) : 'Erro ao importar tabela.',
      })
    }
  },
  $apis.requireAuth(),
)

// 5. Definir versão vigente
// POST /backend/v1/minimum-floor/tables/set-current
routerAdd(
  'POST',
  '/backend/v1/minimum-floor/tables/set-current',
  (e) => {
    try {
      const authUser = e.auth
      const body = e.requestInfo().body || {}
      const tableId = body.table_id

      if (!tableId) {
        return e.json(400, { success: false, error: 'table_id é obrigatório.' })
      }

      const tableRec = e.app.findRecordById('piso_minimo_tabelas', tableId)

      const currentTables = e.app.findRecordsByFilter(
        'piso_minimo_tabelas',
        'is_current = true',
        '',
        100,
        0,
      )
      for (let oldTab of currentTables) {
        oldTab.set('is_current', false)
        e.app.save(oldTab)
      }

      tableRec.set('is_current', true)
      e.app.save(tableRec)

      try {
        const auditCol = e.app.findCollectionByNameOrId('audit_logs')
        const auditRec = new Record(auditCol)
        auditRec.set('actor_name', authUser ? authUser.getString('name') : 'Administrador TMS')
        auditRec.set(
          'actor_email',
          authUser ? authUser.getString('email') : 'operador@transconnect.local',
        )
        if (authUser) auditRec.set('actor_id', authUser.id)
        auditRec.set('action', 'floor_table_set_current')
        auditRec.set(
          'description',
          `Tabela vigente de Piso Mínimo ANTT alterada para: ${tableRec.getString('version_code')} (${tableRec.getString('name')}).`,
        )
        auditRec.set(
          'details',
          JSON.stringify({ tableId: tableRec.id, versionCode: tableRec.getString('version_code') }),
        )
        e.app.save(auditRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: `Tabela ${tableRec.getString('version_code')} definida como vigente!`,
        version_code: tableRec.getString('version_code'),
      })
    } catch (err) {
      console.error('[minimum-floor:tables:set-current] Erro:', err)
      return e.json(500, {
        success: false,
        error: err ? err.message || String(err) : 'Erro ao ativar tabela vigente.',
      })
    }
  },
  $apis.requireAuth(),
)
