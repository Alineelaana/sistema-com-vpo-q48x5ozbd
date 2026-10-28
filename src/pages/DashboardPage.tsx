import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getTrips,
  getCteDocuments,
  getVehicles,
  getDrivers,
  getCompanySettings,
  getTrafficFines,
} from '@/services/logisticsService'
import type {
  Trip,
  CteDocument,
  Vehicle,
  Driver,
  CompanySettings,
  TrafficFine,
} from '@/types/logistics'
import {
  Truck,
  TrendingUp,
  FileCheck2,
  DollarSign,
  AlertCircle,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  Calendar,
  Building2,
  Calculator,
  Plus,
  AlertTriangle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { VpoCalculator } from '@/components/VpoCalculator'

export const DashboardPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([])
  const [ctes, setCtes] = useState<CteDocument[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [company, setCompany] = useState<CompanySettings | null>(null)
  const [fines, setFines] = useState<TrafficFine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      const [tripsList, ctesList, vehList, drivList, comp, finesList] = await Promise.all([
        getTrips(),
        getCteDocuments(),
        getVehicles(),
        getDrivers(),
        getCompanySettings(),
        getTrafficFines(),
      ])
      setTrips(tripsList)
      setCtes(ctesList)
      setVehicles(vehList)
      setDrivers(drivList)
      setCompany(comp)
      setFines(finesList)
      setLoading(false)
    }
    loadDashboard()
  }, [])

  // Indicadores
  const totalFreight = trips.reduce((acc, t) => acc + (t.freight_value || 0), 0)
  const totalVpo = trips.reduce((acc, t) => acc + (t.vpo_value || 0), 0)
  const activeTripsCount = trips.filter((t) => t.status === 'in_progress').length
  const authorizedCtesCount = ctes.filter((c) => c.status === 'authorized').length

  // Métricas de Multas
  const pendingFines = fines.filter((f) => f.status === 'pending')
  const pendingFinesCount = pendingFines.length
  const pendingFinesTotal = pendingFines.reduce((acc, f) => acc + (f.amount || 0), 0)
  const totalFinesCount = fines.length

  // Economia Connect acumulada estimada (20 minutos por CT-e economizados)
  const totalCtesIssued = ctes.length
  const minutesSaved = totalCtesIssued * 20
  const hoursSaved = (minutesSaved / 60).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Alerta de Boas-vindas / Certificado */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase">
              Transporte Rodoviário & VPO Integrado
            </span>
            <span className="text-xs text-slate-300">
              {company?.trade_name || 'TransConnect Transportes'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight">
            Painel Geral de Operações e Vale Pedágio
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl mt-0.5">
            Gerenciamento de viagens, veículos, motoristas e emissão de CT-e com inclusão automática
            do VPO conforme Lei 10.209/01 da ANTT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/vpo-calc">
            <Button size="sm" variant="secondary" className="gap-1.5 text-xs font-semibold">
              <Calculator className="h-4 w-4 text-indigo-600" />
              Calculadora VPO
            </Button>
          </Link>
          <Link to="/trips">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              Nova Viagem
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase">
              Total em Fretes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {totalFreight.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{trips.length} viagens</span>{' '}
              registradas
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-indigo-50/20 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-indigo-800 uppercase">
              VPO Destacado (Pedágio)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">
              {totalVpo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Repasse legal via Lei 10.209/01</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase">
              CT-e Autorizados SEFAZ
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {authorizedCtesCount}{' '}
              <span className="text-sm font-normal text-slate-500">/ {ctes.length}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-medium">100% integrados</span> com VPO
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/20 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-emerald-800 uppercase flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Economia Connect
            </CardTitle>
            <Clock className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">~{hoursSaved} horas</div>
            <p className="text-xs text-slate-500 mt-1">Economizadas com AutoCT-e Connect</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-amber-900 uppercase flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Multas Pendentes
            </CardTitle>
            <Link to="/fines" className="text-amber-700 hover:text-amber-900">
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-950">
              {pendingFinesTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-amber-700 mt-1 flex items-center justify-between">
              <span>
                <strong>{pendingFinesCount}</strong> a pagar
              </span>
              <span className="text-slate-500">{totalFinesCount} no total</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Seções: Viagens Ativas & Últimos CT-es */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Viagens Recentes */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Viagens Operacionais Recentes
                </CardTitle>
                <CardDescription className="text-xs">
                  Acompanhamento de rotas, veículos alocados e status do vale pedágio
                </CardDescription>
              </div>
              <Link to="/trips">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
                  Ver todas
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {trips.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-between gap-3 bg-white"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {t.trip_code}
                      </span>
                      {t.status === 'in_progress' && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                          Em Trânsito
                        </Badge>
                      )}
                      {t.status === 'completed' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          Concluída
                        </Badge>
                      )}
                      {t.status === 'planned' && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                          Planejada
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {t.origin_city}/{t.origin_state} ➔ {t.destination_city}/{t.destination_state}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.distance_km ? `${t.distance_km} km` : ''} • {t.cargo_type || 'Carga geral'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-900">
                      {(t.freight_value + t.vpo_value).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </div>
                    <div className="text-xs font-semibold text-indigo-600">
                      VPO:{' '}
                      {t.vpo_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <div className="text-[10px] text-slate-400">{t.axles_count} eixos</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Últimos CT-es e Status de Emissão */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Documentos Fiscais (CT-e)
                </CardTitle>
                <CardDescription className="text-xs">
                  Últimos conhecimentos emitidos e autorizados
                </CardDescription>
              </div>
              <Link to="/cte">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600">
                  Ver todos
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {ctes.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        CT-e Nº {c.cte_number}
                      </span>
                      {c.status === 'authorized' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Autorizado
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                          {c.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 truncate max-w-[200px] mt-1">
                      {c.sender_name}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">
                      {c.total_cte_value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </div>
                    <div className="text-[10px] text-indigo-600 font-medium">
                      Pedágio:{' '}
                      {(c.vpo_value || 0).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Card Rápido de Status da Frota e Infrações */}
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase font-bold text-slate-500 flex items-center justify-between">
                <span>Resumo Operacional & Frota</span>
                <Link
                  to="/fines"
                  className="text-indigo-600 hover:underline text-[11px] font-normal normal-case"
                >
                  Ver infrações
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <div className="text-xl font-bold text-slate-900">{vehicles.length}</div>
                  <div className="text-[11px] text-slate-500">Veículos</div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg">
                  <div className="text-xl font-bold text-slate-900">{drivers.length}</div>
                  <div className="text-[11px] text-slate-500">Motoristas</div>
                </div>
                <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200/60">
                  <div className="text-xl font-bold text-amber-900">{pendingFinesCount}</div>
                  <div className="text-[11px] text-amber-700">Multas a pagar</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
