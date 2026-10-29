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
import { AlertCircle, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface ForceChangePasswordModalProps {
  open: boolean
  onSuccess: () => void
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  open,
  onSuccess,
}) => {
  const { forceChangePassword, logout, currentUser } = useAuth()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validatePassword = (pass: string): boolean => {
    if (pass.length < 8) return false
    const hasLetter = /[a-zA-Z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    return hasLetter && hasNumber
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validatePassword(password)) {
      setError('A nova senha deve ter no mínimo 8 caracteres, contendo letras e números.')
      return
    }

    if (password !== passwordConfirm) {
      setError('A confirmação da nova senha não confere.')
      return
    }

    setLoading(true)
    try {
      await forceChangePassword(password)
      toast({
        title: 'Senha alterada com sucesso!',
        description: 'Sua nova senha foi cadastrada. O acesso ao sistema está liberado.',
      })
      setPassword('')
      setPasswordConfirm('')
      onSuccess()
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Erro ao atualizar a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-600">
            <ShieldAlert className="h-5 w-5" />
            Troca Obrigatória de Senha
          </DialogTitle>
          <DialogDescription className="text-xs">
            O administrador configurou a exigência de troca de senha no seu próximo acesso. Por
            segurança, defina uma nova senha forte para continuar navegando.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-1">
            <div className="font-semibold text-xs flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Usuário: {currentUser?.name || currentUser?.login || currentUser?.email}
            </div>
            <p className="text-[11px] text-indigo-700">
              Esta etapa é obrigatória antes de acessar os módulos operacionais do Ed Integração.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="force-new-pwd" className="text-slate-700 font-medium">
              Nova Senha Forte *
            </Label>
            <Input
              id="force-new-pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="text-xs"
            />
            <span className="text-[10px] text-slate-500 block">
              Mínimo de 8 caracteres, contendo pelo menos uma letra e um número.
            </span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="force-confirm-pwd" className="text-slate-700 font-medium">
              Confirmar Nova Senha *
            </Label>
            <Input
              id="force-confirm-pwd"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={logout}
              disabled={loading}
              className="text-slate-600 hover:text-rose-600"
            >
              Cancelar e Sair
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
