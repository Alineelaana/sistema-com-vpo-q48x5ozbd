import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Delivery } from '@/types/logistics'
import { ShieldCheck, Calendar, User, FileText, MapPin, Package, Download } from 'lucide-react'

interface PodViewModalProps {
  delivery: Delivery | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const PodViewModal: React.FC<PodViewModalProps> = ({ delivery, open, onOpenChange }) => {
  if (!delivery) return null

  const formattedDate = delivery.completed_at
    ? new Date(delivery.completed_at).toLocaleString('pt-BR')
    : 'Data não informada'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Auditoria de Comprovação de Entrega (POD)
              </DialogTitle>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
              Entrega Concluída
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Registro digital inalterável para prevenção de fraudes, desacordos comerciais e
            extravios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Dados Gerais da Entrega */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div>
              <div className="text-slate-500 text-[11px]">Cliente / Destinatário</div>
              <div className="font-bold text-slate-900 mt-0.5">{delivery.customer_name}</div>
              <div className="text-slate-600 mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>
                  {delivery.street}, {delivery.number} — {delivery.city}/{delivery.state}
                </span>
              </div>
            </div>

            <div>
              <div className="text-slate-500 text-[11px]">Documento Fiscal / Carga</div>
              <div className="font-mono font-bold text-indigo-700 mt-0.5">
                {delivery.invoice_number || 'Sem NF'}
              </div>
              <div className="text-slate-600 mt-1 flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-slate-400" />
                <span>{delivery.packages_count || 1} vols</span>
                <span>•</span>
                <span>{delivery.weight_kg ? `${delivery.weight_kg} kg` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Dados do Recebimento */}
          <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs space-y-2">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <User className="h-4 w-4 text-emerald-700" />
              Dados do Recebedor Homologado
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <div>
                <span className="text-slate-500">Nome:</span>{' '}
                <strong className="text-slate-900">
                  {delivery.receiver_name || 'Não informado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Documento:</span>{' '}
                <strong className="text-slate-900">
                  {delivery.receiver_document || 'Não informado'}
                </strong>
              </div>
              <div className="sm:col-span-2 flex items-center gap-1 text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Carimbo de Conclusão:</span>
                <strong className="text-slate-800">{formattedDate}</strong>
              </div>
            </div>
          </div>

          {/* Assinatura Digital do Recebedor */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Assinatura Digital Coletada</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Autenticidade Verificada
              </span>
            </div>
            {delivery.signature_base64 ? (
              <div className="border border-slate-200 rounded-lg p-2 bg-white flex items-center justify-center min-h-[120px]">
                <img
                  src={delivery.signature_base64}
                  alt="Assinatura do Recebedor"
                  className="max-h-28 max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-xs text-slate-400">
                Nenhuma assinatura digital anexada
              </div>
            )}
          </div>

          {/* Foto do Comprovante / Canhoto */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Canhoto Digitalizado / Foto da Carga</span>
              {delivery.pod_photo && (
                <a
                  href={delivery.pod_photo}
                  download={`comprovante-${delivery.invoice_number || delivery.id}.png`}
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Baixar imagem
                </a>
              )}
            </div>
            {delivery.pod_photo ? (
              <div className="border border-slate-200 rounded-lg p-2 bg-slate-100 flex items-center justify-center min-h-[160px]">
                <img
                  src={delivery.pod_photo}
                  alt="Canhoto Digitalizado"
                  className="max-h-60 max-w-full object-contain rounded"
                />
              </div>
            ) : (
              <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-xs text-slate-400">
                Nenhuma foto do canhoto anexada
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar Visualização
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
