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
import { Checkbox } from '@/components/ui/checkbox'
import {
  getDeliveries,
  getVehicles,
  getDrivers,
  saveRouteSequence,
} from '@/services/logisticsService'
import {
  optimizeRouteStops,
  computeTotalRouteDistance,
  DEFAULT_DEPOT,
} from '@/services/routingOptimizer'
import type { Delivery, Vehicle, Driver } from '@/types/logistics'
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
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export const RoutingPage: React.FC = () => {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  // Seleções para montagem da Rota
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [routeCode, setRouteCode] = useState<string>('')

  // Paradas selecionadas para a Rota (ordenadas)
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set())
  const [routeStops, setRouteStops] = useState<Delivery[]>([])
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [allDeliveries, allVehicles, allDrivers] = await Promise.all([
        getDeliveries(),
        getVehicles(),
        getDrivers(),
      ])

      // Filtra programadas por padrão ou disponíveis
      setDeliveries(allDeliveries)
      setVehicles(allVehicles)
      setDrivers(allDrivers)

      if (allVehicles.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(allVehicles[0].id)
      }
      if (allDrivers.length > 0 && !selectedDriverId) {
        setSelectedDriverId(allDrivers[0].id)
      }

      // Sugere código de rota sequencial
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      setRouteCode(`ROTA-${today}-${Math.floor(100 + Math.random() * 900)}`)

      // Auto-seleciona entregas em status 'scheduled'
      const scheduled = allDeliveries.filter((d) => d.status === 'scheduled')
      const initialIds = new Set(scheduled.map((d) => d.id))
      setSelectedDeliveryIds(initialIds)
      setRouteStops(scheduled)
    } catch (err) {
      console.error('Erro ao carregar dados de roteirização:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Alterna seleção de uma entrega
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

  // Otimizar paradas por Haversine (vizinho mais próximo)
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

  // Mover parada manualmente para cima
  const moveStopUp = (index: number) => {
    if (index === 0) return
    const updated = [...routeStops]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    setRouteStops(updated)
  }

  // Mover parada manualmente para baixo
  const moveStopDown = (index: number) => {
    if (index === routeStops.length - 1) return
    const updated = [...routeStops]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    setRouteStops(updated)
  }

  // Salvar rota e despachar entregas para status 'in_transit'
  const handleSaveAndDispatch = async (startImmediately = true) => {
    if (!selectedVehicleId) {
      toast({
        title: 'Selecione um veículo',
        description: 'É necessário alocar um veículo para a rota.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedDriverId) {
      toast({
        title: 'Selecione um motorista',
        description: 'É necessário alocar um motorista condutor.',
        variant: 'destructive',
      })
      return
    }

    if (routeStops.length === 0) {
      toast({
        title: 'Nenhuma parada selecionada',
        description: 'Selecione ao menos uma entrega programada.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
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
        title: startImmediately ? 'Rota Ativada em Rota!' : 'Sequência de Rota Salva',
        description: `${items.length} entregas sequenciadas para a rota ${routeCode}. As entregas agora constam como "Em Rota".`,
      })

      // Redireciona para a Torre de Controle para acompanhar em tempo real
      navigate('/control-tower')
    } catch (err) {
      console.error('Erro ao salvar rota:', err)
      toast({
        title: 'Erro ao salvar rota',
        description: 'Verifique a conexão e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Cálculos de resumo da Rota
  const totalDistanceKm = computeTotalRouteDistance(routeStops, DEFAULT_DEPOT)
  const totalPackages = routeStops.reduce((acc, s) => acc + (s.packages_count || 1), 0)
  const totalWeightKg = routeStops.reduce((acc, s) => acc + (s.weight_kg || 0), 0)
  const totalCargoValue = routeStops.reduce((acc, s) => acc + (s.cargo_value || 0), 0)
  // Estimativa de combustível: média de 2.8 km/l para caminhão médio a R$ 6.10/l diesel
  const estimatedFuelLiters = Math.round((totalDistanceKm / 2.8) * 10) / 10
  const estimatedFuelCost = Math.round(estimatedFuelLiters * 6.1)

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId)

  // Entregas programadas disponíveis na fila
  const availableDeliveries = deliveries.filter((d) => d.status === 'scheduled')

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 text-white font-semibold">Fusion by nstech</Badge>
            <span className="text-xs text-slate-500">Módulo de Otimização e Sequenciamento</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1 tracking-tight flex items-center gap-2">
            <Navigation className="h-6 w-6 text-indigo-600" />
            Roteirização de Entregas & Coletas
          </h1>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5">
            Agrupe entregas por proximidade geográfica (algoritmo Haversine), reordene paradas
            manualmente e despache para a frota com redução comprovada de até 30% em quilometragem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Entregas
          </Button>

          <Button
            size="sm"
            onClick={handleOptimizeByProximity}
            disabled={routeStops.length <= 1}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Otimizar por Proximidade
          </Button>
        </div>
      </div>

      {/* Grid Principal: Configuração da Rota + Resumo + Sequência */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Alocação de Recursos e Fila de Entregas (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-600" />
                Dados da Rota e Alocação
              </CardTitle>
              <CardDescription className="text-xs">
                Defina o código da rota, veículo com capacidade e motorista responsável.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Código da Rota</Label>
                <Input
                  value={routeCode}
                  onChange={(e) => setRouteCode(e.target.value)}
                  placeholder="Ex: ROTA-SP-02"
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Veículo Alocado</Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate} — {v.model} ({v.axles} eixos / cap:{' '}
                        {v.capacity_kg ? `${v.capacity_kg}kg` : '—'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Motorista</Label>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o condutor" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} — CNH {d.cnh_category} (
                        {d.status === 'available' ? 'Disponível' : d.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Fila de Entregas Programadas Disponíveis */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    Entregas Programadas ({availableDeliveries.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Marque as paradas que farão parte desta rota.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {selectedDeliveryIds.size} selecionadas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {availableDeliveries.length === 0 ? (
                <div className="text-center p-6 text-xs text-slate-500">
                  Nenhuma entrega programada disponível. Crie novas entregas na tela de Entregas.
                </div>
              ) : (
                availableDeliveries.map((del) => {
                  const isChecked = selectedDeliveryIds.has(del.id)
                  return (
                    <div
                      key={del.id}
                      onClick={() => toggleSelectDelivery(del)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'border-indigo-400 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleSelectDelivery(del)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 truncate">
                            {del.customer_name}
                          </span>
                          <span className="font-mono text-[11px] text-indigo-700 font-semibold">
                            {del.invoice_number || 'Sem NF'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate mt-0.5">
                          {del.street}, {del.number} • {del.city}/{del.state}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>{del.packages_count || 1} vols</span>
                          <span>•</span>
                          <span>{del.weight_kg ? `${del.weight_kg} kg` : '—'}</span>
                          <span>•</span>
                          <span>{del.type === 'delivery' ? 'Entrega' : 'Coleta'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: Sequência Ordenada das Paradas e Resumo (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card Resumo de Indicadores da Rota */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="text-slate-500 text-[11px] uppercase font-semibold">
                Distância Total
              </div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {totalDistanceKm} <span className="text-xs font-normal text-slate-500">km</span>
              </div>
              <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 mt-0.5">
                <TrendingDown className="h-3 w-3" />
                Ida e volta ao CD
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="text-slate-500 text-[11px] uppercase font-semibold">
                Total Paradas
              </div>
              <div className="text-xl font-bold text-indigo-700 mt-0.5">
                {routeStops.length}{' '}
                <span className="text-xs font-normal text-slate-500">stops</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{totalPackages} volumes totais</p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="text-slate-500 text-[11px] uppercase font-semibold">Peso Carga</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {totalWeightKg.toLocaleString('pt-BR')}{' '}
                <span className="text-xs font-normal text-slate-500">kg</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {selectedVehicle?.capacity_kg
                  ? `${Math.round((totalWeightKg / selectedVehicle.capacity_kg) * 100)}% ocupação`
                  : '—'}
              </p>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="text-slate-500 text-[11px] uppercase font-semibold">
                Est. Combustível
              </div>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">
                R$ {estimatedFuelCost}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">~{estimatedFuelLiters} L Diesel</p>
            </div>
          </div>

          {/* Lista Sequencial de Paradas com Reordenação Manual */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-indigo-600" />
                  Sequência das Paradas da Rota
                </CardTitle>
                <CardDescription className="text-xs">
                  Reordene as paradas pelas setas ou clique em "Otimizar por Proximidade".
                </CardDescription>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Ponto de partida: <strong>CD Central SP</strong>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {routeStops.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 space-y-2">
                  <MapPin className="h-8 w-8 mx-auto text-slate-300" />
                  <p>Nenhuma entrega selecionada para a sequência da rota.</p>
                  <p className="text-slate-400">Marque as entregas no painel ao lado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {routeStops.map((stop, index) => {
                    return (
                      <div
                        key={stop.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-all flex items-center justify-between gap-3 shadow-xs"
                      >
                        {/* Indicador de Ordem */}
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {stop.customer_name}
                              </span>
                              {stop.invoice_number && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-mono text-indigo-700 bg-indigo-50 border-indigo-200"
                                >
                                  {stop.invoice_number}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>
                                {stop.street}, {stop.number} • {stop.city}/{stop.state}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {stop.packages_count || 1} vols •{' '}
                              {stop.weight_kg ? `${stop.weight_kg} kg` : '—'}
                              {stop.delivery_window_end
                                ? ` • Janela até ${new Date(stop.delivery_window_end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                : ''}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Mover Ordem */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={index === 0}
                            onClick={() => moveStopUp(index)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Subir parada"
                          >
                            <MoveUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={index === routeStops.length - 1}
                            onClick={() => moveStopDown(index)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Descer parada"
                          >
                            <MoveDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Botão de Disparo / Conclusão da Rota */}
              {routeStops.length > 0 && (
                <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Ao confirmar, as <strong>{routeStops.length}</strong> entregas passam para
                    status <strong className="text-blue-700">"Em Rota"</strong> na Torre de
                    Controle.
                  </div>

                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => handleSaveAndDispatch(true)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                  >
                    <Play className="h-4 w-4" />
                    {saving ? 'Despachando...' : 'Salvar Rota & Iniciar Viagem'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
