import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  getEmailAgentConfig,
  getEmailProcessingLogs,
  triggerEmailAgentRun,
} from '@/services/agentService'
import type { EmailAgentConfig, EmailProcessingLog } from '@/types/agent'
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
  Filter,
  FileText,
  HelpCircle,
  FileCode,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

const CENTRAL_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Central de Agentes',
  screenBadge: 'Prioridade 1 • ED Integração',
  lastUpdate: '2026-10-28',
  version: '1.0.0',
  objective:
    'Painel operacional unificado para visualização do fluxo de trabalho autônomo (E-mail recebido → Carga identificada → Documentos emitidos → Documentos enviados). Nesta fase (Prioridade 1), a etapa 1 (Agente de E-mails) está 100% funcional com conectores Gmail/Outlook, classificação estrita por regras aprovadas e controle anti-duplicação. As etapas seguintes são apresentadas no fluxo com status explícito de "Em Implantação".',
  realFeatures: [
    'Fluxo visual em 4 etapas detalhando o status real de cada uma (Etapa 1 ativa; Etapas 2, 3 e 4 em implantação)',
    'Indicadores em tempo real: e-mails processados na última execução, exceções/pendências de triagem, total histórico e status do agente',
    'Disparo manual ("Executar agora") que aciona o hook do backend, sincroniza caixas conectadas e gera auditoria',
    'Listagem de e-mails processados com remetente, assunto, classificação, data, anexos seguros e ações executadas',
    'Filtros por status (Todos, Processados com Sucesso, Exceções/Necessitam Análise, Erros/Duplicados)',
    'Busca textual rápida por assunto, remetente ou código de viagem',
    'Detecção segura de anexos (XML de NF-e, ZIP, RAR, PDF) sem execução de código externo',
    'Controle anti-duplicação por message_id das caixas de correio',
    'Avisos e notificações de situações não previstas encaminhadas para intervenção humana responsável',
  ],
  fieldsAndButtons: [
    {
      name: 'Executar agora',
      type: 'Botão de Ação Primária',
      purpose:
        'Dispara manualmente o ciclo de coleta e classificação do Agente de E-mails via rota autenticada /backend/v1/agents/emails/run-now, atualizando indicadores e gravando em audit_logs.',
    },
    {
      name: 'Atualizar Dados',
      type: 'Botão Secundário',
      purpose: 'Recarrega os logs mais recentes de email_processing_logs e a configuração.',
    },
    {
      name: 'Campo de Busca',
      type: 'Input de Texto',
      purpose:
        'Filtra dinamicamente a tabela por remetente, assunto ou código da viagem vinculada.',
    },
    {
      name: 'Filtros de Status',
      type: 'Botões de Alternância',
      purpose: 'Segmenta logs entre Todos, Concluídos, Exceções (Pendências) e Duplicados/Erros.',
    },
    {
      name: 'Configurar Regras e Intervalo',
      type: 'Link de Navegação',
      purpose: 'Abre a tela administrativa de Treinamento do Agente de E-mails.',
    },
  ],
  businessRules: [
    'O agente NUNCA executa instruções fiscais ou operacionais contidas no corpo do e-mail recebido; opera estritamente com base nas regras treinadas e aprovadas pelo Administrador.',
    'Cada mensagem possui deduplicação pelo message_id único do provedor de e-mail; e-mails já processados são ignorados sem duplicação.',
    'Situações não categorizadas ou divergentes são classificadas como "Solicitação Desconhecida / Exceção" e geram notificação para responsável humano.',
    'Anexos aceitos para extração segura são limitados a XML, ZIP, RAR e PDF para conferência de NF-e, CT-e e documentos complementares.',
    'As etapas 2 (Carga identificada), 3 (Documentos emitidos) e 4 (Documentos enviados) do fluxo visual são exibidas com status transparente de "Em Implantação", sem simulação indevida.',
  ],
  agentsAndAutomations: [
    'Hook do backend (email_agent.pb.js) executado periodicamente via cronAdd a cada intervalo configurado (mínimo 2 minutos).',
    'Acesso às caixas de correio dos próprios usuários via $connectors.execute (GMAIL_FETCH_EMAILS e OUTLOOK_LIST_MESSAGES) sem credenciais em texto plano.',
    'Geração automática de notificações no NotificationCenter para e-mails que caem na fila de exceção.',
    'Rastreabilidade integral no audit_logs para cada disparo manual ou automático do agente.',
  ],
  validations: [
    'Validação de message_id único para prevenção de reprocessamento indevido.',
    'Sanitização de anexos e limitação de visualização de trechos do e-mail (snippet).',
    'Verificação de autenticação via Bearer token antes de autorizar o disparo manual.',
  ],
  integrations: [
    'Conectores Gmail (GMAIL_FETCH_EMAILS) e Outlook (OUTLOOK_LIST_MESSAGES) na conta do usuário',
    'PocketBase REST API e rotas sob /backend/v1/agents/emails/run-now',
    'Central de notificações fine_notifications e registro audit_logs',
  ],
  flowsAndDependencies: [
    'E-mail Recebido (Gmail/Outlook) ➔ Triagem por Regras Aprovadas ➔ Se reconhecido: vincula viagem/NF-e ➔ Se desconhecido: gera Exceção com responsável ➔ Gravação de Log.',
    'Etapa 2 em diante depende da finalização dos módulos de emissão e despacho na fase seguinte do projeto.',
  ],
  dataSourceAndDestination: {
    origin:
      'Caixa de e-mail conectada do usuário via conectores Gmail/Outlook e coleção email_agent_rules.',
    destination:
      'Coleções PocketBase: email_processing_logs, email_agent_configs, audit_logs e fine_notifications.',
    persistence: 'Banco SQLite via PocketBase v0.36.',
  },
  permissions: [
    {
      role: 'Administrador',
      access: 'Acesso total: visualização, disparo manual e acesso à tela de treinamento.',
    },
    {
      role: 'Gestor Operacional',
      access: 'Acesso à Central de Agentes e monitoramento de exceções.',
    },
    {
      role: 'Financeiro',
      access: 'Acesso à Central de Agentes para conferência de NF-e e CT-e recebidos.',
    },
    {
      role: 'Operador Logístico',
      access: 'Acesso à Central de Agentes para visualização de documentos vinculados.',
    },
    {
      role: 'Somente Leitura',
      access: 'Visualização de logs e status da Central de Agentes sem permissão de disparo.',
    },
  ],
  notificationsAndErrors: [
    'Notificação imediata ao usuário na tela via toast em caso de sucesso ou falha do disparo manual.',
    'Notificação persistente no centro de alertas para e-mails que caem como pendência/exceção.',
  ],
  inDevelopmentAlert:
    'Nesta fase (Prioridade 1 do ED Integração), apenas a Etapa 1 (E-mail recebido e triagem de documentos) está funcional. As etapas "Carga identificada", "Documentos emitidos" e "Documentos enviados" estão demarcadas como "Em Implantação" e entrarão nas próximas fases.',
}

export const AgentsCenterPage: React.FC = () => {
  const { toast } = useToast()
  const [config, setConfig] = useState<EmailAgentConfig | null>(null)
  const [logs, setLogs] = useState<EmailProcessingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [logicModalOpen, setLogicModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'processed' | 'needs_analysis' | 'duplicate'
  >('all')

  const loadData = async () => {
    setLoading(true)
    try {
      const [cfg, lgList] = await Promise.all([getEmailAgentConfig(), getEmailProcessingLogs(100)])
      setConfig(cfg)
      setLogs(lgList)
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

  useEffect(() => {
    loadData()
  }, [])

  const handleRunNow = async () => {
    setRunning(true)
    try {
      const res = await triggerEmailAgentRun()
      toast({
        title: 'Agente executado com sucesso!',
        description: res.details
          ? `${res.details.processedNow} novos e-mails processados (${res.details.exceptionsCount} exceções, ${res.details.duplicateCount} duplicados ignorados).`
          : res.message,
      })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Falha na execução do agente',
        description: msg || 'Ocorreu um erro ao acionar o agente.',
        variant: 'destructive',
      })
    } finally {
      setRunning(false)
    }
  }

  // Filtragem
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== 'all' && log.process_status !== statusFilter) {
        return false
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchSubject = log.subject.toLowerCase().includes(q)
        const matchSender = log.sender.toLowerCase().includes(q)
        const matchTrip = (log.trip_code || '').toLowerCase().includes(q)
        const matchCustomer = (log.customer_identified || '').toLowerCase().includes(q)
        return matchSubject || matchSender || matchTrip || matchCustomer
      }
      return true
    })
  }, [logs, statusFilter, searchTerm])

  const exceptionsCount = logs.filter((l) => l.process_status === 'needs_analysis').length
  const processedSuccessCount = logs.filter((l) => l.process_status === 'processed').length
  const duplicatesCount = logs.filter(
    (l) => l.is_duplicate || l.process_status === 'duplicate',
  ).length

  const getClassificationBadge = (type: string) => {
    switch (type) {
      case 'nfe_received':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
            NF-e Recebida
          </Badge>
        )
      case 'cte_request':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
            Solicitação CT-e
          </Badge>
        )
      case 'complementary_doc':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
            Doc. Complementar
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
            Não Previsto / Análise
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Processado
          </Badge>
        )
      case 'needs_analysis':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] gap-1 font-semibold">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            Exceção / Análise
          </Badge>
        )
      case 'duplicate':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]">
            Duplicado
          </Badge>
        )
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
            {status}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Central com Botão de Ação e Modal de Lógica da Tela */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-[10px] uppercase">
              Prioridade 1 • ED Integração
            </Badge>
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {config?.is_active ? 'Agente Ativo' : 'Agente Pausado'} • Intervalo:{' '}
              {config?.check_interval_minutes || 15} min
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-400" />
            Central de Agentes Autônomos
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl mt-0.5">
            Monitoramento do ciclo de atendimento: recepção de e-mails, extração segura de
            documentos, regras treináveis aprovadas e controle de exceções com intervenção humana.
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
            onClick={handleRunNow}
            disabled={running}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 shadow-sm"
          >
            {running ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                Executar Agora
              </>
            )}
          </Button>
        </div>
      </div>

      {/* FLUXO VISUAL EM 4 ETAPAS */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Fluxo Operacional de Atendimento Autônomo
              </CardTitle>
              <CardDescription className="text-xs">
                Visão de ponta a ponta do processo logístico de documentos
              </CardDescription>
            </div>
            <div className="text-[11px] text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md font-medium">
              Fase Atual: <strong className="text-indigo-600">Etapa 1 Funcional</strong> • Etapas 2,
              3 e 4 Em Implantação
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {/* Etapa 1: E-mail recebido (100% Funcional) */}
            <div className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 relative shadow-2xs">
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
                Coleta via conectores Gmail/Outlook, extração segura de XML/PDF/ZIP e classificação
                por regras aprovadas.
              </p>
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800 font-semibold flex items-center justify-between">
                <span>{processedSuccessCount} processados</span>
                <span>{exceptionsCount} exceções</span>
              </div>
            </div>

            {/* Etapa 2: Carga identificada (Em Implantação) */}
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/70 relative opacity-90">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-600 text-white uppercase tracking-wider">
                  Etapa 2
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-400 bg-amber-50 text-amber-800 text-[10px]"
                >
                  Em Implantação
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <FileCheck2 className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Carga Identificada</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cruzamento automático da NF-e com pedidos, remetente, destinatário e veículos em
                trânsito.
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] text-slate-400 italic">
                Próxima fase do ED Integração
              </div>
            </div>

            {/* Etapa 3: Documentos emitidos (Em Implantação) */}
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/70 relative opacity-90">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-600 text-white uppercase tracking-wider">
                  Etapa 3
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-400 bg-amber-50 text-amber-800 text-[10px]"
                >
                  Em Implantação
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Documentos Emitidos</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Geração de minuta de CT-e com destaque de Vale Pedágio Obrigatório (Lei 10.209/01) e
                conferência prévia.
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] text-slate-400 italic">
                Sem autorização fiscal simulada
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
                confirmação de leitura.
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] text-slate-400 italic">
                Próxima fase do ED Integração
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARDS DE INDICADORES / MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Processado
            </CardTitle>
            <Mail className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">
              {config?.processed_count_total || logs.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{processedSuccessCount}</span>{' '}
              classificados com sucesso
            </p>
          </CardContent>
        </Card>

        <Card
          className={`shadow-2xs ${exceptionsCount > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Exceções / Pendências
            </CardTitle>
            <HelpCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-950">{exceptionsCount}</div>
            <p className="text-xs text-amber-700 mt-1">Exigem intervenção manual de responsável</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Duplicados Ignorados
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">{duplicatesCount}</div>
            <p className="text-xs text-slate-500 mt-1">Deduplicação automática por message_id</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Última Execução
            </CardTitle>
            <Clock className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-slate-800 truncate">
              {config?.last_run_at
                ? new Date(config.last_run_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  })
                : 'Não executado'}
            </div>
            <p
              className="text-[11px] text-slate-500 mt-1 truncate"
              title={config?.last_run_status || 'Operação ativa'}
            >
              {config?.last_run_status || 'Monitoramento regular'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABELA DE HISTÓRICO DE E-MAILS E DOCUMENTOS */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-200/80">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Histórico de E-mails & Ações do Agente</span>
                <Badge variant="outline" className="text-xs">
                  {filteredLogs.length} registros
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Acompanhamento das mensagens recebidas, arquivos extraídos e ações executadas
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link to="/email-agent-training">
                <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                  <span>Regras e Treinamento</span>
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

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por remetente, assunto ou código de viagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="text-xs h-8 px-2.5"
              >
                Todos ({logs.length})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'processed' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('processed')}
                className="text-xs h-8 px-2.5"
              >
                Processados ({processedSuccessCount})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'needs_analysis' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('needs_analysis')}
                className={`text-xs h-8 px-2.5 ${exceptionsCount > 0 ? 'border-rose-300 text-rose-700' : ''}`}
              >
                Exceções ({exceptionsCount})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'duplicate' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('duplicate')}
                className="text-xs h-8 px-2.5"
              >
                Duplicados ({duplicatesCount})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Mail className="h-8 w-8 mx-auto text-slate-300 stroke-1 mb-2" />
              <p className="font-semibold text-slate-700">
                Nenhum e-mail encontrado para o filtro atual.
              </p>
              <p className="text-slate-400 mt-0.5">
                Clique em &ldquo;Executar Agora&rdquo; para sincronizar mensagens das caixas de
                correio conectadas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Data / Provedor</th>
                    <th className="p-3">Remetente & Assunto</th>
                    <th className="p-3">Classificação</th>
                    <th className="p-3">Documentos Extraídos</th>
                    <th className="p-3">Ação Executada / Regra</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
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
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase tracking-wider px-1 py-0 mt-0.5"
                        >
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
                        {log.customer_identified && (
                          <div className="text-[10px] text-indigo-600 font-medium truncate mt-0.5">
                            Cliente: {log.customer_identified}
                          </div>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {getClassificationBadge(log.classification)}
                        {log.trip_code && (
                          <div className="text-[10px] font-mono text-indigo-700 mt-1 font-semibold">
                            Viagem: {log.trip_code}
                          </div>
                        )}
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="text-slate-800 text-xs font-medium">
                          {log.attachments_summary || 'Nenhum anexo'}
                        </div>
                        {log.snippet && (
                          <div
                            className="text-[10px] text-slate-400 line-clamp-1 mt-0.5"
                            title={log.snippet}
                          >
                            &ldquo;{log.snippet}&rdquo;
                          </div>
                        )}
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="text-slate-700 text-xs leading-snug">
                          {log.execution_result || 'Triagem realizada'}
                        </div>
                        {log.matched_rule_name && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                            Regra: {log.matched_rule_name}
                          </div>
                        )}
                        {log.exception_details && (
                          <div className="text-[10px] text-rose-600 font-medium mt-1">
                            Alerta: {log.exception_details}
                          </div>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {getStatusBadge(log.process_status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Documentação Viva da Tela */}
      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={CENTRAL_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
