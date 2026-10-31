import React, { useEffect, useState, useId } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  getTrips,
  getVehicles,
  getDrivers,
  createTrip,
  updateTrip,
  deleteTrip,
  createCteDocument,
  getCompanySettings,
} from '@/services/logisticsService'
import type { Trip, Vehicle, Driver } from '@/types/logistics'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { TRIPS_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import {
  MapPin,
  Plus,
  Navigation,
  Calculator,
  ArrowRight,
  FileCheck,
  Trash2,
  Pencil,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
} from 'lucide-react'
import { VpoCalculator } from '@/components/VpoCalculator'

export const TripsPage: React.FC = () => {
  const originCityId = useId()
  const destCityId = useId()
  const distanceId = useId()
  const cargoTypeId = useId()
  const weightId = useId()
  const freightValueId = useId()
  const plazasId = useId()
  const rateId = useId()
  const vpoValueId = useId()
  const voucherId = useId()

  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [showVpoHelper, setShowVpoHelper] = useState(false)
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  // Emissão de CT-e direto da viagem
  const [cteModalOpen, setCteModalOpen] = useState(false)
  const [selectedTripForCte, setSelectedTripForCte] = useState<Trip | null>(null)
  const [cteForm, setCteForm] = useState({
    sender_name: 'Distribuidora Logística Central S/A',
    sender_document: '23.456.789/0001-11',
    recipient_name: 'Supermercados Sul do Brasil Ltda',
    recipient_document: '34.567.890/0001-22',
    cargo_value: 150000,
    include_vpo: true,
  })

  // Form de viagem
  const [formData, setFormData] = useState({
    trip_code: '',
    origin_city: 'São Paulo',
    origin_state: 'SP',
    destination_city: 'Belo Horizonte',
    destination_state: 'MG',
    distance_km: 585,
    vehicle_id: '',
    driver_id: '',
    cargo_type: 'Carga Seca Paletizada',
    weight_kg: 24000,
    freight_value: 8500,
    axles_count: 6,
    toll_tollgate_count: 8,
    toll_rate_per_axle: 8.8,
    vpo_value: 422.4,
    vpo_responsible: 'embarcador' as 'embarcador' | 'transportador' | 'destinatario',
    vpo_voucher_number: '',
    status: 'planned' as 'planned' | 'in_progress' | 'completed' | 'cancelled',
  })

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    const [tripsList, vehList, drivList] = await Promise.all([
      getTrips(),
      getVehicles(),
      getDrivers(),
    ])
    setTrips(tripsList)
    setVehicles(vehList)
    setDrivers(drivList)
    setLoading(false)
  }

  // Recalcula o VPO automaticamente sempre que eixos, praças ou tarifa mudam
  const updateVpoCalculated = (axles: number, plazas: number, rate: number) => {
    const total = axles * plazas * rate
    return Number(total.toFixed(2))
  }

  const handleOpenCreate = () => {
    setEditingTrip(null)
    const nextCode = `VIAG-${new Date().getFullYear()}-${String(trips.length + 1).padStart(3, '0')}`
    const defaultVehicle = vehicles[0]
    const defaultDriver = drivers[0]
    const initialAxles = defaultVehicle?.axles || 6
    const initialPlazas = 8
    const initialRate = 8.8
    const initialVpo = updateVpoCalculated(initialAxles, initialPlazas, initialRate)

    setFormData({
      trip_code: nextCode,
      origin_city: 'São Paulo',
      origin_state: 'SP',
      destination_city: 'Belo Horizonte',
      destination_state: 'MG',
      distance_km: 585,
      vehicle_id: defaultVehicle?.id || '',
      driver_id: defaultDriver?.id || '',
      cargo_type: 'Carga Fracionada / Paletizada',
      weight_kg: 22000,
      freight_value: 8400,
      axles_count: initialAxles,
      toll_tollgate_count: initialPlazas,
      toll_rate_per_axle: initialRate,
      vpo_value: initialVpo,
      vpo_responsible: 'embarcador',
      vpo_voucher_number: `VP-${Math.floor(100000000 + Math.random() * 900000000)}`,
      status: 'planned',
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (t: Trip) => {
    setEditingTrip(t)
    setFormData({
      trip_code: t.trip_code,
      origin_city: t.origin_city,
      origin_state: t.origin_state,
      destination_city: t.destination_city,
      destination_state: t.destination_state,
      distance_km: t.distance_km || 0,
      vehicle_id: t.vehicle_id || '',
      driver_id: t.driver_id || '',
      cargo_type: t.cargo_type || '',
      weight_kg: t.weight_kg || 0,
      freight_value: t.freight_value,
      axles_count: t.axles_count,
      toll_tollgate_count: t.toll_tollgate_count || 1,
      toll_rate_per_axle: t.toll_rate_per_axle || 0,
      vpo_value: t.vpo_value,
      vpo_responsible: t.vpo_responsible || 'embarcador',
      vpo_voucher_number: t.vpo_voucher_number || '',
      status: t.status || 'planned',
    })
    setModalOpen(true)
  }

  const handleVehicleSelect = (vehicleId: string) => {
    const veh = vehicles.find((v) => v.id === vehicleId)
    const newAxles = veh ? veh.axles : formData.axles_count
    const newVpo = updateVpoCalculated(
      newAxles,
      formData.toll_tollgate_count,
      formData.toll_rate_per_axle,
    )
    setFormData((prev) => ({
      ...prev,
      vehicle_id: vehicleId,
      axles_count: newAxles,
      vpo_value: newVpo,
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTrip) {
        await updateTrip(editingTrip.id, formData)
        toast({ title: 'Viagem atualizada com sucesso!' })
      } else {
        await createTrip(formData)
        toast({ title: 'Viagem cadastrada com VPO integrado!' })
      }
      setModalOpen(false)
      loadAll()
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Erro ao salvar viagem',
        description: (err as { message?: string })?.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Excluir a viagem ${code}?`)) {
      try {
        await deleteTrip(id)
        toast({ title: 'Viagem excluída com sucesso' })
        loadAll()
      } catch (err) {
        toast({ title: 'Erro ao excluir viagem', variant: 'destructive' })
      }
    }
  }

  // Emitir CT-e baseado nesta viagem
  const handleOpenEmitCte = (t: Trip) => {
    setSelectedTripForCte(t)
    setCteModalOpen(true)
  }

  const handleConfirmEmitCte = async () => {
    if (!selectedTripForCte) return

    try {
      const company = await getCompanySettings()
      const nextNumber = (company?.cte_current_number || 1040) + 1
      const totalValue = cteForm.include_vpo
        ? selectedTripForCte.freight_value + selectedTripForCte.vpo_value
        : selectedTripForCte.freight_value

      // Cria registro de CT-e vinculado em fila de transmissão
      // REGRA: Sem simulação fiscal - o documento é criado como pending e aguarda autorização oficial
      await createCteDocument({
        cte_number: nextNumber,
        series: company?.cte_series || 1,
        access_key: `3526${Math.floor(1000000000000000000 + Math.random() * 9000000000000000000)}`,
        trip_id: selectedTripForCte.id,
        sender_name: cteForm.sender_name,
        sender_document: cteForm.sender_document,
        recipient_name: cteForm.recipient_name,
        recipient_document: cteForm.recipient_document,
        cargo_value: cteForm.cargo_value,
        freight_value: selectedTripForCte.freight_value,
        vpo_included: cteForm.include_vpo,
        vpo_value: selectedTripForCte.vpo_value,
        total_cte_value: totalValue,
        status: 'pending',
        status_message: 'CT-e gerado e colocado na fila da SEFAZ aguardando transmissão',
        protocol: '',
        issued_at: new Date().toISOString(),
      })

      toast({
        title: `CT-e nº ${nextNumber} gerado na fila!`,
        description: `Conhecimento com VPO de R$ ${selectedTripForCte.vpo_value.toFixed(2)} pronto para transmissão SEFAZ.`,
      })

      setCteModalOpen(false)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao emitir CT-e',
        description: 'Não foi possível gerar o documento fiscal.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-indigo-600" />
            Ordens de Transporte & Viagens
          </h1>
          <p className="text-sm text-slate-500">
            Registro central da operação de transporte: dados completos de expedição, piso mínimo
            ANTT, VPO e esteira operacional integrada.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLogicModalOpen(true)}
            className="text-xs font-semibold gap-1.5"
          >
            Lógica da Tela
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowVpoHelper(!showVpoHelper)}
            className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold"
          >
            <Calculator className="h-4 w-4" />
            {showVpoHelper ? 'Ocultar Calculadora' : 'Abrir Calculadora VPO'}
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            Nova Viagem
          </Button>
        </div>
      </div>

      {/* Seção retrátil da Calculadora VPO */}
      {showVpoHelper && (
        <div className="p-4 bg-slate-50 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in duration-300">
          <VpoCalculator
            onApplyVpoToTrip={(data) => {
              setFormData((prev) => ({
                ...prev,
                axles_count: data.axles,
                toll_tollgate_count: data.plazas,
                toll_rate_per_axle: data.ratePerAxle,
                vpo_value: data.totalVpo,
              }))
              toast({
                title: 'Cálculo aplicado!',
                description: `VPO de ${data.totalVpo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} vinculado ao formulário de viagem.`,
              })
              setModalOpen(true)
            }}
          />
        </div>
      )}

      {/* Tabela de Viagens */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem / Viagem</TableHead>
                <TableHead>Rota (Origem ➔ Destino)</TableHead>
                <TableHead>Veículo / Motorista</TableHead>
                <TableHead>Frete</TableHead>
                <TableHead>VPO Calculado</TableHead>
                <TableHead>Status Operação</TableHead>
                <TableHead>Status Viagem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Carregando viagens...
                  </TableCell>
                </TableRow>
              ) : trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Nenhuma viagem registrada. Crie a primeira para calcular o VPO.
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((t) => {
                  const vehicle = vehicles.find((v) => v.id === t.vehicle_id)
                  const driver = drivers.find((d) => d.id === t.driver_id)
                  const total = t.freight_value + t.vpo_value

                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-mono font-bold text-xs text-indigo-700">
                          {t.operation_number || t.trip_code}
                        </div>
                        {t.operation_number && t.trip_code !== t.operation_number && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Viag: {t.trip_code}
                          </div>
                        )}
                        {t.nfe_number && (
                          <div className="text-[10px] text-cyan-600 font-medium">
                            NF-e: {t.nfe_number}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800 flex items-center gap-1.5 text-sm">
                          <span>
                            {t.origin_city}/{t.origin_state}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {t.destination_city}/{t.destination_state}
                          </span>
                        </div>
                        {t.distance_km ? (
                          <div className="text-xs text-slate-500">
                            {t.distance_km} km de trajeto
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-800">
                          {vehicle
                            ? `${vehicle.plate} (${vehicle.axles} eixos)`
                            : t.vehicle_plate || 'Não atribuído'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {driver ? driver.name : 'Sem motorista'}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        <div>
                          {t.freight_value.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </div>
                        {t.floor_regularization_status === 'nao_aplicavel' ? (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Piso: Isento (Carga própria)
                          </div>
                        ) : t.minimum_floor_value ? (
                          <div
                            className={`text-[10px] font-mono ${
                              (t.floor_freight_difference || 0) < 0
                                ? 'text-rose-600 font-bold'
                                : 'text-emerald-700'
                            }`}
                          >
                            Piso: R$ {t.minimum_floor_value.toFixed(2)} (
                            {t.floor_table_version || 'ANTT'})
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-indigo-600">
                          {t.vpo_value.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {t.toll_tollgate_count || 0} praças × {t.axles_count} eixos
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.operation_status === 'liberada'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : t.operation_status === 'requer_atencao'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {t.operation_status || 'em_analise'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {t.status === 'in_progress' && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            Em Trânsito
                          </Badge>
                        )}
                        {t.status === 'completed' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            Concluída
                          </Badge>
                        )}
                        {t.status === 'planned' && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            Planejada
                          </Badge>
                        )}
                        {t.status === 'cancelled' && <Badge variant="secondary">Cancelada</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1 h-8"
                          onClick={() => handleOpenEmitCte(t)}
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          Emitir CT-e
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(t)}>
                          <Pencil className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(t.id, t.trip_code)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Criar/Editar Viagem */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrip ? 'Editar Viagem' : 'Nova Viagem Rodoviária'}</DialogTitle>
            <DialogDescription>
              Informe o trajeto, veículo e parâmetros do pedágio para gerar o VPO correspondente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Código da Viagem *</Label>
                <Input
                  value={formData.trip_code}
                  onChange={(e) => setFormData({ ...formData, trip_code: e.target.value })}
                  required
                  className="font-mono font-bold mt-1"
                />
              </div>

              <div>
                <Label>Veículo / Placa *</Label>
                <Select value={formData.vehicle_id} onValueChange={handleVehicleSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o veículo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate} — {v.model} ({v.axles} eixos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Motorista Responsável</Label>
                <Select
                  value={formData.driver_id}
                  onValueChange={(val) => setFormData({ ...formData, driver_id: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o motorista..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.status === 'available' ? 'Disponível' : d.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Origem e Destino */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-semibold text-slate-700 uppercase">Trajeto e Rota</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor={originCityId} className="text-xs">
                      Cidade Origem *
                    </Label>
                    <Input
                      id={originCityId}
                      value={formData.origin_city}
                      onChange={(e) => setFormData({ ...formData, origin_city: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">UF</Label>
                    <Input
                      value={formData.origin_state}
                      onChange={(e) =>
                        setFormData({ ...formData, origin_state: e.target.value.toUpperCase() })
                      }
                      maxLength={2}
                      className="mt-1 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor={destCityId} className="text-xs">
                      Cidade Destino *
                    </Label>
                    <Input
                      id={destCityId}
                      value={formData.destination_city}
                      onChange={(e) =>
                        setFormData({ ...formData, destination_city: e.target.value })
                      }
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">UF</Label>
                    <Input
                      value={formData.destination_state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          destination_state: e.target.value.toUpperCase(),
                        })
                      }
                      maxLength={2}
                      className="mt-1 uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <Label htmlFor={distanceId} className="text-xs">
                    Distância (km)
                  </Label>
                  <Input
                    id={distanceId}
                    type="number"
                    value={formData.distance_km}
                    onChange={(e) =>
                      setFormData({ ...formData, distance_km: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={cargoTypeId} className="text-xs">
                    Tipo de Carga
                  </Label>
                  <Input
                    id={cargoTypeId}
                    value={formData.cargo_type}
                    onChange={(e) => setFormData({ ...formData, cargo_type: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={weightId} className="text-xs">
                    Peso Total (kg)
                  </Label>
                  <Input
                    id={weightId}
                    type="number"
                    value={formData.weight_kg}
                    onChange={(e) =>
                      setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Cálculo de VPO e Valores */}
            <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-900 uppercase flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5 text-indigo-600" />
                  Cálculo de Vale Pedágio Obrigatório (VPO)
                </span>
                <span className="text-xs font-bold text-indigo-700">
                  {formData.axles_count} eixos selecionados
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor={freightValueId} className="text-xs">
                    Valor do Frete (R$) *
                  </Label>
                  <Input
                    id={freightValueId}
                    type="number"
                    value={formData.freight_value}
                    onChange={(e) =>
                      setFormData({ ...formData, freight_value: parseFloat(e.target.value) || 0 })
                    }
                    required
                    className="mt-1 font-semibold"
                  />
                </div>

                <div>
                  <Label htmlFor={plazasId} className="text-xs">
                    Nº de Praças
                  </Label>
                  <Input
                    id={plazasId}
                    type="number"
                    min="1"
                    value={formData.toll_tollgate_count}
                    onChange={(e) => {
                      const count = parseInt(e.target.value, 10) || 1
                      const newVpo = updateVpoCalculated(
                        formData.axles_count,
                        count,
                        formData.toll_rate_per_axle,
                      )
                      setFormData({ ...formData, toll_tollgate_count: count, vpo_value: newVpo })
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={rateId} className="text-xs">
                    Tarifa / Eixo (R$)
                  </Label>
                  <Input
                    id={rateId}
                    type="number"
                    step="0.10"
                    value={formData.toll_rate_per_axle}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0
                      const newVpo = updateVpoCalculated(
                        formData.axles_count,
                        formData.toll_tollgate_count,
                        rate,
                      )
                      setFormData({ ...formData, toll_rate_per_axle: rate, vpo_value: newVpo })
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={vpoValueId} className="text-xs font-bold text-indigo-900">
                    Total VPO (R$)
                  </Label>
                  <Input
                    id={vpoValueId}
                    type="number"
                    step="0.01"
                    value={formData.vpo_value}
                    onChange={(e) =>
                      setFormData({ ...formData, vpo_value: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 font-bold text-indigo-700 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs">Responsável pelo VPO</Label>
                  <Select
                    value={formData.vpo_responsible}
                    onValueChange={(val: 'embarcador' | 'transportador' | 'destinatario') =>
                      setFormData({ ...formData, vpo_responsible: val })
                    }
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="embarcador">
                        Embarcador (Regra Geral Lei 10.209)
                      </SelectItem>
                      <SelectItem value="transportador">Transportador Subcontratado</SelectItem>
                      <SelectItem value="destinatario">Destinatário da Carga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={voucherId} className="text-xs">
                    Nº do Comprovante / Vale Pedágio
                  </Label>
                  <Input
                    id={voucherId}
                    value={formData.vpo_voucher_number}
                    onChange={(e) =>
                      setFormData({ ...formData, vpo_voucher_number: e.target.value })
                    }
                    placeholder="Ex: VP-84920194"
                    className="mt-1 font-mono bg-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Status da Viagem</Label>
              <Select
                value={formData.status}
                onValueChange={(val: 'planned' | 'in_progress' | 'completed' | 'cancelled') =>
                  setFormData({ ...formData, status: val })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planejada (Aguardando Carregamento)</SelectItem>
                  <SelectItem value="in_progress">Em Trânsito / Rodovia</SelectItem>
                  <SelectItem value="completed">Concluída / Descarregada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Salvar Viagem
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Emissão Rápida de CT-e (Diferencial Connect) */}
      <Dialog open={cteModalOpen} onOpenChange={setCteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-indigo-600" />
              Emissão de Conhecimento de Transporte (CT-e)
            </DialogTitle>
            <DialogDescription>
              Fluxo automatizado Connect: os dados da viagem e do VPO são transferidos diretamente
              ao documento fiscal.
            </DialogDescription>
          </DialogHeader>

          {selectedTripForCte && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
                <div className="font-semibold text-slate-800">
                  Viagem: {selectedTripForCte.trip_code} ({selectedTripForCte.origin_city}/
                  {selectedTripForCte.origin_state} ➔ {selectedTripForCte.destination_city}/
                  {selectedTripForCte.destination_state})
                </div>
                <div className="text-slate-600">
                  Frete Base:{' '}
                  <strong>
                    {selectedTripForCte.freight_value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </strong>
                </div>
                <div className="text-indigo-700 font-semibold">
                  VPO Calculado:{' '}
                  <strong>
                    {selectedTripForCte.vpo_value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </strong>{' '}
                  ({selectedTripForCte.axles_count} eixos)
                </div>
              </div>

              <div>
                <Label className="text-xs">Remetente (Embarcador / Tomador)</Label>
                <Input
                  value={cteForm.sender_name}
                  onChange={(e) => setCteForm({ ...cteForm, sender_name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">CNPJ Remetente</Label>
                <Input
                  value={cteForm.sender_document}
                  onChange={(e) => setCteForm({ ...cteForm, sender_document: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs">Destinatário</Label>
                <Input
                  value={cteForm.recipient_name}
                  onChange={(e) => setCteForm({ ...cteForm, recipient_name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-900">
                    Total do CT-e c/ VPO destacado:
                  </span>
                  <span className="text-base font-bold text-emerald-700">
                    {(
                      selectedTripForCte.freight_value + selectedTripForCte.vpo_value
                    ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCteModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmEmitCte}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Gerar e Autorizar CT-e
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={TRIPS_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
