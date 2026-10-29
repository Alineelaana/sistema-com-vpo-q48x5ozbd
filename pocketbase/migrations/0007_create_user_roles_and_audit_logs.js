migrate(
  (app) => {
    // 1. Atualizar campos e regras da coleção de usuários (_pb_users_auth_)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // Adicionar campos extras na coleção users
    if (!usersCol.fields.getByName('phone')) {
      usersCol.fields.add(new TextField({ name: 'phone' }))
    }
    if (!usersCol.fields.getByName('role_title')) {
      usersCol.fields.add(new TextField({ name: 'role_title' })) // Cargo/função
    }
    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'manager', 'financial', 'operator', 'readonly'],
          maxSelect: 1,
        }),
      )
    }
    if (!usersCol.fields.getByName('status')) {
      usersCol.fields.add(
        new SelectField({
          name: 'status',
          values: ['active', 'inactive', 'anonymized'],
          maxSelect: 1,
        }),
      )
    }
    if (!usersCol.fields.getByName('privacy_consent_date')) {
      usersCol.fields.add(new DateField({ name: 'privacy_consent_date' }))
    }
    if (!usersCol.fields.getByName('privacy_policy_version')) {
      usersCol.fields.add(new TextField({ name: 'privacy_policy_version' }))
    }
    if (!usersCol.fields.getByName('data_treatment_purpose')) {
      usersCol.fields.add(new TextField({ name: 'data_treatment_purpose' }))
    }
    if (!usersCol.fields.getByName('is_anonymized')) {
      usersCol.fields.add(new BoolField({ name: 'is_anonymized' }))
    }

    // Regras de acesso da coleção users:
    // Usuários autenticados podem ler seu próprio registro ou, se admin, listar/visualizar todos
    usersCol.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    usersCol.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || id = @request.auth.id)"
    // Criação: admin pode cadastrar qualquer usuário, ou no signup inicial se não logado
    usersCol.createRule = "@request.auth.role = 'admin' || @request.auth.id = ''"
    // Atualização: admin pode atualizar qualquer usuário, ou usuário próprio atualizando apenas seus dados sem alterar sua própria role
    usersCol.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || (id = @request.auth.id && @request.body.role:changed = false && @request.body.status:changed = false))"
    // Exclusão: apenas administradores
    usersCol.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'"

    app.save(usersCol)

    // 2. Criar coleção audit_logs (Trilha de auditoria LGPD art. 37)
    let auditLogs
    try {
      auditLogs = app.findCollectionByNameOrId('audit_logs')
    } catch (_) {
      auditLogs = new Collection({
        name: 'audit_logs',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        createRule: "@request.auth.id != ''",
        updateRule: null, // Trilha de auditoria é append-only, não pode ser alterada
        deleteRule: null, // Trilha de auditoria não pode ser apagada
        fields: [
          {
            name: 'actor_id',
            type: 'relation',
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'actor_name', type: 'text' },
          { name: 'actor_email', type: 'text' },
          {
            name: 'action',
            type: 'select',
            values: [
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
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'target_user_id', type: 'text' },
          { name: 'target_user_email', type: 'text' },
          { name: 'description', type: 'text', required: true },
          { name: 'details', type: 'json' },
          { name: 'ip_address', type: 'text' },
          { name: 'user_agent', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_audit_action ON audit_logs (action)',
          'CREATE INDEX idx_audit_actor ON audit_logs (actor_id)',
          'CREATE INDEX idx_audit_target ON audit_logs (target_user_id)',
          'CREATE INDEX idx_audit_created ON audit_logs (created)',
        ],
      })
      app.save(auditLogs)
    }

    // 3. Atualizar usuário administrador existente para role admin e status active
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'alineelaana@gmail.com')
      admin.set('role', 'admin')
      admin.set('status', 'active')
      admin.set('role_title', 'Administrador do Sistema')
      admin.set(
        'data_treatment_purpose',
        'Administração global do sistema e cumprimento legal LGPD',
      )
      admin.set('privacy_policy_version', 'v1.0')
      admin.set('privacy_consent_date', new Date().toISOString())
      app.save(admin)
    } catch (_) {}

    // 4. Seed de exemplo de usuários adicionais com perfis variados (se não existirem)
    const seedUsers = [
      {
        email: 'gestor.operacional@transconnect.com.br',
        name: 'Mariana Duarte',
        role_title: 'Coordenadora de Operações e Frota',
        role: 'manager',
        phone: '(11) 98123-4567',
        status: 'active',
        purpose: 'Gestão operacional de frotas, viagens, entregas e torre de controle',
      },
      {
        email: 'financeiro@transconnect.com.br',
        name: 'Roberto Guimarães',
        role_title: 'Analista Financeiro e Fiscal',
        role: 'financial',
        phone: '(11) 97234-5678',
        status: 'active',
        purpose: 'Faturamento de frete, auditoria e controle de multas',
      },
      {
        email: 'operador@transconnect.com.br',
        name: 'Lucas Barreto',
        role_title: 'Operador de Despacho Logístico',
        role: 'operator',
        phone: '(19) 98345-6789',
        status: 'active',
        purpose: 'Controle operacional de despacho e viagens sem acesso a valores',
      },
      {
        email: 'auditoria.leitura@transconnect.com.br',
        name: 'Camila Peixoto',
        role_title: 'Auditora Externa LGPD/Compliance',
        role: 'readonly',
        phone: '(11) 99456-7890',
        status: 'active',
        purpose: 'Visualização e auditoria de conformidade de processos',
      },
    ]

    for (const u of seedUsers) {
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', u.email)
      } catch (_) {
        const rec = new Record(usersCol)
        rec.setEmail(u.email)
        rec.setPassword('Skip@Pass')
        rec.setVerified(true)
        rec.set('name', u.name)
        rec.set('role_title', u.role_title)
        rec.set('role', u.role)
        rec.set('phone', u.phone)
        rec.set('status', u.status)
        rec.set('data_treatment_purpose', u.purpose)
        rec.set('privacy_policy_version', 'v1.0')
        rec.set('privacy_consent_date', new Date().toISOString())
        app.save(rec)

        // Grava log inicial de criação
        try {
          const auditCol = app.findCollectionByNameOrId('audit_logs')
          const log = new Record(auditCol)
          log.set('actor_name', 'Sistema')
          log.set('actor_email', 'alineelaana@gmail.com')
          log.set('action', 'create_user')
          log.set('target_user_id', rec.id)
          log.set('target_user_email', rec.getString('email'))
          log.set(
            'description',
            `Usuário ${u.name} cadastrado com perfil ${u.role} (LGPD: finalidade registrada)`,
          )
          log.set('details', JSON.stringify({ role: u.role, role_title: u.role_title }))
          app.save(log)
        } catch (_) {}
      }
    }
  },
  (app) => {
    try {
      const audit = app.findCollectionByNameOrId('audit_logs')
      if (audit) app.delete(audit)
    } catch (_) {}
  },
)
