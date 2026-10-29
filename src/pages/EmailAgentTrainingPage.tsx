import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  approveEmailAgentRule,
  rejectEmailAgentRule,
  deleteEmailAgentRule,
} from '@/services/agentService'
import { getCargoAgentConfig, updateCargoAgentConfig } from '@/services/cargoAgentService'
import type {
  EmailAgentConfig,
  EmailAgentRule,
  EmailTriggerType,
  EmailActionType,
} from '@/types/agent'
import type { CargoAgentConfig } from '@/types/cargoAgent'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import { ScreenLogicModal, type ScreenLogicDoc } from '@/components/ScreenLogicModal'
import { useAuth } from '@/context/AuthContext'
import {
  Sliders,
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Clock,
  ShieldCheck,
  HelpCircle,
  FileCode,
  Save,
  Mail,
  Zap,
  FileCheck2,
  Truck,
  Hash,
  AlertTriangle,
  RotateCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const TRAINING_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Treinamento & Regras dos Agentes',
  screenBadge: 'Prioridades 1 e 2 • Gestão de Parâmetros',
  lastUpdate: '2026-10-29',
  version: '1.1.0',
  objective:
    'Interface administrativa unificada para parametrização das regras de triagem do Agente de E-mails (Prioridade 1) e dos critérios de cruzamento multi-sinal do Agente de Identificação de Cargas (Prioridade 2). Garante que nenhuma ação autônoma ocorra sem critérios rigorosos e aprovação prévia.',
  realFeatures: [
    'Gestão completa de regras de e-mail (criação, edição, aprovação por administrador, rejeição e exclusão)',
    'Conectores Gmail e Outlook configurados no modo "cada usuário conecta sua própria caixa"',
    'Ajuste do intervalo de monitoramento periódico (cron) do agente de e-mails',
    'NOVO: Parametrização dos critérios de identificação de cargas (exigência de mínimo de 1 a 6 sinais coincidentes)',
    'NOVO: Toggle para cruzamento por placa, cliente/remetente, janela de datas em dias, motorista, peso da carga e verificação de duplicidade fiscal',
    'NOVO: Toggle para auto-vínculo quando confiável (se houver ambiguidade o sistema bloqueia e cria pendência humana)',
    'Histórico de auditoria registrado em audit_logs para cada alteração de configuração',
  ],
  fieldsAndButtons: [
    {
      name: 'Salvar Critérios de Carga',
      type: 'Botão de Ação Primária',
      purpose: 'Persiste os pesos e critérios de cruzamento do Agente de Identificação de Cargas.',
    },
    {
      name: 'Mínimo de Sinais Coincidentes',
      type: 'Campo Numérico (1 a 6)',
      purpose:
        'Define quantos sinais simultâneos devem bater (placa, cliente, datas, motorista, peso, rota) para autorizar associação automática.',
    },
    {
      name: 'Verificar Duplicidade Fiscal',
      type: 'Toggle Booleano',
      purpose: 'Impede reprocessamento de chaves fiscais que já possuam CT-e emitido.',
    },
    {
      name: 'Nova Regra de E-mail',
      type: 'Botão com Modal',
      purpose: 'Cadastra nova regra de classificação sem intervenção em código.',
    },
    {
      name: 'Aprovar / Rejeitar Regra',
      type: 'Botões Administrativos',
      purpose: 'Garante governança humana sobre o comportamento do agente.',
    },
  ],
  businessRules: [
    'Regra Crítica: A identificação de cargas NÃO poderá depender exclusivamente da placa. Devem ser combinados múltiplos critérios.',
    'Regra Crítica: Ambiguidade ou divergência sempre gera pendência para revisão humana e impede auto-vínculo.',
    'Regra de Duplicidade: Notas com CT-e já autorizado têm seu vínculo bloqueado preventivamente.',
    'Apenas usuários com perfil Administrador podem aprovar ou rejeitar regras de triagem.',
  ],
  agentsAndAutomations: [
    'Persistência imediata na coleção cargo_agent_configs e email_agent_configs.',
    'Gatilhos consultados pelo hook email_agent.pb.js durante cada execução automática ou manual.',
  ],
  validations: [
    'Mínimo de sinais entre 1 e 6.',
    'Janela de datas entre 1 e 60 dias.',
    'Palavras-chave obrigatórias para novas regras de e-mail.',
  ],
  integrations: [
    'Coleções cargo_agent_configs, email_agent_configs, email_agent_rules e audit_logs.',
    'Conectores Gmail e Outlook via API Skip Connectors.',
  ],
  flowsAndDependencies: [
    'Alterações nestes parâmetros afetam imediatamente o próximo ciclo do Agente de Cargas e do Agente de E-mails.',
  ],
  dataSourceAndDestination: {
    origin: 'Entrada manual de administradores e gestores.',
    destination: 'Coleções cargo_agent_configs e email_agent_rules.',
    persistence: 'Banco SQLite via PocketBase v0.36.',
  },
  permissions: [
    { role: 'Administrador', access: 'Total: pode alterar critérios, aprovar e rejeitar regras.' },
    {
      role: 'Gestor Operacional',
      access: 'Pode sugerir regras e alterar configurações operacionais.',
    },
    { role: 'Demais perfis', access: 'Somente leitura ou sem acesso às ações administrativas.' },
  ],
  notificationsAndErrors: [
    'Feedback imediato com toast após persistência.',
    'Mensagens claras caso haja erro de rede ou validação.',
  ],
}

export const EmailAgentTrainingPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  // Estado Agente de E-mails
  const [emailConfig, setEmailConfig] = useState<EmailAgentConfig | null>(null)
  const [rules, setRules] = useState<EmailAgentRule[]>([])
  const [cronInterval, setCronInterval] = useState(15)
  const [emailAgentActive, setEmailAgentActive] = useState(true)

  // Estado Agente de Cargas (Prioridade 2)
  const [cargoConfig, setCargoConfig] = useState<CargoAgentConfig | null>(null)
  const [cargoActive, setCargoActive] = useState(true)
  const [minSignals, setMinSignals] = useState(2)
  const [matchPlate, setMatchPlate] = useState(true)
  const [matchClientDoc, setMatchClientDoc] = useState(true)
  const [matchDatesDays, setMatchDatesDays] = useState(7)
  const [matchDriver, setMatchDriver] = useState(true)
  const [matchCargoWeight, setMatchCargoWeight] = useState(true)
  const [checkDuplicates, setCheckDuplicates] = useState(true)
  const [autoLinkConfident, setAutoLinkConfident] = useState(true)
  const [savingCargoConfig, setSavingCargoConfig] = useState(false)

  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<EmailAgentRule | null>(null)
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  // Formulário Regra de E-mail
  const [ruleName, setRuleName] = useState('')
  const [triggerType, setTriggerType] = useState<EmailTriggerType>('nfe_received')
  const [senderPattern, setSenderPattern] = useState('')
  const [subjectKeywords, setSubjectKeywords] = useState('')
  const [actionType, setActionType] = useState<EmailActionType>('identify_cargo')
  const [priorityOrder, setPriorityOrder] = useState(10)
  const [ruleNotes, setRuleNotes] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [eCfg, rulesData, cCfg] = await Promise.all([
        getEmailAgentConfig(),
        getEmailAgentRules(),
        getCargoAgentConfig(),
      ])

      if (eCfg) {
        setEmailConfig(eCfg)
        setEmailAgentActive(eCfg.is_active)
        setCronInterval(eCfg.check_interval_minutes || 15)
      }
      setRules(rulesData)

      if (cCfg) {
        setCargoConfig(cCfg)
        setCargoActive(cCfg.is_active)
        setMinSignals(cCfg.min_matching_signals || 2)
        setMatchPlate(cCfg.match_plate)
        setMatchClientDoc(cCfg.match_client_document)
        setMatchDatesDays(cCfg.match_dates_window_days || 7)
        setMatchDriver(cCfg.match_driver)
        setMatchCargoWeight(cCfg.match_cargo_weight)
        setCheckDuplicates(cCfg.check_fiscal_duplicates)
        setAutoLinkConfident(cCfg.auto_link_when_confident)
      }
    } catch (err) {
      console.error('Erro ao carregar configurações de treinamento:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as configurações dos agentes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Salvar Configuração do Agente de E-mails
  const handleSaveEmailConfig = async () => {
    if (!emailConfig) return
    setSavingConfig(true)
    try {
      await updateEmailAgentConfig(emailConfig.id, {
        is_active: emailAgentActive,
        check_interval_minutes: cronInterval,
      })
      toast({
        title: 'Configurações de E-mail salvas',
        description: `Intervalo de verificação definido para ${cronInterval} minutos.`,
      })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao salvar configurações de e-mail',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSavingConfig(false)
    }
  }

  // Salvar Configuração do Agente de Cargas (Prioridade 2)
  const handleSaveCargoConfig = async () => {
    if (!cargoConfig) return
    setSavingCargoConfig(true)
    try {
      await updateCargoAgentConfig(cargoConfig.id, {
        is_active: cargoActive,
        min_matching_signals: Number(minSignals),
        match_plate: matchPlate,
        match_client_document: matchClientDoc,
        match_dates_window_days: Number(matchDatesDays),
        match_driver: matchDriver,
        match_cargo_weight: matchCargoWeight,
        check_fiscal_duplicates: checkDuplicates,
        auto_link_when_confident: autoLinkConfident,
      })
      toast({
        title: 'Critérios de Cargas atualizados!',
        description: `Exigindo no mínimo ${minSignals} sinais coincidentes para auto-vínculo seguro.`,
      })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao salvar critérios de carga',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSavingCargoConfig(false)
    }
  }

  // Abrir modal de criação de regra
  const handleOpenCreateRule = () => {
    setEditingRule(null)
    setRuleName('')
    setTriggerType('nfe_received')
    setSenderPattern('')
    setSubjectKeywords('nfe, danfe, xml, nota fiscal')
    setActionType('identify_cargo')
    setPriorityOrder(10)
    setRuleNotes('')
    setRuleModalOpen(true)
  }

  // Abrir modal de edição
  const handleOpenEditRule = (rule: EmailAgentRule) => {
    setEditingRule(rule)
    setRuleName(rule.name)
    setTriggerType(rule.trigger_type)
    setSenderPattern(rule.sender_pattern || '')
    setSubjectKeywords(rule.subject_keywords || '')
    setActionType(rule.action_type)
    setPriorityOrder(rule.order_priority)
    setRuleNotes(rule.description || '')
    setRuleModalOpen(true)
  }

  // Salvar Regra de E-mail
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ruleName.trim() || !subjectKeywords.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome da regra e as palavras-chave do assunto.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingRule) {
        await updateEmailAgentRule(editingRule.id, {
          name: ruleName.trim(),
          trigger_type: triggerType,
          sender_pattern: senderPattern.trim(),
          subject_keywords: subjectKeywords.trim(),
          action_type: actionType,
          order_priority: Number(priorityOrder),
          description: ruleNotes.trim(),
        })
        toast({ title: 'Regra atualizada com sucesso!' })
      } else {
        await createEmailAgentRule({
          name: ruleName.trim(),
          trigger_type: triggerType,
          sender_pattern: senderPattern.trim(),
          subject_keywords: subjectKeywords.trim(),
          action_type: actionType,
          order_priority: Number(priorityOrder),
          approval_status: isAdmin ? 'approved' : 'pending_approval',
          approved_by: isAdmin ? user?.name || user?.email : undefined,
          approved_at: isAdmin ? new Date().toISOString() : undefined,
          is_active: true,
          description: ruleNotes.trim(),
        })
        toast({
          title: 'Regra cadastrada com sucesso!',
          description: isAdmin
            ? 'Regra aprovada e ativa imediatamente.'
            : 'Regra submetida para aprovação do Administrador.',
        })
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
    }
  }

  // Aprovar regra
  const handleApproveRule = async (ruleId: string) => {
    try {
      const adminName = user?.name || user?.email || 'Administrador'
      await approveEmailAgentRule(ruleId, adminName)
      toast({ title: 'Regra aprovada com sucesso!' })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao aprovar', description: msg, variant: 'destructive' })
    }
  }

  // Rejeitar regra
  const handleRejectRule = async (ruleId: string) => {
    try {
      const adminName = user?.name || user?.email || 'Administrador'
      await rejectEmailAgentRule(ruleId, adminName)
      toast({ title: 'Regra rejeitada!' })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao rejeitar', description: msg, variant: 'destructive' })
    }
  }

  // Excluir regra
  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('Deseja realmente excluir esta regra?')) return
    try {
      await deleteEmailAgentRule(ruleId)
      toast({ title: 'Regra excluída!' })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao excluir', description: msg, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-[10px] uppercase">
              Governança & Parâmetros dos Agentes
            </Badge>
            <span className="text-xs text-slate-300">Prioridades 1 & 2 Ativas</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight flex items-center gap-2">
            <Sliders className="h-6 w-6 text-indigo-400" />
            Treinamento & Regras dos Agentes Autônomos
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl mt-0.5">
            Parametrize com rigor a triagem de e-mails e os critérios de cruzamento de cargas para
            manter segurança operacional absoluta.
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

      {/* SEÇÃO NOVA: CRITÉRIOS DE CRUZAMENTO DO AGENTE DE IDENTIFICAÇÃO DE CARGAS (PRIORIDADE 2) */}
      <Card className="border-indigo-200/80 shadow-sm bg-gradient-to-b from-indigo-50/20 to-transparent">
        <CardHeader className="border-b border-indigo-100 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                  Prioridade 2 • Agente de Cargas
                </Badge>
                <Badge variant="outline" className="text-indigo-800 border-indigo-300 text-[10px]">
                  Regra Crítica: Cruzamento Multi-Sinal
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-indigo-600" />
                <span>Critérios de Cruzamento & Limiares de Auto-Vínculo</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                A identificação não depende exclusivamente da placa: combine placa, cliente,
                documentos, datas, condutor e peso.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleSaveCargoConfig}
              disabled={savingCargoConfig || !isAdmin}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5 self-start sm:self-auto"
            >
              <Save className="h-4 w-4" />
              {savingCargoConfig ? 'Salvando...' : 'Salvar Critérios de Carga'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mínimo de sinais coincidentes */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-indigo-600" />
                Mínimo de Sinais Coincidentes
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Quantidade mínima de evidências fiscais coincidentes para que o sistema considere a
                viagem compatível.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={minSignals}
                  onChange={(e) => setMinSignals(Math.max(1, Math.min(6, Number(e.target.value))))}
                  className="w-20 text-center font-bold text-sm h-8"
                  disabled={!isAdmin}
                />
                <span className="text-xs text-slate-600 font-medium">
                  sinais simultâneos (padrão: 2)
                </span>
              </div>
            </div>

            {/* Janela de Datas de Viagem */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600" />
                Janela de Tolerância de Datas
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Intervalo de dias aceito entre a data de emissão da NF-e e a programação da viagem.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={matchDatesDays}
                  onChange={(e) =>
                    setMatchDatesDays(Math.max(1, Math.min(60, Number(e.target.value))))
                  }
                  className="w-20 text-center font-bold text-sm h-8"
                  disabled={!isAdmin}
                />
                <span className="text-xs text-slate-600 font-medium">dias de tolerância</span>
              </div>
            </div>

            {/* Proteção contra Duplicidade Fiscal */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  Prevenir Duplicidade Fiscal
                </label>
                <Switch
                  checked={checkDuplicates}
                  onCheckedChange={setCheckDuplicates}
                  disabled={!isAdmin}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Bloqueia associação se a chave da NF-e já possuir CT-e emitido ou autorizado no
                sistema.
              </p>
              <div className="text-[10px] text-purple-800 font-semibold bg-purple-50 px-2 py-1 rounded">
                Prevenção de Bitributação Ativa
              </div>
            </div>
          </div>

          {/* Sinais Habilitados no Cruzamento */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              Sinais Habilitados para Cruzamento Inteligente:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">Placa do Veículo</div>
                  <div className="text-[10px] text-slate-500">Tag &lt;veicTransp&gt; do XML</div>
                </div>
                <Switch checked={matchPlate} onCheckedChange={setMatchPlate} disabled={!isAdmin} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">Motorista / Condutor</div>
                  <div className="text-[10px] text-slate-500">Nome ou CPF informado</div>
                </div>
                <Switch
                  checked={matchDriver}
                  onCheckedChange={setMatchDriver}
                  disabled={!isAdmin}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">Cliente / Remetente</div>
                  <div className="text-[10px] text-slate-500">CNPJ & Razão Social</div>
                </div>
                <Switch
                  checked={matchClientDoc}
                  onCheckedChange={setMatchClientDoc}
                  disabled={!isAdmin}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">Peso da Carga</div>
                  <div className="text-[10px] text-slate-500">Tolerância de até 25%</div>
                </div>
                <Switch
                  checked={matchCargoWeight}
                  onCheckedChange={setMatchCargoWeight}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>

          {/* Regra de Ambiguidade Informativa */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold text-amber-950">
                Regra de Segurança contra Associações Incorretas:
              </strong>
              <span>
                Sempre que houver divergência de dados ou mais de uma viagem compatível para o mesmo
                documento, o agente <strong>nunca auto-vinculará</strong>. Ele criará
                automaticamente uma pendência e notificará o responsável operacional na Central de
                Agentes para revisão humana.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CONECTORES DE E-MAIL (GMAIL E OUTLOOK DO PRÓPRIO USUÁRIO) */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-200/80">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" />
            <span>Conectores de E-mail Autorizados</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Cada usuário conecta sua própria caixa postal autorizada para coleta segura de NF-es e
            pedidos de transporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Google Workspace / Gmail</span>
                  <Badge variant="outline" className="text-[10px]">
                    OAuth 2.0 Pessoal
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Coleta de e-mails recebidos com anexos XML de NF-e e PDFs operacionais.
                </p>
              </div>
              <ConnectorButton toolkit="gmail" name="Google Gmail" className="w-full text-xs" />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Microsoft 365 / Outlook</span>
                  <Badge variant="outline" className="text-[10px]">
                    OAuth 2.0 Pessoal
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Integração corporativa com caixas Exchange Online e pastas operacionais.
                </p>
              </div>
              <ConnectorButton
                toolkit="outlook"
                name="Microsoft Outlook"
                className="w-full text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* REGRAS DE E-MAIL APROVADAS */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-600" />
                <span>Regras de Triagem de E-mails ({rules.length})</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Classificação determinística através de palavras-chave e padrões de remetente
                aprovados
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleOpenCreateRule}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Nova Regra de E-mail
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Prioridade / Nome</th>
                  <th className="p-3">Gatilho</th>
                  <th className="p-3">Palavras-chave</th>
                  <th className="p-3">Ação Proposta</th>
                  <th className="p-3">Governança</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{rule.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Prioridade #{rule.order_priority} • Disparos: {rule.match_count || 0}
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px]">
                        {rule.trigger_type}
                      </Badge>
                    </td>

                    <td className="p-3 max-w-xs">
                      <div className="text-slate-700 font-mono text-[11px] truncate">
                        {rule.subject_keywords}
                      </div>
                      {rule.sender_pattern && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          Remetente: {rule.sender_pattern}
                        </div>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{rule.action_type}</div>
                      {rule.action_target_process && (
                        <div className="text-[10px] text-indigo-700 font-mono mt-0.5">
                          Alvo: {rule.action_target_process}
                        </div>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {rule.approval_status === 'approved' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Aprovada
                        </Badge>
                      ) : rule.approval_status === 'pending_approval' ? (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] gap-1 font-semibold">
                          <Clock className="h-3 w-3 text-amber-600" />
                          Pendente Aprovação
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] gap-1">
                          <XCircle className="h-3 w-3 text-rose-600" />
                          Rejeitada
                        </Badge>
                      )}
                    </td>

                    <td className="p-3 text-right whitespace-nowrap space-x-1">
                      {isAdmin && rule.approval_status === 'pending_approval' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveRule(rule.id)}
                            className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-2"
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRule(rule.id)}
                            className="h-7 text-xs text-rose-700 border-rose-300 hover:bg-rose-50 px-2"
                          >
                            Rejeitar
                          </Button>
                        </>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditRule(rule)}
                        className="h-7 w-7 p-0 text-slate-600"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE REGRA DE E-MAIL */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-2xl shadow-xl">
          <form onSubmit={handleSaveRule} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {editingRule ? 'Editar Regra de E-mail' : 'Nova Regra de Triagem de E-mail'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Regras aprovadas são executadas automaticamente nos ciclos periódicos do agente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nome da Regra *</label>
                <Input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Ex.: Triagem de NF-e da Metalúrgica Sul"
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipo de Gatilho</label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as EmailTriggerType)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                  >
                    <option value="nfe_received">NF-e Recebida (XML)</option>
                    <option value="cte_request">Solicitação de CT-e</option>
                    <option value="complementary_doc">Documento Complementar</option>
                    <option value="unknown">Não Identificado / Exceção</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Ação Automatizada
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as EmailActionType)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                  >
                    <option value="identify_cargo">Encaminhar ao Agente de Cargas</option>
                    <option value="start_process">Iniciar Processamento</option>
                    <option value="link_operation">Vincular à Operação</option>
                    <option value="send_for_analysis">Enviar para Análise Manual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Palavras-chave no Assunto (separadas por vírgula) *
                </label>
                <Input
                  value={subjectKeywords}
                  onChange={(e) => setSubjectKeywords(e.target.value)}
                  placeholder="Ex.: nfe, xml, nota fiscal, danfe"
                  required
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Padrão do Remetente (opcional)
                </label>
                <Input
                  value={senderPattern}
                  onChange={(e) => setSenderPattern(e.target.value)}
                  placeholder="Ex.: @metalurgica.com.br ou faturamento@"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Descrição / Justificativa
                </label>
                <Input
                  value={ruleNotes}
                  onChange={(e) => setRuleNotes(e.target.value)}
                  placeholder="Ex.: Regra aprovada para automação de faturamento de bobinas"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
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
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Salvar Regra
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Lógica da Tela */}
      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={TRAINING_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
