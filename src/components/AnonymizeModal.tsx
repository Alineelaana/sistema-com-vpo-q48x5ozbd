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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import type { AppUser } from '@/types/userManagement'

interface AnonymizeModalProps {
  open: boolean
  user: AppUser | null
  onClose: () => void
  onConfirm: (userId: string, reason: string) => Promise<void>
}

export const AnonymizeModal: React.FC<AnonymizeModalProps> = ({
  open,
  user,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState(
    'Direito de eliminação solicitado pelo titular (LGPD Art. 18, VI)',
  )
  const [confirmCheck, setConfirmCheck] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const handleConfirm = async () => {
    if (!confirmCheck) return
    setLoading(true)
    try {
      await onConfirm(user.id, reason)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
            Anonimização de Titular (LGPD Art. 16)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Esta operação substitui irreversivelmente os dados pessoais do titular por pseudônimos,
            preservando a integridade fiscal dos registros de transportes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Atenção: Ação Irreversível
            </div>
            <p>
              Os dados de <strong>{user.name}</strong> ({user.email}) serão eliminados e
              substituídos por um código hash/pseudônimo. O titular não conseguirá mais efetuar
              login no sistema.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="anon-reason" className="text-slate-700 font-medium">
              Motivo da anonimização / base legal:
            </Label>
            <Textarea
              id="anon-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer p-2 rounded bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              checked={confirmCheck}
              onChange={(e) => setConfirmCheck(e.target.checked)}
              className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
            />
            <span className="text-[11px] text-slate-600 leading-tight">
              Confirmo que desejo anonimizar permanentemente os dados deste usuário, ciente de que
              esta ação ficará registrada na trilha de auditoria para fins de compliance LGPD.
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading} size="sm">
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!confirmCheck || loading}
            size="sm"
            className="bg-rose-600 hover:bg-rose-700"
          >
            {loading ? 'Anonimizando...' : 'Confirmar Anonimização'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
