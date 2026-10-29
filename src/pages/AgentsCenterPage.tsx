import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getEmailAgentConfig,
  getEmailProcessingLogs,
  triggerEmailAgentRun,
} from '@/services/agentService'
import {
  getCargoAgentConfig,
  getCargoIdentifications,
  getReceivedFiscalDocuments,
  triggerCargoAgentRun,
  resolveCargoLink,
} from '@/services/cargoAgentService'
import { getTrips } from '@/services/logisticsService'
import type { EmailAgentConfig, EmailProcessingLog } from '@/types/agent'
import type {
  CargoAgentConfig,
  CargoIdentification,
  ReceivedFiscalDocument,
} from '@/types/cargoAgent'
import type { Trip } from '@/types/logistics'
import { ScreenLogicModal, type ScreenLogicDoc } from '@/components/ScreenLogicModal'
import {
  Bot,
  Play,
  RotateCw,
  Mail,
  FileCheck2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  FileText,
  HelpCircle,
  FileCode,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Truck,
  Hash,
  AlertCircle,
  Receipt,
  Layers,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

const CENTRAL_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Central de Agentes',
  screenBadge: 'Prioridades 1 e 2 • ED Integração',
  lastUpdate: '2026-10-29',
  version: '1.1.0',
  objective:
    'Painel operacional unificado para visualização do fluxo de trabalho autônomo (E-mail recebido → Carga identificada → Documentos emitidos → Documentos enviados). Com a entrega das Prioridades 1, 2 e 3, as Etapas 1 (Agente de E-mails), 2 (Agente de Identificação de Cargas) e 3 (Documentos Emitidos / Regularização Fiscal com MDF-e, CIOT e Seguros) estão 100% ativas com dados e integrações reais. Sem credenciais cadastradas, os documentos permanecem com status honesto (aguardando transmissão/fila) sem qualquer simulação de autorização. A Etapa 4 (Documentos enviados) permanece transparentemente em implantação.',
  realFeatures: [
    'Fluxo visual em 4 etapas detalhando o status real: Etapas 1, 2 e 3 100% ativas com dados e APIs reais; Etapa 4 em implantação',
    'Etapa 3 100% ativa: Orquestração de regularização fiscal legal (Averbação RCTR-C ➔ CIOT IPEF ➔ VPO ➔ CT-e SEFAZ ➔ MDF-e) via hook de backend fiscal_regularization.pb.js',
    'Transmissão certificada via Nuvem Fiscal no backend com chave segura; interface preparada para Focus NFe e TecnoSpeed',
    'Tratamento honesto de status fiscal: documentos sem credenciais permanecem retidos na fila como aguardando transmissão — nunca simulados',
    'Agente de Identificação de Cargas com cruzamento multi-sinal e bloqueio contra duplicidade fiscal',
    'Resolução manual de pendências pelo responsável: confirmação da viagem correta ou rejeição justificada com registro em audit_logs',
    'Indicadores em tempo real para as três etapas: e-mails triados, cargas vinculadas, pendências aguardando humano, CT-es na esteira, manifestos MDF-e, CIOTs ANTT e averbações de apólices',
    'Filtros por status, busca por remetente, NF-e, placa ou viagem',
    'Visualização de sinais coincidentes confirmados pelo agente e motivos de divergência',
  ],
  fieldsAndButtons: [
    {
      name: 'Executar Agente de E-mails',
      type: 'Botão de Ação Primária',
      purpose: 'Dispara coleta e classificação de mensagens das caixas conectadas.',
    },
    {
      name: 'Executar Identificação de Cargas',
      type: 'Botão de Ação Primária',
      purpose:
        'Dispara o cruzamento multi-critério entre NF-es recebidas e ordens de carregamento (viagens) em aberto.',
    },
    {
      name: 'Confirmar Vínculo / Rejeitar',
      type: 'Botões de Ação na Linha da Pendência',
      purpose:
        'Permite ao operador humano escolher a viagem correta em caso de ambiguidade ou rejeitar a associação.',
    },
    {
      name: 'Alternância entre Etapa 1 e Etapa 2',
      type: 'Tabs / Abas Operacionais',
      purpose:
        'Permite alternar entre o histórico de e-mails recebidos e a gestão de cargas identificadas.',
    },
    {
      name: 'Regras e Treinamento',
      type: 'Link de Navegação',
      purpose:
        'Abre a tela administrativa para configurar regras de e-mail e critérios de identificação de carga.',
    },
  ],
  businessRules: [
    'Regra Crítica: A identificação NÃO depende exclusivamente da placa do veículo. O agente cruza placa, cliente, documentos, datas, motorista e peso da carga.',
    'Regra Crítica: Quando houver divergência ou mais de uma viagem possível, o sistema NUNCA auto-vincula. Gera notificação e pendência para validação humana.',
    'Regra de Duplicidade Fiscal: Se a chave da NF-e já possuir CT-e emitido ou autorizado, a operação é rejeitada para evitar bitributação.',
    'O agente NUNCA executa instruções fiscais contidas no corpo de e-mails; atua estritamente sob as regras aprovadas pelo Administrador.',
    'Prioridade 3 entregue: Etapa 3 ativa. A autorização depende da confirmação oficial da SEFAZ via API certificada (Nuvem Fiscal). Sem token, documentos são retidos na fila com status honesto.',
    'CIOT e VPO são obrigações distintas e segregadas com coleções e fluxos separados.',
    'MDF-e agrupa exclusivamente CT-es autorizados na SEFAZ.',
  ],
  agentsAndAutomations: [
    'Hook email_agent.pb.js: cron periódica e endpoints /backend/v1/agents/emails/run-now, /agents/cargo/identify-now e /agents/cargo/resolve-link.',
    'Conectores Gmail e Outlook na conta de cada usuário autenticado.',
    'Centro de notificações (fine_notifications) acionado automaticamente em casos de divergência ou ambiguidade.',
    'Rastreabilidade integral em audit_logs para cada identificação e aprovação humana.',
  ],
  validations: [
    'Verificação do mínimo de sinais coincidentes configurado antes de autorizar auto-vínculo.',
    'Validação de formato de chave de acesso (44 dígitos) e CNPJs de emitente e destinatário.',
    'Controle de integridade de relacionamentos entre fiscal_document_id e trips.',
  ],
  integrations: [
    'Coleções PocketBase: received_fiscal_documents, cargo_identifications, cargo_agent_configs, trips, cte_documents, vehicles e drivers.',
    'Endpoints backend seguros com autenticação Bearer.',
  ],
  flowsAndDependencies: [
    'E-mail Recebido com NF-e ➔ Extração Segura de Dados Fiscais ➔ Agente de Cargas cruza com Viagens ➔ Se ≥2 sinais e único: Auto-vínculo OK ➔ Se ambíguo ou divergente: Fila de Revisão Humana.',
  ],
  dataSourceAndDestination: {
    origin: 'Caixas de e-mail conectadas, XMLs anexados e coleção trips.',
    destination:
      'Coleções received_fiscal_documents, cargo_identifications, audit_logs e fine_notifications.',
    persistence: 'Banco SQLite via PocketBase v0.36.',
  },
  permissions: [
    {
      role: 'Administrador',
      access: 'Acesso total: disparo, aprovação/rejeição e parametrização.',
    },
    {
      role: 'Gestor Operacional',
      access: 'Acesso total: visualização, disparo e resolução de pendências.',
    },
    { role: 'Operador Logístico', access: 'Visualização e confirmação de vínculos operacionais.' },
    { role: 'Financeiro', access: 'Consulta de documentos fiscais e duplicidades.' },
    { role: 'Somente Leitura', access: 'Apenas consulta aos indicadores e logs.' },
  ],
  notificationsAndErrors: [
    'Notificação imediata ao usuário na tela via toast em caso de sucesso ou falha das ações.',
    'Notificação persistente no NotificationCenter para pendências de ambiguidade ou duplicidade fiscal.',
  ],
  inDevelopmentAlert:
    'As Etapas 1 (E-mails), 2 (Identificação de Cargas) e 3 (Documentos Emitidos & Regularização com MDF-e, CIOT e Seguros) estão 100% ativas. A Etapa 4 (Documentos enviados) está em implantação na próxima fase.',
}

export const AgentsCenterPage: React.FC = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'emails' | 'cargo' | 'emitted'>('emitted')

  // Estado Agente de E-mails
  const [emailConfig, setEmailConfig] = useState<EmailAgentConfig | null>(null)
  const [emailLogs, setEmailLogs] = useState<EmailProcessingLog[]>([])

  // Estado Agente de Cargas (Prioridade 2)
  const [cargoConfig, setCargoConfig] = useState<CargoAgentConfig | null>(null)
  const [cargoIdentifications, setCargoIdentifications] = useState<CargoIdentification[]>([])
  const [fiscalDocs, setFiscalDocs] = useState<ReceivedFiscalDocument[]>([])
  const [trips, setTrips] = useState<Trip[]>([])

  // Estado Etapa 3 (Prioridade 3: Emissão e Regularização Fiscal)
  const [cteList, setCteList] = useState<import('@/types/logistics').CteDocument[]>([])
  const [mdfeList, setMdfeList] = useState<import('@/types/logistics').MdfeDocument[]>([])
  const [ciotList, setCiotList] = useState<import('@/types/logistics').CiotRecord[]>([])
  const [endorsementsList, setEndorsementsList] = useState<
    import('@/types/logistics').InsuranceEndorsement[]
  >([])
  const [runningRegularization, setRunningRegularization] = useState(false)
  const [regularizationIssues, setRegularizationIssues] = useState<
    Array<{ trip_code: string; stage: string; severity: string; message: string }>
  >([])
  const [fiscalProviderConfigured, setFiscalProviderConfigured] = useState<boolean>(false)

  const [loading, setLoading] = useState(true)
  const [runningEmails, setRunningEmails] = useState(false)
  const [runningCargo, setRunningCargo] = useState(false)
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [cargoFilter, setCargoFilter] = useState<
    'all' | 'pending' | 'auto' | 'confirmed' | 'rejected'
  >('all')

  // Modal de Resolução Manual de Vínculo
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [selectedIdentification, setSelectedIdentification] = useState<CargoIdentification | null>(
    null,
  )
  const [selectedTripId, setSelectedTripId] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [resolving, setResolving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const { getCteDocuments, getMdfeDocuments, getCiotRecords, getInsuranceEndorsements } =
        await import('@/services/regularizationService')
      const { getCompanySettings } = await import('@/services/logisticsService')

      const [eCfg, eLogs, cCfg, cIdents, fDocs, tripsList, ctes, mdfes, ciots, ends, comp] =
        await Promise.all([
          getEmailAgentConfig(),
          getEmailProcessingLogs(100),
          getCargoAgentConfig(),
          getCargoIdentifications(100),
          getReceivedFiscalDocuments(100),
          getTrips(),
          getCteDocuments(),
          getMdfeDocuments(),
          getCiotRecords(),
          getInsuranceEndorsements(),
          getCompanySettings(),
        ])
      setEmailConfig(eCfg)
      setEmailLogs(eLogs)
      setCargoConfig(cCfg)
      setCargoIdentifications(cIdents)
      setFiscalDocs(fDocs)
      setTrips(tripsList)
      setCteList(ctes)
      setMdfeList(mdfes)
      setCiotList(ciots)
      setEndorsementsList(ends)
      setFiscalProviderConfigured(Boolean(comp.fiscal_api_token))
    } catch (err) {
      console.error('Erro ao carregar dados da Central de Agentes:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os registros da Central de Agentes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Disparo manual do Orquestrador de Regularização (Etapa 3)
  const handleRunRegularization = async () => {
    setRunningRegularization(true)
    try {
      const { runRegularizationOrchestration } = await import('@/services/regularizationService')
      const res = await runRegularizationOrchestration()
      setRegularizationIssues(res.pending_issues || [])
      setFiscalProviderConfigured(res.fiscal_provider_status === 'configurado')
      toast({
        title: 'Etapa 3 orquestrada!',
        description: res.message,
      })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Falha na esteira de regularização fiscal',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setRunningRegularization(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Disparo manual do Agente de E-mails
  const handleRunEmails = async () => {
    setRunningEmails(true)
    try {
      const res = await triggerEmailAgentRun()
      toast({
        title: 'Agente de E-mails executado!',
        description: res.details
          ? `${res.details.processedNow} novos e-mails processados (${res.details.exceptionsCount} exceções).`
          : res.message,
      })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Falha na execução do agente de e-mails',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setRunningEmails(false)
    }
  }

  // Disparo manual do Agente de Identificação de Cargas
  const handleRunCargo = async () => {
    setRunningCargo(true)
    try {
      const res = await triggerCargoAgentRun()
      toast({
        title: 'Identificação de Cargas concluída!',
        description: res.details
          ? `${res.details.autoLinkedCount} vinculadas automaticamente • ${res.details.pendingHumanCount} pendências geradas • ${res.details.duplicatesFoundCount} duplicidades bloqueadas.`
          : res.message,
      })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Falha na identificação de cargas',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setRunningCargo(false)
    }
  }

  // Abrir modal de resolução manual
  const handleOpenResolveModal = (ident: CargoIdentification) => {
    setSelectedIdentification(ident)
    setSelectedTripId(ident.trip_id || '')
    setReviewNotes(ident.review_notes || '')
    setResolveModalOpen(true)
  }

  // Confirmar vínculo manual
  const handleConfirmLink = async () => {
    if (!selectedIdentification) return
    if (!selectedTripId) {
      toast({
        title: 'Selecione uma viagem',
        description: 'Escolha a ordem de carregamento correta para vincular a esta NF-e.',
        variant: 'destructive',
      })
      return
    }

    setResolving(true)
    try {
      const res = await resolveCargoLink({
        identification_id: selectedIdentification.id,
        trip_id: selectedTripId,
        action: 'confirm',
        notes: reviewNotes.trim(),
      })
      toast({
        title: 'Vínculo confirmado com sucesso!',
        description: res.message,
      })
      setResolveModalOpen(false)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao confirmar vínculo',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setResolving(false)
    }
  }

  // Rejeitar vínculo manual
  const handleRejectLink = async () => {
    if (!selectedIdentification) return
    if (
      !window.confirm(
        'Deseja realmente rejeitar a associação desta carga? Ela permanecerá como divergência.',
      )
    )
      return

    setResolving(true)
    try {
      const res = await resolveCargoLink({
        identification_id: selectedIdentification.id,
        action: 'reject',
        notes: reviewNotes.trim() || 'Rejeitado pelo operador humano',
      })
      toast({
        title: 'Vínculo rejeitado!',
        description: res.message,
      })
      setResolveModalOpen(false)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao rejeitar vínculo',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setResolving(false)
    }
  }

  // Mapa de Documentos Fiscais para fácil lookup
  const fiscalMap = useMemo(() => {
    const map = new Map<string, ReceivedFiscalDocument>()
    for (const d of fiscalDocs) {
      map.set(d.id, d)
    }
    return map
  }, [fiscalDocs])

  // Filtragem Cargas Identificadas
  const filteredCargoIdentifications = useMemo(() => {
    return cargoIdentifications.filter((ident) => {
      if (cargoFilter === 'pending' && ident.match_status !== 'pending_human_review') return false
      if (cargoFilter === 'auto' && ident.match_status !== 'auto_matched') return false
      if (cargoFilter === 'confirmed' && ident.match_status !== 'manually_confirmed') return false
      if (
        cargoFilter === 'rejected' &&
        ident.match_status !== 'manually_rejected' &&
        ident.match_status !== 'duplicate_detected'
      )
        return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const doc = ident.expand?.fiscal_document_id || fiscalMap.get(ident.fiscal_document_id)
        const matchNfe = (doc?.nfe_number || '').toLowerCase().includes(q)
        const matchIssuer = (doc?.issuer_name || '').toLowerCase().includes(q)
        const matchPlate = (doc?.detected_plate || '').toLowerCase().includes(q)
        const matchTrip = (ident.trip_code || '').toLowerCase().includes(q)
        const matchReasons = (ident.divergence_reasons || '').toLowerCase().includes(q)
        return matchNfe || matchIssuer || matchPlate || matchTrip || matchReasons
      }
      return true
    })
  }, [cargoIdentifications, cargoFilter, searchTerm, fiscalMap])

  // Indicadores do Agente de Cargas
  const pendingReviewCount = cargoIdentifications.filter(
    (c) => c.match_status === 'pending_human_review',
  ).length
  const autoMatchedCount = cargoIdentifications.filter(
    (c) => c.match_status === 'auto_matched',
  ).length
  const manuallyConfirmedCount = cargoIdentifications.filter(
    (c) => c.match_status === 'manually_confirmed',
  ).length
  const duplicatesCount = cargoIdentifications.filter(
    (c) => c.match_status === 'duplicate_detected',
  ).length

  const getMatchStatusBadge = (status: string) => {
    switch (status) {
      case 'auto_matched':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Auto-Vinculado
          </Badge>
        )
      case 'pending_human_review':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] gap-1 font-bold animate-pulse">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Pendente Revisão Humana
          </Badge>
        )
      case 'manually_confirmed':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] gap-1">
            <Check className="h-3 w-3 text-blue-600" />
            Confirmado Manualmente
          </Badge>
        )
      case 'duplicate_detected':
        return (
          <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] gap-1 font-semibold">
            <ShieldCheck className="h-3 w-3 text-purple-600" />
            Duplicidade Fiscal Impedida
          </Badge>
        )
      case 'manually_rejected':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] gap-1">
            <X className="h-3 w-3 text-rose-600" />
            Rejeitado pelo Operador
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Central com Botões de Ação e Modal de Lógica da Tela */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-[10px] uppercase">
              Prioridade 1 & 2 • ED Integração
            </Badge>
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Agentes Ativos • Mínimo de Sinais:{' '}
              <strong className="text-white">
                {cargoConfig?.min_matching_signals || 2} coincidentes
              </strong>
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-400" />
            Central de Agentes Autônomos
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl mt-0.5">
            Triagem automatizada de e-mails e identificação inteligente de cargas cruzando NF-es com
            viagens, com proteção contra auto-vínculo ambíguo e prevenção de duplicidade fiscal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLogicModalOpen(true)}
            className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
          >
            <FileCode className="h-4 w-4 text-indigo-300" />
            Lógica da Tela
          </Button>

          <Button
            size="sm"
            onClick={handleRunRegularization}
            disabled={runningRegularization}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 shadow-sm"
          >
            {runningRegularization ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Regularizando Etapa 3...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" />
                Executar Etapa 3
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleRunCargo}
            disabled={runningCargo}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 shadow-sm"
          >
            {runningCargo ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Cruzando Cargas...
              </>
            ) : (
              <>
                <FileCheck2 className="h-4 w-4" />
                Identificar Cargas
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleRunEmails}
            disabled={runningEmails}
            className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold gap-1.5 shadow-sm"
          >
            {runningEmails ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Lendo E-mails...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                Coletar E-mails
              </>
            )}
          </Button>
        </div>
      </div>

      {/* FLUXO VISUAL EM 4 ETAPAS COM ETAPAS 1, 2 E 3 100% FUNCIONAIS */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Fluxo Operacional de Atendimento Autônomo
              </CardTitle>
              <CardDescription className="text-xs">
                Visão de ponta a ponta: E-mail ➔ Carga ➔ Emissão Fiscal/Regularização ➔ Envio
              </CardDescription>
            </div>
            <div className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md font-medium">
              Fase Atual: <strong className="text-emerald-700">Etapas 1, 2 e 3 Ativas</strong> •
              Etapa 4 Em Implantação
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {/* Etapa 1: E-mail recebido (100% Funcional) */}
            <div
              onClick={() => setActiveTab('emails')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                activeTab === 'emails'
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                  : 'border-emerald-500 bg-emerald-50/40 hover:border-emerald-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                  Etapa 1 • Ativa
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                  100% Funcional
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>E-mail Recebido</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Coleta via conectores Gmail/Outlook, extração segura de XML/PDF e classificação por
                regras aprovadas.
              </p>
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 font-semibold flex items-center justify-between">
                <span>{emailLogs.length} mensagens triadas</span>
                <span className="text-indigo-600 underline">Ver aba</span>
              </div>
            </div>

            {/* Etapa 2: Carga identificada (100% Funcional) */}
            <div
              onClick={() => setActiveTab('cargo')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                activeTab === 'cargo'
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                  : 'border-emerald-500 bg-emerald-50/40 hover:border-emerald-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                  Etapa 2 • Ativa
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                  100% Funcional
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <FileCheck2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Carga Identificada</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Cruzamento multi-sinal com viagens cadastradas, prevenção contra duplicidade fiscal
                e bloqueio de ambiguidades.
              </p>
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 font-semibold flex items-center justify-between">
                <span>{autoMatchedCount + manuallyConfirmedCount} vinculadas</span>
                <span className="text-amber-800 font-bold">{pendingReviewCount} pendentes</span>
              </div>
            </div>

            {/* Etapa 3: Documentos Emitidos & Regularização (NOVO: ATIVA) */}
            <div
              onClick={() => setActiveTab('emitted')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                activeTab === 'emitted'
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                  : 'border-indigo-500 bg-indigo-50/30 hover:border-indigo-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white uppercase tracking-wider">
                  Etapa 3 • Ativa
                </span>
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px] font-bold">
                  Regularização Real
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Documentos Emitidos</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Esteira legal: Averbação RCTR-C ➔ CIOT (IPEF) ➔ VPO ➔ CT-e (SEFAZ) ➔ MDF-e com
                status honesto.
              </p>
              <div className="mt-2.5 pt-2 border-t border-indigo-200/60 text-[11px] text-indigo-800 font-semibold flex items-center justify-between">
                <span>
                  {cteList.length} CT-es • {mdfeList.length} MDF-es
                </span>
                <span className="text-indigo-600 underline">Ver aba</span>
              </div>
            </div>

            {/* Etapa 4: Documentos enviados (Em Implantação) */}
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/70 relative opacity-90">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-600 text-white uppercase tracking-wider">
                  Etapa 4
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-400 bg-amber-50 text-amber-800 text-[10px]"
                >
                  Em Implantação
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Documentos Enviados</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Envio automatizado de DACTE e XML para tomador, motorista e embarcador com
                confirmação de entrega.
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] text-slate-400 italic">
                Próxima fase do ED Integração
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARDS DE INDICADORES DO AGENTE DE IDENTIFICAÇÃO DE CARGAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cargas Vinculadas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">
              {autoMatchedCount + manuallyConfirmedCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{autoMatchedCount}</span> automáticas
              • <span className="text-blue-600 font-semibold">{manuallyConfirmedCount}</span>{' '}
              manuais
            </p>
          </CardContent>
        </Card>

        <Card
          className={`shadow-2xs ${
            pendingReviewCount > 0
              ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-300'
              : 'border-slate-200'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Pendências de Revisão
            </CardTitle>
            <HelpCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-950">{pendingReviewCount}</div>
            <p className="text-xs text-amber-800 mt-1 font-medium">
              Ambiguidade ou divergência detectada
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-purple-900 uppercase tracking-wider">
              Duplicidades Bloqueadas
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-purple-950">{duplicatesCount}</div>
            <p className="text-xs text-slate-500 mt-1">CT-e já existente impedido</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Última Execução Cargas
            </CardTitle>
            <Clock className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-slate-800 truncate">
              {cargoConfig?.last_run_at
                ? new Date(cargoConfig.last_run_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  })
                : 'Recente'}
            </div>
            <p
              className="text-[11px] text-slate-500 mt-1 truncate"
              title={cargoConfig?.last_run_summary}
            >
              {cargoConfig?.last_run_summary || 'Monitoramento regular'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ABAS OPERACIONAIS: ETAPA 3 (REGULARIZAÇÃO), ETAPA 2 (CARGAS) E ETAPA 1 (E-MAILS) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Button
          size="sm"
          variant={activeTab === 'emitted' ? 'default' : 'outline'}
          onClick={() => setActiveTab('emitted')}
          className="text-xs font-bold gap-1.5 h-8 bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Layers className="h-4 w-4" />
          <span>Etapa 3: Documentos Emitidos & Regularização</span>
          <Badge className="ml-1 text-[10px] bg-white text-indigo-900 font-bold">
            {cteList.length + mdfeList.length}
          </Badge>
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'cargo' ? 'default' : 'outline'}
          onClick={() => setActiveTab('cargo')}
          className="text-xs font-semibold gap-1.5 h-8"
        >
          <FileCheck2 className="h-4 w-4" />
          <span>Etapa 2: Cargas Identificadas</span>
          <Badge variant="outline" className="ml-1 text-[10px]">
            {cargoIdentifications.length}
          </Badge>
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'emails' ? 'default' : 'outline'}
          onClick={() => setActiveTab('emails')}
          className="text-xs font-semibold gap-1.5 h-8"
        >
          <Mail className="h-4 w-4" />
          <span>Etapa 1: E-mails</span>
          <Badge variant="outline" className="ml-1 text-[10px]">
            {emailLogs.length}
          </Badge>
        </Button>
      </div>

      {/* CONTEÚDO DA ABA ETAPA 3: DOCUMENTOS EMITIDOS & REGULARIZAÇÃO */}
      {activeTab === 'emitted' && (
        <div className="space-y-4">
          {/* Banner de Status de Credenciais */}
          {!fiscalProviderConfigured ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">Provedor fiscal sem token configurado na tela Empresa</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400">
                    Os documentos fiscais gerados estão mantidos com integridade na fila com status{' '}
                    <strong>Aguardando Transmissão</strong>. Nenhuma autorização é simulada.
                  </p>
                </div>
              </div>
              <Link to="/empresa">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1 border-amber-400 font-semibold bg-white text-amber-900"
                >
                  Configurar Provedor
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Provedor Fiscal Conectado:</strong> Transmissão direta para SEFAZ
                  homologada e pronta para emissão oficial.
                </span>
              </div>
            </div>
          )}

          {/* Cards Rápidos de Visão da Regularização */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-slate-200">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">
                    CT-es na Fila / Prontos
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {cteList.filter((c) => c.status !== 'cancelled').length}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {cteList.filter((c) => c.status === 'authorized').length} autorizados •{' '}
                    {cteList.filter((c) => c.status === 'pending').length} na fila
                  </div>
                </div>
                <FileText className="h-7 w-7 text-indigo-500 stroke-1" />
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">
                    Manifestos MDF-e
                  </div>
                  <div className="text-xl font-bold text-slate-900">{mdfeList.length}</div>
                  <div className="text-[10px] text-slate-400">
                    {mdfeList.filter((m) => m.status === 'authorized').length} autorizados •{' '}
                    {mdfeList.filter((m) => m.status !== 'authorized').length} rascunhos/fila
                  </div>
                </div>
                <Layers className="h-7 w-7 text-indigo-500 stroke-1" />
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">
                    CIOTs (ANTT)
                  </div>
                  <div className="text-xl font-bold text-slate-900">{ciotList.length}</div>
                  <div className="text-[10px] text-slate-400">
                    {ciotList.filter((c) => c.status === 'registered').length} com comprovante •{' '}
                    {ciotList.filter((c) => c.status === 'pending').length} pendentes
                  </div>
                </div>
                <Receipt className="h-7 w-7 text-indigo-500 stroke-1" />
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">
                    Averbações RCTR-C
                  </div>
                  <div className="text-xl font-bold text-slate-900">{endorsementsList.length}</div>
                  <div className="text-[10px] text-slate-400">
                    {endorsementsList.filter((e) => e.status === 'averbada').length} confirmadas •{' '}
                    {endorsementsList.filter((e) => e.status !== 'averbada').length} na fila
                  </div>
                </div>
                <ShieldAlert className="h-7 w-7 text-indigo-500 stroke-1" />
              </CardContent>
            </Card>
          </div>

          {/* Alertas e Pendências da Orquestração */}
          {regularizationIssues.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/40 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Pendências Detectadas na Esteira Legal ({regularizationIssues.length})
                </CardTitle>
                <CardDescription className="text-xs text-amber-800">
                  Salvaguardas ativas: obrigações que exigem atenção operacional antes do despacho
                  da carga
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {regularizationIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-amber-200 rounded-lg flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {issue.trip_code}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase font-bold ${
                              issue.severity === 'bloqueio'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {issue.stage} • {issue.severity}
                          </Badge>
                        </div>
                        <p className="text-slate-700 text-xs">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grid de Tabelas: CT-e, MDF-e, CIOT e Averbações */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tabela CT-e */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <span>Conhecimentos (CT-e)</span>
                    <Badge variant="outline" className="text-xs">
                      {cteList.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    CT-es gerados com destaque do VPO
                  </CardDescription>
                </div>
                <Link to="/cte">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                    Ver Módulo
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">CT-e / Série</th>
                        <th className="p-2.5">Destinatário</th>
                        <th className="p-2.5">Valor Frete</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cteList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500 text-xs">
                            Nenhum CT-e gerado na esteira ainda.
                          </td>
                        </tr>
                      ) : (
                        cteList.slice(0, 4).map((cte) => (
                          <tr key={cte.id} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono font-bold text-slate-900">
                              CT-e {cte.cte_number}
                              <div className="text-[10px] text-slate-400 font-normal">
                                Série {cte.series}
                              </div>
                            </td>
                            <td className="p-2.5 max-w-[140px] truncate" title={cte.recipient_name}>
                              {cte.recipient_name}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800 whitespace-nowrap">
                              {(cte.total_cte_value || cte.freight_value || 0).toLocaleString(
                                'pt-BR',
                                {
                                  style: 'currency',
                                  currency: 'BRL',
                                },
                              )}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              {cte.status === 'authorized' ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                  Autorizado
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                                  Aguardando
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Tabela MDF-e */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    <span>Manifestos (MDF-e)</span>
                    <Badge variant="outline" className="text-xs">
                      {mdfeList.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Consolidação interestadual (Modelo 58)
                  </CardDescription>
                </div>
                <Link to="/mdfe">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                    Ver Módulo
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">MDF-e / Série</th>
                        <th className="p-2.5">Rota UFs</th>
                        <th className="p-2.5">CT-es Vinculados</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mdfeList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500 text-xs">
                            Nenhum manifesto gerado ainda.
                          </td>
                        </tr>
                      ) : (
                        mdfeList.slice(0, 4).map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono font-bold text-slate-900">
                              MDF-e {m.mdfe_number}
                              <div className="text-[10px] text-slate-400 font-normal">
                                Série {m.series}
                              </div>
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800">
                              {m.uf_origin} ➔ {m.uf_destination}
                            </td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                              {m.linked_cte_numbers || 'CT-es da Viagem'}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                {m.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Tabela CIOT */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-indigo-600" />
                    <span>CIOT (ANTT / IPEF)</span>
                    <Badge variant="outline" className="text-xs">
                      {ciotList.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Remuneração obrigatória do frete (Res. 5.862/2019)
                  </CardDescription>
                </div>
                <Link to="/ciot">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                    Ver Módulo
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Viagem / CIOT</th>
                        <th className="p-2.5">Perfil</th>
                        <th className="p-2.5">Provedor IPEF</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ciotList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500 text-xs">
                            Nenhum registro de CIOT na esteira.
                          </td>
                        </tr>
                      ) : (
                        ciotList.slice(0, 4).map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono font-bold text-slate-900">
                              {c.trip_code || 'Viagem'}
                              <div className="text-[10px] text-slate-500 font-normal">
                                {c.ciot_number || 'Código a emitir'}
                              </div>
                            </td>
                            <td className="p-2.5 uppercase font-medium text-slate-700 text-[10px]">
                              {c.carrier_profile}
                            </td>
                            <td className="p-2.5 text-slate-600 truncate max-w-[130px]">
                              {c.institution_provider || 'IPEF'}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <Badge
                                className={`text-[10px] ${
                                  c.status === 'registered'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {c.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Tabela Averbações Seguros */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-indigo-600" />
                    <span>Averbações RCTR-C</span>
                    <Badge variant="outline" className="text-xs">
                      {endorsementsList.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Dossiês de averbação obrigatória (Lei 14.599/2023)
                  </CardDescription>
                </div>
                <Link to="/seguros">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                    Ver Módulo
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Dossiê / Viagem</th>
                        <th className="p-2.5">Valor Declarado</th>
                        <th className="p-2.5">Protocolo</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {endorsementsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-500 text-xs">
                            Nenhum dossiê de seguro na esteira.
                          </td>
                        </tr>
                      ) : (
                        endorsementsList.slice(0, 4).map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-mono font-bold text-slate-900">
                              Dossiê #{e.id.slice(0, 6)}
                              <div className="text-[10px] text-slate-400 font-normal">
                                {e.is_mandatory ? 'RCTR-C Obrigatório' : 'Facultativo'}
                              </div>
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800">
                              {(e.declared_cargo_value || 0).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                            </td>
                            <td className="p-2.5 font-mono text-[10px] text-slate-600">
                              {e.endorsement_protocol || 'Aguardando AT&M'}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <Badge
                                className={`text-[10px] ${
                                  e.status === 'averbada'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {e.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA DE CARGAS IDENTIFICADAS */}
      {activeTab === 'cargo' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-200/80">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Documentos Fiscais & Vínculo com Viagens</span>
                  <Badge variant="outline" className="text-xs">
                    {filteredCargoIdentifications.length} de {cargoIdentifications.length} registros
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Acompanhamento de documentos XML cruzados pelo agente, ordens de carregamento
                  vinculadas e pendências
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link to="/email-agent-training">
                  <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                    <span>Parâmetros de Cruzamento</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadData}
                  disabled={loading}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Barra de Busca e Filtros de Carga */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por NF-e, emitente, placa ou código de viagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <Button
                  size="sm"
                  variant={cargoFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setCargoFilter('all')}
                  className="text-xs h-8 px-2.5"
                >
                  Todos ({cargoIdentifications.length})
                </Button>
                <Button
                  size="sm"
                  variant={cargoFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setCargoFilter('pending')}
                  className={`text-xs h-8 px-2.5 ${
                    pendingReviewCount > 0
                      ? 'border-amber-400 text-amber-900 bg-amber-50 font-bold'
                      : ''
                  }`}
                >
                  Pendências ({pendingReviewCount})
                </Button>
                <Button
                  size="sm"
                  variant={cargoFilter === 'auto' ? 'default' : 'outline'}
                  onClick={() => setCargoFilter('auto')}
                  className="text-xs h-8 px-2.5"
                >
                  Auto-Vínculos ({autoMatchedCount})
                </Button>
                <Button
                  size="sm"
                  variant={cargoFilter === 'confirmed' ? 'default' : 'outline'}
                  onClick={() => setCargoFilter('confirmed')}
                  className="text-xs h-8 px-2.5"
                >
                  Confirmados ({manuallyConfirmedCount})
                </Button>
                <Button
                  size="sm"
                  variant={cargoFilter === 'rejected' ? 'default' : 'outline'}
                  onClick={() => setCargoFilter('rejected')}
                  className="text-xs h-8 px-2.5"
                >
                  Bloqueados/Rejeitados ({duplicatesCount})
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredCargoIdentifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <FileCheck2 className="h-8 w-8 mx-auto text-slate-300 stroke-1 mb-2" />
                <p className="font-semibold text-slate-700">
                  Nenhum documento encontrado para o filtro atual.
                </p>
                <p className="text-slate-400 mt-0.5">
                  Clique em &ldquo;Identificar Cargas&rdquo; para cruzar as NF-es com as viagens
                  cadastradas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">NF-e & Chave de Acesso</th>
                      <th className="p-3">Emitente & Destinatário</th>
                      <th className="p-3">Sinais Detectados</th>
                      <th className="p-3">Viagem Vinculada</th>
                      <th className="p-3">Status da Identificação</th>
                      <th className="p-3 text-right">Ação Operacional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCargoIdentifications.map((ident) => {
                      const doc =
                        ident.expand?.fiscal_document_id || fiscalMap.get(ident.fiscal_document_id)
                      const signals = Array.isArray(ident.matching_signals)
                        ? ident.matching_signals
                        : typeof ident.matching_signals === 'string' && ident.matching_signals
                          ? JSON.parse(ident.matching_signals)
                          : []

                      return (
                        <tr key={ident.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 max-w-xs">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>NF-e nº {doc?.nfe_number || '—'}</span>
                              {doc?.series && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                  Série {doc.series}
                                </Badge>
                              )}
                            </div>
                            <div
                              className="font-mono text-[10px] text-slate-500 truncate mt-0.5"
                              title={doc?.access_key}
                            >
                              Chave: {doc?.access_key}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Valor:{' '}
                              {(doc?.total_value || 0).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}{' '}
                              • Peso: {((doc?.weight_kg || 0) / 1000).toFixed(1)}t
                            </div>
                          </td>

                          <td className="p-3 max-w-xs">
                            <div
                              className="font-semibold text-slate-800 truncate"
                              title={doc?.issuer_name}
                            >
                              De: {doc?.issuer_name || '—'}
                            </div>
                            <div
                              className="text-[10px] text-slate-500 truncate mt-0.5"
                              title={doc?.recipient_name}
                            >
                              Para: {doc?.recipient_name || '—'}
                            </div>
                            {doc?.detected_carrier_name && (
                              <div className="text-[10px] text-indigo-600 font-medium truncate mt-0.5">
                                Transp: {doc.detected_carrier_name}
                              </div>
                            )}
                          </td>

                          <td className="p-3 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {doc?.detected_plate ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] bg-slate-50 font-mono"
                                >
                                  Placa: {doc.detected_plate}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] text-amber-700 border-amber-300"
                                >
                                  Sem Placa no XML
                                </Badge>
                              )}
                              {doc?.detected_driver_name && (
                                <Badge variant="outline" className="text-[9px] bg-slate-50">
                                  Condutor: {doc.detected_driver_name.split(' ')[0]}
                                </Badge>
                              )}
                            </div>
                            {signals.length > 0 && (
                              <div className="text-[10px] text-emerald-700 font-medium mt-1">
                                {signals.length} sinais confirmados
                              </div>
                            )}
                            {ident.divergence_reasons && (
                              <div className="text-[10px] text-amber-800 bg-amber-50 p-1 rounded mt-1 border border-amber-200 leading-tight">
                                {ident.divergence_reasons}
                              </div>
                            )}
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            {ident.trip_code ? (
                              <div>
                                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                                  {ident.trip_code}
                                </span>
                                {ident.confidence_score > 0 && (
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    Confiança: {ident.confidence_score}%
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-amber-800 font-medium text-xs">
                                <span>Não vinculada</span>
                                {ident.possible_trip_ids && (
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Opções: {ident.possible_trip_ids}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            {getMatchStatusBadge(ident.match_status)}
                            {ident.cte_ready && (
                              <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Apto para emissão
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-right whitespace-nowrap">
                            {ident.match_status === 'pending_human_review' ? (
                              <Button
                                size="sm"
                                onClick={() => handleOpenResolveModal(ident)}
                                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold gap-1 h-7"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                Resolver Pendência
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenResolveModal(ident)}
                                className="text-xs h-7 text-slate-600"
                              >
                                Detalhes / Alterar
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CONTEÚDO DA ABA DE E-MAILS (ETAPA 1) */}
      {activeTab === 'emails' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Histórico de E-mails Coletados (Etapa 1)</span>
                  <Badge variant="outline" className="text-xs">
                    {emailLogs.length} registros
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Triagem e extração segura de XML e anexos executada pelo agente
                </CardDescription>
              </div>

              <Link to="/email-agent-training">
                <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                  <span>Regras de E-mail</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Data / Provedor</th>
                    <th className="p-3">Remetente & Assunto</th>
                    <th className="p-3">Classificação</th>
                    <th className="p-3">Documentos Extraídos</th>
                    <th className="p-3">Ação Executada</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {log.received_date
                            ? new Date(log.received_date).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })
                            : 'Recente'}
                        </div>
                        <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 mt-0.5">
                          {log.provider}
                        </Badge>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={log.subject}>
                          {log.subject}
                        </div>
                        <div
                          className="text-[11px] text-slate-500 truncate mt-0.5"
                          title={log.sender}
                        >
                          De: {log.sender}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">
                          {log.classification}
                        </Badge>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="text-slate-800 text-xs font-medium">
                          {log.attachments_summary || 'Nenhum anexo'}
                        </div>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="text-slate-700 text-xs leading-snug">
                          {log.execution_result || 'Triagem realizada'}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          className={`text-[10px] ${
                            log.process_status === 'processed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.process_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL DE RESOLUÇÃO MANUAL DE VÍNCULO DE CARGA (RESPONSÁVEL HUMANO) */}
      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-indigo-600" />
              <span>Revisão Humana de Vínculo de Carga</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Valide as ordens de carregamento possíveis e confirme a associação correta ou rejeite
              a carga.
            </DialogDescription>
          </DialogHeader>

          {selectedIdentification && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Resumo do Documento Fiscal */}
              {(() => {
                const doc =
                  selectedIdentification.expand?.fiscal_document_id ||
                  fiscalMap.get(selectedIdentification.fiscal_document_id)
                return (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">
                        NF-e nº {doc?.nfe_number || '—'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Valor:{' '}
                        {(doc?.total_value || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <strong>Emitente:</strong> {doc?.issuer_name} (CNPJ: {doc?.issuer_cnpj})
                      </div>
                      <div>
                        <strong>Destinatário:</strong> {doc?.recipient_name}
                      </div>
                      <div>
                        <strong>Placa Detectada no XML:</strong>{' '}
                        {doc?.detected_plate ? (
                          <span className="font-mono font-bold text-slate-900">
                            {doc.detected_plate}
                          </span>
                        ) : (
                          <span className="text-amber-700 italic">Não informada</span>
                        )}
                      </div>
                      <div>
                        <strong>Peso:</strong> {((doc?.weight_kg || 0) / 1000).toFixed(1)} toneladas
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Alerta de Divergência ou Ambiguidade */}
              {selectedIdentification.divergence_reasons && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Motivo da Intervenção Humana:</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {selectedIdentification.divergence_reasons}
                  </p>
                </div>
              )}

              {/* Seleção da Viagem / Ordem de Carregamento Correta */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  Selecione a Ordem de Carregamento (Viagem) Correspondente:
                </label>
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Selecione uma viagem cadastrada --</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.trip_code} • {t.origin_city}/{t.origin_state} ➔ {t.destination_city}/
                      {t.destination_state} ({t.cargo_type} - {(t.weight_kg / 1000).toFixed(1)}t)
                    </option>
                  ))}
                </select>
              </div>

              {/* Observações da Revisão Humana */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  Parecer / Observação do Responsável:
                </label>
                <Input
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Ex.: Confirmado vínculo com veículo reserva após conferência com expedição."
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-3 border-t flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRejectLink}
                  disabled={resolving}
                  className="text-xs"
                >
                  Rejeitar Vínculo
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResolveModalOpen(false)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConfirmLink}
                    disabled={resolving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1"
                  >
                    {resolving ? 'Salvando...' : 'Confirmar Vínculo da Carga'}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Documentação Viva da Tela */}
      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={CENTRAL_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
