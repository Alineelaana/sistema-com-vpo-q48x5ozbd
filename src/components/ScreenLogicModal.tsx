import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileCode2,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Bot,
  AlertTriangle,
  Database,
  ArrowRight,
  Info,
  Clock,
} from 'lucide-react'

export interface ScreenLogicDoc {
  screenTitle: string
  screenBadge?: string
  lastUpdate: string
  version: string
  objective: string
  realFeatures: string[]
  fieldsAndButtons: { name: string; type: string; purpose: string }[]
  businessRules: string[]
  agentsAndAutomations: string[]
  validations: string[]
  integrations: string[]
  flowsAndDependencies: string[]
  dataSourceAndDestination: { origin: string; destination: string; persistence: string }
  permissions: { role: string; access: string }[]
  notificationsAndErrors: string[]
  inDevelopmentAlert?: string
}

interface ScreenLogicModalProps {
  open: boolean
  onClose: () => void
  doc: ScreenLogicDoc
}

export const ScreenLogicModal: React.FC<ScreenLogicModalProps> = ({ open, onClose, doc }) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto bg-white p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <FileCode2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>Lógica da Tela: {doc.screenTitle}</span>
                  {doc.screenBadge && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200"
                    >
                      {doc.screenBadge}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Documentação viva da arquitetura, regras de negócio, agentes e integrações reais
                  desta tela.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Versão {doc.version} • {doc.lastUpdate}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2 text-sm text-slate-700">
          {/* Alerta de Itens em Desenvolvimento (não implementados nesta rodada) */}
          {doc.inDevelopmentAlert && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800">
                  Transparência de Escopo e Desenvolvimento:
                </span>
                <p className="leading-relaxed">{doc.inDevelopmentAlert}</p>
              </div>
            </div>
          )}

          {/* 1. Objetivo da Tela */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-indigo-600" />
              1. Objetivo da Tela
            </h4>
            <p className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-medium">
              {doc.objective}
            </p>
          </div>

          {/* 2. Funcionalidades Reais Implementadas */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              2. Funcionalidades Reais (100% Implementadas)
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {doc.realFeatures.map((feat, idx) => (
                <li
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-start gap-2 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className="leading-snug">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Campos e Botões */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-indigo-600" />
              3. Campos, Ações e Botões Principais
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Elemento / Botão</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Finalidade e Comportamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doc.fieldsAndButtons.map((fb, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="p-2.5 font-semibold text-slate-900">{fb.name}</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                          {fb.type}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-slate-600">{fb.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Regras de Negócio */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              4. Regras de Negócio e Segurança
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              {doc.businessRules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span className="leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Agentes e Automações */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-indigo-600" />
              5. Agentes e Automações Vinculadas
            </h4>
            <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-2 text-xs text-indigo-950">
              {doc.agentsAndAutomations.map((agent, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">➔</span>
                  <span className="leading-relaxed">{agent}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Validações e Dependências */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                6. Validações e Segurança
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {doc.validations.map((val, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400">✔</span>
                    <span>{val}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                7. Fluxos e Dependências
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {doc.flowsAndDependencies.map((flow, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{flow}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 8. Origem e Destino dos Dados */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-indigo-600" />
              8. Origem e Destino dos Dados
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Origem</span>
                <span className="font-semibold text-slate-800">
                  {doc.dataSourceAndDestination.origin}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Destino
                </span>
                <span className="font-semibold text-slate-800">
                  {doc.dataSourceAndDestination.destination}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Persistência
                </span>
                <span className="font-semibold text-slate-800">
                  {doc.dataSourceAndDestination.persistence}
                </span>
              </div>
            </div>
          </div>

          {/* 9. Permissões e Perfis (RBAC) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              9. Permissões por Perfil (RBAC)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {doc.permissions.map((p, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-900 block">{p.role}</span>
                  <span className="text-slate-600 text-[11px]">{p.access}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button onClick={onClose} className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
