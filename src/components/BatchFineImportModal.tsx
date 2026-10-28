import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import type { Vehicle, Driver, TrafficFine } from '@/types/logistics'
import {
  parseFinesImportData,
  generateSampleCsv,
  CANONICAL_COLUMNS,
} from '@/services/finesBatchParser'
import {
  batchCreateTrafficFines,
  type BatchImportSummary,
  type BatchImportFineItem,
} from '@/services/logisticsService'
import { SEVERITY_LABELS, INFRACTION_TYPE_LABELS, STATUS_CONFIG } from '@/pages/FinesPage'
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  HelpCircle,
  Eye,
  RefreshCw,
  Car,
  User,
} from 'lucide-react'

interface BatchFineImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicles: Vehicle[]
  drivers: Driver[]
  existingFines: TrafficFine[]
  onSuccess: () => void
}

export const BatchFineImportModal: React.FC<BatchFineImportModalProps> = ({
  open,
  onOpenChange,
  vehicles,
  drivers,
  existingFines,
  onSuccess,
}) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados principais
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'template'>('upload')
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Dados interpretados
  const [parsedItems, setParsedItems] = useState<BatchImportFineItem[]>([])
  const [headerErrors, setHeaderErrors] = useState<string[]>([])
  const [hasParsed, setHasParsed] = useState(false)
  const [filterPreview, setFilterPreview] = useState<'all' | 'valid' | 'invalid'>('all')

  // Resumo final após importar
  const [importSummary, setImportSummary] = useState<BatchImportSummary | null>(null)

  // Resetar estado ao fechar ou reabrir
  const handleClose = () => {
    if (isImporting) return
    onOpenChange(false)
    // Limpeza após animação
    setTimeout(() => {
      setRawText('')
      setFileName(null)
      setParsedItems([])
      setHeaderErrors([])
      setHasParsed(false)
      setImportSummary(null)
      setFilterPreview('all')
    }, 200)
  }

  // Upload de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setRawText(content)
        processData(content)
      }
    }
    reader.onerror = () => {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível carregar o conteúdo do arquivo CSV.',
        variant: 'destructive',
      })
    }
    reader.readAsText(file, 'utf-8')
  }

  // Processamento / Parser
  const processData = (content: string) => {
    if (!content.trim()) {
      toast({
        title: 'Conteúdo vazio',
        description: 'Envie um arquivo CSV ou cole as linhas com os dados das multas.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    setHeaderErrors([])
    setImportSummary(null)

    try {
      const result = parseFinesImportData(content, vehicles, drivers, existingFines)
      setHeaderErrors(result.headerErrors)
      setParsedItems(result.items)
      setHasParsed(true)

      if (result.headerErrors.length > 0) {
        toast({
          title: 'Erro no cabeçalho do arquivo',
          description: result.headerErrors.join(' '),
          variant: 'destructive',
        })
      } else if (result.items.length === 0) {
        toast({
          title: 'Nenhum registro encontrado',
          description: 'O arquivo contém cabeçalho mas nenhuma linha de dados.',
        })
      } else {
        toast({
          title: 'Linhas interpretadas!',
          description: `${result.validCount} pronta(s) para importação, ${result.invalidCount} inválida(s).`,
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro no processamento',
        description: 'Ocorreu um erro ao interpretar os dados.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Download do arquivo de modelo
  const handleDownloadSample = (delimiter: ';' | ',' = ';') => {
    const csvContent = generateSampleCsv(delimiter)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `modelo_importacao_multas_${delimiter === ';' ? 'pt_br' : 'padrao'}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Copiar modelo para a área de texto
  const handleUseSampleTemplate = () => {
    const csvContent = generateSampleCsv(';')
    // Remove o BOM para colar na textarea
    const cleanContent = csvContent.replace(/^\uFEFF/, '')
    setRawText(cleanContent)
    setActiveTab('paste')
    processData(cleanContent)
  }

  // Confirmação e gravação no banco
  const handleConfirmImport = async () => {
    const validItems = parsedItems.filter((i) => i.isValid && i.vehicle_id)
    if (validItems.length === 0) {
      toast({
        title: 'Nenhum registro válido',
        description: 'Não há multas válidas para importar. Corrija os erros na prévia.',
        variant: 'destructive',
      })
      return
    }

    setIsImporting(true)
    try {
      const payloads = validItems.map((item) => ({
        vehicle_id: item.vehicle_id!,
        driver_id: item.driver_id || undefined,
        infraction_date: item.infraction_date,
        description: item.description,
        location: item.location || undefined,
        infraction_type: item.infraction_type,
        severity: item.severity,
        points: item.points,
        amount: item.amount,
        notice_number: item.notice_number,
        issuing_body: item.issuing_body,
        due_date: item.due_date,
        status: item.status,
        payment_date: item.payment_date || undefined,
        appeal_number: item.appeal_number || undefined,
        notes: item.notes || undefined,
      }))

      const summary = await batchCreateTrafficFines(payloads)
      setImportSummary(summary)

      toast({
        title: 'Importação finalizada!',
        description: `${summary.successCount} multa(s) gravada(s) com sucesso. ${summary.failureCount} falha(s).`,
      })

      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu uma falha ao enviar as multas para o banco.',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Contadores da prévia
  const totalCount = parsedItems.length
  const validCount = parsedItems.filter((i) => i.isValid).length
  const invalidCount = parsedItems.filter((i) => !i.isValid).length
  const warningCount = parsedItems.reduce((acc, i) => acc + i.warnings.length, 0)

  const filteredPreviewItems = parsedItems.filter((item) => {
    if (filterPreview === 'valid') return item.isValid
    if (filterPreview === 'invalid') return !item.isValid
    return true
  })

  // Encontrar veículo e motorista para exibição bonita na prévia
  const getVehicleLabel = (item: BatchImportFineItem) => {
    if (!item.vehicle_id) {
      return (
        <span className="text-rose-600 font-mono text-[11px] flex items-center gap-1 font-semibold">
          <XCircle className="h-3 w-3" />
          {item.plateInput || 'Não informada'} (não cadastrado)
        </span>
      )
    }
    const v = vehicles.find((veh) => veh.id === item.vehicle_id)
    return (
      <div className="flex items-center gap-1 text-xs">
        <Car className="h-3 w-3 text-slate-400" />
        <span className="font-mono font-semibold bg-slate-100 px-1 py-0.5 rounded text-[11px]">
          {v?.plate || item.plateInput}
        </span>
        <span className="text-slate-500 text-[11px] truncate max-w-[100px]">{v?.model}</span>
      </div>
    )
  }

  const getDriverLabel = (item: BatchImportFineItem) => {
    if (item.driver_id) {
      const d = drivers.find((drv) => drv.id === item.driver_id)
      return (
        <div className="flex items-center gap-1 text-xs text-slate-700">
          <User className="h-3 w-3 text-emerald-600" />
          <span className="truncate max-w-[120px]">{d?.name}</span>
        </div>
      )
    }
    if (item.driverInput) {
      return (
        <span className="text-amber-700 text-[11px] truncate max-w-[120px]" title="Não cadastrado">
          {item.driverInput} (sem cadastro)
        </span>
      )
    }
    return <span className="text-slate-400 text-xs italic">Não informado</span>
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            Importação de Multas em Lote
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Cadastre múltiplas autuações de uma só vez via arquivo CSV ou colando texto tabulado.
            Você verá uma prévia completa antes de salvar.
          </DialogDescription>
        </DialogHeader>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Se a importação acabou de ser concluída, mostrar tela de sucesso/resumo */}
          {importSummary ? (
            <div className="space-y-4 py-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-emerald-950">
                  Importação de Multas Concluída!
                </h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Foram processadas {importSummary.totalRows} autuações da lista.
                </p>
                <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> {importSummary.successCount} gravada(s)
                  </span>
                  {importSummary.failureCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-semibold">
                      <XCircle className="h-4 w-4" /> {importSummary.failureCount} com falha
                    </span>
                  )}
                </div>
              </div>

              {/* Lista detalhada dos que falharam, se houver */}
              {importSummary.failureCount > 0 && (
                <div className="border border-rose-200 bg-rose-50/50 rounded-lg p-4">
                  <h4 className="text-xs font-bold uppercase text-rose-900 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Registros que não puderam ser gravados:
                  </h4>
                  <ul className="text-xs text-rose-800 space-y-1">
                    {importSummary.results
                      .filter((r) => r.status === 'error')
                      .map((r, idx) => (
                        <li key={idx} className="font-mono">
                          Auto <strong>{r.notice_number}</strong>: {r.message}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="text-center pt-2">
                <Button
                  onClick={handleClose}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Fechar e Visualizar Multas
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Abas de Entrada: Upload vs Colar vs Modelo */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'upload' | 'paste' | 'template')}
                className="w-full"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <TabsList className="bg-slate-100">
                    <TabsTrigger value="upload" className="gap-1.5 text-xs">
                      <Upload className="h-3.5 w-3.5" />
                      Enviar Arquivo CSV
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5" />
                      Colar Linhas de Texto
                    </TabsTrigger>
                    <TabsTrigger value="template" className="gap-1.5 text-xs">
                      <HelpCircle className="h-3.5 w-3.5" />
                      Modelo & Colunas
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadSample(';')}
                      className="h-8 text-xs gap-1.5 text-slate-700"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                      Baixar Modelo CSV (Brasil ;)
                    </Button>
                  </div>
                </div>

                {/* ABA 1: UPLOAD ARQUIVO */}
                <TabsContent value="upload" className="pt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-xl p-6 text-center cursor-pointer transition-colors"
                  >
                    <Upload className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-800">
                      Clique para selecionar ou arraste o arquivo CSV
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Separadores aceitos: ponto-e-vírgula (;) ou vírgula (,). Codificação UTF-8.
                    </p>
                    {fileName && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Arquivo: {fileName}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ABA 2: COLAR TEXTO */}
                <TabsContent value="paste" className="pt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Cole abaixo as linhas do CSV (incluindo o cabeçalho):
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleUseSampleTemplate}
                        className="h-6 text-[11px] text-indigo-600 hover:text-indigo-800"
                      >
                        Preencher com exemplo
                      </Button>
                    </div>
                    <Textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Placa;Auto de Infracao;Motorista;Orgao Autuador;Tipo;Gravidade;Pontos;Valor;Data da Infracao;Vencimento;Descricao;Local&#10;BRA2E19;DER-SP-991201;Carlos Eduardo;DER-SP;Excesso de Velocidade;Media;4;130,16;10/03/2025;10/04/2025;Velocidade ate 20%;SP-330 Km 84"
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => processData(rawText)}
                      disabled={!rawText.trim() || isProcessing}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      Processar e Visualizar Prévia
                    </Button>
                  </div>
                </TabsContent>

                {/* ABA 3: MODELO E COLUNAS */}
                <TabsContent value="template" className="pt-3 space-y-3">
                  <div className="bg-slate-50 border rounded-lg p-4 space-y-2 text-xs">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-indigo-600" />
                      Colunas suportadas pelo Importador
                    </h4>
                    <p className="text-slate-600">
                      O importador é tolerante a variações de acentuação e maiúsculas/minúsculas nos
                      cabeçalhos. Abaixo as colunas esperadas:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {CANONICAL_COLUMNS.map((col) => (
                        <div key={col.key} className="p-2 border rounded bg-white">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">
                              {col.label}{' '}
                              {col.required && <strong className="text-rose-600">*</strong>}
                            </span>
                            <Badge
                              variant={col.required ? 'default' : 'outline'}
                              className="text-[10px]"
                            >
                              {col.required ? 'Obrigatório' : 'Opcional'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Exemplo:{' '}
                            <span className="font-mono text-slate-700">{col.example || '—'}</span>
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleDownloadSample(';')}
                        className="text-xs bg-slate-800 hover:bg-slate-900 text-white gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Baixar arquivo modelo (.CSV)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUseSampleTemplate}
                        className="text-xs text-indigo-600 gap-1"
                      >
                        Carregar exemplo na aba Colar
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Erros de Cabeçalho */}
              {headerErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Problema identificado no cabeçalho:
                  </div>
                  <ul className="list-disc list-inside">
                    {headerErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-rose-700 pt-1">
                    Certifique-se de incluir as colunas obrigatórias <strong>Placa</strong> e{' '}
                    <strong>Auto de Infração</strong> na primeira linha do arquivo.
                  </p>
                </div>
              )}

              {/* SEÇÃO DA PRÉVIA (OBRIGATÓRIO) */}
              {hasParsed && parsedItems.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  {/* Barra de Status e Filtro da Prévia */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-600">
                        Total de linhas: <strong>{totalCount}</strong>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {validCount} Válidas
                      </Badge>
                      {invalidCount > 0 && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          {invalidCount} Inválidas (não serão salvas)
                        </Badge>
                      )}
                      {warningCount > 0 && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {warningCount} Aviso(s)
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500">Filtrar tabela:</span>
                      <Button
                        type="button"
                        variant={filterPreview === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterPreview('all')}
                        className="h-7 text-xs px-2"
                      >
                        Todas ({totalCount})
                      </Button>
                      <Button
                        type="button"
                        variant={filterPreview === 'valid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterPreview('valid')}
                        className="h-7 text-xs px-2 text-emerald-700"
                      >
                        Apenas Válidas ({validCount})
                      </Button>
                      <Button
                        type="button"
                        variant={filterPreview === 'invalid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterPreview('invalid')}
                        className="h-7 text-xs px-2 text-rose-700"
                      >
                        Com Erros ({invalidCount})
                      </Button>
                    </div>
                  </div>

                  {/* Tabela de Prévia */}
                  <div className="border rounded-lg overflow-hidden max-h-[340px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="w-12 text-center">Linha</TableHead>
                          <TableHead className="w-20">Status</TableHead>
                          <TableHead>Auto / Órgão</TableHead>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Motorista</TableHead>
                          <TableHead>Infração & Gravidade</TableHead>
                          <TableHead>Pontos / Valor</TableHead>
                          <TableHead>Datas</TableHead>
                          <TableHead className="w-48">Avisos / Erros</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPreviewItems.map((item) => {
                          const severityConf =
                            SEVERITY_LABELS[item.severity] || SEVERITY_LABELS.medium
                          const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending

                          return (
                            <TableRow
                              key={item.lineNumber}
                              className={
                                item.isValid
                                  ? item.warnings.length > 0
                                    ? 'bg-amber-50/30'
                                    : 'hover:bg-slate-50/50'
                                  : 'bg-rose-50/40 hover:bg-rose-50/60'
                              }
                            >
                              <TableCell className="text-center font-mono text-xs text-slate-500">
                                {item.lineNumber}
                              </TableCell>

                              {/* Válida ou Inválida */}
                              <TableCell>
                                {item.isValid ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1.5 py-0">
                                    Válida
                                  </Badge>
                                ) : (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] px-1.5 py-0">
                                    Inválida
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Auto e Órgão */}
                              <TableCell>
                                <div className="font-mono font-bold text-xs text-slate-900">
                                  {item.notice_number || '—'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {item.issuing_body}
                                </div>
                              </TableCell>

                              {/* Veículo */}
                              <TableCell>{getVehicleLabel(item)}</TableCell>

                              {/* Motorista */}
                              <TableCell>{getDriverLabel(item)}</TableCell>

                              {/* Infração e Gravidade */}
                              <TableCell>
                                <div className="text-xs font-medium text-slate-800 truncate max-w-[140px]">
                                  {INFRACTION_TYPE_LABELS[item.infraction_type] ||
                                    item.infraction_type}
                                </div>
                                <div className="mt-0.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 ${severityConf.badgeClass}`}
                                  >
                                    {severityConf.label}
                                  </Badge>
                                </div>
                              </TableCell>

                              {/* Pontos / Valor */}
                              <TableCell>
                                <div className="text-xs font-bold text-slate-900">
                                  {item.amount.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {item.points} pontos
                                </div>
                              </TableCell>

                              {/* Datas */}
                              <TableCell>
                                <div className="text-[11px] text-slate-700">
                                  Infração:{' '}
                                  <strong>
                                    {new Date(item.infraction_date).toLocaleDateString('pt-BR')}
                                  </strong>
                                </div>
                                <div className="text-[11px] text-slate-700">
                                  Vencimento:{' '}
                                  <strong>
                                    {new Date(item.due_date).toLocaleDateString('pt-BR')}
                                  </strong>
                                </div>
                              </TableCell>

                              {/* Erros e Avisos */}
                              <TableCell>
                                <div className="space-y-1 max-w-[220px]">
                                  {item.errors.map((err, idx) => (
                                    <div
                                      key={idx}
                                      className="text-[11px] text-rose-700 flex items-start gap-1 font-medium leading-tight"
                                    >
                                      <XCircle className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
                                      <span>{err}</span>
                                    </div>
                                  ))}
                                  {item.warnings.map((warn, idx) => (
                                    <div
                                      key={idx}
                                      className="text-[10px] text-amber-700 flex items-start gap-1 leading-tight"
                                    >
                                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                      <span>{warn}</span>
                                    </div>
                                  ))}
                                  {item.errors.length === 0 && item.warnings.length === 0 && (
                                    <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" /> Todos os dados validados
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé do Modal */}
        <DialogFooter className="border-t pt-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            {hasParsed && !importSummary && (
              <span>
                Serão importadas <strong>{validCount}</strong> autuações válidas. As{' '}
                <strong>{invalidCount}</strong> inválidas serão ignoradas.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
              className="text-xs"
            >
              {importSummary ? 'Fechar' : 'Cancelar'}
            </Button>

            {!importSummary && (
              <Button
                type="button"
                onClick={handleConfirmImport}
                disabled={validCount === 0 || isImporting || !hasParsed}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Gravando {validCount} multa(s)...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Confirmar Importação ({validCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
