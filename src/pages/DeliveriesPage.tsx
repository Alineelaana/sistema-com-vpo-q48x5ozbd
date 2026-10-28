import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getDeliveries,
  getVehicles,
  getDrivers,
  getTrips,
  deleteDelivery,
} from '@/services/logisticsService'
import type { Delivery, Vehicle, Driver, Trip, DeliveryStatus } from '@/types/logistics'
import { DeliveryFormModal } from '@/components/DeliveryFormModal'
import { PodModal } from '@/components/PodModal'
import { PodViewModal } from '@/components/PodViewModal'
import {
  Package,
  Plus,
  Search,
  Filter,
  Truck,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  RotateCw,
  MoreVertical,
  Navigation,
  Edit2,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export const DeliveriesPage: React.FC = () => {
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Modais
  const [formOpen, setFormOpen] = useState(false)
  const [deliveryToEdit, setDeliveryToEdit] = useState<Delivery | null>(null)
  const [podModalOpen, setPodModalOpen] = useState(false)
  const [podViewOpen, setPodViewOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [delList, vehList, drivList, tripsList] = await Promise.all([
        getDeliveries(),
        getVehicles(),
        getDrivers(),
        getTrips(),
      ])
      setDeliveries(delList)
      setVehicles(vehList)
      setDrivers(drivList)
      setTrips(tripsList)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast({
        title: 'Erro ao carregar entregas',
        description: 'Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Ações
  const handleOpenCreate = () => {
    setDeliveryToEdit(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (del: Delivery) => {
    setDeliveryToEdit(del)
    setFormOpen(true)
  }

  const handleOpenPod = (del: Delivery) => {
    setSelectedDelivery(del)
    setPodModalOpen(true)
  }

  const handleOpenPodView = (del: Delivery) => {
    setSelectedDelivery(del)
    setPodViewOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o pedido de entrega para ${name}?`)) return
    try {
      await deleteDelivery(id)
      setDeliveries((prev) => prev.filter((d) => d.id !== id))
      toast({
        title: 'Pedido removido com sucesso',
      })
    } catch (err) {
      console.error('Erro ao excluir:', err)
      toast({
        title: 'Erro ao excluir',
        variant: 'destructive',
      })
    }
  }

  const handleFormSuccess = (saved: Delivery) => {
    setDeliveries((prev) => {
      const exists = prev.some((d) => d.id === saved.id)
      if (exists) {
        return prev.map((d) => (d.id === saved.id ? saved : d))
      }
      return [saved, ...prev]
    })
  }

  const handlePodSuccess = (updated: Delivery) => {
    setDeliveries((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  // Filtragem
  const filteredDeliveries = deliveries.filter((del) => {
    const matchesSearch =
      del.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      del.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      del.city?.toLowerCase().includes(search.toLowerCase()) ||
      del.street?.toLowerCase().includes(search.toLowerCase()) ||
      del.route_code?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || del.status === statusFilter
    const matchesType = typeFilter === 'all' || del.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  // Badges visuais de status
  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[11px] gap-1">
            <Clock className="h-3 w-3 text-slate-500" />
            Programada
          </Badge>
        )
      case 'in_transit':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[11px] gap-1">
            <Truck className="h-3 w-3 text-blue-600" />
            Em Rota
          </Badge>
        )
      case 'delivered':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[11px] gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Entregue (POD)
          </Badge>
        )
      case 'incident':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[11px] gap-1 font-semibold">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            Ocorrência
          </Badge>
        )
      case 'cancelled':
        return <Badge className="bg-slate-200 text-slate-700 text-[11px]">Cancelada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Contadores
  const scheduledCount = deliveries.filter((d) => d.status === 'scheduled').length
  const inTransitCount = deliveries.filter((d) => d.status === 'in_transit').length
  const deliveredCount = deliveries.filter((d) => d.status === 'delivered').length
  const incidentCount = deliveries.filter((d) => d.status === 'incident').length

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 text-white font-semibold">Fusion by nstech</Badge>
            <span className="text-xs text-slate-500">Gestão Logística de Entregas & Coletas</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1 tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            Entregas & Coletas
          </h1>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5">
            Cadastre novos pedidos, acompanhe o fluxo de carga, consulte comprovantes digitais (POD)
            e ordene coletas e entregas da operação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/routing">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
              <Navigation className="h-4 w-4 text-indigo-600" />
              Montar Rota ({scheduledCount} programadas)
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Novo Pedido de Entrega
          </Button>
        </div>
      </div>

      {/* Cards de Métricas de Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-slate-500 text-xs font-medium uppercase flex items-center justify-between">
            <span>Programadas</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{scheduledCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Prontas para roteirizar</p>
        </div>

        <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl shadow-sm">
          <div className="text-blue-700 text-xs font-medium uppercase flex items-center justify-between">
            <span>Em Rota / Trânsito</span>
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{inTransitCount}</div>
          <p className="text-[11px] text-blue-600 mt-0.5">Veículos em deslocamento</p>
        </div>

        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl shadow-sm">
          <div className="text-emerald-700 text-xs font-medium uppercase flex items-center justify-between">
            <span>Concluídas (POD)</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{deliveredCount}</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Comprovantes coletados</p>
        </div>

        <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl shadow-sm">
          <div className="text-rose-700 text-xs font-medium uppercase flex items-center justify-between">
            <span>Com Ocorrência</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{incidentCount}</div>
          <p className="text-[11px] text-rose-600 mt-0.5">Exigem ação na Torre</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, NF-e, rota, rua ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="scheduled">Programadas</SelectItem>
                  <SelectItem value="in_transit">Em Rota</SelectItem>
                  <SelectItem value="delivered">Entregues</SelectItem>
                  <SelectItem value="incident">Ocorrências</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="delivery">Entregas</SelectItem>
                  <SelectItem value="pickup">Coletas</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-9 px-2 text-slate-600"
                title="Recarregar"
              >
                <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Entregas */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Carregando pedidos de entrega e coletas...
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Nenhuma entrega encontrada</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ajuste seus filtros ou crie uma nova entrega para iniciar.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="bg-indigo-600 text-white text-xs"
              >
                <Plus className="h-4 w-4 mr-1" />
                Criar Primeira Entrega
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredDeliveries.map((del) => {
            const hasPod = !!del.signature_base64 || !!del.receiver_name
            const veh = del.expand?.vehicle_id
            const driver = del.expand?.driver_id

            return (
              <Card
                key={del.id}
                className="border-slate-200 hover:border-indigo-300 transition-all shadow-sm bg-white"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Bloco de Informações Principais */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(del.status)}

                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-mono border-slate-300"
                        >
                          {del.type === 'delivery' ? 'Entrega' : 'Coleta Reversa'}
                        </Badge>

                        {del.invoice_number && (
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {del.invoice_number}
                          </span>
                        )}

                        {del.route_code && (
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Rota: {del.route_code} (Parada #{del.sequence_order || 1})
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h3 className="font-bold text-base text-slate-900 tracking-tight">
                          {del.customer_name}
                        </h3>
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {del.street}, {del.number}
                            {del.neighborhood ? ` - ${del.neighborhood}` : ''} •{' '}
                            <strong>
                              {del.city}/{del.state}
                            </strong>
                          </span>
                        </p>
                      </div>

                      {/* Dados de Carga e Janela */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <div>
                          <strong>{del.packages_count || 1}</strong> vols •{' '}
                          <strong>{del.weight_kg ? `${del.weight_kg} kg` : '—'}</strong>
                          {del.cargo_value
                            ? ` • R$ ${del.cargo_value.toLocaleString('pt-BR')}`
                            : ''}
                        </div>

                        {(veh || driver) && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Truck className="h-3.5 w-3.5 text-indigo-600" />
                            <span>
                              {veh ? veh.plate : '—'} • {driver ? driver.name : '—'}
                            </span>
                          </div>
                        )}

                        {del.delivery_window_end && (
                          <div className="flex items-center gap-1 text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              SLA:{' '}
                              {new Date(del.delivery_window_end).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação & Comprovação */}
                    <div className="flex flex-wrap lg:flex-col items-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                      {del.status === 'delivered' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPodView(del)}
                          className="h-8 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1.5"
                        >
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          Ver Comprovante (POD)
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenPod(del)}
                          className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Concluir com POD
                        </Button>
                      )}

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(del)}
                          className="h-8 text-xs text-slate-600 hover:text-indigo-600 px-2"
                          title="Editar"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(del.id, del.customer_name)}
                          className="h-8 text-xs text-slate-500 hover:text-rose-600 px-2"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modais */}
      <DeliveryFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        deliveryToEdit={deliveryToEdit}
        vehicles={vehicles}
        drivers={drivers}
        trips={trips}
        onSuccess={handleFormSuccess}
      />

      <PodModal
        open={podModalOpen}
        onOpenChange={setPodModalOpen}
        delivery={selectedDelivery}
        onSuccess={handlePodSuccess}
      />

      <PodViewModal open={podViewOpen} onOpenChange={setPodViewOpen} delivery={selectedDelivery} />
    </div>
  )
}
