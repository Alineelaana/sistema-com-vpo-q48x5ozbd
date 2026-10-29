/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase hooks para gestão de usuários:
 * - Geração automática do sequential_code no evento de criação
 * - Garantia de inalterabilidade do sequential_code em updates
 * - Ajuste de timeout padrão se não fornecido
 */

onRecordCreateRequest((e) => {
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

    // Se inactivity_timeout não foi informado ou <= 0, aplica 30 min por padrão
    const timeout = e.record.getInt('inactivity_timeout')
    if (timeout <= 0) {
      e.record.set('inactivity_timeout', 30)
    }
  } catch (err) {
    console.error('[users:createRequest] Erro ao calcular código sequencial:', err)
  }
  e.next()
}, 'users')

onRecordUpdateRequest((e) => {
  try {
    // O código sequencial é estritamente inalterável
    const originalCode = e.record.original().getInt('sequential_code')
    if (originalCode > 0) {
      e.record.set('sequential_code', originalCode)
    }
  } catch (err) {
    console.error('[users:updateRequest] Erro ao proteger código sequencial:', err)
  }
  e.next()
}, 'users')
