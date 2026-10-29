import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  UserX,
  History,
  Lock,
  RefreshCw,
  MoreVertical,
  Edit2,
  ShieldCheck,
  Calendar,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { AppUser, UserRole, UserStatus } from '@/types/userManagement'
import { USER_ROLES_CONFIG } from '@/types/userManagement'
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  anonymizeUser,
} from '@/services/userManagementService'
import { UserFormModal, type UserFormSubmitData } from '@/components/UserFormModal'
import { AnonymizeModal } from '@/components/AnonymizeModal'
import { ExportUserModal } from '@/components/ExportUserModal'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCPF } from '@/lib/cpfUtils'

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modais
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<AppUser | null>(null)
  const [anonymizeModalOpen, setAnonymizeModalOpen] = useState(false)
  const [userToAnonymize, setUserToAnonymize] = useState<AppUser | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [userToExport, setUserToExport] = useState<AppUser | null>(null)

  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const list = await getUsers()
      setUsers(list)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao carregar usuários',
        description: getErrorMessage(err) || 'Verifique suas permissões de administrador.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtros
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const s = searchTerm.toLowerCase()
      const matchSearch =
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.login && u.login.toLowerCase().includes(s)) ||
        (u.cpf && u.cpf.includes(searchTerm)) ||
        (u.sequential_code && String(u.sequential_code).includes(searchTerm)) ||
        (u.phone && u.phone.includes(searchTerm)) ||
        (u.role_title && u.role_title.toLowerCase().includes(s))

      const matchRole = roleFilter === 'all' || u.role === roleFilter
      const matchStatus = statusFilter === 'all' || u.status === statusFilter

      return matchSearch && matchRole && matchStatus
    })
  }, [users, searchTerm, roleFilter, statusFilter])

  // Contadores
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.status === 'active').length
    const inactive = users.filter((u) => u.status === 'inactive').length
    const anonymized = users.filter((u) => u.status === 'anonymized' || u.is_anonymized).length
    const consented = users.filter((u) => !!u.privacy_consent_date).length
    return { total, active, inactive, anonymized, consented }
  }, [users])

  const handleSaveUser = async (data: UserFormSubmitData) => {
    if (data.id) {
      // Update
      await updateUser(data.id, {
        name: data.name,
        login: data.login,
        cpf: data.cpf,
        password: data.password,
        phone: data.phone,
        role: data.role,
        role_title: data.role_title,
        data_treatment_purpose: data.data_treatment_purpose,
        must_change_password: data.must_change_password,
        inactivity_timeout: data.inactivity_timeout,
        avatarFile: data.avatarFile,
        clearAvatar: data.clearAvatar,
        privacy_policy_version: data.privacy_accepted ? 'v1.0' : undefined,
      })
      toast({
        title: 'Usuário atualizado com sucesso',
        description: 'Permissões, dados e parâmetros de segurança atualizados.',
      })
    } else {
      // Create
      await createUser({
        name: data.name,
        email: data.email,
        login: data.login,
        cpf: data.cpf,
        password: data.password || 'Skip@Pass',
        phone: data.phone,
        role: data.role,
        role_title: data.role_title,
        data_treatment_purpose: data.data_treatment_purpose,
        privacy_accepted: data.privacy_accepted,
        must_change_password: data.must_change_password,
        inactivity_timeout: data.inactivity_timeout,
        avatarFile: data.avatarFile,
      })
      toast({
        title: 'Usuário cadastrado com sucesso',
        description: 'Código sequencial gerado e finalidade registrada na auditoria.',
      })
    }
    await loadData()
  }

  const handleToggleStatus = async (user: AppUser) => {
    if (user.status === 'anonymized') {
      toast({
        title: 'Operação não permitida',
        description: 'Usuários anonimizados não podem ser reativados (LGPD Art. 16).',
        variant: 'destructive',
      })
      return
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active'
    try {
      await toggleUserStatus(user.id, nextStatus)
      toast({
        title: nextStatus === 'active' ? 'Usuário ativado' : 'Usuário desativado',
        description: `O acesso de ${user.name} foi ${nextStatus === 'active' ? 'liberado' : 'bloqueado'}.`,
      })
      await loadData()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao alterar status',
        description: (err as { message?: string })?.message,
        variant: 'destructive',
      })
    }
  }

  const handleConfirmAnonymization = async (userId: string, reason: string) => {
    try {
      await anonymizeUser(userId, reason)
      toast({
        title: 'Titular anonimizado com sucesso',
        description: 'Dados pessoais foram eliminados e substituídos por pseudônimo.',
      })
      await loadData()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao anonimizar titular',
        description: (err as { message?: string })?.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Gestão de Usuários & Acessos
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-indigo-50 border-indigo-200 text-indigo-700"
            >
              LGPD Lei 13.709/2018
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Controle de perfis (RBAC), registro de finalidade, consentimento e direitos do titular.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setUserToEdit(null)
              setFormModalOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Cards de Métricas LGPD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Total Cadastrado
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Usuários no sistema</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Ativos / Liberados
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</div>
          <div className="text-[11px] text-emerald-700 mt-1">Com acesso autorizado</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Consentimento LGPD
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {stats.consented} / {stats.total}
          </div>
          <div className="text-[11px] text-indigo-600 mt-1">Termo v1.0 aceito</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Anonimizados (Art. 16)
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{stats.anonymized}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pseudonimizados</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone ou cargo..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-36">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Perfis</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="manager">Gestor Operacional</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
                <SelectItem value="operator">Operador</SelectItem>
                <SelectItem value="readonly">Somente Leitura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-36">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Situações</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="anonymized">Anonimizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5 pl-4">Código / Titular</th>
                <th className="p-3.5">Cargo / Perfil</th>
                <th className="p-3.5">Situação & Senha</th>
                <th className="p-3.5">Segurança & Timeout</th>
                <th className="p-3.5">Consentimento LGPD</th>
                <th className="p-3.5 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Carregando base de usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleConfig = USER_ROLES_CONFIG[u.role] || USER_ROLES_CONFIG.readonly
                  const isAnon = u.status === 'anonymized' || u.is_anonymized

                  const avatarUrl = u.avatar
                    ? pb.files.getURL(u, u.avatar, { thumb: '100x100' })
                    : null

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isAnon ? 'bg-slate-50/50 opacity-75' : ''
                      }`}
                    >
                      {/* Código e Titular */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          {avatarUrl && !isAnon ? (
                            <img
                              src={avatarUrl}
                              alt={u.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                isAnon
                                  ? 'bg-rose-100 text-rose-700'
                                  : u.status === 'active'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isAnon ? 'X' : (u.name || 'U').charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {u.sequential_code && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-bold bg-slate-100 border-slate-300 text-slate-700"
                                >
                                  #{u.sequential_code}
                                </Badge>
                              )}
                              <span className="font-semibold text-slate-900 truncate">
                                {u.name}
                              </span>
                              {isAnon && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-rose-50 text-rose-700 border-rose-200"
                                >
                                  Anonimizado
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
                              {u.login && (
                                <span className="text-indigo-600 font-mono text-[10px] bg-indigo-50/70 px-1 rounded">
                                  login: {u.login}
                                </span>
                              )}
                              <span className="text-slate-500 truncate">{u.email}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              {u.cpf && <span>CPF: {formatCPF(u.cpf)}</span>}
                              {u.phone && <span>• {u.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cargo / Perfil */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold border ${roleConfig.badgeColor}`}
                          >
                            {roleConfig.label}
                          </Badge>
                          {u.role_title && (
                            <div className="text-[11px] text-slate-600 font-medium">
                              {u.role_title}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Situação e Troca de Senha */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div>
                            {u.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Ativo
                              </span>
                            ) : u.status === 'anonymized' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <UserX className="h-3 w-3" />
                                Anonimizado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <XCircle className="h-3 w-3" />
                                Inativo
                              </span>
                            )}
                          </div>
                          {u.must_change_password && (
                            <div>
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-medium px-1.5 py-0"
                              >
                                Troca de senha pendente
                              </Badge>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Segurança & Timeout */}
                      <td className="p-3.5">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="text-slate-700 font-medium">
                            {u.inactivity_timeout || 30} min de inatividade
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {u.inactivity_timeout
                              ? 'Configuração própria'
                              : 'Default do sistema (30 min)'}
                          </div>
                        </div>
                      </td>

                      {/* Consentimento */}
                      <td className="p-3.5">
                        {u.privacy_consent_date ? (
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              {u.privacy_policy_version || 'v1.0'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(u.privacy_consent_date).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Pendente aceite
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4 text-slate-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 text-xs">
                            <DropdownMenuLabel>Ações de Usuário</DropdownMenuLabel>

                            {!isAnon && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToEdit(u)
                                  setFormModalOpen(true)
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                                Editar Cadastro & Perfil
                              </DropdownMenuItem>
                            )}

                            {!isAnon && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(u)}>
                                {u.status === 'active' ? (
                                  <>
                                    <XCircle className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                    Desativar Acesso
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                    Reativar Acesso
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuLabel className="text-[10px] text-slate-400 font-semibold uppercase">
                              Direitos LGPD
                            </DropdownMenuLabel>

                            <DropdownMenuItem
                              onClick={() => {
                                setUserToExport(u)
                                setExportModalOpen(true)
                              }}
                            >
                              <Download className="h-3.5 w-3.5 mr-2 text-cyan-600" />
                              Exportar Dados (Art. 18)
                            </DropdownMenuItem>

                            {!isAnon && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToAnonymize(u)
                                  setAnonymizeModalOpen(true)
                                }}
                                className="text-rose-600 focus:text-rose-700"
                              >
                                <UserX className="h-3.5 w-3.5 mr-2 text-rose-600" />
                                Anonimizar (Art. 16)
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais de Operação */}
      <UserFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={handleSaveUser}
        userToEdit={userToEdit}
      />

      <AnonymizeModal
        open={anonymizeModalOpen}
        user={userToAnonymize}
        onClose={() => setAnonymizeModalOpen(false)}
        onConfirm={handleConfirmAnonymization}
      />

      <ExportUserModal
        open={exportModalOpen}
        user={userToExport}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  )
}
