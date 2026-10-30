migrate(
  (app) => {
    // 1. Estender a coleção existente 'trips' para se tornar a "Ordem de Transporte" central
    const tripsCol = app.findCollectionByNameOrId('trips')

    // Identificador oficial da Ordem de Transporte (ex: OT-2026-0001)
    if (!tripsCol.fields.getByName('operation_number')) {
      tripsCol.fields.add(
        new TextField({
          name: 'operation_number',
        }),
      )
    }

    // Modalidade de transporte (lotação, fracionada, dedicado, subcontratado)
    if (!tripsCol.fields.getByName('transport_mode')) {
      tripsCol.fields.add(
        new SelectField({
          name: 'transport_mode',
          values: ['lotacao', 'fracionada', 'dedicado', 'subcontratacao'],
          maxSelect: 1,
        }),
      )
    }

    // Atores da operação (remetente, destinatário, expedidor, recebedor)
    if (!tripsCol.fields.getByName('sender_name')) {
      tripsCol.fields.add(new TextField({ name: 'sender_name' }))
    }
    if (!tripsCol.fields.getByName('sender_document')) {
      tripsCol.fields.add(new TextField({ name: 'sender_document' }))
    }
    if (!tripsCol.fields.getByName('recipient_name')) {
      tripsCol.fields.add(new TextField({ name: 'recipient_name' }))
    }
    if (!tripsCol.fields.getByName('recipient_document')) {
      tripsCol.fields.add(new TextField({ name: 'recipient_document' }))
    }
    if (!tripsCol.fields.getByName('shipper_name')) {
      tripsCol.fields.add(new TextField({ name: 'shipper_name' }))
    }
    if (!tripsCol.fields.getByName('shipper_document')) {
      tripsCol.fields.add(new TextField({ name: 'shipper_document' }))
    }
    if (!tripsCol.fields.getByName('receiver_name')) {
      tripsCol.fields.add(new TextField({ name: 'receiver_name' }))
    }
    if (!tripsCol.fields.getByName('receiver_document')) {
      tripsCol.fields.add(new TextField({ name: 'receiver_document' }))
    }

    // Locais de coleta e entrega (endereços detalhados)
    if (!tripsCol.fields.getByName('pickup_address')) {
      tripsCol.fields.add(new TextField({ name: 'pickup_address' }))
    }
    if (!tripsCol.fields.getByName('delivery_address')) {
      tripsCol.fields.add(new TextField({ name: 'delivery_address' }))
    }

    // Documentos fiscais vinculados (NF-e chave, número e relação direta com received_fiscal_documents)
    if (!tripsCol.fields.getByName('nfe_key')) {
      tripsCol.fields.add(new TextField({ name: 'nfe_key' }))
    }
    if (!tripsCol.fields.getByName('nfe_number')) {
      tripsCol.fields.add(new TextField({ name: 'nfe_number' }))
    }
    if (!tripsCol.fields.getByName('nfe_series')) {
      tripsCol.fields.add(new TextField({ name: 'nfe_series' }))
    }
    const fiscalDocsCol = app.findCollectionByNameOrId('received_fiscal_documents')
    if (!tripsCol.fields.getByName('fiscal_document_id')) {
      tripsCol.fields.add(
        new RelationField({
          name: 'fiscal_document_id',
          collectionId: fiscalDocsCol.id,
          maxSelect: 1,
        }),
      )
    }

    // Dados de carga e mercadoria
    if (!tripsCol.fields.getByName('cargo_value')) {
      tripsCol.fields.add(new NumberField({ name: 'cargo_value' }))
    }
    if (!tripsCol.fields.getByName('cargo_volume_m3')) {
      tripsCol.fields.add(new NumberField({ name: 'cargo_volume_m3' }))
    }

    // Veículo, implementos e transportador contratado
    if (!tripsCol.fields.getByName('vehicle_plate')) {
      tripsCol.fields.add(new TextField({ name: 'vehicle_plate' }))
    }
    if (!tripsCol.fields.getByName('trailer_plate')) {
      tripsCol.fields.add(new TextField({ name: 'trailer_plate' }))
    }
    if (!tripsCol.fields.getByName('trailer_plate_2')) {
      tripsCol.fields.add(new TextField({ name: 'trailer_plate_2' }))
    }
    if (!tripsCol.fields.getByName('carrier_rntrc')) {
      tripsCol.fields.add(new TextField({ name: 'carrier_rntrc' }))
    }
    if (!tripsCol.fields.getByName('carrier_profile')) {
      tripsCol.fields.add(
        new SelectField({
          name: 'carrier_profile',
          values: ['frota_propria', 'etc', 'tac_equiparado', 'tac_independente', 'ctc'],
          maxSelect: 1,
        }),
      )
    }
    if (!tripsCol.fields.getByName('contracted_carrier_name')) {
      tripsCol.fields.add(new TextField({ name: 'contracted_carrier_name' }))
    }
    if (!tripsCol.fields.getByName('contracted_carrier_doc')) {
      tripsCol.fields.add(new TextField({ name: 'contracted_carrier_doc' }))
    }

    // Condições comerciais e piso mínimo ANTT
    if (!tripsCol.fields.getByName('minimum_floor_value')) {
      tripsCol.fields.add(new NumberField({ name: 'minimum_floor_value' }))
    }
    if (!tripsCol.fields.getByName('minimum_floor_status')) {
      tripsCol.fields.add(
        new SelectField({
          name: 'minimum_floor_status',
          values: ['validado', 'abaixo_piso', 'dispensado', 'pendente'],
          maxSelect: 1,
        }),
      )
    }
    if (!tripsCol.fields.getByName('payment_terms')) {
      tripsCol.fields.add(new TextField({ name: 'payment_terms' }))
    }
    if (!tripsCol.fields.getByName('advance_payment_value')) {
      tripsCol.fields.add(new NumberField({ name: 'advance_payment_value' }))
    }
    if (!tripsCol.fields.getByName('balance_payment_value')) {
      tripsCol.fields.add(new NumberField({ name: 'balance_payment_value' }))
    }

    // Seguro e CTRB / Contrato de Transporte
    if (!tripsCol.fields.getByName('insurance_policy_number')) {
      tripsCol.fields.add(new TextField({ name: 'insurance_policy_number' }))
    }
    if (!tripsCol.fields.getByName('insurance_averbacao_protocol')) {
      tripsCol.fields.add(new TextField({ name: 'insurance_averbacao_protocol' }))
    }
    if (!tripsCol.fields.getByName('contract_number')) {
      tripsCol.fields.add(new TextField({ name: 'contract_number' }))
    }
    if (!tripsCol.fields.getByName('contract_status')) {
      tripsCol.fields.add(
        new SelectField({
          name: 'contract_status',
          values: ['pendente', 'assinado', 'dispensado', 'cancelado'],
          maxSelect: 1,
        }),
      )
    }

    // Máquina de estados: status consolidado da Ordem de Transporte e etapas detalhadas
    if (!tripsCol.fields.getByName('operation_status')) {
      tripsCol.fields.add(
        new SelectField({
          name: 'operation_status',
          values: [
            'rascunho',
            'aguardando_dados',
            'em_processamento',
            'requer_atencao',
            'pronto_para_liberacao',
            'liberada',
            'em_transito',
            'concluida',
            'cancelada',
          ],
          maxSelect: 1,
        }),
      )
    }

    // JSON detalhado com o estado de cada uma das 10 etapas da esteira operacional
    if (!tripsCol.fields.getByName('workflow_stages')) {
      tripsCol.fields.add(new JSONField({ name: 'workflow_stages' }))
    }

    // Histórico de alterações e auditoria da ordem
    if (!tripsCol.fields.getByName('dispatch_released_at')) {
      tripsCol.fields.add(new DateField({ name: 'dispatch_released_at' }))
    }
    if (!tripsCol.fields.getByName('dispatch_released_by')) {
      tripsCol.fields.add(new TextField({ name: 'dispatch_released_by' }))
    }

    app.save(tripsCol)

    // 2. Atualizar a coleção audit_logs para novas ações do orquestrador de operações
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const actionField = auditCol.fields.getByName('action')
    if (actionField) {
      actionField.values = [
        'login',
        'logout',
        'create_user',
        'update_user',
        'deactivate_user',
        'activate_user',
        'anonymize_user',
        'export_user_data',
        'privacy_consent',
        'password_change',
        'email_agent_run',
        'email_agent_config',
        'email_agent_rule_create',
        'email_agent_rule_update',
        'email_agent_rule_approve',
        'email_agent_rule_reject',
        'cargo_agent_run',
        'cargo_link_confirm',
        'cargo_link_reject',
        'regularization_orchestrate',
        'cte_transmit',
        'mdfe_transmit',
        'mdfe_close',
        'mdfe_cancel',
        'ciot_create',
        'ciot_update',
        'insurance_endorsement_create',
        'insurance_endorsement_update',
        'dispatch_agent_run',
        'dispatch_agent_config',
        'dispatch_template_create',
        'dispatch_template_update',
        'dispatch_recipient_create',
        'dispatch_recipient_update',
        'dispatch_recipient_toggle',
        'dispatch_send_success',
        'dispatch_send_fail',
        'dispatch_send_retry',
        'operation_orchestrate',
        'operation_stage_process',
        'operation_release',
        'operation_reprocess',
        'operation_create_from_nfe',
      ]
      app.save(auditCol)
    }

    // 3. Backfill nos registros existentes de trips para preencher operation_number e workflow_stages
    const existingTrips = app.findRecordsByFilter('trips', '1=1', '', 50, 0)
    for (let i = 0; i < existingTrips.length; i++) {
      const t = existingTrips[i]
      let needsSave = false
      if (!t.get('operation_number')) {
        const opNum = `OT-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`
        t.set('operation_number', opNum)
        needsSave = true
      }
      if (!t.get('operation_status')) {
        const curStatus = t.get('status')
        const opStatus =
          curStatus === 'completed'
            ? 'concluida'
            : curStatus === 'in_progress'
              ? 'em_transito'
              : 'pronto_para_liberacao'
        t.set('operation_status', opStatus)
        needsSave = true
      }
      if (!t.get('workflow_stages')) {
        const defaultStages = {
          nfe: {
            status: 'concluida',
            updated_at: new Date().toISOString(),
            message: 'NF-e vinculada',
          },
          ordem: {
            status: 'concluida',
            updated_at: new Date().toISOString(),
            message: 'Ordem de Transporte gerada',
          },
          veiculo_motorista: {
            status: t.get('vehicle_id') && t.get('driver_id') ? 'concluida' : 'requer_atencao',
            updated_at: new Date().toISOString(),
            message: 'Veículo e motorista alocados',
          },
          roteirizacao: {
            status: 'concluida',
            updated_at: new Date().toISOString(),
            message: 'Rota definida',
          },
          piso_minimo: {
            status: 'concluida',
            updated_at: new Date().toISOString(),
            message: 'Piso mínimo ANTT validado',
          },
          cte: {
            status: 'requer_atencao',
            updated_at: new Date().toISOString(),
            message: 'Aguardando transmissão SEFAZ',
          },
          contrato: {
            status: 'concluida',
            updated_at: new Date().toISOString(),
            message: 'Contrato padrão emitido',
          },
          ciot: {
            status: 'requer_atencao',
            updated_at: new Date().toISOString(),
            message: 'Pendente de protocolo IPEF',
          },
          vpo: {
            status: t.get('vpo_value') > 0 ? 'concluida' : 'pendente',
            updated_at: new Date().toISOString(),
            message: 'VPO calculado',
          },
          mdfe: {
            status: 'pendente',
            updated_at: new Date().toISOString(),
            message: 'Requer CT-e autorizado',
          },
          envio: {
            status: 'pendente',
            updated_at: new Date().toISOString(),
            message: 'Aguardando autorização dos documentos',
          },
          liberacao: {
            status: t.get('status') === 'in_progress' ? 'concluida' : 'pendente',
            updated_at: new Date().toISOString(),
            message: 'Aguardando conclusão das etapas obrigatórias',
          },
        }
        t.set('workflow_stages', JSON.stringify(defaultStages))
        needsSave = true
      }
      if (needsSave) {
        app.save(t)
      }
    }
  },
  (app) => {
    // Reversão
  },
)
