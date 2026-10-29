import React, { useState } from 'react'
import {
  ShieldCheck,
  FileText,
  Lock,
  UserCheck,
  Mail,
  Building,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { CURRENT_PRIVACY_POLICY_VERSION, PRIVACY_POLICY_LAST_UPDATE } from '@/types/userManagement'
import { acceptPrivacyPolicy } from '@/services/userManagementService'

export const PrivacyPolicyPage: React.FC = () => {
  const { currentUser, user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [hasConsented, setHasConsented] = useState(!!currentUser?.privacy_consent_date)

  const handleAccept = async () => {
    if (!currentUser?.id) return
    setLoading(true)
    try {
      await acceptPrivacyPolicy(currentUser.id, CURRENT_PRIVACY_POLICY_VERSION)
      setHasConsented(true)
      toast({
        title: 'Consentimento registrado com sucesso!',
        description: `Aceite da Política de Privacidade (${CURRENT_PRIVACY_POLICY_VERSION}) gravado na auditoria com data e hora.`,
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar consentimento',
        description: (err as { message?: string })?.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Política de Privacidade & Proteção de Dados
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-indigo-50 border-indigo-200 text-indigo-700"
            >
              Versão {CURRENT_PRIVACY_POLICY_VERSION}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Termos de tratamento em conformidade com a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018).
          </p>
        </div>

        {/* Status de aceite do titular conectado */}
        <div className="p-3 rounded-lg border bg-white shadow-sm flex items-center gap-3 shrink-0">
          {hasConsented ? (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>
                Termo Aceito em:{' '}
                <strong>
                  {currentUser?.privacy_consent_date
                    ? new Date(currentUser.privacy_consent_date).toLocaleDateString('pt-BR')
                    : 'Hoje'}
                </strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-700 font-medium">Aceite pendente</span>
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
              >
                {loading ? 'Gravando...' : 'Aceitar Termos Vigentes'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cartão de Resumo dos Agentes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-indigo-600" />
            Controlador dos Dados
          </div>
          <div className="text-xs font-bold text-slate-900">
            TransConnect Logística e Transportes Rodoviários Ltda
          </div>
          <div className="text-[11px] text-slate-500">CNPJ: 12.345.678/0001-90 • Jundiaí/SP</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            Encarregado de Dados (DPO)
          </div>
          <div className="text-xs font-bold text-slate-900">
            Comitê de Governança & Compliance LGPD
          </div>
          <div className="text-[11px] text-indigo-600">dpo@transconnect.com.br</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Vigência & Atualização
          </div>
          <div className="text-xs font-bold text-slate-900">
            Versão {CURRENT_PRIVACY_POLICY_VERSION}
          </div>
          <div className="text-[11px] text-slate-500">
            Última revisão: {PRIVACY_POLICY_LAST_UPDATE}
          </div>
        </div>
      </div>

      {/* Conteúdo Formal da Política */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-6 text-xs text-slate-700 leading-relaxed">
        {/* Seção 1 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold">
              1
            </span>
            Objetivo e Agente de Tratamento
          </h2>
          <p>
            A <strong>TransConnect Logística e Transportes Rodoviários Ltda</strong>{' '}
            (“Controladora”) assume o compromisso inequívoco com a privacidade, segurança da
            informação e proteção dos dados pessoais de seus colaboradores, motoristas autônomos,
            clientes, parceiros e usuários da plataforma rodoviária <strong>Ed Integração</strong>,
            em estrita conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº
            13.709/2018 - LGPD) e resoluções da Agência Nacional de Transportes Terrestres (ANTT).
          </p>
        </section>

        {/* Seção 2 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold">
              2
            </span>
            Dados Pessoais Coletados e Tratados
          </h2>
          <p>
            Para possibilitar o acesso à plataforma e a operacionalização logística, coletamos e
            processamos as seguintes categorias de dados:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Operadores e Usuários da Plataforma:</strong> nome completo, e-mail
              corporativo, telefone de contato, cargo/função operacional, credenciais de acesso
              criptografadas, registro de logins, endereço de IP e histórico de auditoria de
              operações realizadas.
            </li>
            <li>
              <strong>Motoristas e Transportadores:</strong> nome, CPF, número e categoria da CNH,
              telefone, placa veicular vinculada e histórico de viagens e multas.
            </li>
            <li>
              <strong>Destinatários e Recebedores de Cargas:</strong> nome, documento (CPF/RG),
              contato, assinatura digitalizada (Proof of Delivery - POD) e geolocalização no ato da
              entrega.
            </li>
          </ul>
        </section>

        {/* Seção 3 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold">
              3
            </span>
            Finalidade e Base Legal do Tratamento (Art. 7º)
          </h2>
          <p>
            O tratamento de dados pessoais no âmbito deste sistema apoia-se nas seguintes bases
            legais legítimas:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-900 block mb-1">
                Execução de Contrato (Art. 7º, V)
              </span>
              Emissão de Conhecimento de Transporte Eletrônico (CT-e), cálculo obrigatório do
              Vale-Pedágio (VPO), roteirização de frotas e comprovação de entrega ao destinatário.
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-900 block mb-1">
                Cumprimento de Obrigação Legal (Art. 7º, II)
              </span>
              Atendimento às normas fiscais da SEFAZ, exigências regulatórias da ANTT, arquivamento
              obrigatório de documentos de transporte e controle de infrações de trânsito.
            </div>
          </div>
        </section>

        {/* Seção 4 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold">
              4
            </span>
            Prazo de Guarda e Retenção dos Registros
          </h2>
          <p>
            Os dados pessoais permanecerão armazenados pelo período necessário para atingir as
            finalidades indicadas, observando os prazos legais de retenção aplicáveis ao setor de
            transportes rodoviários de cargas:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Documentos Fiscais (CT-e, MDF-e, VPO):</strong> 5 (cinco) anos conforme
              legislação tributária e fiscal federal.
            </li>
            <li>
              <strong>Registros de Acesso e Auditoria (Logs):</strong> 6 (seis) meses a 1 (um) ano,
              em cumprimento ao Marco Civil da Internet (Lei nº 12.965/2014) e Art. 37 da LGPD.
            </li>
            <li>
              <strong>Contas Inativas / Revogações:</strong> dados pessoais são submetidos a
              processo de
              <strong> anonimização irreversível</strong> (Art. 16, IV da LGPD), preservando apenas
              métricas anônimas e agregadas.
            </li>
          </ul>
        </section>

        {/* Seção 5 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold">
              5
            </span>
            Direitos do Titular de Dados (Art. 18 da LGPD)
          </h2>
          <p>
            O titular de dados pessoais pode exercer a qualquer momento os direitos garantidos por
            lei diretamente no painel do sistema ou mediante contato com o DPO:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <strong>I - Confirmação e Acesso:</strong> saber quais dados estão em tratamento.
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <strong>II - Correção:</strong> solicitar retificação de dados incorretos ou
              desatualizados.
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <strong>III - Portabilidade:</strong> exportar seus dados cadastrais em JSON ou CSV.
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <strong>IV - Eliminação e Anonimização:</strong> revogar consentimento e solicitar
              descaracterização.
            </div>
          </div>
        </section>

        {/* Seção 6 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold">
              6
            </span>
            Segurança da Informação e Trilha de Auditoria
          </h2>
          <p>
            Implementamos medidas técnicas e administrativas aptas a proteger os dados de acessos
            não autorizados, destruição ou perda acidental:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Criptografia de senhas com algoritmo bcrypt de alto custo computacional.</li>
            <li>Controle de acesso baseado em papéis (RBAC - Role-Based Access Control).</li>
            <li>Expiração automática de sessão por inatividade (timeout de 30 minutos).</li>
            <li>
              Registro imutável de todas as ações de criação, alteração e exportação de dados na
              trilha de auditoria.
            </li>
          </ul>
        </section>

        {/* Seção 7 */}
        <section className="space-y-2 pt-2 border-t border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-extrabold">
              7
            </span>
            Canal de Atendimento do Encarregado de Dados (DPO)
          </h2>
          <p>
            Para dúvidas sobre esta política ou para requisitar o exercício de quaisquer direitos
            como titular, utilize o canal oficial:
          </p>
          <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200 text-indigo-900 font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-600" />
              <span>Canal LGPD: dpo@transconnect.com.br</span>
            </div>
            <span className="text-[11px] text-slate-500">Prazo de resposta: até 15 dias úteis</span>
          </div>
        </section>
      </div>

      {/* Barra de Ação Inferior */}
      {!hasConsented && (
        <div className="p-4 rounded-xl bg-indigo-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="font-bold text-sm">Aceite Formal dos Termos de Privacidade</div>
            <p className="text-xs text-indigo-200">
              Ao clicar em aceitar, seu consentimento e a versão atual da política serão registrados
              no seu perfil de usuário.
            </p>
          </div>
          <Button
            onClick={handleAccept}
            disabled={loading}
            className="bg-white hover:bg-slate-100 text-indigo-900 font-bold shrink-0 text-xs px-5"
          >
            {loading ? 'Gravando Aceite...' : 'Declaro que li e aceito os termos'}
          </Button>
        </div>
      )}
    </div>
  )
}
