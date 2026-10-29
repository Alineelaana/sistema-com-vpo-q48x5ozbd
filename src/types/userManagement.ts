export type UserRole = 'admin' | 'manager' | 'financial' | 'operator' | 'readonly'

export type UserStatus = 'active' | 'inactive' | 'anonymized'

export interface AppUser {
  id: string
  name: string
  email: string
  login?: string
  cpf?: string
  sequential_code?: number
  avatar?: string
  must_change_password?: boolean
  inactivity_timeout?: number
  phone?: string
  role: UserRole
  role_title?: string
  status: UserStatus
  privacy_consent_date?: string
  privacy_policy_version?: string
  data_treatment_purpose?: string
  is_anonymized?: boolean
  created?: string
  updated?: string
}

export type AppModule =
  | 'dashboard'
  | 'deliveries'
  | 'routing'
  | 'control_tower'
  | 'freight_audit'
  | 'vpo_calc'
  | 'trips'
  | 'cte'
  | 'vehicles'
  | 'drivers'
  | 'fines'
  | 'company'
  | 'agents_center'
  | 'email_agent_training'
  | 'users'
  | 'audit'
  | 'privacy_policy'

export interface RoleConfig {
  id: UserRole
  label: string
  description: string
  badgeColor: string
  allowedModules: AppModule[]
  canViewValues: boolean
}

export const USER_ROLES_CONFIG: Record<UserRole, RoleConfig> = {
  admin: {
    id: 'admin',
    label: 'Administrador',
    description:
      'Acesso irrestrito a todos os módulos operacionais, financeiros e gestão de usuários/LGPD',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    allowedModules: [
      'dashboard',
      'deliveries',
      'routing',
      'control_tower',
      'freight_audit',
      'vpo_calc',
      'trips',
      'cte',
      'vehicles',
      'drivers',
      'fines',
      'company',
      'agents_center',
      'email_agent_training',
      'users',
      'audit',
      'privacy_policy',
    ],
    canViewValues: true,
  },
  manager: {
    id: 'manager',
    label: 'Gestor Operacional',
    description:
      'Gestão completa de viagens, entregas, roteirização, torre de controle, frota, multas e documentos',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    allowedModules: [
      'dashboard',
      'deliveries',
      'routing',
      'control_tower',
      'vpo_calc',
      'trips',
      'cte',
      'vehicles',
      'drivers',
      'fines',
      'company',
      'agents_center',
      'email_agent_training',
      'privacy_policy',
    ],
    canViewValues: true,
  },
  financial: {
    id: 'financial',
    label: 'Financeiro',
    description:
      'Foco em documentos fiscais (CT-e), auditoria de frete, multas e conciliação de valores',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    allowedModules: [
      'dashboard',
      'freight_audit',
      'cte',
      'vpo_calc',
      'fines',
      'trips',
      'company',
      'agents_center',
      'privacy_policy',
    ],
    canViewValues: true,
  },
  operator: {
    id: 'operator',
    label: 'Operador Logístico',
    description:
      'Execução de despachos, viagens e entregas no dia a dia, sem acesso a dados de valores',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    allowedModules: [
      'dashboard',
      'deliveries',
      'routing',
      'control_tower',
      'trips',
      'vehicles',
      'drivers',
      'agents_center',
      'privacy_policy',
    ],
    canViewValues: false,
  },
  readonly: {
    id: 'readonly',
    label: 'Somente Leitura / Auditoria',
    description:
      'Acesso para visualização de relatórios, dados cadastrais e conformidade sem permissão de alteração',
    badgeColor: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    allowedModules: [
      'dashboard',
      'deliveries',
      'trips',
      'cte',
      'vehicles',
      'drivers',
      'fines',
      'agents_center',
      'privacy_policy',
    ],
    canViewValues: true,
  },
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'create_user'
  | 'update_user'
  | 'deactivate_user'
  | 'activate_user'
  | 'anonymize_user'
  | 'export_user_data'
  | 'privacy_consent'
  | 'password_change'
  | 'email_agent_run'
  | 'email_agent_config'
  | 'email_agent_rule_create'
  | 'email_agent_rule_update'
  | 'email_agent_rule_approve'
  | 'email_agent_rule_reject'
  | 'cargo_agent_run'
  | 'cargo_link_confirm'
  | 'cargo_link_reject'
  | 'regularization_orchestrate'
  | 'cte_transmit'
  | 'mdfe_transmit'
  | 'mdfe_close'
  | 'mdfe_cancel'
  | 'ciot_create'
  | 'ciot_update'
  | 'insurance_endorsement_create'
  | 'insurance_endorsement_update'

export interface AuditLog {
  id: string
  actor_id?: string
  actor_name?: string
  actor_email?: string
  action: AuditAction
  target_user_id?: string
  target_user_email?: string
  description: string
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created: string
  updated?: string
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, { label: string; badge: string }> = {
  login: { label: 'Login realizado', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  logout: {
    label: 'Logout realizado',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  },
  create_user: {
    label: 'Criação de Usuário',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  update_user: {
    label: 'Alteração de Cadastro',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  deactivate_user: {
    label: 'Desativação de Conta',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  activate_user: {
    label: 'Reativação de Conta',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  anonymize_user: {
    label: 'Anonimização (LGPD)',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  export_user_data: {
    label: 'Exportação / Portabilidade',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  privacy_consent: {
    label: 'Aceite de Termo / Política',
    badge: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  },
  password_change: {
    label: 'Alteração de Senha',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  },
  email_agent_run: {
    label: 'Execução Agente de E-mails',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  email_agent_config: {
    label: 'Configuração do Agente',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  email_agent_rule_create: {
    label: 'Criação de Regra',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  email_agent_rule_update: {
    label: 'Atualização de Regra',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  email_agent_rule_approve: {
    label: 'Aprovação de Regra (Admin)',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  email_agent_rule_reject: {
    label: 'Rejeição de Regra',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  cargo_agent_run: {
    label: 'Execução Agente de Cargas',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  cargo_link_confirm: {
    label: 'Vínculo de Carga Confirmado',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  cargo_link_reject: {
    label: 'Vínculo de Carga Rejeitado',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  regularization_orchestrate: {
    label: 'Orquestração Etapa 3',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  cte_transmit: {
    label: 'Transmissão de CT-e',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  mdfe_transmit: {
    label: 'Transmissão de MDF-e',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  mdfe_close: {
    label: 'Encerramento de MDF-e',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  },
  mdfe_cancel: {
    label: 'Cancelamento de MDF-e',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  ciot_create: {
    label: 'Cadastro de CIOT',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  ciot_update: {
    label: 'Atualização de CIOT',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  insurance_endorsement_create: {
    label: 'Averbação de Seguro',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  insurance_endorsement_update: {
    label: 'Atualização de Averbação',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
}

export const CURRENT_PRIVACY_POLICY_VERSION = 'v1.0'
export const PRIVACY_POLICY_LAST_UPDATE = '28 de Outubro de 2026'
export const DEFAULT_TREATMENT_PURPOSE =
  'Gestão logística rodoviária de cargas, emissão fiscal e cumprimento de obrigações legais da ANTT e LGPD.'
