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
import { Download, FileJson, FileSpreadsheet, ShieldCheck } from 'lucide-react'
import type { AppUser } from '@/types/userManagement'
import { exportUserData } from '@/services/userManagementService'
import { useToast } from '@/hooks/use-toast'

interface ExportUserModalProps {
  open: boolean
  user: AppUser | null
  onClose: () => void
}

export const ExportUserModal: React.FC<ExportUserModalProps> = ({ open, user, onClose }) => {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  if (!user) return null

  const handleDownload = async (format: 'json' | 'csv') => {
    setLoading(true)
    try {
      const data = await exportUserData(user.id)
      const filename = `titular_dados_${user.id}_${Date.now()}`

      if (format === 'json') {
        const jsonStr = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // CSV simples
        const rows: string[] = []
        rows.push('Chave,Valor')
        rows.push(`ID,"${data.user.id}"`)
        rows.push(`Nome,"${data.user.name}"`)
        rows.push(`Email,"${data.user.email}"`)
        rows.push(`Telefone,"${data.user.phone || ''}"`)
        rows.push(`Perfil,"${data.user.role}"`)
        rows.push(`Cargo,"${data.user.role_title || ''}"`)
        rows.push(`Status,"${data.user.status}"`)
        rows.push(
          `Finalidade Tratamento,"${(data.user.data_treatment_purpose || '').replace(/"/g, '""')}"`,
        )
        rows.push(`Data Consentimento,"${data.user.privacy_consent_date || ''}"`)
        rows.push(`Versao Politica,"${data.user.privacy_policy_version || ''}"`)
        rows.push(`Data Cadastro,"${data.user.created || ''}"`)

        rows.push('')
        rows.push('--- TRILHA DE AUDITORIA ASSOCIADA ---,')
        rows.push('ID Log,Data/Hora,Acao,Descricao,IP')
        data.auditLogs.forEach((l) => {
          rows.push(
            `"${l.id}","${l.created}","${l.action}","${l.description.replace(/"/g, '""')}","${l.ip_address || ''}"`,
          )
        })

        const csvStr = '\uFEFF' + rows.join('\n')
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }

      toast({
        title: 'Portabilidade gerada com sucesso!',
        description: `Arquivo ${format.toUpperCase()} exportado conforme art. 18, V da LGPD.`,
      })
      onClose()
    } catch (err: unknown) {
      toast({
        title: 'Erro na exportação',
        description:
          (err as { message?: string })?.message || 'Falha ao gerar arquivo de portabilidade.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Download className="h-5 w-5" />
            Portabilidade de Dados (LGPD Art. 18, V)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Exportar cópia integral dos dados pessoais e logs de atividade do titular em formato
            interoperável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-1">
            <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Titular Selecionado:
            </div>
            <div>
              <strong>{user.name}</strong> • {user.email}
            </div>
            <div className="text-[11px] text-slate-500">
              Perfil: {user.role} | Status: {user.status}
            </div>
          </div>

          <p className="text-slate-600">
            Escolha o formato do relatório para download imediato. Esta exportação será registrada
            na trilha de auditoria para fins de prestação de contas (accountability).
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDownload('json')}
              disabled={loading}
              className="flex flex-col h-20 items-center justify-center gap-1 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/50"
            >
              <FileJson className="h-6 w-6 text-indigo-600" />
              <span className="font-semibold text-xs">Formato JSON</span>
              <span className="text-[10px] text-slate-500">Completo estruturado</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleDownload('csv')}
              disabled={loading}
              className="flex flex-col h-20 items-center justify-center gap-1 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50"
            >
              <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
              <span className="font-semibold text-xs">Formato CSV</span>
              <span className="text-[10px] text-slate-500">Planilhas Excel</span>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading} size="sm">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
