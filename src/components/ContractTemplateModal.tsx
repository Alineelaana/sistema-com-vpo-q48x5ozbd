import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Trash2, CheckCircle2, Save, AlertCircle, HelpCircle } from 'lucide-react'
import type { ContractTemplate, ContractClause, CarrierProfile } from '@/types/contract'
import { saveContractTemplate } from '@/services/contractService'
import { toast } from '@/hooks/use-toast'

interface ContractTemplateModalProps {
  template: ContractTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (savedTemplate: ContractTemplate) => void
}

export const ContractTemplateModal: React.FC<ContractTemplateModalProps> = ({
  template,
  open,
  onOpenChange,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(template?.title || '')
  const [carrierProfile, setCarrierProfile] = useState<CarrierProfile>(
    template?.carrier_profile || 'tac_equiparado',
  )
  const [transportMode, setTransportMode] = useState<string>(template?.transport_mode || 'todos')
  const [isActive, setIsActive] = useState<boolean>(template?.is_active ?? true)
  const [isDefault, setIsDefault] = useState<boolean>(template?.is_default ?? false)
  const [preambleTemplate, setPreambleTemplate] = useState<string>(
    template?.preamble_template || '',
  )
  const [responsibilitiesText, setResponsibilitiesText] = useState<string>(
    template?.responsibilities_text || '',
  )
  const [penaltyTermsText, setPenaltyTermsText] = useState<string>(
    template?.penalty_terms_text || '',
  )
  const [jurisdictionCity, setJurisdictionCity] = useState<string>(
    template?.jurisdiction_city || 'Jundiaí',
  )
  const [jurisdictionState, setJurisdictionState] = useState<string>(
    template?.jurisdiction_state || 'SP',
  )
  const [notes, setNotes] = useState<string>(template?.notes || '')

  // Cláusulas dinâmicas
  const initialClauses: ContractClause[] = Array.isArray(template?.clauses)
    ? template!.clauses
    : typeof template?.clauses === 'string'
      ? (() => {
          try {
            return JSON.parse(template.clauses)
          } catch (_) {
            return []
          }
        })()
      : [
          {
            number: 1,
            title: 'DO OBJETO',
            text: 'Prestação de serviços de transporte rodoviário de cargas.',
          },
          {
            number: 2,
            title: 'DA REMUNERAÇÃO E PISO MÍNIMO',
            text: 'O frete respeitará as resoluções da ANTT.',
          },
        ]

  const [clauses, setClauses] = useState<ContractClause[]>(initialClauses)

  // Reset ao abrir modal com novo template
  React.useEffect(() => {
    if (template) {
      setTitle(template.title)
      setCarrierProfile(template.carrier_profile)
      setTransportMode(template.transport_mode || 'todos')
      setIsActive(template.is_active)
      setIsDefault(template.is_default)
      setPreambleTemplate(template.preamble_template || '')
      setResponsibilitiesText(template.responsibilities_text || '')
      setPenaltyTermsText(template.penalty_terms_text || '')
      setJurisdictionCity(template.jurisdiction_city || 'Jundiaí')
      setJurisdictionState(template.jurisdiction_state || 'SP')
      setNotes(template.notes || '')

      if (Array.isArray(template.clauses)) {
        setClauses(template.clauses)
      } else if (typeof template.clauses === 'string') {
        try {
          setClauses(JSON.parse(template.clauses))
        } catch (_) {
          setClauses([])
        }
      }
    } else {
      setTitle('Novo Modelo de Contrato CTRB')
      setCarrierProfile('tac_equiparado')
      setTransportMode('todos')
      setIsActive(true)
      setIsDefault(false)
      setPreambleTemplate('CONTRATO DE TRANSPORTE RODOVIÁRIO DE BENS (CTRB)')
      setResponsibilitiesText(
        'O Transportador declara que o veículo atende aos requisitos mecânicos e de segurança...',
      )
      setPenaltyTermsText('Atrasos injustificados ensejarão retenção proporcional...')
      setJurisdictionCity('Jundiaí')
      setJurisdictionState('SP')
      setNotes('')
      setClauses([
        {
          number: 1,
          title: 'DO OBJETO',
          text: 'O presente Contrato tem por objeto a prestação de serviços de transporte rodoviário de cargas.',
        },
        {
          number: 2,
          title: 'DO VALOR DO FRETE E PISO MÍNIMO ANTT',
          text: 'O frete acordado atende integralmente à Lei nº 13.703/2018 e Resoluções da ANTT.',
        },
      ])
    }
  }, [template, open])

  const handleAddClause = () => {
    const nextNum = clauses.length > 0 ? Math.max(...clauses.map((c) => c.number)) + 1 : 1
    setClauses([
      ...clauses,
      {
        number: nextNum,
        title: `CLÁUSULA ${nextNum}`,
        text: 'Descreva aqui as obrigações e termos desta cláusula contratual.',
      },
    ])
  }

  const handleRemoveClause = (index: number) => {
    const updated = clauses.filter((_, idx) => idx !== index)
    // Reordenar números
    const renumbered = updated.map((c, i) => ({ ...c, number: i + 1 }))
    setClauses(renumbered)
  }

  const handleClauseChange = (index: number, field: 'title' | 'text', val: string) => {
    const updated = [...clauses]
    updated[index] = { ...updated[index], [field]: val }
    setClauses(updated)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe o título ou identificador do modelo contratual.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const saved = await saveContractTemplate({
        id: template?.id,
        title,
        carrier_profile: carrierProfile,
        transport_mode: transportMode as
          | 'lotacao'
          | 'fracionada'
          | 'dedicado'
          | 'subcontratacao'
          | 'todos',
        is_active: isActive,
        is_default: isDefault,
        version: template?.version || 1,
        preamble_template: preambleTemplate,
        clauses,
        responsibilities_text: responsibilitiesText,
        penalty_terms_text: penaltyTermsText,
        jurisdiction_city: jurisdictionCity,
        jurisdiction_state: jurisdictionState,
        notes,
      })

      toast({
        title: 'Modelo salvo com sucesso!',
        description: `O modelo "${saved.title}" agora está vigente para as novas gerações de CTRB.`,
      })
      onSaved(saved)
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar modelo',
        description: err instanceof Error ? err.message : 'Falha ao salvar template contratual.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-700" />
            <DialogTitle className="text-base font-bold text-slate-900">
              {template ? 'Configurar Modelo Contratual (CTRB)' : 'Novo Modelo Contratual'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Edite cláusulas, textos legais e foro deste modelo. As novas gerações de CTRB usarão
            este modelo vigente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Identificação Geral */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Título do Modelo</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: CTRB Padrão TAC-Equiparado (Lei 11.442/07)"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Perfil do Transportador
              </Label>
              <select
                value={carrierProfile}
                onChange={(e) => setCarrierProfile(e.target.value as CarrierProfile)}
                className="mt-1 w-full text-xs h-9 px-2.5 rounded-md border border-slate-200 bg-white"
              >
                <option value="tac_equiparado">TAC-Equiparado (Autônomo com até 3 veículos)</option>
                <option value="tac_independente">TAC-Independente (Pessoa física / RNTRC)</option>
                <option value="etc">ETC (Empresa de Transporte de Cargas / Subcontratação)</option>
                <option value="ctc">CTC (Cooperativa de Transporte de Cargas)</option>
                <option value="geral">Geral / Todas as Modalidades</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Modalidade de Transporte
              </Label>
              <select
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className="mt-1 w-full text-xs h-9 px-2.5 rounded-md border border-slate-200 bg-white"
              >
                <option value="todos">Todas as Modalidades</option>
                <option value="lotacao">Carga Lotação (Fechada)</option>
                <option value="subcontratacao">Subcontratação Comercial</option>
                <option value="fracionada">Fracionada</option>
                <option value="dedicado">Dedicado</option>
              </select>
            </div>

            <div className="flex items-center gap-6 pt-2 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-700">Modelo Ativo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-700">Modelo Padrão para este Perfil</span>
              </label>
            </div>
          </div>

          {/* Preâmbulo */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">
              Texto do Preâmbulo / Enquadramento Legal
            </Label>
            <Textarea
              value={preambleTemplate}
              onChange={(e) => setPreambleTemplate(e.target.value)}
              rows={2}
              placeholder="CONTRATO DE TRANSPORTE RODOVIÁRIO DE BENS..."
              className="mt-1 text-xs"
            />
          </div>

          {/* Cláusulas Dinâmicas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-slate-900">
                  Cláusulas Contratuais ({clauses.length})
                </Label>
                <p className="text-[11px] text-slate-500">
                  Adicione, edite ou remova cláusulas específicas para este perfil de contratação.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddClause}
                className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Cláusula
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {clauses.map((clause, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-slate-100 font-bold shrink-0"
                      >
                        #{clause.number}
                      </Badge>
                      <Input
                        value={clause.title}
                        onChange={(e) => handleClauseChange(idx, 'title', e.target.value)}
                        placeholder="Ex: DO OBJETO"
                        className="text-xs font-bold uppercase h-8"
                      />
                    </div>
                    {clauses.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveClause(idx)}
                        className="text-red-500 hover:bg-red-50 h-8 w-8 p-0 shrink-0"
                        title="Remover cláusula"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={clause.text}
                    onChange={(e) => handleClauseChange(idx, 'text', e.target.value)}
                    rows={2}
                    placeholder="Texto completo da cláusula..."
                    className="text-xs text-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Responsabilidades e Penalidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Responsabilidades do Transportador
              </Label>
              <Textarea
                value={responsibilitiesText}
                onChange={(e) => setResponsibilitiesText(e.target.value)}
                rows={3}
                placeholder="Ex: Condução prudente, integridade de lacres..."
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Penalidades, Desvios e Avarias
              </Label>
              <Textarea
                value={penaltyTermsText}
                onChange={(e) => setPenaltyTermsText(e.target.value)}
                rows={3}
                placeholder="Ex: Atrasos injustificados ensejarão retenção..."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* Foro de Eleição */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Comarca do Foro</Label>
              <Input
                value={jurisdictionCity}
                onChange={(e) => setJurisdictionCity(e.target.value)}
                placeholder="Jundiaí"
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">UF do Foro</Label>
              <Input
                value={jurisdictionState}
                onChange={(e) => setJurisdictionState(e.target.value)}
                placeholder="SP"
                maxLength={2}
                className="mt-1 text-xs uppercase"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Configuração auditada no sistema para o Passo 4.
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Modelo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
