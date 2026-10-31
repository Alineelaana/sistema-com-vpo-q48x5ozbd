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
import {
  getDocumentDispatchConfig,
  updateDocumentDispatchConfig,
  getDocumentRecipients,
  createDocumentRecipient,
  updateDocumentRecipient,
  deleteDocumentRecipient,
  getDocumentDispatchTemplates,
  createDocumentDispatchTemplate,
  updateDocumentDispatchTemplate,
  deleteDocumentDispatchTemplate,
} from '@/services/dispatchAgentService'
import type {
  EmailAgentConfig,
  EmailAgentRule,
  EmailTriggerType,
  EmailActionType,
} from '@/types/agent'
import type { CargoAgentConfig } from '@/types/cargoAgent'
import type {
  DocumentDispatchConfig,
  DocumentRecipient,
  DocumentDispatchTemplate,
  DocumentType,
  RecipientRole,
} from '@/types/dispatchAgent'
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
  Receipt,
  ShieldAlert,
  Layers,
  Send,
  Users,
  FileCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const TRAINING_SCREEN_LOGIC_DOC: ScreenLogicDoc = {
  screenTitle: 'Treinamento & Regras dos Agentes',
  screenBadge: 'Prioridades 1, 2, 3 e 4 • Gestão Completa dos Agentes',
  lastUpdate: '2026-10-29',
  version: '2.0.0',
  objective:
    'Interface administrativa unificada para parametrização das 4 etapas dos agentes: triagem de e-mails (P1), cruzamento de cargas (P2), diretrizes de regularização fiscal (P3) e Agente de Envio Automático de documentos aos destinatários (P4). Garante que nenhum documento sem autorização fiscal seja enviado e impede envios duplicados com rastreabilidade total.',
  realFeatures: [
    'PRIORIDADE 4: Gestão do Agente de Envio Automático de Documentos aos Destinatários (ativação/pausa, intervalo cron e limite de tentativas)',
    'PRIORIDADE 4: Cadastro de Destinatários de Documentos por cliente/operação com papéis, e-mails (direto e CC) e tipos de documento autorizados (CT-e, MDF-e, CIOT, Seguro, VPO)',
    'PRIORIDADE 4: Modelos de Mensagem configuráveis com variáveis dinâmicas por documento (CT-e, MDF-e, CIOT ANTT e Averbação de Seguro com tags {{nome_cliente}}, {{numero_documento}}, {{seguradora}}, {{numero_apolice}}, {{ramo_seguro}}, {{valor_carga}}, {{comprovante_arquivo}}, {{viagem}}, etc.)',
    'PRIORIDADE 4: Modelo de e-mail dedicado para CIOT Registrado (ANTT) e para Averbação de Seguro Concluída (Lei 14.599/2023), com atalhos dedicados de criação e anexo automático do comprovante digital',
    'PRIORIDADE 4: Modelo dedicado de Pacote de Viagem ao Motorista (bundle) com salvaguarda anti-duplicidade bundle_{tripId}_{driverEmail}, reunindo DACTE, DAMDFE, CTRB em PDF, orientações de VPO/TAG e resumo da rota',
    'PRIORIDADE 4: Regra inegociável de envio seguro: apenas averbações com status oficial "averbada" e com comprovante retornado (PDF/XML) são despachadas; sem comprovante, gera pendência honesta com motivo',
    'PRIORIDADE 4: Controle anti-duplicidade estrito por chave única (document_type + document_id + email)',
    'Gestão completa de regras de e-mail (criação, edição, aprovação por administrador, rejeição e exclusão)',
    'Conectores Gmail e Outlook configurados no modo "cada usuário conecta sua própria caixa"',
    'Ajuste do intervalo de monitoramento periódico (cron) dos agentes',
    'Parametrização dos critérios de identificação de cargas (exigência de mínimo de 1 a 6 sinais coincidentes)',
    'Salvaguardas de regularização fiscal (CIOT ANTT obrigatório e Averbação RCTR-C Lei 14.599/2023)',
    'Histórico de auditoria registrado em audit_logs para cada alteração de configuração',
  ],
  fieldsAndButtons: [
    {
      name: 'Salvar Configuração do Agente de Envio',
      type: 'Botão de Ação Primária',
      purpose: 'Persiste ativação, intervalo de execução e limite de retries do agente de envio.',
    },
    {
      name: 'Novo Destinatário de Documentos',
      type: 'Botão com Modal',
      purpose: 'Cadastra cliente/parceiro que deve receber os arquivos fiscais autorizados.',
    },
    {
      name: 'Criar Modelo Motorista',
      type: 'Botão de Atalho Rápido',
      purpose:
        'Abre o modal já pré-carregado com os parâmetros operacionais do Pacote de Viagem ao Motorista (bundle), tags de veículo, CT-e, MDF-e, CTRB, CIOT e VPO/TAG.',
    },
    {
      name: 'Criar Modelo Averbação',
      type: 'Botão de Atalho Rápido',
      purpose:
        'Abre o modal já pré-carregado com os parâmetros, texto e tags legais da Averbação de Seguro Concluída (Lei 14.599/2023).',
    },
    {
      name: 'Novo Modelo de E-mail',
      type: 'Botão com Modal',
      purpose:
        'Cria ou edita modelo com tags dinâmicas para CT-e, MDF-e, CIOT (ANTT), Averbação de Seguro ou Dossiê.',
    },
    {
      name: 'Salvar Critérios de Carga',
      type: 'Botão de Ação Primária',
      purpose: 'Persiste os pesos e critérios de cruzamento do Agente de Identificação de Cargas.',
    },
  ],
  businessRules: [
    'Regra Inegociável: Apenas documentos AUTORIZADOS pela SEFAZ ou com protocolo de regularização oficial são enviados.',
    'Regra Anti-Duplicidade: Um documento autorizado jamais é enviado duas vezes ao mesmo destinatário.',
    'Envio via Conectores: Utiliza a conta conectada de Gmail ou Outlook do próprio operador logado.',
    'Falhas de Entrega: Notificação gerada automaticamente após esgotamento de tentativas configuradas.',
  ],
  agentsAndAutomations: [
    'Hook dispatch_agent.pb.js executado periodicamente via cron e acionado sob demanda.',
    'Validação antes de cada disparo consultando document_dispatch_logs.',
  ],
  validations: [
    'E-mail válido obrigatório para destinatários.',
    'Ao menos um tipo de documento deve ser selecionado para cada destinatário.',
    'Intervalo de verificação entre 2 e 1440 minutos.',
    'Tentativas de reenvio entre 1 e 10.',
  ],
  integrations: [
    'Coleções document_dispatch_configs, document_recipients, document_dispatch_templates e document_dispatch_logs.',
    'Conectores Gmail e Outlook via Skip Connectors API.',
  ],
  flowsAndDependencies: [
    'Documento entra na Etapa 3 ➔ É autorizado na SEFAZ ➔ Etapa 4 identifica destinatários cadastrados ➔ Dispara e-mail com DACTE/DAMDFE/XML anexos ➔ Com a operação liberada na Central de Operações, despacha o Pacote de Viagem completo ao condutor com chave bundle_{tripId}_{driverEmail} anti-duplicação ➔ Registra em document_dispatch_logs.',
  ],
  dataSourceAndDestination: {
    origin: 'Parâmetros definidos por administradores e gestores.',
    destination: 'Coleções de configuração e modelos no PocketBase.',
    persistence: 'Banco de dados Skip Cloud com integridade referencial.',
  },
  permissions: [
    {
      role: 'Administrador',
      access: 'Total: pode alterar regras, destinatários, modelos e parâmetros.',
    },
    { role: 'Gestor Operacional', access: 'Pode cadastrar destinatários e modelos operacionais.' },
    { role: 'Demais perfis', access: 'Visualização de diretrizes.' },
  ],
  notificationsAndErrors: [
    'Notificação imediata no centro de avisos quando o limite de retries é excedido.',
    'Toasts informativos de sucesso e erro em todas as ações.',
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

  // Estado Agente de Envio Automático (Prioridade 4)
  const [dispatchConfig, setDispatchConfig] = useState<DocumentDispatchConfig | null>(null)
  const [dispatchActive, setDispatchActive] = useState(true)
  const [dispatchInterval, setDispatchInterval] = useState(5)
  const [dispatchMaxRetries, setDispatchMaxRetries] = useState(3)
  const [savingDispatchConfig, setSavingDispatchConfig] = useState(false)

  const [recipients, setRecipients] = useState<DocumentRecipient[]>([])
  const [recipientModalOpen, setRecipientModalOpen] = useState(false)
  const [editingRecipient, setEditingRecipient] = useState<DocumentRecipient | null>(null)

  // Form Destinatário
  const [recipCustomerName, setRecipCustomerName] = useState('')
  const [recipDoc, setRecipDoc] = useState('')
  const [recipContactName, setRecipContactName] = useState('')
  const [recipEmail, setRecipEmail] = useState('')
  const [recipCcEmails, setRecipCcEmails] = useState('')
  const [recipRole, setRecipRole] = useState<RecipientRole>('receiver')
  const [recipAllowedTypes, setRecipAllowedTypes] = useState<DocumentType[]>(['cte', 'mdfe'])
  const [recipNotes, setRecipNotes] = useState('')

  const [templates, setTemplates] = useState<DocumentDispatchTemplate[]>([])
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DocumentDispatchTemplate | null>(null)

  // Form Template
  const [tmplName, setTmplName] = useState('')
  const [tmplDocType, setTmplDocType] = useState<DocumentType>('cte')
  const [tmplSubject, setTmplSubject] = useState('')
  const [tmplBody, setTmplBody] = useState('')
  const [tmplDesc, setTmplDesc] = useState('')
  const [tmplIsDefault, setTmplIsDefault] = useState(false)

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
      const [eCfg, rulesData, cCfg, dCfg, recipList, tmplList] = await Promise.all([
        getEmailAgentConfig(),
        getEmailAgentRules(),
        getCargoAgentConfig(),
        getDocumentDispatchConfig(),
        getDocumentRecipients(100),
        getDocumentDispatchTemplates(50),
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

      if (dCfg) {
        setDispatchConfig(dCfg)
        setDispatchActive(dCfg.is_active)
        setDispatchInterval(dCfg.check_interval_minutes || 5)
        setDispatchMaxRetries(dCfg.max_retry_attempts || 3)
      }
      setRecipients(recipList)
      setTemplates(tmplList)
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

  // Salvar Configuração do Agente de Envio (Prioridade 4)
  const handleSaveDispatchConfig = async () => {
    if (!dispatchConfig) return
    setSavingDispatchConfig(true)
    try {
      await updateDocumentDispatchConfig(dispatchConfig.id, {
        is_active: dispatchActive,
        check_interval_minutes: Number(dispatchInterval),
        max_retry_attempts: Number(dispatchMaxRetries),
        status: dispatchActive ? 'active' : 'paused',
      })
      toast({
        title: 'Configuração do Agente de Envio salva!',
        description: `Agente ${dispatchActive ? 'ATIVO' : 'PAUSADO'}, intervalo de ${dispatchInterval} min e máx de ${dispatchMaxRetries} retries.`,
      })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao salvar configuração do envio',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSavingDispatchConfig(false)
    }
  }

  // Abrir Modal Destinatário
  const handleOpenCreateRecipient = () => {
    setEditingRecipient(null)
    setRecipCustomerName('')
    setRecipDoc('')
    setRecipContactName('')
    setRecipEmail('')
    setRecipCcEmails('')
    setRecipRole('receiver')
    setRecipAllowedTypes(['cte', 'mdfe'])
    setRecipNotes('')
    setRecipientModalOpen(true)
  }

  const handleOpenEditRecipient = (recip: DocumentRecipient) => {
    setEditingRecipient(recip)
    setRecipCustomerName(recip.customer_name)
    setRecipDoc(recip.customer_document || '')
    setRecipContactName(recip.contact_name || '')
    setRecipEmail(recip.email)
    setRecipCcEmails(recip.cc_emails || '')
    setRecipRole(recip.recipient_role)
    setRecipAllowedTypes(recip.allowed_document_types || ['cte'])
    setRecipNotes(recip.notes || '')
    setRecipientModalOpen(true)
  }

  const handleSaveRecipient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipCustomerName.trim() || !recipEmail.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome do cliente e o e-mail de envio.',
        variant: 'destructive',
      })
      return
    }
    if (recipAllowedTypes.length === 0) {
      toast({
        title: 'Documentos autorizados',
        description: 'Selecione ao menos um tipo de documento para este destinatário.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingRecipient) {
        await updateDocumentRecipient(editingRecipient.id, {
          customer_name: recipCustomerName.trim(),
          customer_document: recipDoc.trim(),
          contact_name: recipContactName.trim(),
          email: recipEmail.trim(),
          cc_emails: recipCcEmails.trim(),
          recipient_role: recipRole,
          allowed_document_types: recipAllowedTypes,
          notes: recipNotes.trim(),
        })
        toast({ title: 'Destinatário atualizado com sucesso!' })
      } else {
        await createDocumentRecipient({
          customer_name: recipCustomerName.trim(),
          customer_document: recipDoc.trim(),
          contact_name: recipContactName.trim(),
          email: recipEmail.trim(),
          cc_emails: recipCcEmails.trim(),
          recipient_role: recipRole,
          allowed_document_types: recipAllowedTypes,
          is_active: true,
          notes: recipNotes.trim(),
        })
        toast({ title: 'Destinatário cadastrado com sucesso!' })
      }
      setRecipientModalOpen(false)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao salvar destinatário', description: msg, variant: 'destructive' })
    }
  }

  const handleToggleRecipientStatus = async (recip: DocumentRecipient) => {
    try {
      await updateDocumentRecipient(recip.id, { is_active: !recip.is_active })
      toast({
        title: `Destinatário ${!recip.is_active ? 'ativado' : 'inativado'} com sucesso!`,
      })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao alterar status', description: msg, variant: 'destructive' })
    }
  }

  const handleDeleteRecipient = async (id: string) => {
    if (!window.confirm('Deseja excluir este destinatário?')) return
    try {
      await deleteDocumentRecipient(id)
      toast({ title: 'Destinatário excluído!' })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao excluir', description: msg, variant: 'destructive' })
    }
  }

  // Modelos de Mensagem (Templates)
  const handleOpenCreateTemplate = (preferredDocType?: DocumentType) => {
    setEditingTemplate(null)
    const targetType = preferredDocType || 'cte'
    setTmplDocType(targetType)

    if (targetType === 'ciot') {
      setTmplName('Modelo Específico - CIOT Registrado (ANTT)')
      setTmplSubject(
        '{{empresa_emissora}} - Comprovante CIOT nº {{numero_documento}} Registrado (Viagem {{viagem}})',
      )
      setTmplBody(
        `Prezado(a) {{nome_cliente}},\n\nInformamos que o Código Identificador da Operação de Transportes (CIOT) nº {{numero_documento}} foi devidamente registrado perante a ANTT sob o protocolo/comprovante {{protocolo_autorizacao}}.\n\nDados da Operação:\n- CIOT Nº: {{numero_documento}}\n- IPEF / Administradora: {{provedor_ipef}}\n- Perfil do Transportador: {{perfil_transportador}}\n- Valor do Frete Destacado: {{valor_frete}}\n- Percurso: Viagem {{viagem}}\n- Data de Registro: {{data_documento}}\n\nO comprovante oficial emitido pela IPEF segue em anexo para compliance fiscal (Resolução ANTT nº 5.862/2019).\n\nAtenciosamente,\nDepartamento Fiscal • {{empresa_emissora}}`,
      )
      setTmplDesc(
        'Modelo dedicado para envio automático de comprovante de CIOT aos destinatários e motoristas.',
      )
    } else if (targetType === 'insurance') {
      setTmplName('Modelo Específico - Averbação de Seguro Concluída')
      setTmplSubject(
        '{{empresa_emissora}} - Comprovante de Averbação de Seguro nº {{numero_documento}} (Viagem {{viagem}})',
      )
      setTmplBody(
        `Prezado(a) {{nome_cliente}},\n\nInformamos que a averbação de seguro da operação referente à Viagem {{viagem}} foi devidamente confirmada e concluída sob o protocolo {{protocolo_autorizacao}}.\n\nDados da Cobertura e Averbação:\n- Protocolo da Averbação: {{numero_documento}}\n- Seguradora: {{seguradora}}\n- Nº da Apólice: {{numero_apolice}}\n- Ramo / Cobertura: {{ramo_seguro}}\n- Valor Declarado da Carga: {{valor_carga}}\n- Chave Fiscal Vinculada: {{chave_documento}}\n- Data da Averbação: {{data_documento}}\n\nO comprovante digital retornado pela seguradora/AT&M (arquivo {{comprovante_arquivo}}) encontra-se anexado a esta mensagem em estrito cumprimento à Lei nº 14.599/2023.\n\nAtenciosamente,\nDepartamento de Gestão de Riscos & Seguros • {{empresa_emissora}}`,
      )
      setTmplDesc(
        'Modelo dedicado para envio automático de comprovante de averbação aos embarcadores e tomadores de seguro.',
      )
    } else if (targetType === 'bundle') {
      setTmplName('Modelo Padrão - Pacote de Viagem ao Motorista')
      setTmplSubject(
        '{{empresa_emissora}} - Pacote de Viagem Liberado: Viagem {{viagem}} (MDF-e {{numero_documento}})',
      )
      setTmplBody(
        `Olá, {{nome_cliente}}!\n\nSua viagem {{viagem}} foi devidamente liberada pela Central de Operações de Transporte da {{empresa_emissora}}.\n\nSeguem os dados operacionais e os documentos de porte obrigatório anexos:\n\n• Veículo: {{placa_veiculo}}\n• Origem / Destino: {{origem_destino}}\n• Distância Rodoviária: {{distancia_km}} km\n• CT-e: nº {{numero_cte}} (Protocolo: {{protocolo_cte}})\n• MDF-e: nº {{numero_documento}} (Protocolo: {{protocolo_autorizacao}})\n• CTRB (Contrato de Frete): nº {{numero_contrato}}\n• CIOT ANTT: {{numero_ciot}}\n• Vale-Pedágio (VPO): R$ {{valor_vpo}} ({{comprovante_vpo}})\n• TAG / Meio Eletrônico: {{tag_veiculo}}\n\nPor favor, confirme o recebimento e cumpra rigorosamente a rota rodoviária aprovada e os tempos de descanso da Lei nº 13.103/2015.\n\nBoa viagem!\n{{empresa_emissora}}`,
      )
      setTmplDesc(
        'Enviado automaticamente ao motorista com DACTE, DAMDFE, CTRB em PDF, orientações de VPO/TAG e resumo da rota quando a operação for liberada.',
      )
    } else {
      setTmplName('')
      setTmplSubject('{{empresa_emissora}} - {{tipo_documento}} nº {{numero_documento}} Autorizado')
      setTmplBody(
        `Prezado(a) {{nome_cliente}},\n\nInformamos que o {{tipo_documento}} nº {{numero_documento}} foi autorizado pela SEFAZ sob o protocolo {{protocolo_autorizacao}}.\n\nAtenciosamente,\n{{empresa_emissora}}`,
      )
      setTmplDesc('')
    }

    setTmplIsDefault(false)
    setTemplateModalOpen(true)
  }

  const handleOpenEditTemplate = (tmpl: DocumentDispatchTemplate) => {
    setEditingTemplate(tmpl)
    setTmplName(tmpl.name)
    setTmplDocType(tmpl.document_type)
    setTmplSubject(tmpl.subject_template)
    setTmplBody(tmpl.body_template)
    setTmplDesc(tmpl.description || '')
    setTmplIsDefault(tmpl.is_default)
    setTemplateModalOpen(true)
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tmplName.trim() || !tmplSubject.trim() || !tmplBody.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome, o assunto e o corpo do modelo de e-mail.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingTemplate) {
        await updateDocumentDispatchTemplate(editingTemplate.id, {
          name: tmplName.trim(),
          document_type: tmplDocType,
          subject_template: tmplSubject.trim(),
          body_template: tmplBody.trim(),
          description: tmplDesc.trim(),
          is_default: tmplIsDefault,
        })
        toast({ title: 'Modelo atualizado com sucesso!' })
      } else {
        await createDocumentDispatchTemplate({
          name: tmplName.trim(),
          document_type: tmplDocType,
          subject_template: tmplSubject.trim(),
          body_template: tmplBody.trim(),
          description: tmplDesc.trim(),
          is_default: tmplIsDefault,
          is_active: true,
        })
        toast({ title: 'Modelo de mensagem criado com sucesso!' })
      }
      setTemplateModalOpen(false)
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao salvar modelo', description: msg, variant: 'destructive' })
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Deseja excluir este modelo de mensagem?')) return
    try {
      await deleteDocumentDispatchTemplate(id)
      toast({ title: 'Modelo excluído com sucesso!' })
      await loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao excluir modelo', description: msg, variant: 'destructive' })
    }
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
            <span className="text-xs text-slate-300">Prioridades 1, 2, 3 e 4 Ativas</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight flex items-center gap-2">
            <Sliders className="h-6 w-6 text-indigo-400" />
            Treinamento & Regras dos Agentes Autônomos
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl mt-0.5">
            Parametrize a triagem de e-mails, o cruzamento de cargas, diretrizes fiscais e o Agente
            de Envio Automático de documentos.
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

      {/* SEÇÃO PRIORIDADE 4: CONFIGURAÇÃO DO AGENTE DE ENVIO AUTOMÁTICO DE DOCUMENTOS */}
      <Card className="border-emerald-300 shadow-sm bg-gradient-to-b from-emerald-50/20 to-transparent">
        <CardHeader className="border-b border-emerald-100 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  Prioridade 4 • Agente de Envio Automático
                </Badge>
                <Badge
                  variant="outline"
                  className="text-emerald-800 border-emerald-300 text-[10px]"
                >
                  Etapa Final do Fluxo
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-600" />
                <span>Parâmetros de Envio de Documentos Fiscais Autorizados</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Apenas documentos devidamente AUTORIZADOS pela SEFAZ ou com protocolo oficial são
                despachados aos destinatários.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleSaveDispatchConfig}
              disabled={savingDispatchConfig || !isAdmin}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 self-start sm:self-auto"
            >
              <Save className="h-4 w-4" />
              {savingDispatchConfig ? 'Salvando...' : 'Salvar Configuração do Envio'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status do Agente de Envio */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-emerald-600" />
                  Agente de Envio Ativo
                </label>
                <Switch
                  checked={dispatchActive}
                  onCheckedChange={setDispatchActive}
                  disabled={!isAdmin}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Quando ativo, verifica novos documentos autorizados e dispara e-mails
                automaticamente.
              </p>
              <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block">
                {dispatchActive
                  ? 'Status: Em Operação Automática'
                  : 'Status: Pausado pelo Administrador'}
              </div>
            </div>

            {/* Intervalo de Verificação (Cron) */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-600" />
                Intervalo do Cron de Envio
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Frequência em minutos para varredura de novos CT-es, MDF-es e comprovantes
                autorizados.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min={2}
                  max={1440}
                  value={dispatchInterval}
                  onChange={(e) =>
                    setDispatchInterval(Math.max(2, Math.min(1440, Number(e.target.value))))
                  }
                  className="w-20 text-center font-bold text-sm h-8"
                  disabled={!isAdmin}
                />
                <span className="text-xs text-slate-600 font-medium">minutos (padrão: 5)</span>
              </div>
            </div>

            {/* Limite de Tentativas em Caso de Falha */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <RotateCw className="h-4 w-4 text-emerald-600" />
                Limite de Tentativas (Retry)
              </label>
              <p className="text-[11px] text-slate-500 leading-tight">
                Em caso de erro SMTP, tenta reenviar até atingir este limite antes de notificar o
                gestor.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={dispatchMaxRetries}
                  onChange={(e) =>
                    setDispatchMaxRetries(Math.max(1, Math.min(10, Number(e.target.value))))
                  }
                  className="w-20 text-center font-bold text-sm h-8"
                  disabled={!isAdmin}
                />
                <span className="text-xs text-slate-600 font-medium">tentativas máximas</span>
              </div>
            </div>
          </div>

          {/* Avisos Regulatórios e Anti-Duplicidade */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-950 flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block font-bold">
                Salvaguardas Inegociáveis do Agente de Envio (Prioridade 4):
              </strong>
              <div>
                <strong>1. Nunca simular autorização:</strong> Somente documentos com status oficial
                <code className="mx-1 bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono text-[11px]">
                  authorized
                </code>{' '}
                /
                <code className="mx-1 bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono text-[11px]">
                  registered
                </code>{' '}
                /
                <code className="mx-1 bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono text-[11px]">
                  averbada
                </code>
                são elegíveis para disparo. Documentos em rascunho ou pendentes nunca são enviados.
              </div>
              <div>
                <strong>2. Chave Oficial Anti-Duplicidade:</strong> Cada envio é registrado com
                chave única{' '}
                <code className="mx-1 bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono text-[11px]">
                  [tipo_doc]_[id]_[email]
                </code>
                . O mesmo documento autorizado jamais é reenviado por engano.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO: DESTINATÁRIOS DE DOCUMENTOS FISCAIS */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <span>Destinatários de Documentos Cadastrados ({recipients.length})</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Mapeamento por cliente/embarcador/destinatário com tipos de documentos autorizados
                para recebimento automático.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleOpenCreateRecipient}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Novo Destinatário
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Cliente / Contato</th>
                  <th className="p-3">Papel</th>
                  <th className="p-3">E-mail Principal / Cópias (CC)</th>
                  <th className="p-3">Documentos Autorizados</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Histórico</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{r.customer_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {r.customer_document || 'Sem documento'} • {r.contact_name || 'Geral'}
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {r.recipient_role === 'receiver'
                          ? 'Destinatário'
                          : r.recipient_role === 'shipper'
                            ? 'Embarcador'
                            : r.recipient_role}
                      </Badge>
                    </td>

                    <td className="p-3 max-w-xs">
                      <div className="text-slate-800 font-mono text-[11px] font-semibold">
                        {r.email}
                      </div>
                      {r.cc_emails && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          CC: {r.cc_emails}
                        </div>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {r.allowed_document_types.map((type) => (
                          <Badge
                            key={type}
                            className="bg-slate-100 text-slate-700 border-slate-300 text-[9px] uppercase"
                          >
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {r.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px]">
                          Inativo
                        </Badge>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap text-[11px] text-slate-600">
                      <div>
                        <strong>{r.sent_count || 0}</strong> envios
                      </div>
                      {r.last_sent_at && (
                        <div className="text-[10px] text-slate-400">
                          Último: {new Date(r.last_sent_at).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-right whitespace-nowrap space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleRecipientStatus(r)}
                        className="h-7 text-xs px-2"
                      >
                        {r.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditRecipient(r)}
                        className="h-7 w-7 p-0 text-slate-600"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRecipient(r.id)}
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

      {/* SEÇÃO: MODELOS DE MENSAGEM CONFIGURÁVEIS (TEMPLATES DE E-MAIL) */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-600" />
                <span>Modelos de Mensagem de Envio ({templates.length})</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Templates dinâmicos de e-mail personalizáveis com variáveis do documento e da
                transportadora.
              </CardDescription>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenCreateTemplate('bundle')}
                className="text-xs font-semibold border-cyan-300 text-cyan-800 hover:bg-cyan-50 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-cyan-600" />
                Criar Modelo Motorista
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenCreateTemplate('insurance')}
                className="text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-600" />
                Criar Modelo Averbação
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenCreateTemplate('ciot')}
                className="text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-indigo-600" />
                Criar Modelo CIOT
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenCreateTemplate()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Novo Modelo de E-mail
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((tmpl) => {
              const isCiot = tmpl.document_type === 'ciot'
              const isInsurance = tmpl.document_type === 'insurance'
              const isBundle = tmpl.document_type === 'bundle'
              const docTypeLabel =
                tmpl.document_type === 'cte'
                  ? 'CT-e'
                  : tmpl.document_type === 'mdfe'
                    ? 'MDF-e'
                    : tmpl.document_type === 'ciot'
                      ? 'CIOT (ANTT)'
                      : tmpl.document_type === 'insurance'
                        ? 'Averbação de Seguro'
                        : tmpl.document_type === 'vpo'
                          ? 'Vale Pedágio (VPO)'
                          : tmpl.document_type === 'bundle'
                            ? 'Pacote de Viagem (Motorista)'
                            : 'Dossiê Fiscal'

              return (
                <div
                  key={tmpl.id}
                  className={`p-4 rounded-xl border bg-white shadow-2xs flex flex-col justify-between space-y-3 ${
                    isBundle
                      ? 'border-cyan-300 ring-1 ring-cyan-100'
                      : isInsurance
                        ? 'border-emerald-300 ring-1 ring-emerald-100'
                        : isCiot
                          ? 'border-indigo-300 ring-1 ring-indigo-100'
                          : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200 text-[10px] uppercase font-mono">
                          Tipo: {tmpl.document_type}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-600">{docTypeLabel}</span>
                      </div>
                      {tmpl.is_default && (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                          Padrão
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mt-2">{tmpl.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {tmpl.description || 'Sem descrição'}
                    </p>

                    <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-mono text-slate-700">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        Assunto:
                      </span>
                      <span className="truncate block font-semibold">{tmpl.subject_template}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">Variáveis dinâmicas ativas</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditTemplate(tmpl)}
                        className="h-7 text-xs px-2.5 gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        Editar
                      </Button>
                      {isAdmin && !tmpl.is_default && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">
              Variáveis disponíveis para templates:
            </span>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">
                {'{{nome_cliente}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">
                {'{{numero_documento}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">
                {'{{tipo_documento}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">
                {'{{empresa_emissora}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">
                {'{{protocolo_autorizacao}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">
                {'{{viagem}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">
                {'{{chave_documento}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">
                {'{{data_documento}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-300 text-indigo-800 font-bold">
                {'{{provedor_ipef}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-300 text-indigo-800 font-bold">
                {'{{perfil_transportador}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-300 text-indigo-800 font-bold">
                {'{{valor_frete}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800 font-bold">
                {'{{seguradora}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800 font-bold">
                {'{{numero_apolice}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800 font-bold">
                {'{{ramo_seguro}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800 font-bold">
                {'{{valor_carga}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800 font-bold">
                {'{{comprovante_arquivo}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{placa_veiculo}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{origem_destino}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{distancia_km}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{numero_cte}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{protocolo_cte}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{numero_contrato}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{numero_ciot}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{valor_vpo}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{comprovante_vpo}}'}
              </code>
              <code className="bg-white px-1.5 py-0.5 rounded border border-cyan-300 text-cyan-800 font-bold">
                {'{{tag_veiculo}}'}
              </code>
            </div>
            <p className="text-[10px] text-slate-500 pt-1">
              * Para modelos de <strong>CIOT</strong>, utilize <code>{'{{provedor_ipef}}'}</code>,{' '}
              <code>{'{{perfil_transportador}}'}</code> e <code>{'{{valor_frete}}'}</code>. Para
              modelos de <strong>Averbação de Seguro</strong>, utilize{' '}
              <code>{'{{seguradora}}'}</code>, <code>{'{{numero_apolice}}'}</code>,{' '}
              <code>{'{{ramo_seguro}}'}</code>, <code>{'{{valor_carga}}'}</code> e{' '}
              <code>{'{{comprovante_arquivo}}'}</code> (anexo automático). Para o{' '}
              <strong>Pacote do Motorista (bundle)</strong>, utilize tags como{' '}
              <code>{'{{placa_veiculo}}'}</code>, <code>{'{{numero_cte}}'}</code>,{' '}
              <code>{'{{numero_contrato}}'}</code>, <code>{'{{numero_ciot}}'}</code>,{' '}
              <code>{'{{valor_vpo}}'}</code> e <code>{'{{tag_veiculo}}'}</code>.
            </p>
          </div>
        </CardContent>
      </Card>

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
                    OAuth 2.0 Pessoal (Entrada & Saída)
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Utilizado para a <strong>Etapa 1</strong> (coleta de NF-e recebidas) e para a{' '}
                  <strong>Etapa 4</strong> (envio automático de CT-e, MDF-e e comprovantes
                  autorizados a partir da sua própria caixa).
                </p>
              </div>
              <ConnectorButton toolkit="gmail" name="Google Gmail" className="w-full text-xs" />
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">Microsoft 365 / Outlook</span>
                  <Badge variant="outline" className="text-[10px]">
                    OAuth 2.0 Pessoal (Entrada & Saída)
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Utilizado para a <strong>Etapa 1</strong> (coleta de anexos operacionais) e para a{' '}
                  <strong>Etapa 4</strong> (envio de documentos fiscais autorizados aos
                  destinatários via Microsoft Graph).
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

      {/* REGRAS DE REGULARIZAÇÃO FISCAL & SALVAGUARDAS (NOVO: ETAPA 3) */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <span>Diretrizes e Salvaguardas da Etapa 3 (Regularização Fiscal)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Parâmetros legais e bloqueios operacionais automáticos do agente fiscal
              </CardDescription>
            </div>
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs">
              Prioridade 3 Ativa
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wide">
                <Receipt className="h-4 w-4 text-indigo-600" />
                Bloqueio por CIOT Ausente
              </div>
              <p className="text-xs text-slate-600">
                Se ativado na tela Empresa, o agente bloqueia a liberação e emissão de viagens para
                perfis TAC-Equiparado até o registro formal do CIOT ou comprovante da IPEF.
              </p>
              <div className="text-[10px] text-indigo-700 font-semibold font-mono">
                Resolução ANTT nº 5.862/2019
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wide">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                Bloqueio por Averbação RCTR-C
              </div>
              <p className="text-xs text-slate-600">
                O agente gera o dossiê de seguro e retém a expedição se a apólice não estiver ativa
                ou o protocolo de averbação da seguradora/AT&M não for informado.
              </p>
              <div className="text-[10px] text-rose-700 font-semibold font-mono">
                Lei nº 14.599/2023
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wide">
                <Layers className="h-4 w-4 text-emerald-600" />
                Emissão Automática de MDF-e
              </div>
              <p className="text-xs text-slate-600">
                Após autorização oficial dos CT-es pela SEFAZ, o agente consolida as cargas, calcula
                peso e valor total e monta o rascunho de MDF-e interestadual.
              </p>
              <div className="text-[10px] text-emerald-700 font-semibold font-mono">
                Ajuste SINIEF 21/2010
              </div>
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

      {/* MODAL: NOVO / EDITAR DESTINATÁRIO DE DOCUMENTOS */}
      <Dialog open={recipientModalOpen} onOpenChange={setRecipientModalOpen}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-2xl shadow-xl">
          <form onSubmit={handleSaveRecipient} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {editingRecipient
                  ? 'Editar Destinatário de Documentos'
                  : 'Novo Destinatário de Documentos Fiscais'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre o cliente, embarcador ou parceiro que receberá os arquivos fiscais
                autorizados.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nome do Cliente / Razão Social *
                  </label>
                  <Input
                    value={recipCustomerName}
                    onChange={(e) => setRecipCustomerName(e.target.value)}
                    placeholder="Ex.: Supermercado Nova Esperança Ltda"
                    required
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">CNPJ ou CPF</label>
                  <Input
                    value={recipDoc}
                    onChange={(e) => setRecipDoc(e.target.value)}
                    placeholder="Ex.: 14.281.940/0001-52"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    E-mail Principal para Envio *
                  </label>
                  <Input
                    type="email"
                    value={recipEmail}
                    onChange={(e) => setRecipEmail(e.target.value)}
                    placeholder="Ex.: fiscal@cliente.com.br"
                    required
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Papel na Operação
                  </label>
                  <select
                    value={recipRole}
                    onChange={(e) => setRecipRole(e.target.value as RecipientRole)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                  >
                    <option value="receiver">Destinatário da Carga</option>
                    <option value="shipper">Embarcador / Remetente</option>
                    <option value="carrier">Transportadora Subcontratada</option>
                    <option value="driver">Condutor / Motorista</option>
                    <option value="broker">Corretora de Seguros</option>
                    <option value="accountant">Contabilidade / Fiscal</option>
                    <option value="other">Outro Parceiro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Contato Responsável / Setor
                </label>
                <Input
                  value={recipContactName}
                  onChange={(e) => setRecipContactName(e.target.value)}
                  placeholder="Ex.: Roberto Alves - Gerência de Faturamento"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  E-mails em Cópia (CC) - separados por vírgula
                </label>
                <Input
                  value={recipCcEmails}
                  onChange={(e) => setRecipCcEmails(e.target.value)}
                  placeholder="Ex.: compras@cliente.com.br, xml@cliente.com.br"
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Documentos que este destinatário deve receber *
                </label>
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  {[
                    { id: 'cte', label: 'CT-e (DACTE + XML)' },
                    { id: 'mdfe', label: 'MDF-e (DAMDFE + XML)' },
                    { id: 'ciot', label: 'Comprovante CIOT' },
                    { id: 'insurance', label: 'Averbação de Seguro' },
                    { id: 'vpo', label: 'Comprovante VPO' },
                  ].map((doc) => {
                    const isChecked = recipAllowedTypes.includes(doc.id as DocumentType)
                    return (
                      <label
                        key={doc.id}
                        className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRecipAllowedTypes([...recipAllowedTypes, doc.id as DocumentType])
                            } else {
                              setRecipAllowedTypes(recipAllowedTypes.filter((t) => t !== doc.id))
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        {doc.label}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Observações Operacionais
                </label>
                <Input
                  value={recipNotes}
                  onChange={(e) => setRecipNotes(e.target.value)}
                  placeholder="Ex.: Exige DACTE legível para conferência de descarga"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRecipientModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Salvar Destinatário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVO / EDITAR MODELO DE MENSAGEM */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-2xl shadow-xl">
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {editingTemplate ? 'Editar Modelo de Mensagem' : 'Novo Modelo de Mensagem de Envio'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure o texto padrão do e-mail com tags dinâmicas substituídas na hora do envio.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nome do Modelo *
                  </label>
                  <Input
                    value={tmplName}
                    onChange={(e) => setTmplName(e.target.value)}
                    placeholder="Ex.: CT-e Autorizado - Tomador"
                    required
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tipo de Documento Alvo
                  </label>
                  <select
                    value={tmplDocType}
                    onChange={(e) => setTmplDocType(e.target.value as DocumentType)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                  >
                    <option value="cte">Conhecimento de Transporte (CT-e)</option>
                    <option value="mdfe">Manifesto Eletrônico (MDF-e)</option>
                    <option value="ciot">Comprovante CIOT</option>
                    <option value="insurance">Averbação de Seguro RCTR-C</option>
                    <option value="vpo">Vale Pedágio Obrigatório (VPO)</option>
                    <option value="bundle">Pacote de Viagem ao Motorista (bundle)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Assunto do E-mail (com variáveis) *
                </label>
                <Input
                  value={tmplSubject}
                  onChange={(e) => setTmplSubject(e.target.value)}
                  placeholder="Ex.: {{empresa_emissora}} - CT-e nº {{numero_documento}} Autorizado"
                  required
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Corpo da Mensagem (com variáveis) *
                </label>
                <textarea
                  value={tmplBody}
                  onChange={(e) => setTmplBody(e.target.value)}
                  rows={6}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Prezado(a) {{nome_cliente}}, ..."
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div>
                  <span className="font-bold text-slate-800 block">Modelo Padrão</span>
                  <span className="text-[11px] text-slate-500">
                    Usado automaticamente caso nenhum modelo específico seja selecionado
                  </span>
                </div>
                <Switch checked={tmplIsDefault} onCheckedChange={setTmplIsDefault} />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Descrição</label>
                <Input
                  value={tmplDesc}
                  onChange={(e) => setTmplDesc(e.target.value)}
                  placeholder="Ex.: Modelo oficial para clientes da Rota Sul"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTemplateModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Salvar Modelo
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
