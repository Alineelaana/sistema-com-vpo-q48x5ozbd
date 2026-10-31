import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  getDeliveries,
  getVehicles,
  getDrivers,
  saveRouteSequence,
} from '@/services/logisticsService'
import { getTransportOrders } from '@/services/operationService'
import {
  getTollPlazas,
  calculateRouteTolls,
  approveTransportOrderRoute,
  RoutingCalculateResponse,
} from '@/services/routingService'
import {
  optimizeRouteStops,
  computeTotalRouteDistance,
  DEFAULT_DEPOT,
} from '@/services/routingOptimizer'
import type { Delivery, Vehicle, Driver, Trip, TollPlaza, RouteWaypoint } from '@/types/logistics'
import {
  Navigation,
  Truck,
  Users,
  MapPin,
  Sparkles,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  CheckCircle2,
  Clock,
  Layers,
  Fuel,
  TrendingDown,
  Play,
  RotateCw,
  Plus,
  Trash2,
  DollarSign,
  ShieldAlert,
  Info,
  ExternalLink,
  Lock,
  ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { ROUTING_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'

export const RoutingPage: React.FC = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  // Modo de operação da tela: Rota de Ordem de Transporte (TMS Central) OU Sequenciamento de Entregas Locais
  const [activeTab, setActiveTab] = useState<'transport_order' | 'local_deliveries'>(
    'transport_order',
  )

  // Dados centrais
  const [transportOrders, setTransportOrders] = useState<Trip[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [tollPlazas, setTollPlazas] = useState<TollPlaza[]>([])
  const [tariffVersionSummary, setTariffVersionSummary] = useState<string>('ANTT-2026.1')
  const [loading, setLoading] = useState(true)

  // Campos do Roteirizador para a Ordem de Transporte
  const [originCity, setOriginCity] = useState('São Paulo')
  const [originState, setOriginState] = useState('SP')
  const [originAddress, setOriginAddress] = useState('')
  const [destinationCity, setDestinationCity] = useState('Curitiba')
  const [destinationState, setDestinationState] = useState('PR')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([])
  const [distanceKm, setDistanceKm] = useState<number>(408)
  const [highways, setHighways] = useState<string>('BR-116')
  const [selectedAxles, setSelectedAxles] = useState<number>(6)
  const [selectedPlazaIds, setSelectedPlazaIds] = useState<string[]>([])
  const [isReturnTrip, setIsReturnTrip] = useState<boolean>(false)

  // Resultado do Cálculo de Pedágios
  const [calculationResult, setCalculationResult] = useState<RoutingCalculateResponse | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  // Entregas locais (recurso existente preservado e aperfeiçoado)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [routeCode, setRouteCode] = useState<string>('')
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set())
  const [routeStops, setRouteStops] = useState<Delivery[]>([])
  const [savingDeliveries, setSavingDeliveries] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersRes, allVehicles, allDrivers, plazasRes, allDeliveries] = await Promise.all([
        getTransportOrders(),
        getVehicles(),
        getDrivers(),
        getTollPlazas(),
        getDeliveries(),
      ])

      setTransportOrders(ordersRes.items)
      setVehicles(allVehicles)
      setDrivers(allDrivers)
      setTollPlazas(plazasRes.plazas || [])
      setTariffVersionSummary(plazasRes.version_summary || 'ANTT-2026.1')
      setDeliveries(allDeliveries)

      // Seleção inicial da primeira Ordem de Transporte
      if (ordersRes.items.length > 0 && !selectedOrderId) {
        const first = ordersRes.items[0]
        setSelectedOrderId(first.id)
        applyOrderToForm(first)
      }

      if (allVehicles.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(allVehicles[0].id)
      }
      if (allDrivers.length > 0 && !selectedDriverId) {
        setSelectedDriverId(allDrivers[0].id)
      }

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      setRouteCode(`ROTA-${today}-${Math.floor(100 + Math.random() * 900)}`)

      const scheduled = allDeliveries.filter((d) => d.status === 'scheduled')
      setSelectedDeliveryIds(new Set(scheduled.map((d) => d.id)))
      setRouteStops(scheduled)
    } catch (err) {
      console.error('Erro ao carregar dados de roteirização:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações do roteirizador.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Preenche o formulário com dados da ordem selecionada
  const applyOrderToForm = (order: Trip) => {
    setOriginCity(order.origin_city || 'São Paulo')
    setOriginState(order.origin_state || 'SP')
    setOriginAddress(order.pickup_address || '')
    setDestinationCity(order.destination_city || 'Curitiba')
    setDestinationState(order.destination_state || 'PR')
    setDestinationAddress(order.delivery_address || '')
    setDistanceKm(order.distance_km || 408)
    setSelectedAxles(order.axles_count || 6)
    setHighways(order.highways || 'BR-116')

    // Waypoints
    if (order.waypoints) {
      try {
        const parsedWp =
          typeof order.waypoints === 'string' ? JSON.parse(order.waypoints) : order.waypoints
        setWaypoints(Array.isArray(parsedWp) ? parsedWp : [])
      } catch (_) {
        setWaypoints([])
      }
    } else {
      setWaypoints([])
    }

    // Praças selecionadas
    if (order.selected_plazas_details) {
      try {
        const parsedPlazas =
          typeof order.selected_plazas_details === 'string'
            ? JSON.parse(order.selected_plazas_details)
            : order.selected_plazas_details
        if (Array.isArray(parsedPlazas)) {
          setSelectedPlazaIds(parsedPlazas.map((p: any) => p.plaza_id))
        }
      } catch (_) {
        setSelectedPlazaIds([])
      }
    } else {
      // Auto-seleciona praças da rodovia se houver
      const matched = tollPlazas.filter((p) => p.highway === (order.highways || 'BR-116'))
      if (matched.length > 0) {
        setSelectedPlazaIds(matched.map((m) => m.id))
      }
    }
  }

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId)
    const found = transportOrders.find((o) => o.id === orderId)
    if (found) {
      applyOrderToForm(found)
      setCalculationResult(null)
    }
  }

  // Adicionar Parada Intermediária (Waypoint)
  const addWaypoint = () => {
    const newWp: RouteWaypoint = {
      order: waypoints.length + 1,
      city: '',
      state: 'SP',
      address: '',
    }
    setWaypoints([...waypoints, newWp])
  }

  // Remover Parada Intermediária
  const removeWaypoint = (index: number) => {
    const updated = waypoints
      .filter((_, i) => i !== index)
      .map((wp, i) => ({ ...wp, order: i + 1 }))
    setWaypoints(updated)
  }

  // Atualizar campo de Waypoint
  const updateWaypoint = (index: number, field: keyof RouteWaypoint, value: string) => {
    const updated = [...waypoints]
    updated[index] = { ...updated[index], [field]: value }
    setWaypoints(updated)
  }

  // Alternar seleção de praça de pedágio
  const togglePlazaSelection = (plazaId: string) => {
    setSelectedPlazaIds((prev) => {
      if (prev.includes(plazaId)) {
        return prev.filter((id) => id !== plazaId)
      } else {
        return [...prev, plazaId]
      }
    })
  }

  // Calcular Pedágios usando Tarifas Versionadas
  const handleCalculateTolls = async () => {
    if (distanceKm <= 0) {
      toast({
        title: 'Distância rodoviária obrigatória',
        description:
          'Informe a quilometragem rodoviária real do trajeto (proibido usar linha reta).',
        variant: 'destructive',
      })
      return
    }

    setIsCalculating(true)
    try {
      const res = await calculateRouteTolls({
        plaza_ids: selectedPlazaIds,
        axles: selectedAxles,
        distance_km: distanceKm,
        is_return: isReturnTrip,
      })

      if (res.success) {
        setCalculationResult(res)
        toast({
          title: 'Cálculo Tarifário Realizado',
          description: `Total de R$ ${Number(res.total_toll_cost || 0).toFixed(2)} calculado em ${res.plaza_count || 0} praça(s) (Versão: ${res.tariff_version_used}).`,
        })
      } else {
        toast({
          title: 'Erro no cálculo',
          description: res.error || 'Falha ao calcular pedágios.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro no cálculo de pedágio',
        description: err.message || 'Falha de comunicação.',
        variant: 'destructive',
      })
    } finally {
      setIsCalculating(false)
    }
  }

  // Aprovar Rota na Ordem de Transporte
  const handleApproveRoute = async (force = false) => {
    if (!selectedOrderId) {
      toast({
        title: 'Selecione uma Ordem de Transporte',
        description: 'É necessário vincular a rota a uma Ordem ativa.',
        variant: 'destructive',
      })
      return
    }

    if (distanceKm <= 0) {
      toast({
        title: 'Distância rodoviária não informada',
        description: 'O cálculo e aprovação exigem distância rodoviária real comprovada.',
        variant: 'destructive',
      })
      return
    }

    setIsApproving(true)
    try {
      const res = await approveTransportOrderRoute({
        trip_id: selectedOrderId,
        origin: {
          city: originCity,
          state: originState,
          address: originAddress,
        },
        destination: {
          city: destinationCity,
          state: destinationState,
          address: destinationAddress,
        },
        waypoints,
        distance_km: distanceKm,
        highways,
        plaza_ids: selectedPlazaIds,
        axles: selectedAxles,
        is_return: isReturnTrip,
        force_reapprove: force,
      })

      if (res.success) {
        if (res.already_approved) {
          toast({
            title: 'Rota já Aprovada (Anti-duplicidade)',
            description: res.message,
          })
        } else {
          toast({
            title: 'Rota Aprovada com Sucesso!',
            description: res.message,
          })
        }
        await loadData()
      } else {
        toast({
          title: 'Falha ao aprovar rota',
          description: res.error || 'Erro desconhecido.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro na aprovação da rota',
        description: err.message || 'Falha de comunicação.',
        variant: 'destructive',
      })
    } finally {
      setIsApproving(false)
    }
  }

  // Métodos da aba de Entregas Locais (Preservados)
  const toggleSelectDelivery = (delivery: Delivery) => {
    const nextSet = new Set(selectedDeliveryIds)
    if (nextSet.has(delivery.id)) {
      nextSet.delete(delivery.id)
      setRouteStops((prev) => prev.filter((d) => d.id !== delivery.id))
    } else {
      nextSet.add(delivery.id)
      setRouteStops((prev) => [...prev, delivery])
    }
    setSelectedDeliveryIds(nextSet)
  }

  const handleOptimizeByProximity = () => {
    if (routeStops.length <= 1) {
      toast({
        title: 'Poucas paradas para otimização',
        description: 'Selecione ao menos 2 entregas para calcular proximidade.',
      })
      return
    }

    const { orderedStops, totalDistanceKm } = optimizeRouteStops(routeStops, DEFAULT_DEPOT)
    setRouteStops(orderedStops)
    toast({
      title: 'Rota Otimizada com Sucesso!',
      description: `Paradas reordenadas por proximidade geográfica. Distância estimada: ${totalDistanceKm} km com retorno ao CD.`,
    })
  }

  const moveStopUp = (index: number) => {
    if (index === 0) return
    const updated = [...routeStops]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setRouteStops(updated)
  }

  const moveStopDown = (index: number) => {
    if (index === routeStops.length - 1) return
    const updated = [...routeStops]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setRouteStops(updated)
  }

  const handleSaveAndDispatchDeliveries = async (startImmediately = true) => {
    if (!selectedVehicleId || !selectedDriverId || routeStops.length === 0) {
      toast({
        title: 'Campos incompletos',
        description: 'Selecione veículo, motorista e ao menos uma parada.',
        variant: 'destructive',
      })
      return
    }

    setSavingDeliveries(true)
    try {
      const items = routeStops.map((stop, idx) => ({
        id: stop.id,
        sequence_order: idx + 1,
      }))

      await saveRouteSequence({
        route_code: routeCode || 'ROTA-MANUAL',
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId,
        deliveries: items,
        startRouteImmediately: startImmediately,
      })

      toast({
        title: startImmediately ? 'Rota Ativada em Rota!' : 'Sequência Salva',
        description: `${items.length} entregas sequenciadas.`,
      })
      navigate('/control-tower')
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar rota',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSavingDeliveries(false)
    }
  }

  const currentOrder = transportOrders.find((o) => o.id === selectedOrderId)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 text-white font-semibold">
              Roteirizador Inteligente
            </Badge>
            <Badge variant="outline" className="text-slate-600 text-xs">
              TMS Passo 2 • Tarifas Versionadas {tariffVersionSummary}
            </Badge>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1 tracking-tight flex items-center gap-2">
            <Navigation className="h-6 w-6 text-indigo-600" />
            Roteirizador & Gestão de Praças de Pedágio
          </h1>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5">
            Mapeamento rodoviário real da Ordem de Transporte: origem, waypoints, destino, cálculo
            de pedágios por eixo com tarifas versionadas e integração com VPO e MDF-e.
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
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/operations-center')}
            className="text-xs gap-1.5 text-cyan-700 border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
          >
            Central de Operações
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tabs: Rota da Ordem de Transporte x Rota de Entregas Fracionadas */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="transport_order" className="text-xs font-bold gap-1.5">
            <Truck className="h-3.5 w-3.5 text-indigo-600" />
            Rota da Ordem de Transporte (Viagem & VPO)
          </TabsTrigger>
          <TabsTrigger value="local_deliveries" className="text-xs font-bold gap-1.5">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            Sequenciamento de Entregas & Coletas (Última Milha)
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: ROTEIRIZADOR INTELIGENTE INTEGRADO À ORDEM DE TRANSPORTE */}
        <TabsContent value="transport_order" className="space-y-6 mt-4">
          {/* Seletor de Ordem de Transporte e Status Atual */}
          <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase text-indigo-700 tracking-wider">
                    Ordem de Transporte em Roteirização
                  </span>
                  <div className="flex items-center gap-3">
                    <Select value={selectedOrderId} onValueChange={handleOrderChange}>
                      <SelectTrigger className="w-full md:w-80 h-9 text-xs font-mono font-bold bg-white">
                        <SelectValue placeholder="Selecione a Ordem..." />
                      </SelectTrigger>
                      <SelectContent>
                        {transportOrders.map((ord) => (
                          <SelectItem key={ord.id} value={ord.id} className="text-xs">
                            {ord.operation_number || ord.trip_code} — {ord.origin_city}/
                            {ord.origin_state} ➔ {ord.destination_city}/{ord.destination_state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {currentOrder && (
                      <Badge
                        className={`text-xs ${
                          currentOrder.route_approved
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {currentOrder.route_approved ? '✓ Rota Aprovada' : 'Pendente de Aprovação'}
                      </Badge>
                    )}
                  </div>
                </div>

                {currentOrder && (
                  <div className="flex items-center gap-3 text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px]">VPO Atual:</span>
                      <strong className="text-emerald-700 font-mono text-sm">
                        R$ {Number(currentOrder.vpo_value || 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-slate-400 block text-[10px]">Piso ANTT Est.:</span>
                      <strong className="text-indigo-700 font-mono text-sm">
                        R$ {Number(currentOrder.minimum_floor_value || 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-slate-400 block text-[10px]">Tarifa Usada:</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {currentOrder.tariff_version_used || 'ANTT-2026.1'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grid Principal: Parâmetros da Rota + Seleção de Praças + Resumo Tarifário */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna 1: Origem, Destino, Waypoints e Rodovias (5 colunas) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-600" />
                      Trajeto da Operação
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Distância Rodoviária Real
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Origem, destino e paradas intermediárias (waypoints) oficiais da viagem.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 text-xs">
                  {/* Origem */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="font-bold text-indigo-900 block text-[11px] uppercase">
                      Ponto de Partida (Origem)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-600">Cidade</Label>
                        <Input
                          value={originCity}
                          onChange={(e) => setOriginCity(e.target.value)}
                          placeholder="São Paulo"
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-600">UF</Label>
                        <Input
                          value={originState}
                          onChange={(e) => setOriginState(e.target.value.toUpperCase().slice(0, 2))}
                          placeholder="SP"
                          className="h-8 text-xs font-mono uppercase bg-white"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-600">
                        Endereço de Coleta (Opcional)
                      </Label>
                      <Input
                        value={originAddress}
                        onChange={(e) => setOriginAddress(e.target.value)}
                        placeholder="Av. dos Bandeirantes, 1000 - Galpão 3"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Paradas Intermediárias (Waypoints) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-slate-800 text-xs">
                        Paradas Intermediárias ({waypoints.length})
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addWaypoint}
                        className="h-7 text-[11px] gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar Parada
                      </Button>
                    </div>

                    {waypoints.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-[11px]">
                        Nenhuma parada intermediária adicionada (viagem direta).
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {waypoints.map((wp, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-700 text-[11px]">
                                Parada #{idx + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeWaypoint(idx)}
                                className="h-6 w-6 p-0 text-rose-500 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <Input
                                  value={wp.city}
                                  onChange={(e) => updateWaypoint(idx, 'city', e.target.value)}
                                  placeholder="Cidade da parada"
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                <Input
                                  value={wp.state}
                                  onChange={(e) =>
                                    updateWaypoint(
                                      idx,
                                      'state',
                                      e.target.value.toUpperCase().slice(0, 2),
                                    )
                                  }
                                  placeholder="UF"
                                  className="h-7 text-xs font-mono uppercase"
                                  maxLength={2}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Destino */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="font-bold text-emerald-900 block text-[11px] uppercase">
                      Ponto de Chegada (Destino)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label className="text-[10px] text-slate-600">Cidade</Label>
                        <Input
                          value={destinationCity}
                          onChange={(e) => setDestinationCity(e.target.value)}
                          placeholder="Curitiba"
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-600">UF</Label>
                        <Input
                          value={destinationState}
                          onChange={(e) =>
                            setDestinationState(e.target.value.toUpperCase().slice(0, 2))
                          }
                          placeholder="PR"
                          className="h-8 text-xs font-mono uppercase bg-white"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-600">
                        Endereço de Entrega (Opcional)
                      </Label>
                      <Input
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder="Rodoanel / Centro de Distribuição"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Parâmetros de Distância e Veículo */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-700">
                        Distância Rodoviária Real (km)
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={distanceKm}
                        onChange={(e) => setDistanceKm(Number(e.target.value) || 0)}
                        className="h-8 text-xs font-bold font-mono"
                      />
                      <span className="text-[9px] text-slate-500 block mt-0.5">
                        Proibido linha reta. Fonte: rota comprovada.
                      </span>
                    </div>

                    <div>
                      <Label className="text-[10px] font-semibold text-slate-700">
                        Eixos do Veículo
                      </Label>
                      <Select
                        value={selectedAxles.toString()}
                        onValueChange={(v) => setSelectedAxles(Number(v))}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Eixos (VUC / Toco)</SelectItem>
                          <SelectItem value="3">3 Eixos (Truck 6x2)</SelectItem>
                          <SelectItem value="4">4 Eixos (Bitruck)</SelectItem>
                          <SelectItem value="5">5 Eixos (Cavalo 2E + Carreta 3E)</SelectItem>
                          <SelectItem value="6">6 Eixos (Carreta LS - 3E+3E)</SelectItem>
                          <SelectItem value="7">7 Eixos (Bitrem 7E)</SelectItem>
                          <SelectItem value="9">9 Eixos (Rodotrem 9E)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">
                      Rodovias Percorridas
                    </Label>
                    <Input
                      value={highways}
                      onChange={(e) => setHighways(e.target.value)}
                      placeholder="Ex: BR-116, BR-381, SP-160"
                      className="h-8 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Aviso Honesto de Limitação Técnica */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  Arquitetura Plugável & Limitação Honesta de Restrições
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Enquanto não houver provedor externo pesado configurado (ex: Google Maps Heavy /
                  HERE Heavy), o sistema <strong>não finge</strong> gabaritos de pontes ou
                  restrições municipais. O operador informa a distância rodoviária real e o sistema
                  calcula os pedágios com base na tabela versionada local.
                </p>
              </div>
            </div>

            {/* Coluna 2: Mapeamento de Praças de Pedágio e Cálculo Versionado (7 colunas) */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Praças de Pedágio da Rota
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Selecione as praças atravessadas pelo trajeto rodoviário para cálculo por
                      eixo.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={isReturnTrip ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsReturnTrip(!isReturnTrip)}
                      className={`h-7 text-xs ${isReturnTrip ? 'bg-indigo-600' : ''}`}
                    >
                      {isReturnTrip ? 'Ida e Volta (2x)' : 'Apenas Ida'}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Lista de Praças com Checkbox */}
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-lg p-1.5 bg-slate-50/50">
                    {tollPlazas.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Nenhuma praça de pedágio cadastrada na base versionada.
                      </div>
                    ) : (
                      tollPlazas.map((p) => {
                        const isSelected = selectedPlazaIds.includes(p.id)
                        return (
                          <div
                            key={p.id}
                            onClick={() => togglePlazaSelection(p.id)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'bg-indigo-50/60 border-indigo-300'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => togglePlazaSelection(p.id)}
                                className="mt-0.5"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">{p.name}</div>
                                <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-0.5">
                                  <span className="font-semibold text-indigo-700">{p.highway}</span>
                                  <span>•</span>
                                  <span>km {p.km}</span>
                                  <span>•</span>
                                  <span>
                                    {p.city}/{p.state}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Concessionária: {p.concessionaire}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {selectedAxles} eixos
                              </Badge>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Botão de Calcular */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      <strong>{selectedPlazaIds.length}</strong> praça(s) selecionada(s)
                    </span>

                    <Button
                      size="sm"
                      onClick={handleCalculateTolls}
                      disabled={isCalculating}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isCalculating ? 'Calculando...' : 'Calcular Custo de Pedágios'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Demonstrativo do Cálculo Tarifário */}
              {calculationResult && (
                <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
                  <CardHeader className="p-4 pb-2 border-b border-emerald-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Demonstrativo de Pedágios por Eixo
                      </CardTitle>
                      <Badge className="bg-emerald-700 text-white font-mono text-[10px]">
                        Versão: {calculationResult.tariff_version_used}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-xs">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                          Custo Total VPO
                        </span>
                        <div className="text-2xl font-extrabold text-emerald-700 mt-0.5">
                          R$ {Number(calculationResult.total_toll_cost || 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-xs">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                          Total de Praças
                        </span>
                        <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                          {calculationResult.plaza_count || 0}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {calculationResult.is_return ? 'Ida e volta' : 'Sentido único'}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-xs">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold block">
                          Duração Estimada
                        </span>
                        <div className="text-2xl font-extrabold text-indigo-700 mt-0.5">
                          ~{calculationResult.estimated_duration_hours || 0}h
                        </div>
                        <span className="text-[10px] text-slate-500">Média 65 km/h pesado</span>
                      </div>
                    </div>

                    {/* Breakdown de praças */}
                    {calculationResult.plazas_breakdown &&
                      calculationResult.plazas_breakdown.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <span className="font-bold text-slate-700 text-[11px] block">
                            Detalhamento por Praça e Fonte Regulatória:
                          </span>
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {calculationResult.plazas_breakdown.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-1.5 bg-white border border-emerald-100 rounded text-[11px] flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold text-slate-800">
                                    {item.plaza_name}
                                  </span>{' '}
                                  <span className="text-slate-500">
                                    ({item.highway} - km {item.km})
                                  </span>
                                </div>
                                <div className="font-mono font-bold text-emerald-800">
                                  R$ {Number(item.effective_amount).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Botão de Aprovação Final da Rota */}
                    <div className="pt-3 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-600">
                        Ao aprovar, o VPO da operação, o frete piso mínimo e o percurso do MDF-e
                        serão atualizados automaticamente sem duplicações.
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveRoute(false)}
                          disabled={isApproving}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {isApproving ? 'Aprovando...' : 'Aprovar Rota na Ordem'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ABA 2: SEQUENCIAMENTO DE ENTREGAS & COLETAS LOCAIS (Preservada da versão anterior) */}
        <TabsContent value="local_deliveries" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-indigo-600" />
                    Dados do Manifesto Local
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3.5 text-xs">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Código da Rota</Label>
                    <Input
                      value={routeCode}
                      onChange={(e) => setRouteCode(e.target.value)}
                      className="h-9 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Veículo Alocado</Label>
                    <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione o veículo" />
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
                    <Label className="text-xs font-semibold text-slate-700">Motorista</Label>
                    <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione o condutor" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} — CNH {d.cnh_category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Fila de entregas programadas */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Entregas Programadas (
                    {deliveries.filter((d) => d.status === 'scheduled').length})
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={handleOptimizeByProximity}
                    disabled={routeStops.length <= 1}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Otimizar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {deliveries
                    .filter((d) => d.status === 'scheduled')
                    .map((del) => {
                      const isChecked = selectedDeliveryIds.has(del.id)
                      return (
                        <div
                          key={del.id}
                          onClick={() => toggleSelectDelivery(del)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-start gap-2.5 ${
                            isChecked
                              ? 'border-indigo-400 bg-indigo-50/50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSelectDelivery(del)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 truncate">
                              {del.customer_name}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate">
                              {del.street}, {del.number} • {del.city}/{del.state}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {/* Sequência das Paradas */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Sequência das Paradas Ordenadas ({routeStops.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {routeStops.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma entrega selecionada.
                    </div>
                  ) : (
                    routeStops.map((stop, idx) => (
                      <div
                        key={stop.id}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900">{stop.customer_name}</span>
                            <div className="text-[11px] text-slate-500">
                              {stop.city}/{stop.state}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => moveStopUp(idx)}
                            className="h-6 w-6 p-0"
                          >
                            <MoveUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={idx === routeStops.length - 1}
                            onClick={() => moveStopDown(idx)}
                            className="h-6 w-6 p-0"
                          >
                            <MoveDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}

                  {routeStops.length > 0 && (
                    <div className="pt-3 border-t flex justify-end">
                      <Button
                        size="sm"
                        disabled={savingDeliveries}
                        onClick={() => handleSaveAndDispatchDeliveries(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {savingDeliveries ? 'Despachando...' : 'Salvar & Iniciar Viagem'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={ROUTING_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
