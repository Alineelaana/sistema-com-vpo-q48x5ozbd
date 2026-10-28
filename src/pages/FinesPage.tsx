import React, { useEffect, useState, useId, useRef } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  getTrafficFines,
  createTrafficFine,
  updateTrafficFine,
  deleteTrafficFine,
  markFineAsPaid,
  registerFineAppeal,
  getVehicles,
  getDrivers,
} from '@/services/logisticsService'
import type {
  TrafficFine,
  Vehicle,
  Driver,
  InfractionType,
  FineSeverity,
  FineStatus,
} from '@/types/logistics'
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  FileText,
  DollarSign,
  AlertCircle,
  Clock,
  Car,
  User,
  Calendar,
  XCircle,
  Filter,
  RotateCcw,
} from 'lucide-react'

export const INFRACTION_TYPE_LABELS: Record<InfractionType, string> = {
  speeding: 'Excesso de Velocidade',
  weight_scale: 'Evasão de Balança / Pesagem',
  red_light: 'Avanço de Sinal Vermelho',
  parking: 'Estacionamento Irregular',
  overtaking: 'Ultrapassagem Proibida',
  seatbelt: 'Cinto de Segurança',
  phone_usage: 'Uso de Celular ao Volante',
  tachograph: 'Tacógrafo / Jornada',
  other: 'Outra Infração',
}

export const SEVERITY_LABELS: Record<
  FineSeverity,
  { label: string; defaultPoints: number; badgeClass: string }
> = {
  light: {
    label: 'Leve (3 pts)',
    defaultPoints: 3,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  medium: {
    label: 'Média (4 pts)',
    defaultPoints: 4,
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  grave: {
    label: 'Grave (5 pts)',
    defaultPoints: 5,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  very_grave: {
    label: 'Gravíssima (7 pts)',
    defaultPoints: 7,
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
  },
}

export const STATUS_CONFIG: Record<
  FineStatus,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  pending: {
    label: 'Pendente',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Clock,
  },
  paid: {
    label: 'Paga',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: CheckCircle2,
  },
  appealed: {
    label: 'Recorrida',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: FileText,
  },
  cancelled: {
    label: 'Cancelada',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    icon: XCircle,
  },
}

export const FinesPage: React.FC = () => {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const highlightFineId =
    searchParams.get('highlight') || (location.hash ? location.hash.replace('#fine-', '') : null)

  // Form IDs for accessibility
  const vehicleInputId = useId()
  const driverInputId = useId()
  const noticeInputId = useId()
  const issuingInputId = useId()
  const infractionDateInputId = useId()
  const dueDateInputId = useId()
  const amountInputId = useId()
  const pointsInputId = useId()
  const descriptionInputId = useId()
  const locationInputId = useId()
  const notesInputId = useId()

  const [fines, setFines] = useState<TrafficFine[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [vehicleFilter, setVehicleFilter] = useState<string>('all')
  const [driverFilter, setDriverFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFine, setEditingFine] = useState<TrafficFine | null>(null)
  const [formData, setFormData] = useState<{
    vehicle_id: string
    driver_id: string
    infraction_date: string
    description: string
    location: string
    infraction_type: InfractionType
    severity: FineSeverity
    points: number
    amount: number
    notice_number: string
    issuing_body: string
    due_date: string
    status: FineStatus
    payment_date: string
    appeal_number: string
    notes: string
  }>({
    vehicle_id: '',
    driver_id: '',
    infraction_date: new Date().toISOString().split('T')[0],
    description: '',
    location: '',
    infraction_type: 'speeding',
    severity: 'medium',
    points: 4,
    amount: 130.16,
    notice_number: '',
    issuing_body: 'DER',
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'pending',
    payment_date: '',
    appeal_number: '',
    notes: '',
  })

  // Modal de Marcar como Paga
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [fineToPay, setFineToPay] = useState<TrafficFine | null>(null)
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])

  // Modal de Recorrer
  const [appealModalOpen, setAppealModalOpen] = useState(false)
  const [fineToAppeal, setFineToAppeal] = useState<TrafficFine | null>(null)
  const [appealNumber, setAppealNumber] = useState('')
  const [appealNotes, setAppealNotes] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  // Efeito para rolar até a multa destacada e focar visualmente
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null)
  useEffect(() => {
    if (!loading && highlightFineId && fines.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`fine-${highlightFineId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 300)
    }
  }, [loading, highlightFineId, fines])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [finesList, vehiclesList, driversList] = await Promise.all([
        getTrafficFines(),
        getVehicles(),
        getDrivers(),
      ])
      setFines(finesList)
      setVehicles(vehiclesList)
      setDrivers(driversList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as multas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Abertura do modal para criar
  const handleOpenCreate = () => {
    setEditingFine(null)
    setFormData({
      vehicle_id: vehicles[0]?.id || '',
      driver_id: drivers[0]?.id || '',
      infraction_date: new Date().toISOString().split('T')[0],
      description: '',
      location: '',
      infraction_type: 'speeding',
      severity: 'medium',
      points: 4,
      amount: 130.16,
      notice_number: '',
      issuing_body: 'PRF',
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      payment_date: '',
      appeal_number: '',
      notes: '',
    })
    setModalOpen(true)
  }

  // Abertura do modal para editar
  const handleOpenEdit = (fine: TrafficFine) => {
    setEditingFine(fine)
    setFormData({
      vehicle_id: fine.vehicle_id,
      driver_id: fine.driver_id || '',
      infraction_date: fine.infraction_date ? fine.infraction_date.split('T')[0] : '',
      description: fine.description,
      location: fine.location || '',
      infraction_type: fine.infraction_type,
      severity: fine.severity,
      points: fine.points,
      amount: fine.amount,
      notice_number: fine.notice_number,
      issuing_body: fine.issuing_body,
      due_date: fine.due_date ? fine.due_date.split('T')[0] : '',
      status: fine.status,
      payment_date: fine.payment_date ? fine.payment_date.split('T')[0] : '',
      appeal_number: fine.appeal_number || '',
      notes: fine.notes || '',
    })
    setModalOpen(true)
  }

  // Atualizar pontos padrão ao mudar gravidade no form
  const handleSeverityChange = (sev: FineSeverity) => {
    const defaultPts = SEVERITY_LABELS[sev].defaultPoints
    setFormData((prev) => ({
      ...prev,
      severity: sev,
      points: defaultPts,
    }))
  }

  // Salvar multa
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.vehicle_id) {
      toast({
        title: 'Selecione o veículo',
        description: 'O veículo autuado é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.notice_number || !formData.description) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Auto de infração e descrição são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      const payload: Omit<TrafficFine, 'id' | 'created' | 'updated' | 'expand'> = {
        vehicle_id: formData.vehicle_id,
        driver_id: formData.driver_id || undefined,
        infraction_date: new Date(formData.infraction_date).toISOString(),
        description: formData.description,
        location: formData.location || undefined,
        infraction_type: formData.infraction_type,
        severity: formData.severity,
        points: Number(formData.points) || 0,
        amount: Number(formData.amount) || 0,
        notice_number: formData.notice_number.trim(),
        issuing_body: formData.issuing_body.trim(),
        due_date: new Date(formData.due_date).toISOString(),
        status: formData.status,
        payment_date: formData.payment_date
          ? new Date(formData.payment_date).toISOString()
          : undefined,
        appeal_number: formData.appeal_number || undefined,
        notes: formData.notes || undefined,
      }

      if (editingFine) {
        await updateTrafficFine(editingFine.id, payload)
        toast({ title: 'Multa atualizada com sucesso!' })
      } else {
        await createTrafficFine(payload)
        toast({ title: 'Multa cadastrada com sucesso!' })
      }
      setModalOpen(false)
      loadAll()
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Erro ao salvar multa',
        description:
          (err as { message?: string })?.message ||
          'Verifique se o número do auto de infração já não existe.',
        variant: 'destructive',
      })
    }
  }

  // Excluir multa
  const handleDelete = async (fine: TrafficFine) => {
    if (confirm(`Deseja realmente remover o auto de infração ${fine.notice_number}?`)) {
      try {
        await deleteTrafficFine(fine.id)
        toast({ title: 'Multa removida com sucesso' })
        loadAll()
      } catch (err) {
        toast({ title: 'Erro ao remover multa', variant: 'destructive' })
      }
    }
  }

  // Marcar como paga
  const handleOpenPay = (fine: TrafficFine) => {
    setFineToPay(fine)
    setPayDate(new Date().toISOString().split('T')[0])
    setPayModalOpen(true)
  }

  const handleConfirmPayment = async () => {
    if (!fineToPay) return
    try {
      await markFineAsPaid(
        fineToPay.id,
        payDate ? new Date(payDate).toISOString() : new Date().toISOString(),
      )
      toast({
        title: 'Multa marcada como paga!',
        description: `Auto ${fineToPay.notice_number} atualizado para status Pago.`,
      })
      setPayModalOpen(false)
      loadAll()
    } catch (err) {
      toast({ title: 'Erro ao registrar pagamento', variant: 'destructive' })
    }
  }

  // Registrar recurso
  const handleOpenAppeal = (fine: TrafficFine) => {
    setFineToAppeal(fine)
    setAppealNumber(fine.appeal_number || `REC-${new Date().getFullYear()}-`)
    setAppealNotes(fine.notes || '')
    setAppealModalOpen(true)
  }

  const handleConfirmAppeal = async () => {
    if (!fineToAppeal) return
    if (!appealNumber.trim()) {
      toast({
        title: 'Número do recurso obrigatório',
        description: 'Informe o protocolo ou número do recurso interposto.',
        variant: 'destructive',
      })
      return
    }
    try {
      await registerFineAppeal(fineToAppeal.id, appealNumber.trim(), appealNotes.trim())
      toast({
        title: 'Recurso registrado com sucesso!',
        description: `Auto ${fineToAppeal.notice_number} alterado para status Recorrida.`,
      })
      setAppealModalOpen(false)
      loadAll()
    } catch (err) {
      toast({ title: 'Erro ao registrar recurso', variant: 'destructive' })
    }
  }

  // Filtragem
  const filteredFines = fines.filter((f) => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false
    if (vehicleFilter !== 'all' && f.vehicle_id !== vehicleFilter) return false
    if (driverFilter !== 'all' && f.driver_id !== driverFilter) return false

    if (startDate) {
      const fDate = f.infraction_date.split('T')[0]
      if (fDate < startDate) return false
    }
    if (endDate) {
      const fDate = f.infraction_date.split('T')[0]
      if (fDate > endDate) return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const vehiclePlate = f.expand?.vehicle_id?.plate?.toLowerCase() || ''
      const vehicleModel = f.expand?.vehicle_id?.model?.toLowerCase() || ''
      const driverName = f.expand?.driver_id?.name?.toLowerCase() || ''
      const notice = f.notice_number?.toLowerCase() || ''
      const issuing = f.issuing_body?.toLowerCase() || ''
      const desc = f.description?.toLowerCase() || ''
      const loc = f.location?.toLowerCase() || ''

      const match =
        vehiclePlate.includes(q) ||
        vehicleModel.includes(q) ||
        driverName.includes(q) ||
        notice.includes(q) ||
        issuing.includes(q) ||
        desc.includes(q) ||
        loc.includes(q)
      if (!match) return false
    }

    return true
  })

  // Métricas de resumo (calculadas a partir de toda a base carregada)
  const pendingCount = fines.filter((f) => f.status === 'pending').length
  const pendingTotal = fines
    .filter((f) => f.status === 'pending')
    .reduce((acc, f) => acc + (f.amount || 0), 0)

  const paidCount = fines.filter((f) => f.status === 'paid').length
  const paidTotal = fines
    .filter((f) => f.status === 'paid')
    .reduce((acc, f) => acc + (f.amount || 0), 0)

  const appealedCount = fines.filter((f) => f.status === 'appealed').length
  const appealedTotal = fines
    .filter((f) => f.status === 'appealed')
    .reduce((acc, f) => acc + (f.amount || 0), 0)

  const totalPointsPending = fines
    .filter((f) => f.status === 'pending' || f.status === 'appealed')
    .reduce((acc, f) => acc + (f.points || 0), 0)

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setVehicleFilter('all')
    setDriverFilter('all')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters =
    search !== '' ||
    statusFilter !== 'all' ||
    vehicleFilter !== 'all' ||
    driverFilter !== 'all' ||
    startDate !== '' ||
    endDate !== ''

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            Gestão de Multas e Infrações de Trânsito
          </h1>
          <p className="text-sm text-slate-500">
            Controle de infrações da frota, acompanhamento de vencimentos, pontos na CNH, recursos e
            pagamentos.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Multa
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-amber-900 uppercase">
              Multas Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-950">
              {pendingTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-amber-700 mt-1 font-medium">
              {pendingCount} multa{pendingCount === 1 ? '' : 's'} aguardando pagamento
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-blue-900 uppercase">
              Em Recurso (JARI/CETRAN)
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-950">
              {appealedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-blue-700 mt-1 font-medium">
              {appealedCount} autuaç{appealedCount === 1 ? 'ão contestada' : 'ões contestadas'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-900 uppercase">
              Multas Quitadas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-950">
              {paidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              {paidCount} multa{paidCount === 1 ? '' : 's'} pagas
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase">
              Pontuação Ativa em Risco
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalPointsPending} pts</div>
            <p className="text-xs text-slate-500 mt-1">Acumulados em infrações ativas/recorridas</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Campo de Busca Livre */}
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por auto, placa, motorista ou órgão..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro de Status */}
            <div className="md:col-span-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Paga</SelectItem>
                  <SelectItem value="appealed">Recorrida</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Veículo */}
            <div className="md:col-span-2">
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Veículo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Veículos</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} - {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Motorista */}
            <div className="md:col-span-2">
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Motorista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Motoristas</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período De / Até */}
            <div className="md:col-span-2 flex items-center gap-1.5">
              <Input
                type="date"
                title="Data inicial"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
              />
              <span className="text-slate-400 text-xs">a</span>
              <Input
                type="date"
                title="Data final"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-1 border-t text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" />
                Filtrando: {filteredFines.length} de {fines.length} multas encontradas
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs gap-1 text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="h-3 w-3" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Multas */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auto / Órgão</TableHead>
                <TableHead>Veículo & Motorista</TableHead>
                <TableHead>Infração & Gravidade</TableHead>
                <TableHead className="text-center">Pontos CNH</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Carregando multas e infrações...
                  </TableCell>
                </TableRow>
              ) : filteredFines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Nenhuma multa encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFines.map((fine) => {
                  const statusConf = STATUS_CONFIG[fine.status] || STATUS_CONFIG.pending
                  const StatusIcon = statusConf.icon
                  const severityConf = SEVERITY_LABELS[fine.severity] || SEVERITY_LABELS.medium
                  const fineDateStr = fine.infraction_date
                    ? new Date(fine.infraction_date).toLocaleDateString('pt-BR')
                    : '—'
                  const dueDateStr = fine.due_date
                    ? new Date(fine.due_date).toLocaleDateString('pt-BR')
                    : '—'

                  const isOverdue =
                    fine.status === 'pending' &&
                    fine.due_date &&
                    new Date(fine.due_date).getTime() < Date.now()

                  const isHighlighted = fine.id === highlightFineId

                  return (
                    <TableRow
                      key={fine.id}
                      id={`fine-${fine.id}`}
                      ref={isHighlighted ? highlightedRowRef : undefined}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-50/90 ring-2 ring-amber-400 ring-inset shadow-sm'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Auto / Órgão */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {fine.notice_number}
                          </span>
                          {isHighlighted && (
                            <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 uppercase animate-pulse">
                              Destacada
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {fine.issuing_body}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Em {fineDateStr}</div>
                      </TableCell>

                      {/* Veículo & Motorista */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                          <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border text-[11px]">
                            {fine.expand?.vehicle_id?.plate || '—'}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                            {fine.expand?.vehicle_id?.model || ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {fine.expand?.driver_id?.name || 'Não identificado'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Infração & Gravidade */}
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-800">
                          {INFRACTION_TYPE_LABELS[fine.infraction_type] || fine.infraction_type}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {fine.description}
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 font-medium ${severityConf.badgeClass}`}
                          >
                            {severityConf.label}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Pontos CNH */}
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 font-bold text-xs text-slate-800 border">
                          {fine.points}
                        </span>
                      </TableCell>

                      {/* Valor */}
                      <TableCell>
                        <div className="font-bold text-xs text-slate-900">
                          {fine.amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </div>
                        {fine.payment_date && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            Pago em {new Date(fine.payment_date).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </TableCell>

                      {/* Vencimento */}
                      <TableCell>
                        <div
                          className={`text-xs font-medium ${isOverdue ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-slate-700'}`}
                        >
                          {dueDateStr}
                          {isOverdue && <span className="text-[10px] uppercase">(Vencida)</span>}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] gap-1 font-medium ${statusConf.badgeClass}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConf.label}
                        </Badge>
                        {fine.appeal_number && (
                          <div className="text-[10px] text-blue-600 font-mono mt-0.5">
                            {fine.appeal_number}
                          </div>
                        )}
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right space-x-1">
                        {fine.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] text-emerald-700 border-emerald-200 hover:bg-emerald-50 px-2"
                              title="Marcar como Paga"
                              onClick={() => handleOpenPay(fine)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Pagar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] text-blue-700 border-blue-200 hover:bg-blue-50 px-2"
                              title="Registrar Recurso"
                              onClick={() => handleOpenAppeal(fine)}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              Recurso
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleOpenEdit(fine)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDelete(fine)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
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

      {/* Modal Criar / Editar Multa */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFine ? 'Editar Infração de Trânsito' : 'Cadastrar Nova Multa / Infração'}
            </DialogTitle>
            <DialogDescription>
              Vincule a infração ao veículo e ao condutor para controle de pontos e custos da frota.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Linha 1: Veículo e Motorista */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={vehicleInputId}>Veículo Autuado *</Label>
                <Select
                  value={formData.vehicle_id}
                  onValueChange={(val) => setFormData({ ...formData, vehicle_id: val })}
                >
                  <SelectTrigger id={vehicleInputId} className="mt-1">
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
                <Label htmlFor={driverInputId}>Motorista Responsável (Opcional)</Label>
                <Select
                  value={formData.driver_id || 'none'}
                  onValueChange={(val) =>
                    setFormData({ ...formData, driver_id: val === 'none' ? '' : val })
                  }
                >
                  <SelectTrigger id={driverInputId} className="mt-1">
                    <SelectValue placeholder="Selecione ou deixe em branco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum / Não Identificado</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} (CNH {d.cnh_category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 2: Auto de Infração e Órgão Autuador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={noticeInputId}>Nº do Auto de Infração (AIT) *</Label>
                <Input
                  id={noticeInputId}
                  value={formData.notice_number}
                  onChange={(e) => setFormData({ ...formData, notice_number: e.target.value })}
                  placeholder="Ex: PRF-SP-1092839"
                  required
                  className="font-mono uppercase mt-1"
                />
              </div>

              <div>
                <Label htmlFor={issuingInputId}>Órgão Autuador *</Label>
                <Input
                  id={issuingInputId}
                  value={formData.issuing_body}
                  onChange={(e) => setFormData({ ...formData, issuing_body: e.target.value })}
                  placeholder="Ex: PRF, DER-SP, CET-SP, ANTT"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* Linha 3: Tipo de Infração e Gravidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Infração *</Label>
                <Select
                  value={formData.infraction_type}
                  onValueChange={(val: InfractionType) =>
                    setFormData({ ...formData, infraction_type: val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INFRACTION_TYPE_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Gravidade *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(val: FineSeverity) => handleSeverityChange(val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_LABELS).map(([k, item]) => (
                      <SelectItem key={k} value={k}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 4: Pontos CNH e Valor da Multa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={pointsInputId}>Pontos na CNH *</Label>
                <Input
                  id={pointsInputId}
                  type="number"
                  min={0}
                  max={20}
                  value={formData.points}
                  onChange={(e) =>
                    setFormData({ ...formData, points: parseInt(e.target.value, 10) || 0 })
                  }
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={amountInputId}>Valor da Multa (R$) *</Label>
                <Input
                  id={amountInputId}
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="mt-1 font-semibold"
                />
              </div>
            </div>

            {/* Linha 5: Datas da Infração e Vencimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={infractionDateInputId}>Data e Hora da Infração *</Label>
                <Input
                  id={infractionDateInputId}
                  type="date"
                  value={formData.infraction_date}
                  onChange={(e) => setFormData({ ...formData, infraction_date: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={dueDateInputId}>Data de Vencimento *</Label>
                <Input
                  id={dueDateInputId}
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {/* Linha 6: Descrição e Local */}
            <div>
              <Label htmlFor={descriptionInputId}>Descrição do Fato / Artigo do CTB *</Label>
              <Input
                id={descriptionInputId}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Transitar em velocidade superior à máxima em até 20% (Art. 218, I)"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={locationInputId}>Local da Infração / Rodovia / Km</Label>
              <Input
                id={locationInputId}
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Rodovia Anhanguera (SP-330), Km 84 - Campinas/SP"
                className="mt-1"
              />
            </div>

            {/* Linha 7: Status e Campos de Pagamento/Recurso */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Status da Multa</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: FineStatus) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Paga</SelectItem>
                    <SelectItem value="appealed">Recorrida</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === 'paid' && (
                <div className="sm:col-span-2">
                  <Label>Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}

              {formData.status === 'appealed' && (
                <div className="sm:col-span-2">
                  <Label>Nº do Protocolo / Recurso JARI</Label>
                  <Input
                    value={formData.appeal_number}
                    onChange={(e) => setFormData({ ...formData, appeal_number: e.target.value })}
                    placeholder="Ex: REC-2025-0982"
                    className="mt-1 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor={notesInputId}>Observações Internas</Label>
              <Textarea
                id={notesInputId}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Detalhes adicionais, dados da notificação de penalidade, orientações ao motorista..."
                rows={2}
                className="mt-1"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {editingFine ? 'Salvar Alterações' : 'Cadastrar Multa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Rápido: Marcar como Paga */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Marcar Multa como Paga
            </DialogTitle>
            <DialogDescription>
              Confirme a quitação da multa <strong>{fineToPay?.notice_number}</strong> no valor de{' '}
              <strong>
                {fineToPay?.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Data da Baixa / Pagamento</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-slate-500">
              O status será alterado para <strong>Paga</strong> e a data de pagamento será
              registrada no histórico.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rápido: Registrar Recurso */}
      <Dialog open={appealModalOpen} onOpenChange={setAppealModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Registrar Recurso de Multa
            </DialogTitle>
            <DialogDescription>
              Informe o protocolo de interposição do recurso (JARI, CETRAN ou PRF) para o auto{' '}
              <strong>{fineToAppeal?.notice_number}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Número do Protocolo / Recurso *</Label>
              <Input
                value={appealNumber}
                onChange={(e) => setAppealNumber(e.target.value)}
                placeholder="Ex: REC-2025-0491"
                className="mt-1 font-mono uppercase"
              />
            </div>

            <div>
              <Label>Fundamento / Observações do Recurso</Label>
              <Textarea
                value={appealNotes}
                onChange={(e) => setAppealNotes(e.target.value)}
                placeholder="Motivo alegado: inconsistência no radar, sinalização deficiente, veículo vendido..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAppealModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAppeal}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Registrar Recurso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default FinesPage
