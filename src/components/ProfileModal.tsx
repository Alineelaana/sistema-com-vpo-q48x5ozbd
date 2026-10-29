import React, { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Lock, User, Phone, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { USER_ROLES_CONFIG } from '@/types/userManagement'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const { currentUser, updateProfile, role } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState(currentUser?.name || '')
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validação de senha forte (mín. 8 caracteres, letra e número)
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
      setError('O nome é obrigatório.')
      return
    }

    if (password) {
      if (!validatePassword(password)) {
        setError('A nova senha deve ter no mínimo 8 caracteres contendo letras e números.')
        return
      }
      if (password !== passwordConfirm) {
        setError('A confirmação da nova senha não confere.')
        return
      }
    }

    setLoading(true)
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        password: password || undefined,
      })
      toast({
        title: 'Perfil atualizado com sucesso!',
        description: password ? 'Dados e nova senha salvos.' : 'Dados cadastrais atualizados.',
      })
      setPassword('')
      setPasswordConfirm('')
      onClose()
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Falha ao atualizar perfil.')
    } finally {
      setLoading(false)
    }
  }

  const roleConfig = USER_ROLES_CONFIG[role] || USER_ROLES_CONFIG.readonly

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Meu Perfil & Segurança
          </DialogTitle>
          <DialogDescription className="text-xs">
            Gerencie seus dados pessoais cadastrados e altere sua senha de acesso.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
          {/* Informações de Perfil e Papel */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Seu Perfil no Sistema:</span>
              <Badge variant="outline" className={`text-[10px] ${roleConfig.badgeColor}`}>
                {roleConfig.label}
              </Badge>
            </div>
            <div className="text-[11px] text-slate-600">
              {currentUser?.role_title || roleConfig.description}
            </div>
            {currentUser?.privacy_consent_date && (
              <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 pt-1 border-t border-slate-200">
                <CheckCircle2 className="h-3 w-3" />
                Política de Privacidade v1.0 aceita em{' '}
                {new Date(currentUser.privacy_consent_date).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="prof-email" className="text-slate-700 font-medium">
              E-mail (Identificador / Não alterável)
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                id="prof-email"
                type="email"
                value={currentUser?.email || ''}
                disabled
                className="pl-9 text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="prof-name" className="text-slate-700 font-medium">
              Nome Completo *
            </Label>
            <Input
              id="prof-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="prof-phone" className="text-slate-700 font-medium">
              Telefone / Celular
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                id="prof-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="pl-9 text-xs"
              />
            </div>
          </div>

          {/* Troca de Senha */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-800 font-semibold flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                Alterar Senha
              </Label>
              <span className="text-[10px] text-slate-400">
                Deixe em branco para manter a atual
              </span>
            </div>

            <div className="space-y-1">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha (mín. 8 caracteres com letras e números)"
                className="text-xs"
              />
            </div>

            {password && (
              <div className="space-y-1">
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Confirme a nova senha"
                  className="text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading} size="sm">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
