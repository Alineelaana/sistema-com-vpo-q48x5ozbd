import React, { useState, useId } from 'react'
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
import { Slider } from '@/components/ui/slider'
import {
  Calculator,
  Truck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  DollarSign,
  Clock,
  HelpCircle,
  FileCheck2,
  Info,
} from 'lucide-react'

// Dados de referência e tabela ANTT / VPO
export const AXLE_PRESETS = [
  { axles: 2, label: '2 Eixos (Caminhão Toco / VUC)', factor: 1.0, typicalWeight: '16 ton' },
  { axles: 3, label: '3 Eixos (Caminhão Truck 6x2)', factor: 1.5, typicalWeight: '23 ton' },
  {
    axles: 4,
    label: '4 Eixos (Cavalo Mecânico + Semirreboque 1 eixo / Bitruck)',
    factor: 2.0,
    typicalWeight: '29 ton',
  },
  {
    axles: 5,
    label: '5 Eixos (Cavalo 2 eixos + Semirreboque 3 eixos)',
    factor: 2.5,
    typicalWeight: '41.5 ton',
  },
  {
    axles: 6,
    label: '6 Eixos (Cavalo 3 eixos + Semirreboque 3 eixos - Carreta LS)',
    factor: 3.0,
    typicalWeight: '48.5 ton',
  },
  { axles: 7, label: '7 Eixos (Bitrem / Rodotrem 7 eixos)', factor: 3.5, typicalWeight: '57 ton' },
  { axles: 9, label: '9 Eixos (Rodotrem 9 eixos / Tritrem)', factor: 4.5, typicalWeight: '74 ton' },
]

export const POPULAR_ROUTES = [
  {
    name: 'São Paulo (SP) ⇄ Belo Horizonte (MG)',
    distanceKm: 585,
    tollPlazas: 8,
    avgRatePerAxle: 8.8,
  },
  { name: 'São Paulo (SP) ⇄ Curitiba (PR)', distanceKm: 408, tollPlazas: 6, avgRatePerAxle: 7.9 },
  { name: 'Santos (SP) ⇄ Campinas (SP)', distanceKm: 180, tollPlazas: 4, avgRatePerAxle: 11.2 },
  {
    name: 'Rio de Janeiro (RJ) ⇄ São Paulo (SP)',
    distanceKm: 435,
    tollPlazas: 6,
    avgRatePerAxle: 15.6,
  },
  { name: 'Goiânia (GO) ⇄ Brasília (DF)', distanceKm: 210, tollPlazas: 3, avgRatePerAxle: 6.7 },
  {
    name: 'Personalizada (Informar valores manuais)',
    distanceKm: 0,
    tollPlazas: 0,
    avgRatePerAxle: 9.0,
  },
]

interface VpoCalculatorProps {
  onApplyVpoToTrip?: (data: {
    axles: number
    plazas: number
    ratePerAxle: number
    totalVpo: number
  }) => void
}

export const VpoCalculator: React.FC<VpoCalculatorProps> = ({ onApplyVpoToTrip }) => {
  const originCityId = useId()
  const destCityId = useId()
  const distanceId = useId()
  const plazasId = useId()
  const rateId = useId()
  const freightValueId = useId()
  const ctesPerDayId = useId()

  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0)
  const [originCity, setOriginCity] = useState('São Paulo, SP')
  const [destinationCity, setDestinationCity] = useState('Belo Horizonte, MG')
  const [distanceKm, setDistanceKm] = useState<number>(585)
  const [axles, setAxles] = useState<number>(6)
  const [tollPlazas, setTollPlazas] = useState<number>(8)
  const [ratePerAxle, setRatePerAxle] = useState<number>(8.8)
  const [isReturnTrip, setIsReturnTrip] = useState<boolean>(false)
  const [freightValue, setFreightValue] = useState<number>(8400)
  const [includeVpoInFreight, setIncludeVpoInFreight] = useState<boolean>(true)

  // Economia Connect / AutoCT-e (conforme calculadora Connect Sistemas)
  const [ctesPerDay, setCtesPerDay] = useState<number>(25)

  const handleRouteChange = (idxStr: string) => {
    const idx = parseInt(idxStr, 10)
    setSelectedRouteIdx(idx)
    const route = POPULAR_ROUTES[idx]
    if (route && idx < POPULAR_ROUTES.length - 1) {
      const parts = route.name.split(' ⇄ ')
      setOriginCity(parts[0] || '')
      setDestinationCity(parts[1] || '')
      setDistanceKm(route.distanceKm)
      setTollPlazas(route.tollPlazas)
      setRatePerAxle(route.avgRatePerAxle)
    }
  }

  // Cálculos do VPO
  const effectivePlazas = isReturnTrip ? tollPlazas * 2 : tollPlazas
  const vpoPerPlaza = axles * ratePerAxle
  const totalVpo = effectivePlazas * vpoPerPlaza
  const totalWithFreight = includeVpoInFreight ? freightValue + totalVpo : freightValue

  // Economia Connect AutoCT-e:
  // Sem automação: 20 min por CT-e manual.
  // Horas gastas por mês (22 dias úteis)
  const monthlyCtes = ctesPerDay * 22
  const manualHoursMonth = (monthlyCtes * 20) / 60
  const connectHoursMonth = (monthlyCtes * 0.1) / 60 // ~0 seg
  const hoursSaved = Math.max(0, manualHoursMonth - connectHoursMonth)
  // Custo estimado hora operador: ~R$ 35/h c/ encargos
  const monthlySavingsBrl = hoursSaved * 35

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900">
            <Calculator className="h-6 w-6 text-indigo-600" />
            Calculadora de Vale Pedágio Obrigatório (VPO)
          </h2>
          <p className="text-sm text-slate-500">
            Cálculo oficial conforme Lei nº 10.209/2001 e normas da ANTT. Inclua o VPO destacado no
            CT-e automaticamente.
          </p>
        </div>
        <Badge
          variant="outline"
          className="px-3 py-1 bg-amber-50 text-amber-800 border-amber-300 w-fit"
        >
          <ShieldAlert className="h-3.5 w-3.5 mr-1 text-amber-600" />
          VPO é responsabilidade do Embarcador
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Cálculo */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Parâmetros da Rota e Veículo</CardTitle>
              <CardDescription>
                Selecione um trajeto comum ou defina a rota personalizada e eixos do veículo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rota pré-configurada */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Trajeto Rápido / Rota Frequente
                </Label>
                <Select value={selectedRouteIdx.toString()} onValueChange={handleRouteChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma rota..." />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_ROUTES.map((r, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {r.name}{' '}
                        {r.distanceKm > 0 ? `(${r.distanceKm} km - ${r.tollPlazas} praças)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Origem e Destino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={originCityId} className="text-xs font-semibold text-slate-700">
                    Origem (Cidade / UF)
                  </Label>
                  <Input
                    id={originCityId}
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    placeholder="Ex: São Paulo, SP"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={destCityId} className="text-xs font-semibold text-slate-700">
                    Destino (Cidade / UF)
                  </Label>
                  <Input
                    id={destCityId}
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    placeholder="Ex: Belo Horizonte, MG"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Tipo de Veículo e Eixos */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Configuração de Eixos (Tabela de Cobrança)</span>
                  <span className="text-indigo-600 font-bold">{axles} eixos</span>
                </Label>
                <Select
                  value={axles.toString()}
                  onValueChange={(val) => setAxles(parseInt(val, 10))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AXLE_PRESETS.map((item) => (
                      <SelectItem key={item.axles} value={item.axles.toString()}>
                        {item.label} — Capacidade máx. ~{item.typicalWeight}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Praças de Pedágio e Tarifa Média por Eixo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor={distanceId} className="text-xs font-semibold text-slate-700">
                    Distância Total (km)
                  </Label>
                  <Input
                    id={distanceId}
                    type="number"
                    min="0"
                    value={distanceKm || ''}
                    onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={plazasId} className="text-xs font-semibold text-slate-700">
                    Nº de Praças de Pedágio
                  </Label>
                  <Input
                    id={plazasId}
                    type="number"
                    min="1"
                    max="50"
                    value={tollPlazas}
                    onChange={(e) => setTollPlazas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={rateId} className="text-xs font-semibold text-slate-700">
                    Tarifa Média / Eixo (R$)
                  </Label>
                  <Input
                    id={rateId}
                    type="number"
                    step="0.10"
                    min="1"
                    value={ratePerAxle}
                    onChange={(e) => setRatePerAxle(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Opções de ida e volta e composição do CT-e */}
              <div className="pt-2 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-800">Calcular Ida e Volta</span>
                    <p className="text-xs text-slate-500">
                      Duplica o número de praças de pedágio no trajeto
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={isReturnTrip ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsReturnTrip(!isReturnTrip)}
                    className={isReturnTrip ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                  >
                    {isReturnTrip ? 'Ida e Volta Ativo' : 'Apenas Ida'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label
                      htmlFor={freightValueId}
                      className="text-xs font-semibold text-slate-700"
                    >
                      Valor Base do Frete (R$)
                    </Label>
                    <Input
                      id={freightValueId}
                      type="number"
                      step="50"
                      value={freightValue}
                      onChange={(e) => setFreightValue(parseFloat(e.target.value) || 0)}
                      className="mt-1 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Button
                      type="button"
                      variant={includeVpoInFreight ? 'secondary' : 'outline'}
                      className="w-full text-xs"
                      onClick={() => setIncludeVpoInFreight(!includeVpoInFreight)}
                    >
                      {includeVpoInFreight ? '✓ VPO somado no Total CT-e' : 'VPO destacado à parte'}
                    </Button>
                  </div>
                </div>
              </div>

              {onApplyVpoToTrip && (
                <div className="pt-2">
                  <Button
                    type="button"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2"
                    onClick={() =>
                      onApplyVpoToTrip({
                        axles,
                        plazas: effectivePlazas,
                        ratePerAxle,
                        totalVpo,
                      })
                    }
                  >
                    <FileCheck2 className="h-4 w-4" />
                    Aplicar este cálculo na Viagem / CT-e
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumo do Pedágio + Card de Economia Connect */}
        <div className="lg:col-span-5 space-y-5">
          {/* Resultado do VPO */}
          <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-indigo-900 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-indigo-600" />
                  Demonstrativo do Vale Pedágio
                </CardTitle>
                <Badge className="bg-indigo-600 text-white">Obrigatório</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-indigo-100 shadow-sm space-y-2">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Valor Total VPO (Pedágio)
                </div>
                <div className="text-3xl font-extrabold text-indigo-700">
                  {totalVpo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="text-xs text-slate-600 flex items-center gap-1">
                  <span>{effectivePlazas} praças</span>
                  <span>×</span>
                  <span>{axles} eixos</span>
                  <span>×</span>
                  <span>
                    {ratePerAxle.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    /eixo
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-indigo-100/60">
                  <span className="text-slate-500">Custo médio por praça:</span>
                  <span className="font-semibold">
                    {vpoPerPlaza.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-indigo-100/60">
                  <span className="text-slate-500">Frete Líquido Transporte:</span>
                  <span className="font-semibold">
                    {freightValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-indigo-100/60">
                  <span className="text-slate-500">Total do CT-e a Cobrar:</span>
                  <span className="font-bold text-slate-900">
                    {totalWithFreight.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Atenção ANTT:</strong> O VPO não integra o frete para fins de base de
                  cálculo de tributação (Lei 10.209/01), devendo constar destacado no CT-e com seu
                  respectivo código do comprovante.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Calculadora de Economia inspirada no Connect Doc-e */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Simulador de Produtividade AutoCT-e
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[10px]"
                >
                  Modelo Connect
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Baseado na métrica: 20 min/emissão manual vs ~0s no fluxo Connect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-2">
                  <Label htmlFor={ctesPerDayId} className="cursor-pointer">
                    Volume diário de CT-e emitidos:
                  </Label>
                  <span className="font-bold text-emerald-700">{ctesPerDay} CT-e/dia</span>
                </div>
                <Slider
                  value={[ctesPerDay]}
                  min={5}
                  max={150}
                  step={5}
                  onValueChange={(val) => setCtesPerDay(val[0] ?? 25)}
                  className="py-1"
                />
                <div className="flex justify-between text-[11px] text-slate-600 mt-1">
                  <span>5 CT-e/dia</span>
                  <span>50 CT-e/dia</span>
                  <span>150 CT-e/dia</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    Tempo economizado
                  </div>
                  <div className="text-xl font-bold text-slate-800 mt-1">
                    {Math.round(hoursSaved)}h<span className="text-xs text-slate-600">/mês</span>
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Equivale a ~{(hoursSaved / 160 || 0).toFixed(1)} operador(es)
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-600 flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-emerald-500" />
                    Economia estimada
                  </div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">
                    {monthlySavingsBrl.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div className="text-[10px] text-slate-600">Em horas operacionais</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-700">Diferencial Connect:</span> O sistema
                vincula automaticamente o valor do VPO calculado à ordem de frete, preenchendo os
                campos fiscais do CT-e sem digitação manual.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
