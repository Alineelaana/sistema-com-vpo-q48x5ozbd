import React, { useState, useEffect, useRef } from 'react'
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
import {
  AlertCircle,
  ShieldCheck,
  Lock,
  Upload,
  User as UserIcon,
  Trash2,
  Clock,
  KeyRound,
  Hash,
} from 'lucide-react'
import type { AppUser, UserRole } from '@/types/userManagement'
import {
  USER_ROLES_CONFIG,
  CURRENT_PRIVACY_POLICY_VERSION,
  DEFAULT_TREATMENT_PURPOSE,
} from '@/types/userManagement'
import pb from '@/lib/pocketbase/client'
import { formatCPF, isValidCPF, cleanCPF } from '@/lib/cpfUtils'

export interface UserFormSubmitData {
  id?: string
  name: string
  email: string
  login: string
  cpf: string
  password?: string
  phone?: string
  role: UserRole
  role_title: string
  data_treatment_purpose: string
  privacy_accepted: boolean
  must_change_password: boolean
  inactivity_timeout: number
  avatarFile?: File | null
  clearAvatar?: boolean
  status?: AppUser['status']
}

interface UserFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: UserFormSubmitData) => Promise<void>
  userToEdit?: AppUser | null
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  onClose,
  onSave,
  userToEdit,
}) => {
  const isEditing = !!userToEdit
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [login, setLogin] = useState('')
  const [cpf, setCpf] = useState('')
  const [sequentialCode, setSequentialCode] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('operator')
  const [roleTitle, setRoleTitle] = useState('')
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [inactivityTimeout, setInactivityTimeout] = useState<number>(30)
  const [purpose, setPurpose] = useState(DEFAULT_TREATMENT_PURPOSE)
  const [privacyAccepted, setPrivacyAccepted] = useState(true)

  // Foto / Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [clearAvatar, setClearAvatar] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '')
      setEmail(userToEdit.email || '')
      setLogin(userToEdit.login || '')
      setCpf(userToEdit.cpf ? formatCPF(userToEdit.cpf) : '')
      setSequentialCode(userToEdit.sequential_code || null)
      setPassword('')
      setPhone(userToEdit.phone || '')
      setRole(userToEdit.role || 'operator')
      setRoleTitle(userToEdit.role_title || '')
      setMustChangePassword(!!userToEdit.must_change_password)
      setInactivityTimeout(userToEdit.inactivity_timeout || 30)
      setPurpose(userToEdit.data_treatment_purpose || DEFAULT_TREATMENT_PURPOSE)
      setPrivacyAccepted(!!userToEdit.privacy_consent_date)

      if (userToEdit.avatar) {
        setAvatarPreview(pb.files.getURL(userToEdit, userToEdit.avatar, { thumb: '120x120' }))
      } else {
        setAvatarPreview(null)
      }
      setAvatarFile(null)
      setClearAvatar(false)
    } else {
      setName('')
      setEmail('')
      setLogin('')
      setCpf('')
      setSequentialCode(null)
      setPassword('')
      setPhone('')
      setRole('operator')
      setRoleTitle('')
      setMustChangePassword(false)
      setInactivityTimeout(30)
      setPurpose(DEFAULT_TREATMENT_PURPOSE)
      setPrivacyAccepted(true)
      setAvatarPreview(null)
      setAvatarFile(null)
      setClearAvatar(false)
    }
    setError(null)
  }, [userToEdit, open])

  const validatePassword = (pass: string): boolean => {
    if (pass.length < 8) return false
    const hasLetter = /[a-zA-Z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    return hasLetter && hasNumber
  }

  const handleCpfChange = (val: string) => {
    const formatted = formatCPF(val)
    setCpf(formatted)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecione um arquivo de imagem válido (PNG, JPG, WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A foto selecionada deve ter no máximo 5MB.')
      return
    }

    setAvatarFile(file)
    setClearAvatar(false)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setClearAvatar(true)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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

    if (!login.trim()) {
      setError('O campo Login (nome de usuário) é obrigatório.')
      return
    }

    const cleanCpfVal = cleanCPF(cpf)
    if (cleanCpfVal.length > 0 && !isValidCPF(cleanCpfVal)) {
      setError('O CPF informado é inválido. Verifique os dígitos verificadores.')
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

    if (inactivityTimeout < 1 || inactivityTimeout > 1440) {
      setError('Os minutos de inatividade devem estar entre 1 e 1440 (24h).')
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
        login: login.trim(),
        cpf: cleanCpfVal,
        password: password || undefined,
        phone: phone.trim(),
        role,
        role_title: roleTitle.trim(),
        data_treatment_purpose: purpose.trim(),
        privacy_accepted: privacyAccepted,
        must_change_password: mustChangePassword,
        inactivity_timeout: Number(inactivityTimeout) || 30,
        avatarFile,
        clearAvatar,
        status: userToEdit?.status,
      })
      onClose()
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ||
          'Erro ao salvar usuário. Verifique se login, e-mail ou CPF já não estão cadastrados.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              {isEditing ? 'Editar Usuário & Acessos' : 'Cadastrar Novo Usuário (Conforme LGPD)'}
            </DialogTitle>
            {sequentialCode && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700">
                <Hash className="h-3 w-3" />
                Código #{sequentialCode} (Inalterável)
              </span>
            )}
          </div>
          <DialogDescription>
            {isEditing
              ? 'Atualize permissões, foto, regras de expiração e parâmetros de segurança.'
              : 'Registre o novo usuário com código sequencial automático, login único e foto de perfil.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Seção Foto / Avatar e Código */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar Preview"
                  className="w-20 h-20 rounded-full object-cover border-2 border-indigo-200 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500">
                  <UserIcon className="h-8 w-8 text-slate-400" />
                  <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">
                    Sem Foto
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Label className="text-xs font-semibold text-slate-800">Foto de Perfil</Label>
                <span className="text-[10px] text-slate-500">(JPG, PNG, WebP até 5MB)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Exibida como avatar na listagem de usuários e no menu do cabeçalho do sistema.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs h-7 gap-1"
                >
                  <Upload className="h-3 w-3" />
                  {avatarPreview ? 'Alterar Foto' : 'Subir Foto'}
                </Button>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remover
                  </Button>
                )}
              </div>
            </div>

            {/* Código sequencial para visualização */}
            <div className="sm:border-l sm:border-slate-200 sm:pl-4 text-center sm:text-left shrink-0">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Código Sequencial
              </span>
              <div className="text-lg font-black text-indigo-700">
                {sequentialCode ? `#${sequentialCode}` : 'Gerado no envio'}
              </div>
              <span className="text-[10px] text-slate-400 block">
                {isEditing ? 'Somente Leitura' : 'Automático'}
              </span>
            </div>
          </div>

          {/* Dados Pessoais & Credenciais */}
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

            {/* Campo Login Único */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="usr-login" className="text-xs font-medium text-slate-700">
                  Login (Nome de Usuário) *
                </Label>
                <span className="text-[10px] text-slate-400">Usado para entrar</span>
              </div>
              <Input
                id="usr-login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Ex: carlos.silva"
                required
              />
            </div>

            {/* Campo CPF */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="usr-cpf" className="text-xs font-medium text-slate-700">
                  CPF
                </Label>
                <span className="text-[10px] text-slate-400">11 dígitos (único)</span>
              </div>
              <Input
                id="usr-cpf"
                value={cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
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

          {/* Parâmetros de Segurança: Inatividade e Troca de Senha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            {/* Minutos de inatividade */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="usr-timeout"
                  className="text-xs font-medium text-slate-700 flex items-center gap-1"
                >
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Minutos de inatividade para logout
                </Label>
              </div>
              <Input
                id="usr-timeout"
                type="number"
                min={1}
                max={1440}
                value={inactivityTimeout}
                onChange={(e) => setInactivityTimeout(Number(e.target.value))}
                placeholder="30"
              />
              <span className="text-[10px] text-slate-500 block">
                Tempo sem interação (mouse/teclado) até deslogar. Padrão: 30 min.
              </span>
            </div>

            {/* Toggle / Checkbox Criar nova senha no próximo acesso */}
            <div className="flex flex-col justify-center pt-1">
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer transition-colors">
                <Checkbox
                  checked={mustChangePassword}
                  onCheckedChange={(c) => setMustChangePassword(!!c)}
                  className="mt-0.5"
                />
                <div className="text-xs text-slate-700 leading-snug">
                  <span className="font-semibold text-slate-900 flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
                    Criar nova senha no próximo acesso
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Força a redefinição de senha assim que o usuário entrar no sistema.
                  </span>
                </div>
              </label>
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
