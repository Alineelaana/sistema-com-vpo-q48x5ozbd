import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, ShieldCheck, Lock } from 'lucide-react'
import type { AppUser, UserRole } from '@/types/userManagement'
import {
  USER_ROLES_CONFIG,
  CURRENT_PRIVACY_POLICY_VERSION,
  DEFAULT_TREATMENT_PURPOSE,
} from '@/types/userManagement'

interface UserFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    id?: string
    name: string
    email: string
    password?: string
    phone?: string
    role: UserRole
    role_title: string
    data_treatment_purpose: string
    privacy_accepted: boolean
    status?: AppUser['status']
  }) => Promise<void>
  userToEdit?: AppUser | null
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  onClose,
  onSave,
  userToEdit,
}) => {
  const isEditing = !!userToEdit

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('operator')
  const [roleTitle, setRoleTitle] = useState('')
  const [purpose, setPurpose] = useState(DEFAULT_TREATMENT_PURPOSE)
  const [privacyAccepted, setPrivacyAccepted] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '')
      setEmail(userToEdit.email || '')
      setPassword('')
      setPhone(userToEdit.phone || '')
      setRole(userToEdit.role || 'operator')
      setRoleTitle(userToEdit.role_title || '')
      setPurpose(userToEdit.data_treatment_purpose || DEFAULT_TREATMENT_PURPOSE)
      setPrivacyAccepted(!!userToEdit.privacy_consent_date)
    } else {
      setName('')
      setEmail('')
      setPassword('')
      setPhone('')
      setRole('operator')
      setRoleTitle('')
      setPurpose(DEFAULT_TREATMENT_PURPOSE)
      setPrivacyAccepted(true)
    }
    setError(null)
  }, [userToEdit, open])

  // Validação de senha forte (mínimo 8 caracteres, com letra e número)
  const validatePassword = (pass: string): boolean => {
    if (pass.length < 8) return false
    const hasLetter = /[a-zA-Z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    return hasLetter && hasNumber
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('O nome completo do usuário é obrigatório.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Forneça um endereço de e-mail corporativo válido.')
      return
    }

    if (!isEditing) {
      if (!password) {
        setError('A senha de acesso provisória é obrigatória.')
        return
      }
      if (!validatePassword(password)) {
        setError('A senha deve conter no mínimo 8 caracteres, incluindo letras e números.')
        return
      }
      if (!privacyAccepted) {
        setError('É necessário registrar o aceite das regras da Política de Privacidade.')
        return
      }
    } else if (password && !validatePassword(password)) {
      setError('A nova senha deve ter no mínimo 8 caracteres com letras e números.')
      return
    }

    if (!purpose.trim()) {
      setError('Informe a base legal / finalidade do tratamento conforme a LGPD.')
      return
    }

    setLoading(true)
    try {
      await onSave({
        id: userToEdit?.id,
        name: name.trim(),
        email: email.trim(),
        password: password || undefined,
        phone: phone.trim(),
        role,
        role_title: roleTitle.trim(),
        data_treatment_purpose: purpose.trim(),
        privacy_accepted: privacyAccepted,
        status: userToEdit?.status,
      })
      onClose()
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ||
          'Erro ao salvar usuário. Verifique se o e-mail já não está cadastrado.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            {isEditing ? 'Editar Usuário & Acessos' : 'Cadastrar Novo Usuário (Conforme LGPD)'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as permissões de módulo e dados cadastrais do titular.'
              : 'Registre o novo usuário com finalidade legal de tratamento e perfil de acesso.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="usr-name" className="text-xs font-medium text-slate-700">
                Nome Completo do Titular *
              </Label>
              <Input
                id="usr-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Augusto Silva"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="usr-email" className="text-xs font-medium text-slate-700">
                E-mail Corporativo *
              </Label>
              <Input
                id="usr-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@transconnect.com.br"
                required
                disabled={isEditing}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="usr-phone" className="text-xs font-medium text-slate-700">
                Telefone / Celular
              </Label>
              <Input
                id="usr-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
              />
            </div>
          </div>

          {/* Cargo e Perfil RBAC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <Label htmlFor="usr-role" className="text-xs font-medium text-slate-700">
                Perfil de Acesso (RBAC) *
              </Label>
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger id="usr-role">
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(USER_ROLES_CONFIG).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="text-left">
                        <span className="font-semibold text-xs block">{r.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="usr-title" className="text-xs font-medium text-slate-700">
                Cargo / Função na Empresa
              </Label>
              <Input
                id="usr-title"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Ex: Despachante / Coordenador"
              />
            </div>
          </div>

          {/* Descrição do perfil selecionado */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center justify-between">
              <span>Permissões do Perfil: {USER_ROLES_CONFIG[role].label}</span>
              <span
                className={
                  USER_ROLES_CONFIG[role].canViewValues
                    ? 'text-emerald-700 font-medium'
                    : 'text-amber-700 font-medium'
                }
              >
                {USER_ROLES_CONFIG[role].canViewValues
                  ? '• Visualiza valores financeiros'
                  : '• Sem visualização de valores'}
              </span>
            </div>
            <p>{USER_ROLES_CONFIG[role].description}</p>
            <div className="text-[10px] text-slate-500 pt-1">
              Módulos liberados: {USER_ROLES_CONFIG[role].allowedModules.join(', ')}
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="usr-password"
                className="text-xs font-medium text-slate-700 flex items-center gap-1"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                {isEditing
                  ? 'Nova Senha (deixe em branco para manter)'
                  : 'Senha de Acesso Provisória *'}
              </Label>
              <span className="text-[10px] text-slate-500">
                Mín. 8 caracteres (letras e números)
              </span>
            </div>
            <Input
              id="usr-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditing ? 'Manter senha atual...' : '••••••••'}
            />
          </div>

          {/* LGPD: Finalidade do Tratamento */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <Label htmlFor="usr-purpose" className="text-xs font-medium text-slate-700">
                Finalidade do Tratamento dos Dados (LGPD Art. 6º, I) *
              </Label>
              <span className="text-[10px] text-indigo-600 font-medium">Lei 13.709/2018</span>
            </div>
            <Textarea
              id="usr-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              className="text-xs"
              placeholder="Descreva a finalidade legítima para coleta dos dados cadastrais deste operador..."
            />
          </div>

          {/* LGPD: Consentimento e Versão da Política */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
              <Checkbox
                checked={privacyAccepted}
                onCheckedChange={(c) => setPrivacyAccepted(!!c)}
                className="mt-0.5"
              />
              <div className="text-xs text-slate-700 leading-snug">
                <span className="font-semibold text-indigo-900 block">
                  Consentimento com a Política de Privacidade ({CURRENT_PRIVACY_POLICY_VERSION})
                </span>
                Registrar aceite formal do titular nos termos da LGPD, autorizando o tratamento
                estrito para cumprimento do contrato de transporte rodoviário e exigências da ANTT.
              </div>
            </label>
          </div>

          <DialogFooter className="pt-3 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Usuário' : 'Cadastrar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
