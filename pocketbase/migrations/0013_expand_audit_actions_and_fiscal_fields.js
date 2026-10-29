migrate(
  (app) => {
    // 1. Atualizar a coleção audit_logs para aceitar novas ações e permitir que campos opcionais recebam valores nulos/vazios
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
      ]
    }

    // Regras de auditoria: qualquer usuário autenticado pode criar logs
    auditCol.createRule = "@request.auth.id != ''"
    app.save(auditCol)

    // 2. Garantir campo rntrc e outros campos fiscais em company_settings se faltarem
    const companyCol = app.findCollectionByNameOrId('company_settings')
    if (!companyCol.fields.getByName('rntrc')) {
      companyCol.fields.add(
        new TextField({
          name: 'rntrc',
        }),
      )
    }
    if (!companyCol.fields.getByName('sefaz_environment')) {
      companyCol.fields.add(
        new SelectField({
          name: 'sefaz_environment',
          values: ['homologation', 'production'],
          maxSelect: 1,
        }),
      )
    }
    app.save(companyCol)

    // 3. Garantir campo xml_content em cte_documents se não existir
    const cteCol = app.findCollectionByNameOrId('cte_documents')
    if (!cteCol.fields.getByName('xml_content')) {
      cteCol.fields.add(
        new TextField({
          name: 'xml_content',
        }),
      )
    }
    if (!cteCol.fields.getByName('access_key')) {
      cteCol.fields.add(
        new TextField({
          name: 'access_key',
        }),
      )
    }
    if (!cteCol.fields.getByName('protocol')) {
      cteCol.fields.add(
        new TextField({
          name: 'protocol',
        }),
      )
    }
    if (!cteCol.fields.getByName('issued_at')) {
      cteCol.fields.add(
        new DateField({
          name: 'issued_at',
        }),
      )
    }
    app.save(cteCol)
  },
  (app) => {
    // Reversão segura
  },
)
