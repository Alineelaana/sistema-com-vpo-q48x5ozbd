import { ClientResponseError } from 'pocketbase'

export type FieldErrors = Record<string, string>

export function extractFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ClientResponseError)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object') return {}
  const errors: FieldErrors = {}
  for (const [field, detail] of Object.entries(data)) {
    if (
      detail &&
      typeof detail === 'object' &&
      'message' in detail &&
      typeof (detail as { message: unknown }).message === 'string'
    ) {
      errors[field] = (detail as { message: string }).message
    }
  }
  return errors
}

const FIELD_FRIENDLY_NAMES: Record<string, string> = {
  login: 'Login / Usuário',
  cpf: 'CPF',
  email: 'E-mail corporativo',
  password: 'Senha',
  passwordConfirm: 'Confirmação de senha',
  name: 'Nome completo',
  role: 'Perfil de acesso',
  data_treatment_purpose: 'Finalidade do tratamento (LGPD)',
  inactivity_timeout: 'Tempo limite de inatividade',
}

export function formatFieldErrorMessage(field: string, rawMessage: string): string {
  const fieldName = FIELD_FRIENDLY_NAMES[field] || field
  const lowerMsg = rawMessage.toLowerCase()

  if (
    lowerMsg.includes('must be unique') ||
    lowerMsg.includes('unique constraint') ||
    lowerMsg.includes('already exists') ||
    lowerMsg.includes('já está em uso')
  ) {
    return `${fieldName} já cadastrado(a) no sistema. Por favor, utilize outro.`
  }

  if (
    lowerMsg.includes('cannot be blank') ||
    lowerMsg.includes('missing required') ||
    lowerMsg.includes('validation_required')
  ) {
    return `O campo "${fieldName}" é obrigatório.`
  }

  if (lowerMsg.includes("values don't match") || lowerMsg.includes('mismatch')) {
    return `${fieldName}: os valores não conferem.`
  }

  if (lowerMsg.includes('invalid') || lowerMsg.includes('format')) {
    return `${fieldName}: formato inválido.`
  }

  return `${fieldName}: ${rawMessage}`
}

export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  }

  const fieldErrors = extractFieldErrors(error)
  const fieldEntries = Object.entries(fieldErrors)

  if (fieldEntries.length > 0) {
    return fieldEntries.map(([field, msg]) => formatFieldErrorMessage(field, msg)).join(' | ')
  }

  // Se houver mensagem de erro do servidor
  if (error.response?.message && error.response.message !== 'Failed to create record.') {
    return error.response.message
  }

  if (error.message && error.message !== 'Failed to create record.') {
    return error.message
  }

  return 'Não foi possível salvar o usuário. Verifique se o login, e-mail ou CPF já estão cadastrados.'
}
