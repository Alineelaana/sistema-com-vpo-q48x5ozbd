/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks para gestão de usuários:
 * - Geração automática do sequential_code no evento de criação
 * - Garantia de inalterabilidade do sequential_code em updates
 * - Ajuste de timeout padrão se não fornecido
 */

onRecordCreate((e) => {
  try {
    // Busca o maior sequential_code existente na coleção users
    const users = e.app.findRecordsByFilter(
      'users',
      'sequential_code > 0',
      '-sequential_code',
      1,
      0,
    )
    let nextCode = 1
    if (users && users.length > 0) {
      const highest = users[0].getInt('sequential_code')
      nextCode = highest + 1
    }
    e.record.set('sequential_code', nextCode)

    // Garante verified = true para novos usuários criados no sistema
    e.record.setVerified(true)

    // Se inactivity_timeout não foi informado ou <= 0, aplica 30 min por padrão
    const timeout = e.record.getInt('inactivity_timeout')
    if (timeout <= 0) {
      e.record.set('inactivity_timeout', 30)
    }
  } catch (err) {
    console.error('[users:onRecordCreate] Erro ao processar novo usuário:', err)
  }
  e.next()
}, 'users')

onRecordUpdate((e) => {
  try {
    // O código sequencial é estritamente inalterável
    const originalCode = e.record.original().getInt('sequential_code')
    if (originalCode > 0) {
      e.record.set('sequential_code', originalCode)
    }
  } catch (err) {
    console.error('[users:onRecordUpdate] Erro ao proteger código sequencial:', err)
  }
  e.next()
}, 'users')
