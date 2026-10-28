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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createDelivery, updateDelivery } from '@/services/logisticsService'
import type { Delivery, Vehicle, Driver, Trip, DeliveryType } from '@/types/logistics'
import { Package, Truck, Calendar, MapPin, DollarSign, UserCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DeliveryFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliveryToEdit?: Delivery | null
  vehicles: Vehicle[]
  drivers: Driver[]
  trips: Trip[]
  onSuccess: (saved: Delivery) => void
}

export const DeliveryFormModal: React.FC<DeliveryFormModalProps> = ({
  open,
  onOpenChange,
  deliveryToEdit,
  vehicles,
  drivers,
  trips,
  onSuccess,
}) => {
  const { toast } = useToast()
  const isEditing = !!deliveryToEdit

  const [type, setType] = useState<DeliveryType>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [customerDocument, setCustomerDocument] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [recipientContact, setRecipientContact] = useState('')

  // Endereço
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('São Paulo')
  const [state, setState] = useState('SP')
  const [zipCode, setZipCode] = useState('')

  // Carga
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [packagesCount, setPackagesCount] = useState<number>(1)
  const [weightKg, setWeightKg] = useState<number>(50)
  const [volumeM3, setVolumeM3] = useState<number>(0.5)
  const [cargoValue, setCargoValue] = useState<number>(1500)

  // Janela
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')

  // Vínculos
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [tripId, setTripId] = useState('')
  const [expectedFreight, setExpectedFreight] = useState<number>(350)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (deliveryToEdit) {
      setType(deliveryToEdit.type || 'delivery')
      setCustomerName(deliveryToEdit.customer_name || '')
      setCustomerDocument(deliveryToEdit.customer_document || '')
      setCustomerPhone(deliveryToEdit.customer_phone || '')
      setRecipientContact(deliveryToEdit.recipient_contact || '')

      setStreet(deliveryToEdit.street || '')
      setNumber(deliveryToEdit.number || '')
      setNeighborhood(deliveryToEdit.neighborhood || '')
      setCity(deliveryToEdit.city || 'São Paulo')
      setState(deliveryToEdit.state || 'SP')
      setZipCode(deliveryToEdit.zip_code || '')

      setInvoiceNumber(deliveryToEdit.invoice_number || '')
      setPackagesCount(deliveryToEdit.packages_count || 1)
      setWeightKg(deliveryToEdit.weight_kg || 0)
      setVolumeM3(deliveryToEdit.volume_m3 || 0)
      setCargoValue(deliveryToEdit.cargo_value || 0)

      setWindowStart(
        deliveryToEdit.delivery_window_start
          ? deliveryToEdit.delivery_window_start.substring(0, 16)
          : '',
      )
      setWindowEnd(
        deliveryToEdit.delivery_window_end
          ? deliveryToEdit.delivery_window_end.substring(0, 16)
          : '',
      )

      setVehicleId(deliveryToEdit.vehicle_id || '')
      setDriverId(deliveryToEdit.driver_id || '')
      setTripId(deliveryToEdit.trip_id || '')
      setExpectedFreight(deliveryToEdit.expected_freight_value || 350)
    } else {
      // Default para nova entrega
      setType('delivery')
      setCustomerName('')
      setCustomerDocument('')
      setCustomerPhone('')
      setRecipientContact('')
      setStreet('')
      setNumber('')
      setNeighborhood('')
      setCity('São Paulo')
      setState('SP')
      setZipCode('')
      setInvoiceNumber('')
      setPackagesCount(5)
      setWeightKg(120)
      setVolumeM3(1.2)
      setCargoValue(4500)
      // Janela para hoje
      const now = new Date()
      const start = new Date(now.getTime() + 60 * 60 * 1000)
      const end = new Date(now.getTime() + 4 * 60 * 60 * 1000)
      setWindowStart(start.toISOString().substring(0, 16))
      setWindowEnd(end.toISOString().substring(0, 16))
      setVehicleId(vehicles[0]?.id || '')
      setDriverId(drivers[0]?.id || '')
      setTripId(trips[0]?.id || '')
      setExpectedFreight(450)
    }
  }, [deliveryToEdit, open, vehicles, drivers, trips])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName.trim() || !street.trim() || !number.trim() || !city.trim() || !state.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha cliente, endereço completo (rua, número, cidade e UF).',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Delivery> = {
        type,
        customer_name: customerName.trim(),
        customer_document: customerDocument.trim(),
        customer_phone: customerPhone.trim(),
        recipient_contact: recipientContact.trim(),
        street: street.trim(),
        number: number.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zip_code: zipCode.trim(),
        invoice_number: invoiceNumber.trim(),
        packages_count: Number(packagesCount) || 1,
        weight_kg: Number(weightKg) || 0,
        volume_m3: Number(volumeM3) || 0,
        cargo_value: Number(cargoValue) || 0,
        delivery_window_start: windowStart ? new Date(windowStart).toISOString() : undefined,
        delivery_window_end: windowEnd ? new Date(windowEnd).toISOString() : undefined,
        vehicle_id: vehicleId || undefined,
        driver_id: driverId || undefined,
        trip_id: tripId || undefined,
        expected_freight_value: Number(expectedFreight) || 0,
      }

      let result: Delivery
      if (isEditing && deliveryToEdit) {
        result = await updateDelivery(deliveryToEdit.id, payload)
        toast({
          title: 'Entrega atualizada',
          description: `Os dados da entrega ${result.customer_name} foram salvos.`,
        })
      } else {
        payload.status = 'scheduled'
        payload.audit_status = 'pending'
        payload.audit_difference = 0
        result = await createDelivery(
          payload as Omit<Delivery, 'id' | 'created' | 'updated' | 'expand'>,
        )
        toast({
          title: 'Pedido de Entrega Criado!',
          description: `Entrega para ${result.customer_name} agendada com sucesso em status "Programada".`,
        })
      }

      onSuccess(result)
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao salvar entrega:', err)
      toast({
        title: 'Erro ao salvar',
        description: 'Verifique os dados preenchidos e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-700">
              <Package className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                {isEditing
                  ? 'Editar Pedido de Entrega/Coleta'
                  : 'Novo Pedido de Entrega ou Coleta (Fusion)'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre a carga, endereço de destino, janela prevista e vincule ao veículo e
              motorista.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {/* Tipo e Identificação */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tipo de Operação *</Label>
                <Select value={type} onValueChange={(val: DeliveryType) => setType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Entrega ao Cliente</SelectItem>
                    <SelectItem value="pickup">Coleta / Logística Reversa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Cliente / Destinatário *
                </Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Comercial Souza Ltda"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">CNPJ / CPF</Label>
                <Input
                  value={customerDocument}
                  onChange={(e) => setCustomerDocument(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Telefone Contato</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Contato no Local</Label>
                <Input
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                  placeholder="Ex: Carlos (Portaria)"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                Endereço de Parada (Roteirização e Geocodificação)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-[11px] text-slate-600">Rua / Logradouro *</Label>
                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Av. Brasil"
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Número *</Label>
                  <Input
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="1500"
                    required
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">Bairro</Label>
                  <Input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Centro"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] text-slate-600">Cidade *</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-600">UF *</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    maxLength={2}
                    required
                    className="h-8 text-xs uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Dados da Carga & NF */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">NF-e Vinculada</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="NF-049100"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Volumes (un)</Label>
                <Input
                  type="number"
                  min={1}
                  value={packagesCount}
                  onChange={(e) => setPackagesCount(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Peso Total (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Valor Mercadoria (R$)
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cargoValue}
                  onChange={(e) => setCargoValue(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Janela de Entrega Prevista */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-lg">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-amber-700" />
                  Início da Janela Prevista
                </Label>
                <Input
                  type="datetime-local"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-amber-700" />
                  Limite da Janela (SLA)
                </Label>
                <Input
                  type="datetime-local"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
              </div>
            </div>

            {/* Alocação Inicial (Veículo, Motorista, Frete Previsto) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Veículo Alocado</Label>
                <Select value={vehicleId} onValueChange={(val) => setVehicleId(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum no momento</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate} — {v.model} ({v.axles} eixos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Motorista</Label>
                <Select value={driverId} onValueChange={(val) => setDriverId(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione motorista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum no momento</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} (CNH {d.cnh_category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Frete Previsto (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={expectedFreight}
                  onChange={(e) => setExpectedFreight(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Pedido de Entrega'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
