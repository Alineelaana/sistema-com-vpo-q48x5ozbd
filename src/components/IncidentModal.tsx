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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createDeliveryIncident } from '@/services/logisticsService'
import type { Delivery, IncidentType } from '@/types/logistics'
import { AlertTriangle, Clock, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface IncidentModalProps {
  delivery: Delivery | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const INCIDENT_TYPE_LABELS: Record<IncidentType, { label: string; desc: string }> = {
  client_absent: {
    label: 'Cliente Ausente / Local Fechado',
    desc: 'Destinatário não atendeu ou estabelecimento fechado no horário comercial.',
  },
  wrong_address: {
    label: 'Endereço Incorreto / Não Localizado',
    desc: 'Número inexistente, CEP divergente ou rua não encontrada pelo motorista.',
  },
  cargo_damage: {
    label: 'Avaria na Mercadoria',
    desc: 'Embalagem rasgada, quebra ou produto danificado durante o transporte.',
  },
  customer_refused: {
    label: 'Recusa pelo Destinatário',
    desc: 'Pedido em desacordo com a compra ou cliente rejeitou o recebimento.',
  },
  traffic_delay: {
    label: 'Trânsito Intenso / Quebra de Veículo',
    desc: 'Problema mecânico com o caminhão ou congestionamento grave na rota.',
  },
  payment_issue: {
    label: 'Problema Financeiro / Falta de Pagamento',
    desc: 'Cobrança no ato da entrega não autorizada pelo financeiro.',
  },
  bad_weather: {
    label: 'Condições Climáticas Adversas',
    desc: 'Chuva torrencial, alagamento ou interdição de via pública.',
  },
  other: {
    label: 'Outras Ocorrências Operacionais',
    desc: 'Situação atípica registrada pelo motorista na ponta.',
  },
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  delivery,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [incidentType, setIncidentType] = useState<IncidentType>('client_absent')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  if (!delivery) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      toast({
        title: 'Descrição obrigatória',
        description: 'Informe os detalhes da ocorrência relatada pelo motorista.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await createDeliveryIncident({
        delivery_id: delivery.id,
        type: incidentType,
        description: description.trim(),
        reported_at: new Date().toISOString(),
      })

      toast({
        title: 'Ocorrência Registrada na Torre',
        description: `A entrega passou para status "Ocorrência" e foi destacada para a equipe operacional.`,
      })
      setDescription('')
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao registrar ocorrência:', err)
      toast({
        title: 'Erro ao registrar ocorrência',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Registrar Ocorrência na Entrega (Torre de Controle)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Registre imprevistos em tempo real para permitir ações corretivas, re-agendamento ou
              retorno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {/* Resumo da entrega afetada */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{delivery.customer_name}</span>
                <span className="font-mono text-indigo-700">
                  {delivery.invoice_number || 'Sem NF'}
                </span>
              </div>
              <div className="text-slate-600 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {delivery.street}, {delivery.number} — {delivery.city}/{delivery.state}
                </span>
              </div>
            </div>

            {/* Tipo de Ocorrência */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Ocorrência *</Label>
              <Select
                value={incidentType}
                onValueChange={(val: IncidentType) => setIncidentType(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INCIDENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                {INCIDENT_TYPE_LABELS[incidentType]?.desc}
              </p>
            </div>

            {/* Descrição detalhada */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Descrição Detalhada do Fato *
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Motorista aguardou 25 minutos na portaria mas o responsável estava em reunião externa. Contatado o telefone sem resposta."
                rows={3}
                required
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
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 font-semibold text-xs"
            >
              <AlertTriangle className="h-4 w-4" />
              {saving ? 'Registrando...' : 'Gravar Ocorrência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
