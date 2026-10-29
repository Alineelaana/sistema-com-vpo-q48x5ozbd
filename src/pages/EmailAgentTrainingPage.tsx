import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  updateEmailAgentConfig,
  getEmailAgentRules,
  createEmailAgentRule,
  updateEmailAgentRule,
  deleteEmailAgentRule,
} from '@/services/agentService'
import type {
  EmailAgentConfig,
  EmailAgentRule,
  EmailTriggerType,
  EmailActionType,
} from '@/types/agent'
import { ScreenLogicModal, type ScreenLogicDoc } from '@/components/ScreenLogicModal'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import {
  Sliders,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  RotateCcw,
  Sparkles,
  Link2,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'

const TRAINING_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Treinamento do Agente de E-mails',
  screenBadge: 'Administração & Parâmetros • ED Integração',
  lastUpdate: '2026-10-28',
  version: '1.0.0',
  objective:
    'Área administrativa para parametrização do Agente de E-mails, conexão de caixas postais do próprio usuário (Gmail/Outlook sem armazenamento de senhas), definição do intervalo de verificação (mínimo 2 minutos), ativação/desativação do agente e gestão das regras treináveis aprovadas.',
  realFeatures: [
    'Gestão completa de regras treináveis: criação, edição, ativação/desativação e exclusão',
    'Suporte aos 4 tipos de classificação: NF-e recebida → Iniciar processo; Solicitação de CT-e → Identificar carga; Documento complementar → Vincular à operação; Solicitação desconhecida → Encaminhar para análise',
    'Configuração do intervalo de verificação automática em minutos (validação de mínimo 2 minutos e máximo 1440 minutos)',
    'Interruptor de ativação/desativação operacional do agente',
    'Conexão segura de caixas Gmail e Outlook via ConnectorButton injetado (modo cada usuário conecta sua conta, sem guardar senhas)',
    'Aviso mandatório de segurança: o agente NUNCA executa instruções externas vindas de e-mails — apenas as regras aprovadas nesta tela',
  ],
  fieldsAndButtons: [
    {
      name: 'Salvar Configurações do Agente',
      type: 'Botão de Ação',
      purpose:
        'Grava o intervalo em minutos e o status ativo/pausado na coleção email_agent_configs.',
    },
    {
      name: 'Conectar Gmail / Conectar Outlook',
      type: 'Botão de Conector OAuth',
      purpose:
        'Abre fluxo de consentimento seguro da conta do próprio usuário via skipConnectors sem exigir senha.',
    },
    {
      name: 'Nova Regra de Treinamento',
      type: 'Botão de Ação / Modal',
      purpose: 'Abre formulário para criação de nova regra de classificação e ação vinculada.',
    },
    {
      name: 'Editar / Excluir Regra',
      type: 'Botões de Linha',
      purpose:
        'Permite alterar padrões de palavras-chave, remetente, extensões e prioridade da regra, ou removê-la.',
    },
  ],
  businessRules: [
    'O agente NUNCA executa comandos, instruções ou solicitações contidas no corpo ou no assunto dos e-mails. Ele apenas avalia correspondência com as regras cadastradas e aprovadas nesta tela.',
    'O intervalo mínimo de verificação aceito pelo sistema e pelo cron é de 2 minutos para evitar sobrecarga nas APIs de e-mail.',
    'Apenas usuários com perfil Administrador podem gerenciar ou aprovar regras de treinamento do agente.',
    'Regras ativas são executadas em ordem de prioridade (order_priority ascendente).',
  ],
  agentsAndAutomations: [
    'Cron do backend (email_agent.pb.js) lê o intervalo configurado nesta tela para disparar as verificações.',
    'Regras aprovadas são consumidas diretamente pelo hook nas coletas periódicas e manuais.',
  ],
  validations: [
    'Intervalo deve ser um número inteiro maior ou igual a 2.',
    'Campos de nome e classificação são obrigatórios na criação de regra.',
  ],
  integrations: [
    'Conectores Gmail e Outlook via ConnectorButton injetado e skipConnectors',
    'PocketBase collections email_agent_configs e email_agent_rules',
  ],
  flowsAndDependencies: [
    'Regras aprovadas aqui alimentam o hook email_agent.pb.js que gera os registros vistos na Central de Agentes.',
  ],
  dataSourceAndDestination: {
    origin: 'Entrada do administrador na interface web e conectores Gmail/Outlook.',
    destination: 'Coleções email_agent_configs e email_agent_rules no PocketBase.',
    persistence: 'Banco SQLite via PocketBase v0.36.',
  },
  permissions: [
    {
      role: 'Administrador',
      access: 'Acesso total: gerenciar parâmetros, criar, editar e excluir regras.',
    },
    {
      role: 'Outros perfis',
      access: 'Bloqueado por padrão no RBAC (restrito a gestores/administradores).',
    },
  ],
  notificationsAndErrors: [
    'Validação visual de campos obrigatórios e notificações toast de confirmação.',
  ],
}

export const EmailAgentTrainingPage: React.FC = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [config, setConfig] = useState<EmailAgentConfig | null>(null)
  const [rules, setRules] = useState<EmailAgentRule[]>([])
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  // Config Form
  const [intervalMinutes, setIntervalMinutes] = useState(15)
  const [agentActive, setAgentActive] = useState(true)

  // Modal Regra
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<EmailAgentRule | null>(null)
  const [ruleName, setRuleName] = useState('')
  const [ruleDesc, setRuleDesc] = useState('')
  const [triggerType, setTriggerType] = useState<EmailTriggerType>('nfe_received')
  const [actionType, setActionType] = useState<EmailActionType>('start_process')
  const [subjectKeywords, setSubjectKeywords] = useState('')
  const [senderPattern, setSenderPattern] = useState('')
  const [fileExtensions, setFileExtensions] = useState('')
  const [targetProcess, setTargetProcess] = useState('')
  const [priority, setPriority] = useState(1)
  const [ruleActive, setRuleActive] = useState(true)
  const [savingRule, setSavingRule] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [cfg, rList] = await Promise.all([getEmailAgentConfig(), getEmailAgentRules()])
      if (cfg) {
        setConfig(cfg)
        setIntervalMinutes(cfg.check_interval_minutes || 15)
        setAgentActive(cfg.is_active)
      }
      setRules(rList)
    } catch (err) {
      console.error('Erro ao carregar dados de treinamento:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as configurações do agente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (intervalMinutes < 2) {
      toast({
        title: 'Intervalo inválido',
        description: 'O intervalo mínimo de verificação permitido é de 2 minutos.',
        variant: 'destructive',
      })
      return
    }

    setSavingConfig(true)
    try {
      if (config) {
        const updated = await updateEmailAgentConfig(config.id, {
          check_interval_minutes: intervalMinutes,
          is_active: agentActive,
          status: agentActive ? 'active' : 'paused',
        })
        setConfig(updated)
        toast({
          title: 'Configurações salvas!',
          description: `Intervalo definido para ${intervalMinutes} minutos. Status: ${agentActive ? 'Ativo' : 'Pausado'}.`,
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao salvar configurações',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSavingConfig(false)
    }
  }

  const handleOpenRuleModal = (rule?: EmailAgentRule) => {
    if (rule) {
      setEditingRule(rule)
      setRuleName(rule.name)
      setRuleDesc(rule.description || '')
      setTriggerType(rule.trigger_type)
      setActionType(rule.action_type)
      setSubjectKeywords(rule.subject_keywords || '')
      setSenderPattern(rule.sender_pattern || '')
      setFileExtensions(rule.file_extensions || '')
      setTargetProcess(rule.action_target_process || '')
      setPriority(rule.order_priority || 1)
      setRuleActive(rule.is_active)
    } else {
      setEditingRule(null)
      setRuleName('')
      setRuleDesc('')
      setTriggerType('nfe_received')
      setActionType('start_process')
      setSubjectKeywords('')
      setSenderPattern('')
      setFileExtensions('xml,pdf,zip')
      setTargetProcess('Triagem de NF-e')
      setPriority(rules.length + 1)
      setRuleActive(true)
    }
    setRuleModalOpen(true)
  }

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome descritivo para a regra.',
        variant: 'destructive',
      })
      return
    }

    setSavingRule(true)
    try {
      const adminIdentity = user ? `${user.name || user.email} (${user.email})` : 'Administrador'
      if (editingRule) {
        await updateEmailAgentRule(editingRule.id, {
          name: ruleName.trim(),
          description: ruleDesc.trim(),
          trigger_type: triggerType,
          action_type: actionType,
          subject_keywords: subjectKeywords.trim(),
          sender_pattern: senderPattern.trim(),
          file_extensions: fileExtensions.trim(),
          action_target_process: targetProcess.trim(),
          order_priority: priority,
          is_active: ruleActive,
          approval_status: 'approved',
          approved_by: adminIdentity,
          approved_at: new Date().toISOString(),
        })
        toast({ title: 'Regra atualizada com sucesso!' })
      } else {
        await createEmailAgentRule({
          name: ruleName.trim(),
          description: ruleDesc.trim(),
          trigger_type: triggerType,
          action_type: actionType,
          subject_keywords: subjectKeywords.trim(),
          sender_pattern: senderPattern.trim(),
          file_extensions: fileExtensions.trim(),
          action_target_process: targetProcess.trim(),
          order_priority: priority,
          is_active: ruleActive,
          approval_status: 'approved',
          approved_by: adminIdentity,
          approved_at: new Date().toISOString(),
        })
        toast({ title: 'Regra criada e aprovada!' })
      }
      setRuleModalOpen(false)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao salvar regra',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSavingRule(false)
    }
  }

  const handleToggleRuleStatus = async (rule: EmailAgentRule) => {
    try {
      await updateEmailAgentRule(rule.id, {
        is_active: !rule.is_active,
      })
      toast({
        title: !rule.is_active ? 'Regra ativada!' : 'Regra pausada!',
      })
      await loadData()
    } catch {
      toast({
        title: 'Erro ao alternar status da regra',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteRule = async (rule: EmailAgentRule) => {
    if (!window.confirm(`Deseja realmente excluir a regra "${rule.name}"?`)) return
    try {
      await deleteEmailAgentRule(rule.id)
      toast({ title: 'Regra excluída com sucesso!' })
      await loadData()
    } catch {
      toast({ title: 'Erro ao excluir regra', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Tela de Treinamento */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-[10px] uppercase">
              Área Administrativa
            </Badge>
            <span className="text-xs text-slate-300">
              Conexões Seguras • Intervalo Programado • Regras Autorizadas
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight flex items-center gap-2">
            <Sliders className="h-6 w-6 text-indigo-400" />
            Treinamento do Agente de E-mails
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl mt-0.5">
            Gerenciamento de regras de classificação e triagem. O agente atua com estrita obediência
            às regras cadastradas e aprovadas aqui.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLogicModalOpen(true)}
            className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
          >
            <FileCode className="h-4 w-4 text-indigo-300" />
            Lógica da Tela
          </Button>
        </div>
      </div>

      {/* AVISO MANDATÓRIO DE SEGURANÇA */}
      <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/70 text-indigo-950 shadow-2xs flex items-start gap-3">
        <ShieldCheck className="h-6 w-6 text-indigo-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-extrabold text-sm uppercase tracking-wide text-indigo-900 flex items-center gap-1.5">
            <span>Regra de Ouro de Segurança do Agente:</span>
          </div>
          <p className="leading-relaxed font-medium text-indigo-900">
            O Agente de E-mails{' '}
            <strong>NUNCA executa instruções externas recebidas por e-mail</strong>. Qualquer
            solicitação, comando de texto ou instrução contida no corpo do e-mail é tratada apenas
            como texto bruto para triagem contra as regras previamente aprovadas pelo Administrador
            nesta tela.
          </p>
        </div>
      </div>

      {/* BLOCO DE PARÂMETROS OPERACIONAIS E CONECTORES DE CAIXA POSTAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Parâmetros do Agente */}
        <Card className="lg:col-span-6 border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              Parâmetros de Execução do Agente
            </CardTitle>
            <CardDescription className="text-xs">
              Defina o intervalo em minutos para o ciclo automático no backend
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="interval" className="text-xs font-semibold text-slate-700">
                  Intervalo de Verificação (em minutos — mínimo 2 min)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="interval"
                    type="number"
                    min={2}
                    max={1440}
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    className="w-32 text-sm font-semibold"
                    required
                  />
                  <span className="text-xs text-slate-500">
                    O cron do servidor verifica caixas a cada {intervalMinutes} minutos.
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-xs font-semibold text-slate-700 block">
                  Status Operacional do Agente
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={agentActive ? 'default' : 'outline'}
                    onClick={() => setAgentActive(true)}
                    className="text-xs font-semibold"
                  >
                    Ativo (Monitorando)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!agentActive ? 'destructive' : 'outline'}
                    onClick={() => setAgentActive(false)}
                    className="text-xs font-semibold"
                  >
                    Pausado (Inativo)
                  </Button>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingConfig}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5"
                >
                  {savingConfig ? 'Salvando...' : 'Salvar Parâmetros'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Conectores Gmail e Outlook do Próprio Usuário */}
        <Card className="lg:col-span-6 border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-indigo-600" />
              Conexão da Caixa de E-mails do Usuário
            </CardTitle>
            <CardDescription className="text-xs">
              Conecte sua própria conta via consentimento seguro (sem armazenar senhas)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              O sistema utiliza conectores oficiais autorizados. Cada usuário conecta a sua própria
              caixa de correio profissional (Gmail ou Outlook/Office 365). Nenhuma senha é gravada
              no banco de dados.
            </p>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    Google Workspace / Gmail
                  </span>
                  <span className="text-[11px] text-slate-500">Caixa de entrada corporativa</span>
                </div>
                <ConnectorButton toolkit="gmail" name="Gmail" className="shrink-0" />
              </div>

              <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    Microsoft Outlook / 365
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Caixa de correio Exchange/Office
                  </span>
                </div>
                <ConnectorButton toolkit="outlook" name="Outlook" className="shrink-0" />
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Conectores ativos no modo seguro por usuário autenticado.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GESTÃO DE REGRAS TREINÁVEIS */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Regras de Classificação e Triagem Aprovadas</span>
                <Badge variant="outline" className="text-xs">
                  {rules.length} regras
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Regras vigentes que o agente utiliza para classificar e-mails e anexos
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={() => handleOpenRuleModal()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 h-8"
            >
              <Plus className="h-4 w-4" />
              Nova Regra
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Ordem</th>
                  <th className="p-3">Nome da Regra & Descrição</th>
                  <th className="p-3">Tipo de Gatilho</th>
                  <th className="p-3">Critérios (Palavras / Extensões)</th>
                  <th className="p-3">Ação Executada</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-700">
                      {rule.order_priority}
                    </td>

                    <td className="p-3 max-w-sm">
                      <div className="font-bold text-slate-900">{rule.name}</div>
                      {rule.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {rule.description}
                        </div>
                      )}
                      <div className="text-[10px] text-indigo-600 mt-0.5">
                        Acessos correspondidos: {rule.match_count || 0}
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {rule.trigger_type === 'nfe_received' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          NF-e Recebida
                        </Badge>
                      )}
                      {rule.trigger_type === 'cte_request' && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                          Solicitação CT-e
                        </Badge>
                      )}
                      {rule.trigger_type === 'complementary_doc' && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                          Doc. Complementar
                        </Badge>
                      )}
                      {rule.trigger_type === 'unknown' && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                          Solicitação Desconhecida
                        </Badge>
                      )}
                    </td>

                    <td className="p-3 max-w-xs">
                      {rule.subject_keywords && (
                        <div className="text-[11px] text-slate-700">
                          <strong>Assunto:</strong> {rule.subject_keywords}
                        </div>
                      )}
                      {rule.file_extensions && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <strong>Anexos:</strong> {rule.file_extensions}
                        </div>
                      )}
                      {rule.sender_pattern && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          <strong>Remetente:</strong> {rule.sender_pattern}
                        </div>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {rule.action_type === 'start_process' && 'Iniciar Processo'}
                        {rule.action_type === 'identify_cargo' && 'Identificar Carga'}
                        {rule.action_type === 'link_operation' && 'Vincular à Operação'}
                        {rule.action_type === 'send_for_analysis' && 'Encaminhar p/ Análise'}
                      </div>
                      {rule.action_target_process && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {rule.action_target_process}
                        </div>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleRuleStatus(rule)}
                        className="cursor-pointer"
                        title="Clique para alternar o status"
                      >
                        {rule.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            Ativa
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px]">
                            Inativa
                          </Badge>
                        )}
                      </button>
                    </td>

                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenRuleModal(rule)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-600"
                          title="Editar Regra"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRule(rule)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                          title="Excluir Regra"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE REGRA */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingRule ? 'Editar Regra de Treinamento' : 'Nova Regra de Treinamento'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina os critérios de correspondência e o processo operacional a ser iniciado
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRule} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Nome da Regra *</Label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Ex.: Quando receber NF-e → Iniciar triagem de carga"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Descrição Explicativa</Label>
              <Input
                value={ruleDesc}
                onChange={(e) => setRuleDesc(e.target.value)}
                placeholder="Explique a finalidade da regra"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">
                  Tipo de Gatilho / Classificação *
                </Label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as EmailTriggerType)}
                  className="w-full h-8 px-2 rounded-md border border-slate-300 bg-white text-xs"
                >
                  <option value="nfe_received">NF-e Recebida</option>
                  <option value="cte_request">Solicitação de CT-e</option>
                  <option value="complementary_doc">Documento Complementar</option>
                  <option value="unknown">Solicitação Desconhecida / Outros</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">Ação a Executar *</Label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as EmailActionType)}
                  className="w-full h-8 px-2 rounded-md border border-slate-300 bg-white text-xs"
                >
                  <option value="start_process">Iniciar Processo</option>
                  <option value="identify_cargo">Identificar Carga e Transportadora</option>
                  <option value="link_operation">Vincular à Operação de Viagem</option>
                  <option value="send_for_analysis">Encaminhar para Análise Humana</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">
                Palavras-chave no Assunto (separadas por vírgula)
              </Label>
              <Input
                value={subjectKeywords}
                onChange={(e) => setSubjectKeywords(e.target.value)}
                placeholder="Ex.: nfe, nota fiscal, danfe, xml (ou * para qualquer assunto)"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">
                  Extensões de Arquivo (separadas por vírgula)
                </Label>
                <Input
                  value={fileExtensions}
                  onChange={(e) => setFileExtensions(e.target.value)}
                  placeholder="Ex.: xml,pdf,zip,rar"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">
                  Padrão de Remetente (opcional)
                </Label>
                <Input
                  value={senderPattern}
                  onChange={(e) => setSenderPattern(e.target.value)}
                  placeholder="Ex.: @fornecedor.com.br"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">Processo Alvo Vinculado</Label>
                <Input
                  value={targetProcess}
                  onChange={(e) => setTargetProcess(e.target.value)}
                  placeholder="Ex.: Triagem de NF-e"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-slate-700">
                  Prioridade de Execução (1 = máxima)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRuleModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingRule}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                {savingRule ? 'Salvando...' : 'Salvar e Aprovar Regra'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Documentação Viva da Tela */}
      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={TRAINING_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
