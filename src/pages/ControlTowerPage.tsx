import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getDeliveries, getDeliveryIncidents, updateDelivery } from '@/services/logisticsService'
import { useRealtime } from '@/hooks/use-realtime'
import type { Delivery, DeliveryIncident, DeliveryStatus } from '@/types/logistics'
import { IncidentModal } from '@/components/IncidentModal'
import { PodModal } from '@/components/PodModal'
import { PodViewModal } from '@/components/PodViewModal'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { CONTROL_TOWER_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import {
  Radio,
  Clock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  MapPin,
  Calendar,
  AlertCircle,
  Eye,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const ControlTowerPage: React.FC = () => {
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [incidents, setIncidents] = useState<DeliveryIncident[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<
    'all' | 'delayed' | 'incident' | 'in_transit' | 'scheduled' | 'delivered'
  >('all')

  // Modais
  const [incidentModalOpen, setIncidentModalOpen] = useState(false)
  const [podModalOpen, setPodModalOpen] = useState(false)
  const [podViewOpen, setPodViewOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  const loadAll = async () => {
    try {
      const [delList, incList] = await Promise.all([
        getDeliveries(undefined, '-updated'),
        getDeliveryIncidents(),
      ])
      setDeliveries(delList)
      setIncidents(incList)
    } catch (err) {
      console.error('Erro ao carregar dados da Torre de Controle:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Inscrições Real-time no PocketBase para Deliveries e DeliveryIncidents
  useRealtime('deliveries', (event) => {
    const { action, record } = event
    const typedRecord = record as unknown as Delivery
    setDeliveries((prev) => {
      if (action === 'create') {
        return [typedRecord, ...prev]
      }
      if (action === 'update') {
        return prev.map((item) => (item.id === typedRecord.id ? typedRecord : item))
      }
      if (action === 'delete') {
        return prev.filter((item) => item.id !== typedRecord.id)
      }
      return prev
    })
  })

  useRealtime('delivery_incidents', (event) => {
    const { action, record } = event
    const typedRecord = record as unknown as DeliveryIncident
    setIncidents((prev) => {
      if (action === 'create') {
        return [typedRecord, ...prev]
      }
      if (action === 'update') {
        return prev.map((item) => (item.id === typedRecord.id ? typedRecord : item))
      }
      if (action === 'delete') {
        return prev.filter((item) => item.id !== typedRecord.id)
      }
      return prev
    })
  })

  // Checagem de atraso (se a entrega passou da janela prevista e ainda não foi entregue/cancelada)
  const nowMs = Date.now()
  const isDelayed = (del: Delivery) => {
    if (del.status === 'delivered' || del.status === 'cancelled') return false
    if (!del.delivery_window_end) return false
    return new Date(del.delivery_window_end).getTime() < nowMs
  }

  // Agrupamentos e contadores
  const scheduledDeliveries = deliveries.filter((d) => d.status === 'scheduled')
  const inTransitDeliveries = deliveries.filter((d) => d.status === 'in_transit')
  const incidentDeliveries = deliveries.filter((d) => d.status === 'incident')
  const deliveredDeliveries = deliveries.filter((d) => d.status === 'delivered')
  const delayedDeliveries = deliveries.filter(isDelayed)

  // Mudança rápida de status direto pelo card
  const handleQuickStatusChange = async (deliveryId: string, newStatus: DeliveryStatus) => {
    try {
      const updated = await updateDelivery(deliveryId, { status: newStatus })
      setDeliveries((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      toast({
        title: 'Status atualizado',
        description: `Entrega alterada para "${newStatus}".`,
      })
    } catch (err) {
      console.error('Erro ao mudar status:', err)
      toast({
        title: 'Erro ao atualizar status',
        variant: 'destructive',
      })
    }
  }

  const handleOpenIncidentModal = (del: Delivery) => {
    setSelectedDelivery(del)
    setIncidentModalOpen(true)
  }

  const handleOpenPodModal = (del: Delivery) => {
    setSelectedDelivery(del)
    setPodModalOpen(true)
  }

  const handleOpenPodView = (del: Delivery) => {
    setSelectedDelivery(del)
    setPodViewOpen(true)
  }

  // Filtro de exibição conforme busca e aba ativa
  const displayedDeliveries = useMemo(() => {
    return deliveries.filter((del) => {
      const matchesSearch =
        del.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        del.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        del.city?.toLowerCase().includes(search.toLowerCase()) ||
        del.route_code?.toLowerCase().includes(search.toLowerCase())

      if (!matchesSearch) return false

      if (activeTab === 'all') return true
      if (activeTab === 'delayed') return isDelayed(del)
      if (activeTab === 'incident') return del.status === 'incident'
      if (activeTab === 'in_transit') return del.status === 'in_transit'
      if (activeTab === 'scheduled') return del.status === 'scheduled'
      if (activeTab === 'delivered') return del.status === 'delivered'

      return true
    })
  }, [deliveries, search, activeTab, nowMs])

  return (
    <div className="space-y-6">
      {/* Cabeçalho com indicador de Realtime */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 text-white font-semibold">Fusion by nstech</Badge>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Torre Real-time Conectada
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1 tracking-tight flex items-center gap-2">
            <Radio className="h-6 w-6 text-indigo-600 animate-pulse" />
            Torre de Controle Logística
          </h1>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5">
            Visão centralizada e preditiva de todas as entregas do dia em tempo real — detecção
            imediata de atrasos de SLA, ocorrências em campo e comprovantes de entrega.
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
            onClick={loadAll}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Banner de Alerta Crítico quando há Entregas Atrasadas */}
      {delayedDeliveries.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm flex items-center gap-2">
                <span>{delayedDeliveries.length} Entrega(s) em Risco de SLA / Atrasadas</span>
                <Badge className="bg-rose-600 text-white text-[10px]">Ação Imediata</Badge>
              </div>
              <p className="text-xs text-rose-800 mt-0.5 max-w-2xl">
                O horário previsto limite para conclusão foi ultrapassado. Verifique com o motorista
                ou registre uma ocorrência de trânsito ou ausência de cliente.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setActiveTab('delayed')}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0"
          >
            Filtrar Atrasadas
          </Button>
        </div>
      )}

      {/* Cards de Métricas Principais da Torre */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'all'
              ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="text-slate-500 text-[11px] font-semibold uppercase flex items-center justify-between">
            <span>Todas do Dia</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{deliveries.length}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Carga total alocada</p>
        </button>

        <button
          onClick={() => setActiveTab('in_transit')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'in_transit'
              ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
              : 'border-slate-200 bg-white hover:border-blue-200'
          }`}
        >
          <div className="text-blue-700 text-[11px] font-semibold uppercase flex items-center justify-between">
            <span>Em Trânsito</span>
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{inTransitDeliveries.length}</div>
          <p className="text-[10px] text-blue-600 mt-0.5">Em deslocamento</p>
        </button>

        <button
          onClick={() => setActiveTab('delayed')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'delayed'
              ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-500'
              : 'border-slate-200 bg-white hover:border-amber-200'
          }`}
        >
          <div className="text-amber-700 text-[11px] font-semibold uppercase flex items-center justify-between">
            <span>Atrasadas (SLA)</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{delayedDeliveries.length}</div>
          <p className="text-[10px] text-amber-700 mt-0.5">Janela estourada</p>
        </button>

        <button
          onClick={() => setActiveTab('incident')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'incident'
              ? 'border-rose-500 bg-rose-50/50 shadow-sm ring-1 ring-rose-500'
              : 'border-slate-200 bg-white hover:border-rose-200'
          }`}
        >
          <div className="text-rose-700 text-[11px] font-semibold uppercase flex items-center justify-between">
            <span>Ocorrências</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{incidentDeliveries.length}</div>
          <p className="text-[10px] text-rose-600 mt-0.5">{incidents.length} relatos totais</p>
        </button>

        <button
          onClick={() => setActiveTab('delivered')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeTab === 'delivered'
              ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500'
              : 'border-slate-200 bg-white hover:border-emerald-200'
          }`}
        >
          <div className="text-emerald-700 text-[11px] font-semibold uppercase flex items-center justify-between">
            <span>Concluídas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">
            {deliveredDeliveries.length}
          </div>
          <p className="text-[10px] text-emerald-600 mt-0.5">100% com POD digital</p>
        </button>
      </div>

      {/* Barra de Filtro de Pesquisa e Abas */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Filtrar por cliente, NF-e, rota ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'delayed', label: `Atrasadas (${delayedDeliveries.length})` },
            { id: 'in_transit', label: `Em Rota (${inTransitDeliveries.length})` },
            { id: 'incident', label: `Ocorrências (${incidentDeliveries.length})` },
            { id: 'delivered', label: `Entregues (${deliveredDeliveries.length})` },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`h-8 text-xs font-semibold ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid de Cards de Monitoramento da Torre */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-sm">
            Conectando com a Torre de Controle...
          </div>
        ) : displayedDeliveries.length === 0 ? (
          <div className="col-span-full p-12 bg-white border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
            Nenhuma entrega encontrada para a visualização selecionada.
          </div>
        ) : (
          displayedDeliveries.map((del) => {
            const delayed = isDelayed(del)
            const veh = del.expand?.vehicle_id
            const driver = del.expand?.driver_id
            const delIncidents = incidents.filter((i) => i.delivery_id === del.id)

            return (
              <Card
                key={del.id}
                className={`transition-all shadow-xs relative overflow-hidden bg-white ${
                  delayed
                    ? 'border-rose-400 ring-1 ring-rose-300'
                    : del.status === 'incident'
                      ? 'border-rose-300 bg-rose-50/20'
                      : del.status === 'in_transit'
                        ? 'border-blue-300'
                        : del.status === 'delivered'
                          ? 'border-emerald-300'
                          : 'border-slate-200'
                }`}
              >
                {/* Faixa superior de destaque para atraso */}
                {delayed && (
                  <div className="bg-rose-600 text-white text-[10px] font-bold px-3 py-1 flex items-center justify-between">
                    <span className="flex items-center gap-1 uppercase tracking-wider">
                      <AlertTriangle className="h-3 w-3" />
                      Atrasada em relação ao SLA
                    </span>
                    <span>
                      Prazo:{' '}
                      {del.delivery_window_end
                        ? new Date(del.delivery_window_end).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                )}

                <CardContent className="p-4 space-y-3">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {del.status === 'in_transit' && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                            Em Rota
                          </Badge>
                        )}
                        {del.status === 'incident' && (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                            Ocorrência Ativa
                          </Badge>
                        )}
                        {del.status === 'delivered' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            Concluída
                          </Badge>
                        )}
                        {del.status === 'scheduled' && (
                          <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                            Programada
                          </Badge>
                        )}

                        {del.invoice_number && (
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {del.invoice_number}
                          </span>
                        )}

                        {del.route_code && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {del.route_code} #{del.sequence_order || 1}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm mt-1.5 line-clamp-1">
                        {del.customer_name}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold text-slate-700">
                        {del.packages_count || 1} vols
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {del.weight_kg ? `${del.weight_kg} kg` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="text-xs text-slate-600 flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div className="line-clamp-2">
                      {del.street}, {del.number} • {del.city}/{del.state}
                    </div>
                  </div>

                  {/* Veículo & Condutor */}
                  {(veh || driver) && (
                    <div className="text-[11px] text-slate-500 flex items-center justify-between border-t pt-2">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Truck className="h-3.5 w-3.5 text-indigo-600" />
                        <span>{veh ? veh.plate : '—'}</span>
                      </div>
                      <div className="text-slate-600 truncate max-w-[150px]">
                        {driver ? driver.name : '—'}
                      </div>
                    </div>
                  )}

                  {/* Alerta de Ocorrência cadastrada se houver */}
                  {delIncidents.length > 0 && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                        Ocorrência: {delIncidents[0].type}
                      </div>
                      <p className="text-[11px] text-rose-700 line-clamp-2">
                        {delIncidents[0].description}
                      </p>
                    </div>
                  )}

                  {/* Ações da Torre */}
                  <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-1.5">
                    {del.status === 'delivered' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPodView(del)}
                        className="h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1 w-full"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Ver Comprovante (POD)
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between w-full gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenIncidentModal(del)}
                          className="h-7 text-[11px] text-rose-700 border-rose-200 hover:bg-rose-50 gap-1 flex-1"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                          Ocorrência
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenPodModal(del)}
                          className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 flex-1"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Concluir
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modais */}
      <IncidentModal
        delivery={selectedDelivery}
        open={incidentModalOpen}
        onOpenChange={setIncidentModalOpen}
        onSuccess={loadAll}
      />

      <PodModal
        delivery={selectedDelivery}
        open={podModalOpen}
        onOpenChange={setPodModalOpen}
        onSuccess={loadAll}
      />

      <PodViewModal delivery={selectedDelivery} open={podViewOpen} onOpenChange={setPodViewOpen} />

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={CONTROL_TOWER_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
