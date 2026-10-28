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
import { getDeliveries } from '@/services/logisticsService'
import type { Delivery, AuditStatus } from '@/types/logistics'
import { AuditFormModal } from '@/components/AuditFormModal'
import {
  Scale,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  FileText,
  Truck,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react'

export const FreightAuditPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modal
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getDeliveries()
      setDeliveries(data)
    } catch (err) {
      console.error('Erro ao carregar auditoria de frete:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenAudit = (del: Delivery) => {
    setSelectedDelivery(del)
    setAuditModalOpen(true)
  }

  const handleAuditSuccess = (updated: Delivery) => {
    setDeliveries((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  // Métricas de Auditoria
  const totalExpected = deliveries.reduce((acc, d) => acc + (d.expected_freight_value || 0), 0)
  const totalInvoiced = deliveries.reduce((acc, d) => acc + (d.invoiced_freight_value || 0), 0)
  const totalDifference = deliveries.reduce((acc, d) => acc + (d.audit_difference || 0), 0)

  const divergentDeliveries = deliveries.filter((d) => d.audit_status === 'divergent')
  const okDeliveries = deliveries.filter((d) => d.audit_status === 'ok')
  const pendingDeliveries = deliveries.filter(
    (d) => d.audit_status === 'pending' || !d.audit_status,
  )

  // Filtragem
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((del) => {
      const matchesSearch =
        del.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        del.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        del.city?.toLowerCase().includes(search.toLowerCase()) ||
        del.route_code?.toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'pending'
            ? del.audit_status === 'pending' || !del.audit_status
            : del.audit_status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [deliveries, search, statusFilter])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600 text-white font-semibold">Fusion by nstech</Badge>
            <span className="text-xs text-slate-500">Conferência Fiscal & Prevenção de Perdas</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1 tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-600" />
            Auditoria de Frete & Faturamento
          </h1>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5">
            Compare o frete previsto cotado nas viagens x o valor faturado nos conhecimentos de
            transporte e notas fiscais. Identifique cobranças indevidas, taxas adicionais e glosas.
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
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas de Auditoria */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Frete Previsto Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {totalExpected.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-slate-500 mt-1">{deliveries.length} entregas auditadas</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Frete Faturado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-indigo-700">
              {totalInvoiced.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cobrado pelo transporte</p>
          </CardContent>
        </Card>

        <Card
          className={`shadow-sm ${
            Math.abs(totalDifference) > 0.01
              ? 'border-amber-300 bg-amber-50/30'
              : 'border-emerald-200 bg-emerald-50/20'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-amber-900 uppercase">
              Saldo de Divergências
            </CardTitle>
            <Scale className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-bold ${
                totalDifference > 0
                  ? 'text-rose-700'
                  : totalDifference < 0
                    ? 'text-emerald-700'
                    : 'text-slate-900'
              }`}
            >
              {totalDifference > 0 ? '+' : ''}
              {totalDifference.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {divergentDeliveries.length}{' '}
              {divergentDeliveries.length === 1
                ? 'conhecimento divergente'
                : 'conhecimentos divergentes'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Status da Carteira
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span className="text-emerald-600">{okDeliveries.length} OK</span>
              <span className="text-amber-600">{divergentDeliveries.length} Divergentes</span>
              <span className="text-slate-400">{pendingDeliveries.length} Pendentes</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Conferência contábil</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, NF-e ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs w-[180px]">
                  <SelectValue placeholder="Status Auditoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Conferências</SelectItem>
                  <SelectItem value="divergent">Apenas Divergentes</SelectItem>
                  <SelectItem value="ok">Conferidas (OK)</SelectItem>
                  <SelectItem value="pending">Pendentes de Conferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Auditoria */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Carregando conciliação de frete...
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
            Nenhuma entrega encontrada para a auditoria com os filtros selecionados.
          </div>
        ) : (
          filteredDeliveries.map((del) => {
            const exp = del.expected_freight_value || 0
            const inv = del.invoiced_freight_value || 0
            const diff = del.audit_difference ?? inv - exp
            const isDivergent = Math.abs(diff) > 0.01
            const isOk = del.audit_status === 'ok'

            return (
              <Card
                key={del.id}
                className={`border transition-all shadow-xs bg-white ${
                  isDivergent
                    ? 'border-amber-300 hover:border-amber-400'
                    : isOk
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Dados da Entrega & NF */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {del.audit_status === 'ok' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Conferido (OK)
                          </Badge>
                        ) : del.audit_status === 'divergent' ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] gap-1 font-bold">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            Divergência
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                            Pendente de Conferência
                          </Badge>
                        )}

                        {del.invoice_number && (
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {del.invoice_number}
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 font-medium">
                          Status entrega: <strong>{del.status}</strong>
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm">{del.customer_name}</h3>
                      <p className="text-xs text-slate-500">
                        {del.city}/{del.state} • {del.packages_count || 1} vols •{' '}
                        {del.weight_kg ? `${del.weight_kg} kg` : '—'}
                      </p>

                      {del.audit_notes && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 mt-2">
                          <strong className="text-slate-800">Nota da Auditoria:</strong>{' '}
                          {del.audit_notes}
                        </div>
                      )}
                    </div>

                    {/* Comparativo de Valores */}
                    <div className="grid grid-cols-3 gap-3 text-center sm:text-right shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">
                          Previsto
                        </div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">
                          {exp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-indigo-600 uppercase font-semibold">
                          Faturado
                        </div>
                        <div className="text-xs font-bold text-indigo-700 mt-0.5">
                          {inv.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">
                          Diferença
                        </div>
                        <div
                          className={`text-xs font-extrabold mt-0.5 ${
                            diff > 0.01
                              ? 'text-rose-600'
                              : diff < -0.01
                                ? 'text-emerald-600'
                                : 'text-slate-900'
                          }`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="shrink-0 flex items-center justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAudit(del)}
                        className="h-8 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1.5"
                      >
                        <Scale className="h-3.5 w-3.5" />
                        Lançar / Auditar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal de Auditoria */}
      <AuditFormModal
        delivery={selectedDelivery}
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        onSuccess={handleAuditSuccess}
      />
    </div>
  )
}
