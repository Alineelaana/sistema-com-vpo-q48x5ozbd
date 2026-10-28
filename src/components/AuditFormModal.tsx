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
import { Textarea } from '@/components/ui/textarea'
import { auditDeliveryFreight } from '@/services/logisticsService'
import type { Delivery } from '@/types/logistics'
import { DollarSign, CheckCircle2, AlertTriangle, Scale } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AuditFormModalProps {
  delivery: Delivery | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (updated: Delivery) => void
}

export const AuditFormModal: React.FC<AuditFormModalProps> = ({
  delivery,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [expectedValue, setExpectedValue] = useState<number>(0)
  const [invoicedValue, setInvoicedValue] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (delivery && open) {
      setExpectedValue(delivery.expected_freight_value || 0)
      setInvoicedValue(delivery.invoiced_freight_value || delivery.expected_freight_value || 0)
      setNotes(delivery.audit_notes || '')
    }
  }, [delivery, open])

  if (!delivery) return null

  const diff = Math.round((Number(invoicedValue) - Number(expectedValue)) * 100) / 100
  const isDivergent = Math.abs(diff) > 0.01

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await auditDeliveryFreight(delivery.id, {
        expected_freight_value: Number(expectedValue),
        invoiced_freight_value: Number(invoicedValue),
        audit_notes: notes.trim(),
      })

      toast({
        title: isDivergent ? 'Divergência Registrada' : 'Frete Auditado e Homologado',
        description: isDivergent
          ? `Diferença de ${diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} apontada no relatório de conferência.`
          : 'Valor faturado confere exatamente com o frete previsto da viagem.',
      })

      onSuccess(updated)
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao auditar frete:', err)
      toast({
        title: 'Erro ao salvar conferência',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-700">
              <Scale className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Conferência e Auditoria de Frete (Fusion)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Compare o frete previsto da operação contra o valor faturado/cobrado pelo
              transportador ou embarcador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {/* Resumo da Entrega */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{delivery.customer_name}</span>
                <span className="font-mono text-indigo-700">
                  {delivery.invoice_number || 'Sem NF'}
                </span>
              </div>
              <p className="text-slate-600">
                {delivery.street}, {delivery.number} — {delivery.city}/{delivery.state}
              </p>
            </div>

            {/* Comparativo de Valores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Frete Previsto na Viagem (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expectedValue}
                  onChange={(e) => setExpectedValue(Number(e.target.value))}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Frete Faturado / Cobrado (R$) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={invoicedValue}
                  onChange={(e) => setInvoicedValue(Number(e.target.value))}
                  className="h-9 text-xs font-bold"
                  required
                />
              </div>
            </div>

            {/* Card com o Cálculo da Diferença em Tempo Real */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                isDivergent
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="flex items-center gap-2">
                {isDivergent ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {isDivergent ? 'Divergência Apontada' : 'Valores Idênticos (OK)'}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {isDivergent
                      ? diff > 0
                        ? 'Cobrança a maior (adicional de frete)'
                        : 'Cobrança a menor (glosa/desconto)'
                      : 'Nenhuma inconsistência fiscal ou tarifária'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-extrabold">
                  {diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/80">
                  {isDivergent ? 'Divergente' : 'Conferido'}
                </span>
              </div>
            </div>

            {/* Justificativa / Notas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações da Auditoria / Justificativa de Divergência
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Cobrança adicional decorrente de tempo de espera em doca ou taxa de paletização."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              {saving ? 'Gravando...' : 'Salvar Auditoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
