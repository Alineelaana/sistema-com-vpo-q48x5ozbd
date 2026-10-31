// src/pages/MinimumFloorAdminPage.tsx
/**
 * Tela de Administração do Piso Mínimo ANTT
 * Gerenciamento de tabelas e coeficientes oficiais versionados
 * Lei nº 13.703/2018 e Resoluções ANTT nº 5.867/2020 e 6.059/2024
 */

import { useState, useEffect } from 'react'
import {
  Scale,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  Truck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { MINIMUM_FLOOR_ADMIN_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import {
  getFloorTables,
  setFloorTableCurrent,
  importFloorTable,
  FloorTableRecord,
  FloorCoefficientItem,
} from '@/services/minimumFloorService'

export function MinimumFloorAdminPage() {
  const { toast } = useToast()
  const [tables, setTables] = useState<FloorTableRecord[]>([])
  const [selectedTable, setSelectedTable] = useState<FloorTableRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSettingCurrent, setIsSettingCurrent] = useState(false)
  const [isLogicModalOpen, setIsLogicModalOpen] = useState(false)

  // Filtros de visualização dos coeficientes
  const [filterTableType, setFilterTableType] = useState<string>('all')
  const [filterCargoCategory, setFilterCargoCategory] = useState<string>('all')
  const [filterAxles, setFilterAxles] = useState<string>('all')

  // Modal de importação / nova versão
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importForm, setImportForm] = useState({
    version_code: '',
    name: '',
    legal_act: '',
    source_url: '',
    effective_from: new Date().toISOString().split('T')[0],
    is_current: false,
    validation_status: 'aguardando_validacao_oficial' as const,
    diesel_reference_price: '5.94',
    ipca_accumulated_percent: '2.84',
    notes: '',
  })

  // Carregar dados
  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await getFloorTables()
      setTables(res.tables)
      if (res.tables.length > 0) {
        setSelectedTable((prev) => {
          if (!prev) return res.current_version || res.tables[0]
          const found = res.tables.find((t) => t.id === prev.id)
          return found || res.current_version || res.tables[0]
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar tabelas de piso mínimo',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Definir versão como vigente
  const handleSetCurrent = async (tableId: string) => {
    setIsSettingCurrent(true)
    try {
      const res = await setFloorTableCurrent(tableId)
      toast({
        title: 'Tabela Vigente Atualizada',
        description: res.message,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao ativar versão',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSettingCurrent(false)
    }
  }

  // Importar / Cadastrar Nova Versão
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importForm.version_code || !importForm.name || !importForm.legal_act) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Código da versão, nome e ato legal são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setIsImporting(true)
    try {
      // Clonar coeficientes da tabela selecionada como base para nova versão
      const baseCoefficients: FloorCoefficientItem[] = (selectedTable?.coefficients || []).map(
        (c) => ({
          table_type: c.table_type,
          cargo_category: c.cargo_category,
          cargo_category_label: c.cargo_category_label,
          axles: c.axles,
          ccd_cost_per_km: c.ccd_cost_per_km,
          cc_loading_unloading: c.cc_loading_unloading,
        }),
      )

      const res = await importFloorTable({
        version_code: importForm.version_code.trim(),
        name: importForm.name.trim(),
        legal_act: importForm.legal_act.trim(),
        source_url: importForm.source_url.trim(),
        effective_from: new Date(importForm.effective_from).toISOString(),
        is_current: importForm.is_current,
        validation_status: importForm.validation_status,
        diesel_reference_price: Number(importForm.diesel_reference_price) || 0,
        ipca_accumulated_percent: Number(importForm.ipca_accumulated_percent) || 0,
        notes: importForm.notes,
        coefficients: baseCoefficients,
      })

      toast({
        title: 'Nova Versão Cadastrada!',
        description: res.message,
      })
      setIsImportModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao importar versão',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Filtragem de coeficientes
  const filteredCoefficients = (selectedTable?.coefficients || []).filter((c) => {
    if (filterTableType !== 'all' && c.table_type !== filterTableType) return false
    if (filterCargoCategory !== 'all' && c.cargo_category !== filterCargoCategory) return false
    if (filterAxles !== 'all' && String(c.axles) !== filterAxles) return false
    return true
  })

  // Categorias únicas presentes nos coeficientes da tabela selecionada
  const uniqueCategories = Array.from(
    new Set((selectedTable?.coefficients || []).map((c) => c.cargo_category)),
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Tela */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
              TMS Passo 3 • Motor do Piso Mínimo
            </Badge>
            <Badge variant="outline" className="text-zinc-400">
              Lei nº 13.703/2018
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Scale className="h-7 w-7 text-cyan-400" />
            Piso Mínimo ANTT — Tabelas Oficiais Versionadas
          </h1>
          <p className="text-sm text-zinc-400">
            Base oficial de coeficientes de custo de deslocamento (CCD) e carga/descarga (CC) por
            tipo de carga e configuração de eixos, com histórico auditado de vigência.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsLogicModalOpen(true)}
            className="text-xs font-semibold gap-1.5 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Lógica da Tela
          </Button>
          <ScreenLogicModal
            open={isLogicModalOpen}
            onClose={() => setIsLogicModalOpen(false)}
            doc={MINIMUM_FLOOR_ADMIN_SCREEN_LOGIC_DOC}
          />
          <Button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/50 flex items-center gap-2 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            Importar / Nova Versão
          </Button>
          <Button
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Conteúdo em Abas */}
      <Tabs defaultValue="tables" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
          <TabsTrigger value="tables" className="data-[state=active]:bg-zinc-800 text-zinc-300">
            <Layers className="h-4 w-4 mr-2 text-cyan-400" />
            Tabelas & Versões
          </TabsTrigger>
          <TabsTrigger
            value="coefficients"
            className="data-[state=active]:bg-zinc-800 text-zinc-300"
          >
            <Scale className="h-4 w-4 mr-2 text-emerald-400" />
            Coeficientes CCD & CC ({selectedTable?.version_code || 'Selecione'})
          </TabsTrigger>
          <TabsTrigger value="regulation" className="data-[state=active]:bg-zinc-800 text-zinc-300">
            <FileText className="h-4 w-4 mr-2 text-amber-400" />
            Metodologia & Marco Legal
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: Tabelas & Versões */}
        <TabsContent value="tables" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna da Esquerda: Lista de Versões */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                <span>Versões Registradas</span>
                <Badge variant="outline" className="text-zinc-400 text-xs">
                  {tables.length}
                </Badge>
              </h3>

              <div className="space-y-2.5">
                {tables.map((tab) => {
                  const isSelected = selectedTable?.id === tab.id
                  const isCurrent = tab.is_current
                  const isOfficial = tab.validation_status === 'oficial_validada'

                  return (
                    <div
                      key={tab.id}
                      onClick={() => setSelectedTable(tab)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/30 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-cyan-300 font-mono">
                          {tab.version_code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                              Vigente
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              isOfficial
                                ? 'text-emerald-400 border-emerald-500/30'
                                : 'text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {isOfficial ? 'Oficial Validada' : 'Aguardando Validação'}
                          </Badge>
                        </div>
                      </div>

                      <div className="text-xs font-medium text-zinc-200 line-clamp-1 mb-1">
                        {tab.name}
                      </div>

                      <div className="text-[11px] text-zinc-400 line-clamp-2 mb-2">
                        {tab.legal_act}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                        <span>
                          Vigência: {new Date(tab.effective_from).toLocaleDateString('pt-BR')}
                        </span>
                        <span>{tab.coefficients_count || 0} coeficientes</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Painel Central e Direita: Detalhes da Versão Selecionada */}
            {selectedTable ? (
              <div className="lg:col-span-2 space-y-5">
                <Card className="border-zinc-800 bg-zinc-900/60">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-xl font-bold text-white font-mono">
                            {selectedTable.version_code}
                          </h2>
                          {selectedTable.is_current ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              Tabela Vigente no Motor
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-zinc-400">
                              Versão Histórica
                            </Badge>
                          )}
                          <Badge
                            className={`text-[10px] ${
                              selectedTable.validation_status === 'oficial_validada'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {selectedTable.validation_status === 'oficial_validada'
                              ? 'Fonte Oficial Homologada'
                              : 'Aguardando Validação Oficial'}
                          </Badge>
                        </div>
                        <CardTitle className="text-base text-zinc-200 font-semibold">
                          {selectedTable.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-zinc-400 mt-1">
                          {selectedTable.legal_act}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2">
                        {!selectedTable.is_current && (
                          <Button
                            size="sm"
                            onClick={() => handleSetCurrent(selectedTable.id)}
                            disabled={isSettingCurrent}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            Definir como Vigente
                          </Button>
                        )}
                        {selectedTable.source_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                          >
                            <a
                              href={selectedTable.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              DOU / ANTTlegis
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-2 space-y-4">
                    {/* Metadados Técnicos */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80 text-xs">
                      <div>
                        <span className="text-zinc-500 block text-[11px]">
                          Vigência a partir de:
                        </span>
                        <strong className="text-zinc-200 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                          {new Date(selectedTable.effective_from).toLocaleDateString('pt-BR')}
                        </strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[11px]">
                          Diesel de Referência:
                        </span>
                        <strong className="text-zinc-200 block mt-0.5">
                          R$ {Number(selectedTable.diesel_reference_price || 0).toFixed(2)} / litro
                        </strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[11px]">IPCA Acumulado:</span>
                        <strong className="text-zinc-200 block mt-0.5">
                          {selectedTable.ipca_accumulated_percent || 0}%
                        </strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[11px]">Importado Por:</span>
                        <strong className="text-zinc-200 block mt-0.5">
                          {selectedTable.imported_by || 'Sistema'}
                        </strong>
                      </div>
                    </div>

                    {/* Observações da Versão */}
                    {selectedTable.notes && (
                      <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60 text-xs">
                        <span className="text-zinc-400 font-semibold block mb-1">
                          Observações & Fundamentação:
                        </span>
                        <p className="text-zinc-300 text-[11px] leading-relaxed">
                          {selectedTable.notes}
                        </p>
                      </div>
                    )}

                    {/* Alerta de Honestidade de Integração */}
                    <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-3 text-xs flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold text-amber-300 block">
                          Salvaguarda de Transparência Fiscal:
                        </span>
                        <p className="text-amber-200/80 text-[11px] leading-relaxed">
                          Não existe API pública oficial da ANTT que processe cálculos de frete em
                          tempo real; o cálculo é executado internamente pela fórmula oficial da
                          ANTT sobre coeficientes versionados. Antes do uso fiscal definitivo
                          perante órgãos fiscalizadores, valide se a resolução vigente na ANTT
                          sofreu atualização extraordinária pelo gatilho do diesel (+5%).
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* ABA 2: Coeficientes CCD & CC */}
        <TabsContent value="coefficients" className="space-y-5 mt-4">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="p-5 pb-3 border-b border-zinc-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <Scale className="h-5 w-5 text-cyan-400" />
                    Coeficientes Oficiais — Versão {selectedTable?.version_code}
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Fórmula oficial: <code>Frete Mínimo = (Distância × CCD) + CC</code> (+ Retorno
                    Vazio se aplicável).
                  </CardDescription>
                </div>

                {/* Filtros rápidos */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={filterTableType} onValueChange={setFilterTableType}>
                    <SelectTrigger className="w-[180px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                      <SelectValue placeholder="Tipo de Tabela" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="all">Todas as Tabelas</SelectItem>
                      <SelectItem value="tabela_a">Tabela A - Lotação</SelectItem>
                      <SelectItem value="tabela_b">Tabela B - Apenas Tração</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterCargoCategory} onValueChange={setFilterCargoCategory}>
                    <SelectTrigger className="w-[190px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                      <SelectValue placeholder="Categoria Carga" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="all">Todas as Categorias</SelectItem>
                      {uniqueCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace(/_/g, ' ').toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterAxles} onValueChange={setFilterAxles}>
                    <SelectTrigger className="w-[120px] h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-300">
                      <SelectValue placeholder="Eixos" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="all">Todos Eixos</SelectItem>
                      <SelectItem value="2">2 eixos</SelectItem>
                      <SelectItem value="3">3 eixos</SelectItem>
                      <SelectItem value="4">4 eixos</SelectItem>
                      <SelectItem value="5">5 eixos</SelectItem>
                      <SelectItem value="6">6 eixos</SelectItem>
                      <SelectItem value="7">7 eixos</SelectItem>
                      <SelectItem value="9">9 eixos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase sticky top-0 border-b border-zinc-800">
                    <tr>
                      <th className="p-3 pl-5">Tabela</th>
                      <th className="p-3">Categoria de Carga</th>
                      <th className="p-3 text-center">Eixos</th>
                      <th className="p-3 text-right">CCD (R$/km)</th>
                      <th className="p-3 text-right">CC Carga/Descarga (R$)</th>
                      <th className="p-3 text-right pr-5">Exemplo 500 km</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredCoefficients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                          Nenhum coeficiente encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredCoefficients.map((coef) => {
                        const sampleFloor = Number(
                          (500 * coef.ccd_cost_per_km + coef.cc_loading_unloading).toFixed(2),
                        )
                        return (
                          <tr key={coef.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="p-3 pl-5 font-mono text-zinc-300">
                              <Badge variant="outline" className="text-[10px] text-zinc-400">
                                {coef.table_type === 'tabela_b'
                                  ? 'Tabela B (Cavalo)'
                                  : 'Tabela A (Lotação)'}
                              </Badge>
                            </td>
                            <td className="p-3 font-semibold text-zinc-200">
                              {coef.cargo_category_label}
                            </td>
                            <td className="p-3 text-center font-bold text-cyan-400">
                              {coef.axles}
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-400">
                              R$ {Number(coef.ccd_cost_per_km).toFixed(4)}
                            </td>
                            <td className="p-3 text-right font-mono text-amber-400">
                              R$ {Number(coef.cc_loading_unloading).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-white pr-5">
                              R$ {sampleFloor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: Metodologia & Marco Legal */}
        <TabsContent value="regulation" className="space-y-4 mt-4">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                Marco Regulatório do Piso Mínimo do Frete (ANTT)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2 text-xs space-y-4 text-zinc-300 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-950/60 p-4 rounded-lg border border-zinc-800 space-y-2">
                  <h4 className="font-bold text-zinc-100 flex items-center gap-2 text-sm">
                    <Scale className="h-4 w-4 text-cyan-400" />
                    Lei nº 13.703/2018
                  </h4>
                  <p className="text-zinc-400 text-[11px]">
                    Institui a Política Nacional de Pisos Mínimos do Transporte Rodoviário de
                    Cargas. Determina a fixação de pisos mínimos semestrais e reajuste obrigatório
                    pelo gatilho do diesel sempre que a oscilação do preço de referência superar 5%.
                  </p>
                  <div className="p-2 bg-zinc-900 rounded border border-zinc-800 text-[10px] text-zinc-400">
                    <strong>Regra de ouro:</strong> A política vincula contratações de frete de
                    terceiros (TAC e ETC). Transporte de carga própria em veículo próprio ou
                    comodato é dispensado da tabela de pisos mínimos (art. 3º).
                  </div>
                </div>

                <div className="bg-zinc-950/60 p-4 rounded-lg border border-zinc-800 space-y-2">
                  <h4 className="font-bold text-zinc-100 flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-emerald-400" />
                    Resoluções ANTT nº 5.867/2020 e 6.059/2024
                  </h4>
                  <p className="text-zinc-400 text-[11px]">
                    Estabelece a metodologia de cálculo: Coeficiente de Custo de Deslocamento (CCD
                    em R$/km) e Coeficiente de Custo de Carga e Descarga (CC em R$), estruturados em
                    12 categorias de carga e configurações veiculares de 2 a 9 eixos.
                  </p>
                  <div className="p-2 bg-zinc-900 rounded border border-zinc-800 text-[10px] text-zinc-400">
                    <strong>Regra do Retorno Vazio (art. 10):</strong> Em cargas dedicadas com
                    retorno vazio obrigatório, o CCD de ida é aplicado também ao percurso de
                    retorno.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Importar / Nova Versão */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-zinc-200">
          <form onSubmit={handleImportSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyan-400" />
                Cadastrar Nova Versão de Tabela ANTT
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Cadastre uma nova resolução oficial ou portaria de reajuste do piso mínimo. Os
                coeficientes serão clonados da tabela atual como modelo inicial para posterior
                conferência.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-300 text-xs">Código da Versão *</Label>
                  <Input
                    value={importForm.version_code}
                    onChange={(e) => setImportForm({ ...importForm, version_code: e.target.value })}
                    placeholder="Ex: ANTT-2025.2"
                    required
                    className="bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-300 text-xs">Data de Vigência *</Label>
                  <Input
                    type="date"
                    value={importForm.effective_from}
                    onChange={(e) =>
                      setImportForm({ ...importForm, effective_from: e.target.value })
                    }
                    required
                    className="bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-300 text-xs">Nome Descritivo *</Label>
                <Input
                  value={importForm.name}
                  onChange={(e) => setImportForm({ ...importForm, name: e.target.value })}
                  placeholder="Ex: Tabela ANTT 2025.2 — Reajuste Gatilho Diesel"
                  required
                  className="bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-300 text-xs">Ato Legal / Resolução *</Label>
                <Input
                  value={importForm.legal_act}
                  onChange={(e) => setImportForm({ ...importForm, legal_act: e.target.value })}
                  placeholder="Ex: Resolução ANTT nº 6.067, de 25 de junho de 2025"
                  required
                  className="bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-300 text-xs">
                  Link da Fonte Oficial (DOU / ANTTlegis)
                </Label>
                <Input
                  value={importForm.source_url}
                  onChange={(e) => setImportForm({ ...importForm, source_url: e.target.value })}
                  placeholder="https://anttlegis.antt.gov.br/..."
                  className="bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-300 text-xs">Preço Diesel Referência (R$/L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={importForm.diesel_reference_price}
                    onChange={(e) =>
                      setImportForm({ ...importForm, diesel_reference_price: e.target.value })
                    }
                    className="bg-zinc-900 border-zinc-800 text-white text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-300 text-xs">Status da Validação</Label>
                  <Select
                    value={importForm.validation_status}
                    onValueChange={(val: any) =>
                      setImportForm({ ...importForm, validation_status: val })
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="aguardando_validacao_oficial">
                        Aguardando Validação Oficial
                      </SelectItem>
                      <SelectItem value="oficial_validada">Oficial Homologada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-300 text-xs">Observações</Label>
                <Textarea
                  value={importForm.notes}
                  onChange={(e) => setImportForm({ ...importForm, notes: e.target.value })}
                  placeholder="Justificativa do reajuste, percentual aplicado ou fonte..."
                  className="bg-zinc-900 border-zinc-800 text-white text-xs"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-current"
                  checked={importForm.is_current}
                  onChange={(e) => setImportForm({ ...importForm, is_current: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-900 text-cyan-600 focus:ring-cyan-500"
                />
                <label htmlFor="chk-current" className="text-zinc-300 text-xs cursor-pointer">
                  Definir imediatamente esta versão como a <strong>vigente</strong> no sistema
                </label>
              </div>
            </div>

            <DialogFooter className="border-t border-zinc-800 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsImportModalOpen(false)}
                className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isImporting}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                {isImporting ? 'Salvando...' : 'Salvar Versão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
