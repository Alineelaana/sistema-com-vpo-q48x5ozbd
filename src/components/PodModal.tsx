import React, { useRef, useState, useEffect } from 'react'
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
import { completeDeliveryWithPod } from '@/services/logisticsService'
import type { Delivery } from '@/types/logistics'
import {
  PenTool,
  Camera,
  Eraser,
  CheckCircle2,
  ShieldCheck,
  Upload,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PodModalProps {
  delivery: Delivery | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (updated: Delivery) => void
}

export const PodModal: React.FC<PodModalProps> = ({ delivery, open, onOpenChange, onSuccess }) => {
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const [receiverName, setReceiverName] = useState('')
  const [receiverDocument, setReceiverDocument] = useState('')
  const [photoBase64, setPhotoBase64] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Inicializa o canvas e campos quando o modal abre
  useEffect(() => {
    if (open && delivery) {
      setReceiverName(delivery.receiver_name || delivery.recipient_contact || '')
      setReceiverDocument(delivery.receiver_document || '')
      setPhotoBase64(delivery.pod_photo || '')
      setHasSignature(!!delivery.signature_base64)

      // Desenha assinatura salva ou limpa canvas
      setTimeout(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        if (delivery.signature_base64) {
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          }
          img.src = delivery.signature_base64
        }
      }, 100)
    }
  }, [open, delivery])

  // Lógica de desenho no canvas (Mouse e Touch)
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = '#1e3a8a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'Selecione uma imagem de até 2MB.',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPhotoBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!delivery) return

    if (!receiverName.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o nome de quem recebeu a mercadoria.',
        variant: 'destructive',
      })
      return
    }

    if (!hasSignature) {
      toast({
        title: 'Assinatura obrigatória',
        description: 'Colete a assinatura digital no quadro antes de confirmar.',
        variant: 'destructive',
      })
      return
    }

    const canvas = canvasRef.current
    const signatureBase64 = canvas ? canvas.toDataURL('image/png') : ''

    setSaving(true)
    try {
      const updated = await completeDeliveryWithPod(delivery.id, {
        receiver_name: receiverName.trim(),
        receiver_document: receiverDocument.trim(),
        signature_base64: signatureBase64,
        pod_photo: photoBase64,
        completed_at: new Date().toISOString(),
      })

      toast({
        title: 'Entrega Comprovada com Sucesso!',
        description: `POD registrado com assinatura digital e carimbo de data/hora.`,
      })
      onSuccess(updated)
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao salvar POD:', err)
      toast({
        title: 'Erro ao registrar comprovante',
        description: 'Verifique a conexão e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-700">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle className="text-base font-bold text-slate-900">
              Comprovação Digital de Entrega (POD - Fusion)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Eliminação de fraudes e desvios: colete a assinatura do recebedor e foto do canhoto da
            NF.
          </DialogDescription>
        </DialogHeader>

        {delivery && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{delivery.customer_name}</span>
              <span className="font-mono text-indigo-600 font-semibold">
                {delivery.invoice_number || 'Sem NF'}
              </span>
            </div>
            <p className="text-slate-600">
              {delivery.street}, {delivery.number} — {delivery.city}/{delivery.state}
            </p>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
              <span>{delivery.packages_count || 1} volumes</span>
              <span>•</span>
              <span>{delivery.weight_kg ? `${delivery.weight_kg} kg` : 'Peso não informado'}</span>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-1">
          {/* Identificação do Recebedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="receiver-name" className="text-xs font-semibold text-slate-700">
                Nome de Quem Recebeu *
              </Label>
              <Input
                id="receiver-name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Ex: Carlos Oliveira - Almoxarife"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receiver-doc" className="text-xs font-semibold text-slate-700">
                CPF ou RG do Recebedor (Opcional)
              </Label>
              <Input
                id="receiver-doc"
                value={receiverDocument}
                onChange={(e) => setReceiverDocument(e.target.value)}
                placeholder="Ex: 123.456.789-00"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Assinatura Digital no Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <PenTool className="h-3.5 w-3.5 text-indigo-600" />
                Assinatura Digital do Recebedor (Desenhe abaixo) *
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                className="h-7 text-[11px] text-slate-500 hover:text-rose-600 gap-1 px-2"
              >
                <Eraser className="h-3 w-3" />
                Limpar
              </Button>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-1 bg-white relative">
              <canvas
                ref={canvasRef}
                width={500}
                height={160}
                className="w-full h-36 touch-none cursor-crosshair rounded bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400">
                  Toque ou use o mouse para assinar aqui
                </div>
              )}
            </div>
          </div>

          {/* Foto do Comprovante / Canhoto */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-indigo-600" />
              Foto do Canhoto / Documento Físico Assinado (Opcional)
            </Label>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="cursor-pointer border border-slate-300 hover:border-indigo-400 rounded-lg p-3 bg-slate-50 hover:bg-indigo-50/30 transition-all text-center flex-1 w-full">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <div className="flex items-center justify-center gap-2 text-xs text-slate-700 font-medium">
                  <Upload className="h-4 w-4 text-indigo-600" />
                  <span>Tirar foto com câmera ou anexar arquivo</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">JPG, PNG até 2MB</div>
              </label>

              {photoBase64 && (
                <div className="relative border rounded-lg overflow-hidden shrink-0 w-24 h-16 bg-slate-100 flex items-center justify-center">
                  <img src={photoBase64} alt="Canhoto" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoBase64('')}
                    className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-0.5 text-[9px] hover:bg-rose-600"
                    title="Remover foto"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
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
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? 'Registrando...' : 'Confirmar Entrega (POD)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
