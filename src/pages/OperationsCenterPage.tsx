import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Truck,
  UserCheck,
  MapPin,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Send,
  Zap,
  Building,
  Radio,
  FileCheck2,
  Lock,
  AlertTriangle,
  AlertCircle,
  Compass,
  Scale,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { OPERATIONS_CENTER_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import { useToast } from '@/hooks/use-toast'
import {
  advanceOperationStage,
  createOperationFromNfe,
  getConnectorsStatus,
  getTransportOrders,
} from '@/services/operationService'
import { getReceivedFiscalDocuments } from '@/services/cargoAgentService'
import { calculateMinimumFloor, regularizeMinimumFloor } from '@/services/minimumFloorService'
import {
  ConnectorContract,
  Trip,
  TripWorkflowStages,
  WorkflowStageInfo,
  WorkflowStageStatus,
} from '@/types/logistics'
import { ReceivedFiscalDocument } from '@/types/cargoAgent'

interface StageDef {
  key: keyof TripWorkflowStages
  title: string
  shortLabel: string
  icon: React.ElementType
  description: string
  actionLabel?: string
  responsible: string
}

const WORKFLOW_SEQUENCE: StageDef[] = [
  {
    key: 'nfe',
    title: '1. NF-e Recebida',
    shortLabel: 'NF-e',
    icon: FileText,
    description: 'XML recebido da NF-e, emitente, destinatário, mercadoria e valor.',
    responsible: 'Agente de E-mails e Cargas',
  },
  {
    key: 'ordem',
    title: '2. Ordem de Transporte',
    shortLabel: 'Ordem',
    icon: FileCheck2,
    description: 'Instanciação da Ordem central no TMS com número de operação.',
    responsible: 'Expedição TMS',
  },
  {
    key: 'veiculo_motorista',
    title: '3. Veículo & Motorista',
    shortLabel: 'Alocação',
    icon: Truck,
    description: 'Cavalo, semirreboque, placas, eixos e prontuário do condutor.',
    responsible: 'Gestão de Tráfego',
  },
  {
    key: 'roteirizacao',
    title: '4. Roteirização',
    shortLabel: 'Rota',
    icon: MapPin,
    description: 'Trajeto rodoviário, distância, pedágios mapeados e restrições.',
    responsible: 'Roteirizador Connect',
  },
  {
    key: 'piso_minimo',
    title: '5. Piso Mínimo ANTT',
    shortLabel: 'Piso ANTT',
    icon: ShieldCheck,
    description: 'Cálculo de conformidade com a Resolução ANTT nº 5.867/2019.',
    responsible: 'Módulo de Regulação',
  },
  {
    key: 'cte',
    title: '6. Emissão de CT-e',
    shortLabel: 'CT-e SEFAZ',
    icon: FileText,
    description: 'Conhecimento de Transporte modelo 57 transmitido à SEFAZ.',
    responsible: 'Agente Fiscal (Nuvem Fiscal)',
  },
  {
    key: 'contrato',
    title: '7. Contrato / CTRB',
    shortLabel: 'Contrato',
    icon: FileCheck2,
    description: 'Termo de frete e contrato com transportador/TAC contratado.',
    responsible: 'Jurídico & Faturamento',
  },
  {
    key: 'ciot',
    title: '8. Registro CIOT',
    shortLabel: 'CIOT ANTT',
    icon: Lock,
    description: 'Código Identificador da Operação perante IPEF habilitada.',
    responsible: 'Integração ANTT / IPEF',
  },
  {
    key: 'vpo',
    title: '9. VPO & TAG',
    shortLabel: 'Vale-Pedágio',
    icon: CreditCard,
    description: 'Vale-Pedágio Obrigatório Lei 10.209/01 carregado na TAG.',
    responsible: 'Operadora de TAG (SemParar/Repom)',
  },
  {
    key: 'mdfe',
    title: '10. Emissão de MDF-e',
    shortLabel: 'MDF-e',
    icon: FileText,
    description: 'Manifesto Eletrônico modelo 58 agrupando CT-es autorizados.',
    responsible: 'Agente Fiscal SEFAZ',
  },
  {
    key: 'envio',
    title: '11. Envio Documentos',
    shortLabel: 'Envio Doc',
    icon: Send,
    description: 'Despacho automatizado aos contatos (Etapa 4 do Agente).',
    responsible: 'Agente de Despacho',
  },
  {
    key: 'liberacao',
    title: '12. Liberação da Viagem',
    shortLabel: 'Liberação',
    icon: CheckCircle2,
    description: 'Aprovação final para carregamento e trânsito rodoviário.',
    responsible: 'Torre de Controle',
  },
]

export function OperationsCenterPage() {
  const { toast } = useToast()
  const navigate = useNavigate()

  // Estados principais
  const [orders, setOrders] = useState<Trip[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Trip | null>(null)
  const [connectors, setConnectors] = useState<ConnectorContract[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingStage, setIsProcessingStage] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal de Detalhes da Etapa
  const [selectedStageKey, setSelectedStageKey] = useState<keyof TripWorkflowStages | null>(null)

  // Estados específicos do Piso Mínimo ANTT
  const [isCalculatingFloor, setIsCalculatingFloor] = useState(false)
  const [isRegularizingFloor, setIsRegularizingFloor] = useState(false)
  const [regularizeActionType, setRegularizeActionType] = useState<
    'adjust_freight' | 'legal_justification'
  >('adjust_freight')
  const [adjustedFreightInput, setAdjustedFreightInput] = useState('')
  const [legalJustificationInput, setLegalJustificationInput] = useState('')

  // Modal de Criar Ordem a partir de NF-e
  const [isNfeModalOpen, setIsNfeModalOpen] = useState(false)
  const [pendingNfes, setPendingNfes] = useState<ReceivedFiscalDocument[]>([])
  const [isLoadingNfes, setIsLoadingNfes] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)

  // Modal da Lógica da Tela
  const [isLogicModalOpen, setIsLogicModalOpen] = useState(false)

  // Carregar Ordens e Conectores
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [ordersRes, connectorsRes] = await Promise.all([
        getTransportOrders(),
        getConnectorsStatus().catch(() => ({
          success: false,
          connectors: [],
          summary: { total: 0, configured: 0, waiting_config: 0, in_progress: 0 },
        })),
      ])

      setOrders(ordersRes.items)
      if (ordersRes.items.length > 0) {
        // Manter a ordem selecionada ou pegar a primeira
        setSelectedOrder((prev) => {
          if (!prev) return ordersRes.items[0]
          const found = ordersRes.items.find((o) => o.id === prev.id)
          return found || ordersRes.items[0]
        })
      }
      setConnectors(connectorsRes.connectors || [])
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados operacionais',
        description: err.message || 'Falha de comunicação.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Carregar NF-es recebidas para a modal de nova ordem
  const handleOpenNfeModal = async () => {
    setIsNfeModalOpen(true)
    setIsLoadingNfes(true)
    try {
      const nfes = await getReceivedFiscalDocuments()
      setPendingNfes(nfes)
    } catch (err: any) {
      toast({
        title: 'Erro ao listar NF-es',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoadingNfes(false)
    }
  }

  // Criar ordem a partir de uma NF-e
  const handleCreateFromNfe = async (docId: string) => {
    setIsCreatingOrder(true)
    try {
      const res = await createOperationFromNfe(docId)
      toast({
        title: 'Ordem de Transporte Gerada!',
        description: res.message,
      })
      setIsNfeModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao gerar Ordem',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsCreatingOrder(false)
    }
  }

  // Calcular piso mínimo ANTT para a ordem selecionada
  const handleCalculateFloor = async () => {
    if (!selectedOrder) return
    setIsCalculatingFloor(true)
    try {
      const res = await calculateMinimumFloor({
        trip_id: selectedOrder.id,
        distance_km: selectedOrder.distance_km,
        freight_value: selectedOrder.freight_value,
        carrier_profile: selectedOrder.carrier_profile,
        axles: selectedOrder.axles_count,
        table_type: (selectedOrder.floor_table_type as any) || 'tabela_a',
        cargo_category: selectedOrder.floor_cargo_category || 'carga_geral',
        empty_return_applicable: selectedOrder.floor_empty_return_applicable,
      })

      toast({
        title: res.is_compliant ? 'Piso Mínimo em Conformidade' : 'Atenção: Frete Abaixo do Piso',
        description: res.applicable
          ? `Piso calculado: R$ ${res.minimum_floor_value.toFixed(2)} (Versão ${res.table_version}). Status: ${res.status_label}.`
          : `Operação dispensada de piso mínimo: ${res.reason}`,
        variant: res.is_compliant ? 'default' : 'destructive',
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao calcular piso mínimo',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsCalculatingFloor(false)
    }
  }

  // Regularizar piso mínimo
  const handleRegularizeFloor = async () => {
    if (!selectedOrder) return
    setIsRegularizingFloor(true)
    try {
      const res = await regularizeMinimumFloor({
        trip_id: selectedOrder.id,
        action_type: regularizeActionType,
        new_freight_value: Number(adjustedFreightInput) || undefined,
        justification: legalJustificationInput,
      })

      toast({
        title: 'Operação Regularizada!',
        description: res.message,
      })
      setAdjustedFreightInput('')
      setLegalJustificationInput('')
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha na regularização',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsRegularizingFloor(false)
    }
  }

  // Processar ou reprocessar etapa
  const handleProcessStage = async (
    stageKey: string,
    action: 'process' | 'reprocess' = 'process',
  ) => {
    if (!selectedOrder) return
    setIsProcessingStage(true)
    try {
      const res = await advanceOperationStage(selectedOrder.id, stageKey, action)
      toast({
        title: 'Etapa Processada',
        description: res.message,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao processar etapa',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsProcessingStage(false)
    }
  }

  // Helpers de parsing de workflow_stages
  const parseStages = (stagesData?: string | TripWorkflowStages): TripWorkflowStages => {
    if (!stagesData) return {}
    if (typeof stagesData === 'string') {
      try {
        return JSON.parse(stagesData)
      } catch (_) {
        return {}
      }
    }
    return stagesData
  }

  const currentStages = parseStages(selectedOrder?.workflow_stages)

  const getStageInfo = (key: keyof TripWorkflowStages): WorkflowStageInfo => {
    return (
      currentStages[key] || {
        status: 'pendente',
        message: 'Aguardando processamento das etapas anteriores.',
      }
    )
  }

  const getStatusBadge = (status: WorkflowStageStatus) => {
    switch (status) {
      case 'concluida':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            Concluída
          </Badge>
        )
      case 'em_processamento':
        return (
          <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse">
            Processando
          </Badge>
        )
      case 'requer_atencao':
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">
            Requer Atenção
          </Badge>
        )
      case 'erro':
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30">Erro</Badge>
      default:
        return (
          <Badge variant="outline" className="text-zinc-500 border-zinc-700">
            Pendente
          </Badge>
        )
    }
  }

  const getStatusColorClass = (status: WorkflowStageStatus) => {
    switch (status) {
      case 'concluida':
        return 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300'
      case 'em_processamento':
        return 'border-sky-500/50 bg-sky-950/20 text-sky-300'
      case 'requer_atencao':
        return 'border-amber-500/50 bg-amber-950/20 text-amber-300'
      case 'erro':
        return 'border-rose-500/50 bg-rose-950/20 text-rose-300'
      default:
        return 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
    }
  }

  // Filtragem de ordens
  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.toLowerCase()
    return (
      (o.operation_number && o.operation_number.toLowerCase().includes(q)) ||
      (o.trip_code && o.trip_code.toLowerCase().includes(q)) ||
      (o.nfe_number && o.nfe_number.toLowerCase().includes(q)) ||
      (o.sender_name && o.sender_name.toLowerCase().includes(q)) ||
      (o.recipient_name && o.recipient_name.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Tela */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
              TMS Passo 1 • Ordem Central
            </Badge>
            <Badge variant="outline" className="text-zinc-400">
              Versão v0.0.26
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Central de Operações de Transporte
          </h1>
          <p className="text-sm text-zinc-400">
            Fluxo unificado de expedição: da NF-e ao CT-e, CIOT, VPO, MDF-e e liberação da viagem
            rodoviária sem trocar de tela.
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
            doc={OPERATIONS_CENTER_SCREEN_LOGIC_DOC}
          />
          <Button
            onClick={handleOpenNfeModal}
            className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/50 flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Importar NF-e e Gerar OT
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
      <Tabs defaultValue="operations" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
          <TabsTrigger value="operations" className="data-[state=active]:bg-zinc-800 text-zinc-300">
            <Truck className="h-4 w-4 mr-2 text-cyan-400" />
            Esteira Operacional
          </TabsTrigger>
          <TabsTrigger value="connectors" className="data-[state=active]:bg-zinc-800 text-zinc-300">
            <Radio className="h-4 w-4 mr-2 text-emerald-400" />
            Conectores de Integração
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: Esteira Operacional Unificada */}
        <TabsContent value="operations" className="space-y-6 mt-4">
          {/* Seletor de Ordem e Resumo Executivo */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Coluna da Esquerda: Lista de Ordens de Transporte */}
            <Card className="lg:col-span-1 border-zinc-800 bg-zinc-900/60">
              <CardHeader className="p-4 pb-2 border-b border-zinc-800/80">
                <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center justify-between">
                  <span>Ordens de Transporte</span>
                  <Badge variant="outline" className="text-xs text-zinc-400">
                    {orders.length}
                  </Badge>
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar OT, viagem, NF-e..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-1.5 max-h-[600px] overflow-y-auto">
                {filteredOrders.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-500">
                    Nenhuma ordem de transporte encontrada.
                  </div>
                ) : (
                  filteredOrders.map((ord) => {
                    const isSelected = selectedOrder?.id === ord.id
                    return (
                      <div
                        key={ord.id}
                        onClick={() => setSelectedOrder(ord)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm'
                            : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-cyan-400 font-mono">
                            {ord.operation_number || ord.trip_code}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {ord.created ? new Date(ord.created).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-zinc-200 truncate">
                          {ord.sender_name || 'Remetente não informado'}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-zinc-500" />
                          {ord.origin_city}/{ord.origin_state} ➔ {ord.destination_city}/
                          {ord.destination_state}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-800/60 text-[10px]">
                          <span className="text-zinc-400">
                            Frete:{' '}
                            <strong className="text-zinc-200">
                              R${' '}
                              {Number(ord.freight_value || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </strong>
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                              ord.operation_status === 'liberada'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : ord.operation_status === 'requer_atencao'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {ord.operation_status || 'em_andamento'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Painel Central: Detalhes da Ordem Selecionada e Fluxo Visual */}
            {selectedOrder ? (
              <div className="lg:col-span-3 space-y-5">
                {/* Cabeçalho da Ordem Ativa */}
                <Card className="border-zinc-800 bg-zinc-900/40">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-white font-mono">
                            {selectedOrder.operation_number || selectedOrder.trip_code}
                          </h2>
                          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                            {selectedOrder.transport_mode?.toUpperCase() || 'LOTAÇÃO'}
                          </Badge>
                          <Badge
                            className={
                              selectedOrder.operation_status === 'liberada'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }
                          >
                            {selectedOrder.operation_status?.toUpperCase() || 'EM ANÁLISE'}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Código interno:{' '}
                          <strong className="text-zinc-300">{selectedOrder.trip_code}</strong> •
                          NF-e vinculada:{' '}
                          <strong className="text-zinc-300 font-mono">
                            {selectedOrder.nfe_number || 'Sem NF-e'}
                          </strong>
                        </p>
                      </div>

                      {/* Resumo Financeiro da Viagem */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-lg text-right">
                          <span className="text-[10px] text-zinc-400 block uppercase font-semibold">
                            Frete Acordado
                          </span>
                          <span className="text-sm font-bold text-emerald-400">
                            R${' '}
                            {Number(selectedOrder.freight_value || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-lg text-right">
                          <span className="text-[10px] text-zinc-400 block uppercase font-semibold">
                            VPO (Lei 10.209/01)
                          </span>
                          <span className="text-sm font-bold text-amber-400">
                            R${' '}
                            {Number(selectedOrder.vpo_value || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-lg text-right">
                          <span className="text-[10px] text-zinc-400 block uppercase font-semibold flex items-center justify-end gap-1">
                            <span>Piso Mínimo ANTT</span>
                            {selectedOrder.floor_table_version && (
                              <span className="text-[9px] text-zinc-500 font-mono">
                                ({selectedOrder.floor_table_version})
                              </span>
                            )}
                          </span>
                          <div className="flex items-center justify-end gap-1.5">
                            {selectedOrder.floor_regularization_status === 'nao_aplicavel' ? (
                              <Badge variant="outline" className="text-[10px] text-zinc-400">
                                Dispensado
                              </Badge>
                            ) : (
                              <span className="text-sm font-bold text-cyan-400">
                                R${' '}
                                {Number(selectedOrder.minimum_floor_value || 0).toLocaleString(
                                  'pt-BR',
                                  { minimumFractionDigits: 2 },
                                )}
                              </span>
                            )}
                          </div>
                          {selectedOrder.floor_freight_difference !== undefined &&
                            selectedOrder.floor_regularization_status !== 'nao_aplicavel' && (
                              <span
                                className={`text-[10px] font-mono block ${
                                  (selectedOrder.floor_freight_difference || 0) >= 0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400 font-bold'
                                }`}
                              >
                                {(selectedOrder.floor_freight_difference || 0) >= 0 ? '+' : ''}
                                R$ {Number(selectedOrder.floor_freight_difference || 0).toFixed(
                                  2,
                                )}{' '}
                                vs Frete
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Dados Básicos de Rota e Mercadoria */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-500 block">Origem:</span>
                        <span className="font-semibold text-zinc-200">
                          {selectedOrder.origin_city}/{selectedOrder.origin_state}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Destino:</span>
                        <span className="font-semibold text-zinc-200">
                          {selectedOrder.destination_city}/{selectedOrder.destination_state}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Veículo / Placa:</span>
                        <span className="font-semibold text-zinc-200">
                          {selectedOrder.vehicle_plate || 'Pendente'} (
                          {selectedOrder.axles_count || 6} eixos)
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Carga & Peso:</span>
                        <span className="font-semibold text-zinc-200 truncate block">
                          {selectedOrder.cargo_type || 'Carga Geral'} (
                          {Number(selectedOrder.weight_kg || 0).toLocaleString('pt-BR')} kg)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Esteira Visual de 12 Etapas */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-cyan-400" />
                        Esteira da Operação (Máquina de Estados)
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Clique em qualquer etapa para auditar pendências, documentos ou reprocessar.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleProcessStage('cte')}
                        disabled={isProcessingStage}
                        variant="outline"
                        className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <RefreshCw
                          className={`h-3 w-3 mr-1.5 ${isProcessingStage ? 'animate-spin' : ''}`}
                        />
                        Verificar CT-e
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleProcessStage('liberacao')}
                        disabled={isProcessingStage}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Liberar Viagem
                      </Button>
                    </div>
                  </div>

                  {/* Grid de Etapas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {WORKFLOW_SEQUENCE.map((stage, idx) => {
                      const Icon = stage.icon
                      const info = getStageInfo(stage.key)
                      const isCompleted = info.status === 'concluida'
                      const isAttention = info.status === 'requer_atencao'
                      const isError = info.status === 'erro'

                      return (
                        <div
                          key={stage.key}
                          onClick={() => setSelectedStageKey(stage.key)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${getStatusColorClass(
                            info.status,
                          )}`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono text-zinc-400">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : isAttention ? (
                                <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />
                              ) : isError ? (
                                <AlertCircle className="h-4 w-4 text-rose-400" />
                              ) : (
                                <Clock className="h-4 w-4 text-zinc-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className="h-3.5 w-3.5 text-zinc-300" />
                              <span className="font-bold text-xs text-zinc-100 truncate">
                                {stage.shortLabel}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 line-clamp-2">
                              {info.message || stage.description}
                            </p>
                          </div>

                          <div className="mt-3 pt-1.5 border-t border-zinc-800/40 flex items-center justify-between text-[9px]">
                            <span className="text-zinc-500 uppercase">{info.status}</span>
                            <ChevronRight className="h-3 w-3 text-zinc-500" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Detalhes da Ordem de Transporte e Atores */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                  <CardHeader className="p-4 pb-2 border-b border-zinc-800">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Atores e Dados de Expedição da Ordem
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Remetente e Expedidor */}
                      <div className="space-y-1.5 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                          Remetente / Expedidor
                        </span>
                        <div className="font-semibold text-zinc-200">
                          {selectedOrder.sender_name || 'Não informado'}
                        </div>
                        <div className="text-zinc-400 font-mono text-[11px]">
                          CNPJ: {selectedOrder.sender_document || 'Não preenchido'}
                        </div>
                        <div className="text-zinc-500 text-[11px]">
                          Local Coleta: {selectedOrder.pickup_address || 'Pátio Embarcador'}
                        </div>
                      </div>

                      {/* Destinatário e Recebedor */}
                      <div className="space-y-1.5 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                          Destinatário / Recebedor
                        </span>
                        <div className="font-semibold text-zinc-200">
                          {selectedOrder.recipient_name || 'Não informado'}
                        </div>
                        <div className="text-zinc-400 font-mono text-[11px]">
                          CNPJ: {selectedOrder.recipient_document || 'Não preenchido'}
                        </div>
                        <div className="text-zinc-500 text-[11px]">
                          Local Entrega:{' '}
                          {selectedOrder.delivery_address || 'Centro de Distribuição'}
                        </div>
                      </div>

                      {/* Condições Comerciais e Transportador */}
                      <div className="space-y-1.5 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                          Transportador & Pagamento
                        </span>
                        <div className="font-semibold text-zinc-200">
                          RNTRC:{' '}
                          <strong className="font-mono text-zinc-100">
                            {selectedOrder.carrier_rntrc || '49827361'}
                          </strong>{' '}
                          ({selectedOrder.carrier_profile || 'TAC-Equiparado'})
                        </div>
                        <div className="text-zinc-400 text-[11px]">
                          Condição: {selectedOrder.payment_terms || '70% Adiantamento + 30% Saldo'}
                        </div>
                        <div className="text-zinc-400 text-[11px]">
                          Apólice Seguro:{' '}
                          <span className="font-mono text-zinc-300">
                            {selectedOrder.insurance_policy_number || 'POL-2026-PORTO-9841'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="lg:col-span-3 p-12 text-center border border-zinc-800 rounded-xl bg-zinc-900/30">
                <Truck className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-zinc-300">Nenhuma Ordem Selecionada</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Selecione uma ordem de transporte na barra lateral ou clique em &quot;Importar
                  NF-e e Gerar OT&quot; para iniciar uma nova operação.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA 2: Conectores de Integração (Honestidade Técnica) */}
        <TabsContent value="connectors" className="space-y-5 mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Radio className="h-5 w-5 text-emerald-400" />
                  Contratos de Integração & Conectores de Terceiros
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Interfaces estruturadas com SEFAZ, ANTT/IPEF, Concessionárias de Pedágio e
                  Seguradoras. Conectores sem credenciais aparecem como{' '}
                  <strong>&quot;Aguardando configuração&quot;</strong> (sem falsas simulações
                  fiscais ou financeiras).
                </p>
              </div>
            </div>

            {/* Grid dos Conectores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectors.map((conn) => {
                const isWaiting = conn.status === 'aguardando_configuracao'
                const isConfigured = conn.status === 'configurado'

                return (
                  <Card key={conn.id} className="border-zinc-800 bg-zinc-950/60">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] text-zinc-400 uppercase">
                          {conn.category}
                        </Badge>
                        <Badge
                          className={`text-[10px] ${
                            isConfigured
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : isWaiting
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                          }`}
                        >
                          {conn.status_label}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-zinc-100">{conn.name}</CardTitle>
                      <CardDescription className="text-xs text-zinc-500">
                        Provedor: <strong className="text-zinc-300">{conn.provider}</strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 text-xs space-y-2">
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        {conn.description}
                      </p>
                      <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 text-[10px] text-zinc-400">
                        <strong className="text-zinc-300 block mb-0.5">
                          Salvaguarda de Segurança:
                        </strong>
                        {conn.notes}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal 1: Importar NF-e e Gerar Ordem de Transporte */}
      <Dialog open={isNfeModalOpen} onOpenChange={setIsNfeModalOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              Importar NF-e Recebida e Gerar Ordem de Transporte
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Selecione uma NF-e triada pelo Agente de E-mails/Cargas. Todos os campos (remetente,
              destinatário, mercadoria, pesos, valores e placas) serão importados automaticamente
              sem redigitação nem duplicação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {isLoadingNfes ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-cyan-500" />
                Carregando documentos fiscais...
              </div>
            ) : pendingNfes.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                Nenhuma NF-e pendente de importação no momento.
              </div>
            ) : (
              pendingNfes.map((nfe) => {
                const isLinked = nfe.status === 'linked'
                return (
                  <div
                    key={nfe.id}
                    className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white font-mono">
                          NF-e nº {nfe.nfe_number} (Série {nfe.series || '1'})
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            isLinked
                              ? 'text-emerald-400 border-emerald-500/30'
                              : 'text-amber-400 border-amber-500/30'
                          }
                        >
                          {nfe.status === 'linked' ? 'Já vinculada' : 'Disponível para OT'}
                        </Badge>
                      </div>
                      <div className="text-xs text-zinc-300">
                        Emitente: <strong>{nfe.issuer_name || 'Desconhecido'}</strong> ➔
                        Destinatário: <strong>{nfe.recipient_name || 'Desconhecido'}</strong>
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        Chave: {nfe.access_key ? `${nfe.access_key.slice(0, 20)}...` : 'Sem chave'}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                        <span>
                          Valor:{' '}
                          <strong className="text-zinc-200">
                            R${' '}
                            {Number(nfe.total_value || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </strong>
                        </span>
                        <span>
                          Peso:{' '}
                          <strong className="text-zinc-200">
                            {Number(nfe.weight_kg || 0).toLocaleString('pt-BR')} kg
                          </strong>
                        </span>
                        {nfe.detected_plate && (
                          <span>
                            Placa lida:{' '}
                            <strong className="text-cyan-400">{nfe.detected_plate}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleCreateFromNfe(nfe.id)}
                      disabled={isCreatingOrder || isLinked}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white shrink-0 text-xs"
                    >
                      {isLinked ? 'Já Vinculada' : 'Gerar Ordem'}
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="border-t border-zinc-800 pt-3">
            <Button
              variant="outline"
              onClick={() => setIsNfeModalOpen(false)}
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Detalhes e Ações da Etapa Selecionada */}
      {selectedStageKey && (
        <Dialog open={!!selectedStageKey} onOpenChange={() => setSelectedStageKey(null)}>
          <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-zinc-200">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                {getStatusBadge(getStageInfo(selectedStageKey).status)}
                <span className="text-xs text-zinc-400 uppercase font-mono">
                  Etapa da Máquina de Estados
                </span>
              </div>
              <DialogTitle className="text-base font-bold text-white">
                {WORKFLOW_SEQUENCE.find((s) => s.key === selectedStageKey)?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {WORKFLOW_SEQUENCE.find((s) => s.key === selectedStageKey)?.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs space-y-2">
                <div className="text-zinc-400">
                  <strong className="text-zinc-200 block mb-0.5">Diagnóstico da Etapa:</strong>
                  {getStageInfo(selectedStageKey).message}
                </div>
                <div className="text-zinc-500 text-[11px] pt-1 border-t border-zinc-800/80">
                  Responsável:{' '}
                  <strong>
                    {WORKFLOW_SEQUENCE.find((s) => s.key === selectedStageKey)?.responsible}
                  </strong>
                </div>
              </div>

              {/* Ações Específicas conforme a etapa */}
              <div className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-800 text-xs space-y-2">
                <span className="font-bold text-zinc-300 text-xs block">Ações Disponíveis:</span>

                {selectedStageKey === 'roteirizacao' && (
                  <div className="p-2.5 bg-indigo-950/40 border border-indigo-800/60 rounded-lg space-y-1.5 mb-2">
                    <span className="font-bold text-indigo-300 block text-xs">
                      Roteirizador Inteligente Integrado (Passo 2)
                    </span>
                    <p className="text-zinc-400 text-[11px]">
                      Acesse a tela de Roteirização para conferir a distância rodoviária real,
                      definir waypoints, calcular praças de pedágio por eixo com tarifas versionadas
                      e aprovar a rota.
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedStageKey(null)
                          navigate('/routing')
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        Abrir Roteirizador Inteligente
                      </Button>
                    </div>
                  </div>
                )}

                {selectedStageKey === 'piso_minimo' && (
                  <div className="p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-lg space-y-3 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300 block text-xs flex items-center gap-1.5">
                        <Scale className="h-4 w-4" />
                        Motor do Piso Mínimo ANTT (Passo 3)
                      </span>
                      {selectedOrder?.floor_table_version && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-cyan-400 border-cyan-500/30 font-mono"
                        >
                          {selectedOrder.floor_table_version}
                        </Badge>
                      )}
                    </div>

                    {/* Resumo dos Valores Calculados */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">
                          Piso Mínimo Calculado:
                        </span>
                        <strong className="text-cyan-400 text-sm">
                          R${' '}
                          {Number(selectedOrder?.minimum_floor_value || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      </div>
                      <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 block">Frete Negociado:</span>
                        <strong className="text-zinc-200 text-sm">
                          R${' '}
                          {Number(selectedOrder?.freight_value || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      </div>
                      <div className="p-2 bg-zinc-950/70 rounded border border-zinc-800 col-span-2 md:col-span-1">
                        <span className="text-[10px] text-zinc-500 block">Diferença / Status:</span>
                        <strong
                          className={`text-sm ${
                            (selectedOrder?.floor_freight_difference || 0) >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {(selectedOrder?.floor_freight_difference || 0) >= 0 ? '+' : ''}
                          R$ {Number(selectedOrder?.floor_freight_difference || 0).toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    {/* Parâmetros do Cálculo */}
                    <div className="text-[11px] text-zinc-400 bg-zinc-950/50 p-2.5 rounded border border-zinc-800 space-y-1">
                      <div className="flex justify-between">
                        <span>Distância Rodoviária:</span>
                        <strong className="text-zinc-200">
                          {selectedOrder?.distance_km || 0} km (Rota Aprovada)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Configuração:</span>
                        <strong className="text-zinc-200">
                          {selectedOrder?.axles_count || 6} eixos •{' '}
                          {selectedOrder?.cargo_type || 'Carga Geral'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Retorno Vazio Regulamentar:</span>
                        <strong className="text-zinc-200">
                          {selectedOrder?.floor_empty_return_applicable ? 'Sim (Aplicado)' : 'Não'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Status Regularização:</span>
                        <strong className="text-cyan-300 uppercase font-mono">
                          {selectedOrder?.floor_regularization_status || 'Pendente'}
                        </strong>
                      </div>
                    </div>

                    {/* Botões do Motor de Piso */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={handleCalculateFloor}
                        disabled={isCalculatingFloor}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold gap-1"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${isCalculatingFloor ? 'animate-spin' : ''}`}
                        />
                        {isCalculatingFloor ? 'Calculando Piso...' : 'Recalcular Piso ANTT'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedStageKey(null)
                          navigate('/minimum-floor-admin')
                        }}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                      >
                        Gerenciar Tabelas ANTT
                      </Button>
                    </div>

                    {/* Formulário de Regularização quando Bloqueado ou Abaixo do Piso */}
                    {(selectedOrder?.floor_regularization_status === 'bloqueado_abaixo_piso' ||
                      selectedOrder?.minimum_floor_status === 'abaixo_piso') && (
                      <div className="mt-3 p-3 bg-rose-950/30 border border-rose-800/50 rounded-lg space-y-2.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                          <span className="font-bold text-rose-300 text-xs">
                            Caminho de Regularização do Frete (Bloqueio Ativo)
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          A viagem não pode ser liberada enquanto o frete estiver abaixo do piso
                          mínimo oficial ANTT. Escolha uma das opções legais para regularizar:
                        </p>

                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                              <input
                                type="radio"
                                name="reg_action"
                                value="adjust_freight"
                                checked={regularizeActionType === 'adjust_freight'}
                                onChange={() => setRegularizeActionType('adjust_freight')}
                                className="text-cyan-600"
                              />
                              Ajustar Frete para cumprir o Piso
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                              <input
                                type="radio"
                                name="reg_action"
                                value="legal_justification"
                                checked={regularizeActionType === 'legal_justification'}
                                onChange={() => setRegularizeActionType('legal_justification')}
                                className="text-cyan-600"
                              />
                              Justificativa Legal Aprovada
                            </label>
                          </div>

                          {regularizeActionType === 'adjust_freight' ? (
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-2 text-zinc-500 text-xs">
                                  R$
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={adjustedFreightInput}
                                  onChange={(e) => setAdjustedFreightInput(e.target.value)}
                                  placeholder={`Mínimo: R$ ${Number(selectedOrder?.minimum_floor_value || 0).toFixed(2)}`}
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-white"
                                />
                              </div>
                              <Button
                                size="sm"
                                onClick={handleRegularizeFloor}
                                disabled={isRegularizingFloor || !adjustedFreightInput}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                              >
                                {isRegularizingFloor ? 'Salvando...' : 'Atualizar Frete'}
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <textarea
                                value={legalJustificationInput}
                                onChange={(e) => setLegalJustificationInput(e.target.value)}
                                placeholder="Descreva o enquadramento legal ou justificativa para a exceção regulatória (mínimo 10 caracteres)..."
                                rows={2}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-white"
                              />
                              <Button
                                size="sm"
                                onClick={handleRegularizeFloor}
                                disabled={
                                  isRegularizingFloor || legalJustificationInput.length < 10
                                }
                                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                              >
                                {isRegularizingFloor ? 'Gravando...' : 'Aprovar Justificativa'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-zinc-400 text-[11px]">
                  Você pode comandar o reprocessamento desta etapa sem reiniciar as etapas
                  concluídas anteriormente.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      handleProcessStage(selectedStageKey, 'reprocess')
                      setSelectedStageKey(null)
                    }}
                    disabled={isProcessingStage}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
                  >
                    Reprocessar Etapa
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-zinc-800 pt-3">
              <Button
                variant="outline"
                onClick={() => setSelectedStageKey(null)}
                className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
