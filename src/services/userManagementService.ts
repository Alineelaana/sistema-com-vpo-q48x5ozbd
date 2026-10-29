import pb from '@/lib/pocketbase/client'
import type {
  AppUser,
  AuditLog,
  AuditAction,
  CURRENT_PRIVACY_POLICY_VERSION,
} from '@/types/userManagement'

// Coleta IP público aproximado ou identificação de rede de forma assíncrona com fallback
let cachedClientIp: string | null = null

export async function getClientIp(): Promise<string> {
  if (cachedClientIp) return cachedClientIp
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(2000),
    })
    if (res.ok) {
      const data = await res.json()
      cachedClientIp = data.ip || '127.0.0.1'
      return cachedClientIp
    }
  } catch (_) {
    // Falha silenciosa de rede externa
  }
  cachedClientIp = 'Rede Local/Navegador'
  return cachedClientIp
}

export function getUserAgent(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent
  }
  return 'Browser'
}

/**
 * Grava um evento na trilha de auditoria (LGPD Art. 37)
 */
export async function logAuditEvent(params: {
  action: AuditAction
  description: string
  target_user_id?: string
  target_user_email?: string
  details?: Record<string, unknown>
  actorOverride?: { id?: string; name?: string; email?: string }
}): Promise<AuditLog | null> {
  try {
    const currentAuth = pb.authStore.record
    const actorId = params.actorOverride?.id || currentAuth?.id || ''
    const actorName =
      params.actorOverride?.name || currentAuth?.name || currentAuth?.email || 'Sistema'
    const actorEmail =
      params.actorOverride?.email || currentAuth?.email || 'sistema@transconnect.com.br'

    const ip = await getClientIp()
    const ua = getUserAgent()

    const record = await pb.collection('audit_logs').create<AuditLog>({
      actor_id: actorId || '',
      actor_name: actorName || 'Sistema',
      actor_email: actorEmail || 'sistema@transconnect.com.br',
      action: params.action,
      target_user_id: params.target_user_id || '',
      target_user_email: params.target_user_email || '',
      description: params.description || '',
      details: params.details || {},
      ip_address: ip && ip !== 'unknown' ? ip : '',
      user_agent: ua && ua !== 'unknown' ? ua : '',
    })
    return record
  } catch (err) {
    console.warn('Falha ao registrar log de auditoria:', err)
    return null
  }
}

/**
 * Lista usuários cadastrados (somente admins podem chamar a API com listRule)
 */
export async function getUsers(): Promise<AppUser[]> {
  const records = await pb.collection('users').getFullList<AppUser>({
    sort: '-created',
  })
  return records
}

/**
 * Criação de novo usuário com dados LGPD
 */
export async function createUser(data: {
  name: string
  email: string
  login?: string
  cpf?: string
  password: string
  phone?: string
  role: AppUser['role']
  role_title?: string
  data_treatment_purpose: string
  privacy_accepted: boolean
  must_change_password?: boolean
  inactivity_timeout?: number
  avatarFile?: File | null
}): Promise<AppUser> {
  const now = new Date().toISOString()
  const formData = new FormData()
  formData.append('name', data.name)
  formData.append('email', data.email)
  formData.append('password', data.password)
  formData.append('passwordConfirm', data.password)
  formData.append('phone', data.phone || '')
  formData.append('role', data.role)
  formData.append('role_title', data.role_title || '')
  formData.append('status', 'active')
  formData.append('data_treatment_purpose', data.data_treatment_purpose)
  formData.append('is_anonymized', 'false')
  formData.append('must_change_password', data.must_change_password ? 'true' : 'false')
  formData.append('inactivity_timeout', String(data.inactivity_timeout || 30))

  if (data.login) {
    formData.append('login', data.login.trim())
  }
  if (data.cpf) {
    formData.append('cpf', data.cpf.trim())
  }
  if (data.avatarFile) {
    formData.append('avatar', data.avatarFile)
  }

  if (data.privacy_accepted) {
    formData.append('privacy_consent_date', now)
    formData.append('privacy_policy_version', 'v1.0')
  }

  const createdUser = await pb.collection('users').create<AppUser>(formData)

  await logAuditEvent({
    action: 'create_user',
    description: `Usuário ${createdUser.name} (${createdUser.email} / login: ${createdUser.login || '—'}) cadastrado com código #${createdUser.sequential_code || '—'}`,
    target_user_id: createdUser.id,
    target_user_email: createdUser.email,
    details: {
      role: createdUser.role,
      role_title: createdUser.role_title,
      login: createdUser.login,
      sequential_code: createdUser.sequential_code,
      must_change_password: createdUser.must_change_password,
      inactivity_timeout: createdUser.inactivity_timeout,
      purpose: createdUser.data_treatment_purpose,
      privacy_policy_version: createdUser.privacy_policy_version,
    },
  })

  return createdUser
}

/**
 * Atualiza dados de um usuário
 */
export async function updateUser(
  id: string,
  data: Partial<Omit<AppUser, 'id' | 'created' | 'updated'>> & {
    avatarFile?: File | null
    clearAvatar?: boolean
    password?: string
  },
): Promise<AppUser> {
  const previous = await pb.collection('users').getOne<AppUser>(id)

  let payload: FormData | Record<string, unknown>

  if (data.avatarFile !== undefined || data.clearAvatar) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, val]) => {
      if (key === 'avatarFile' || key === 'clearAvatar') return
      if (val !== undefined && val !== null) {
        formData.append(key, typeof val === 'boolean' ? String(val) : (val as string))
      }
    })
    if (data.avatarFile) {
      formData.append('avatar', data.avatarFile)
    } else if (data.clearAvatar) {
      formData.append('avatar', '')
    }
    payload = formData
  } else {
    const jsonPayload: Record<string, unknown> = {}
    Object.entries(data).forEach(([key, val]) => {
      if (key === 'avatarFile' || key === 'clearAvatar') return
      if (val !== undefined) {
        jsonPayload[key] = val
      }
    })
    payload = jsonPayload
  }

  const updatedUser = await pb.collection('users').update<AppUser>(id, payload)

  // Auditoria detalhada incluindo troca de senha obrigatória
  const details: Record<string, unknown> = {
    changed_fields: Object.keys(data).filter((k) => k !== 'password'),
    previous_status: previous.status,
    new_status: updatedUser.status,
    previous_role: previous.role,
    new_role: updatedUser.role,
  }

  if (
    data.must_change_password !== undefined &&
    data.must_change_password !== previous.must_change_password
  ) {
    details.must_change_password = data.must_change_password
  }

  const desc =
    data.must_change_password && !previous.must_change_password
      ? `Dados do usuário ${updatedUser.name} atualizados e ativada exigência de troca de senha no próximo acesso`
      : `Dados cadastrais do usuário ${updatedUser.name} atualizados`

  await logAuditEvent({
    action: 'update_user',
    description: desc,
    target_user_id: updatedUser.id,
    target_user_email: updatedUser.email,
    details,
  })

  return updatedUser
}

/**
 * Altera status de ativação (ativar / desativar)
 */
export async function toggleUserStatus(
  id: string,
  newStatus: 'active' | 'inactive',
): Promise<AppUser> {
  const target = await pb.collection('users').getOne<AppUser>(id)
  const updated = await pb.collection('users').update<AppUser>(id, { status: newStatus })

  const action = newStatus === 'active' ? 'activate_user' : 'deactivate_user'
  const actionLabel = newStatus === 'active' ? 'Reativação de acesso' : 'Desativação de acesso'

  await logAuditEvent({
    action,
    description: `${actionLabel} para o usuário ${target.name} (${target.email})`,
    target_user_id: target.id,
    target_user_email: target.email,
    details: { previousStatus: target.status, newStatus },
  })

  return updated
}

/**
 * LGPD Art. 16: Anonimização de dados do titular.
 * Em vez de exclusão física destrutiva (que quebraria integridade de logs fiscais/viagens),
 * substitui dados pessoais identificáveis (nome, email, telefone) por pseudônimos irreversíveis.
 */
export async function anonymizeUser(id: string, reason?: string): Promise<AppUser> {
  const target = await pb.collection('users').getOne<AppUser>(id)

  const pseudoId = id.slice(0, 6)
  const anonymizedPayload = {
    name: `Titular Anonimizado [${pseudoId}]`,
    login: `anon_${pseudoId}_${Date.now()}`,
    email: `anonimizado_${pseudoId}_${Date.now()}@lgpd.transconnect.local`,
    phone: '',
    cpf: '',
    avatar: null,
    role_title: 'Ex-colaborador (Dados Anonimizados)',
    status: 'anonymized',
    is_anonymized: true,
    must_change_password: false,
    data_treatment_purpose: `Dados anonimizados conforme LGPD Art. 16 em ${new Date().toLocaleDateString('pt-BR')}. Motivo: ${reason || 'Solicitação de eliminação / revogação'}`,
  }

  const updated = await pb.collection('users').update<AppUser>(id, anonymizedPayload)

  await logAuditEvent({
    action: 'anonymize_user',
    description: `Anonimização dos dados pessoais do usuário id ${id} (LGPD Art. 16) - Titular substituído por pseudônimo`,
    target_user_id: id,
    target_user_email: target.email,
    details: {
      original_email_hash: target.email ? btoa(target.email) : '',
      pseudonym: `Titular Anonimizado [${pseudoId}]`,
      reason: reason || 'Direito de eliminação / Revogação de consentimento',
    },
  })

  return updated
}

/**
 * LGPD Art. 18 (Portabilidade): Exportação de todos os dados do titular em JSON ou CSV
 */
export async function exportUserData(
  userId: string,
): Promise<{ user: AppUser; auditLogs: AuditLog[] }> {
  const user = await pb.collection('users').getOne<AppUser>(userId)

  let logs: AuditLog[] = []
  try {
    logs = await pb.collection('audit_logs').getFullList<AuditLog>({
      filter: `target_user_id = "${userId}" || actor_id = "${userId}"`,
      sort: '-created',
    })
  } catch {
    /* intentionally ignored */
  }

  await logAuditEvent({
    action: 'export_user_data',
    description: `Exportação de relatório de portabilidade de dados (LGPD Art. 18) do titular ${user.name}`,
    target_user_id: user.id,
    target_user_email: user.email,
    details: { exported_records: logs.length + 1 },
  })

  return { user, auditLogs: logs }
}

/**
 * Lista trilha de auditoria com filtros
 */
export async function getAuditLogs(params?: {
  action?: string
  actorEmail?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<AuditLog[]> {
  const filters: string[] = []

  if (params?.action && params.action !== 'all') {
    filters.push(`action = "${params.action}"`)
  }
  if (params?.actorEmail) {
    filters.push(
      `(actor_email ~ "${params.actorEmail}" || target_user_email ~ "${params.actorEmail}")`,
    )
  }
  if (params?.startDate) {
    filters.push(`created >= "${params.startDate} 00:00:00.000Z"`)
  }
  if (params?.endDate) {
    filters.push(`created <= "${params.endDate} 23:59:59.999Z"`)
  }

  const filterExpr = filters.length > 0 ? filters.join(' && ') : ''

  const records = await pb.collection('audit_logs').getList<AuditLog>(1, params?.limit || 100, {
    filter: filterExpr,
    sort: '-created',
  })

  return records.items
}

/**
 * Registra o aceite da Política de Privacidade pelo titular atual
 */
export async function acceptPrivacyPolicy(
  userId: string,
  policyVersion: string = 'v1.0',
): Promise<AppUser> {
  const now = new Date().toISOString()
  const updated = await pb.collection('users').update<AppUser>(userId, {
    privacy_consent_date: now,
    privacy_policy_version: policyVersion,
  })

  await logAuditEvent({
    action: 'privacy_consent',
    description: `Titular ${updated.name} manifestou consentimento com os Termos de Privacidade versão ${policyVersion}`,
    target_user_id: updated.id,
    target_user_email: updated.email,
    details: { policy_version: policyVersion, consented_at: now },
  })

  return updated
}
