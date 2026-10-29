migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Campo de login (nome de usuário único)
    if (!usersCol.fields.getByName('login')) {
      usersCol.fields.add(
        new TextField({
          name: 'login',
          required: false,
        }),
      )
    }

    // 2. Opção "Criar nova senha no próximo acesso" (must_change_password)
    if (!usersCol.fields.getByName('must_change_password')) {
      usersCol.fields.add(
        new BoolField({
          name: 'must_change_password',
        }),
      )
    }

    // 3. Logout por inatividade configurável por usuário (em minutos, default 30)
    if (!usersCol.fields.getByName('inactivity_timeout')) {
      usersCol.fields.add(
        new NumberField({
          name: 'inactivity_timeout',
          min: 1,
          max: 1440, // até 24h
          onlyInt: true,
        }),
      )
    }

    // 4. Campo CPF (único por usuário)
    if (!usersCol.fields.getByName('cpf')) {
      usersCol.fields.add(
        new TextField({
          name: 'cpf',
          required: false,
        }),
      )
    }

    // 5. Código de cadastro sequencial inalterável
    if (!usersCol.fields.getByName('sequential_code')) {
      usersCol.fields.add(
        new NumberField({
          name: 'sequential_code',
          min: 1,
          onlyInt: true,
        }),
      )
    }

    // Salvar novos campos
    app.save(usersCol)

    // 6. Atualizar os usuários existentes com login derivado do e-mail, timeout padrão e código sequencial
    const existingUsers = app.findRecordsByFilter('_pb_users_auth_', '', 'created', 1000, 0)

    let currentCode = 1
    for (let i = 0; i < existingUsers.length; i++) {
      const u = existingUsers[i]
      let needsSave = false

      if (!u.getString('login')) {
        const email = u.getString('email')
        let derivedLogin = email.split('@')[0]
        derivedLogin = derivedLogin.replace(/[^a-zA-Z0-9._-]/g, '')
        u.set('login', derivedLogin)
        needsSave = true
      }

      if (u.getInt('inactivity_timeout') <= 0) {
        u.set('inactivity_timeout', 30)
        needsSave = true
      }

      if (u.getInt('sequential_code') <= 0) {
        u.set('sequential_code', currentCode)
        currentCode++
        needsSave = true
      } else {
        const val = u.getInt('sequential_code')
        if (val >= currentCode) {
          currentCode = val + 1
        }
      }

      if (needsSave) {
        app.save(u)
      }
    }

    // 7. Criar índices únicos com segurança (safe addIndex)
    usersCol.addIndex('idx_users_login', true, 'login', "login != ''")
    usersCol.addIndex('idx_users_cpf', true, 'cpf', "cpf != ''")
    usersCol.addIndex('idx_users_sequential_code', true, 'sequential_code', 'sequential_code > 0')

    app.save(usersCol)
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.removeIndex('idx_users_login')
      usersCol.removeIndex('idx_users_cpf')
      usersCol.removeIndex('idx_users_sequential_code')
      app.save(usersCol)
    } catch (_) {}
  },
)
