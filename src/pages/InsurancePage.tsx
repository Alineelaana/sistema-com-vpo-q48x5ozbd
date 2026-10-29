import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { INSURANCE_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import {
  getInsurancePolicies,
  createInsurancePolicy,
  updateInsurancePolicy,
  getInsuranceEndorsements,
  createInsuranceEndorsement,
  updateInsuranceEndorsement,
  getTripsForFiscalSelection,
} from '@/services/regularizationService'
import type { InsurancePolicy, InsuranceEndorsement, Trip, InsuranceType } from '@/types/logistics'
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck2,
  AlertTriangle,
  Building,
} from 'lucide-react'

export function InsurancePage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'endorsements' | 'policies'>('endorsements')
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [endorsements, setEndorsements] = useState<InsuranceEndorsement[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  // Modal Apólice
  const [policyModalOpen, setPolicyModalOpen] = useState(false)
  const [polInsurer, setPolInsurer] = useState('')
  const [polCnpj, setPolCnpj] = useState('')
  const [polNumber, setPolNumber] = useState('')
  const [polType, setPolType] = useState<InsuranceType>('rctr_c')
  const [polBroker, setPolBroker] = useState('')
  const [polAtm, setPolAtm] = useState('AT&M Integração')

  // Modal Averbação
  const [endModalOpen, setEndModalOpen] = useState(false)
  const [endTripId, setEndTripId] = useState('')
  const [endPolicyId, setEndPolicyId] = useState('')
  const [endProtocol, setEndProtocol] = useState('')
  const [endCargoValue, setEndCargoValue] = useState(150000)
  const [endFiscalKey, setEndFiscalKey] = useState('')
  const [endProof, setEndProof] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [polList, endList, tripList] = await Promise.all([
      getInsurancePolicies(),
      getInsuranceEndorsements(),
      getTripsForFiscalSelection(),
    ])
    setPolicies(polList)
    setEndorsements(endList)
    setTrips(tripList)
    setLoading(false)
  }

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createInsurancePolicy({
        insurer_name: polInsurer,
        insurer_cnpj: polCnpj,
        policy_number: polNumber,
        insurance_type: polType,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        insured_cnpjs: '12.345.678/0001-90',
        broker_name: polBroker,
        atm_provider: polAtm,
        is_mandatory_all_trips: true,
        is_active: true,
        notes: 'Apólice registrada e pronta para averbação automática.',
      })
      toast({ title: 'Apólice cadastrada com sucesso!' })
      setPolicyModalOpen(false)
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao cadastrar apólice', variant: 'destructive' })
    }
  }

  const handleSaveEndorsement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!endTripId || !endPolicyId) {
      toast({ title: 'Selecione a viagem e a apólice', variant: 'destructive' })
      return
    }

    const isAverbada = Boolean(endProtocol.trim())
    try {
      await createInsuranceEndorsement({
        trip_id: endTripId,
        policy_id: endPolicyId,
        declared_cargo_value: endCargoValue,
        fiscal_key: endFiscalKey,
        endorsement_protocol: endProtocol.trim(),
        proof_document: endProof.trim(),
        carrier_document: '12.345.678/0001-90',
        is_mandatory: true,
        status: isAverbada ? 'averbada' : 'queued',
        status_message: isAverbada
          ? 'Carga averbada com protocolo de seguradora confirmado.'
          : 'Dossiê na fila de averbação — aguardando protocolo da seguradora/AT&M.',
        averbada_at: isAverbada ? new Date().toISOString() : undefined,
      })
      toast({ title: 'Averbação registrada na fila!' })
      setEndModalOpen(false)
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao registrar averbação', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-600" />
            Seguros & Averbação de Carga
          </h1>
          <p className="text-sm text-slate-500">
            Gestão de apólices RCTR-C / RC-DC (Lei nº 14.599/2023) e dossiês de averbação vinculados
            às viagens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLogicModalOpen(true)}
            className="text-xs font-semibold gap-1.5"
          >
            Lógica da Tela
          </Button>

          {activeTab === 'policies' ? (
            <Button
              onClick={() => setPolicyModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova Apólice
            </Button>
          ) : (
            <Button
              onClick={() => setEndModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Dossiê de Averbação
            </Button>
          )}
        </div>
      </div>

      {/* Banner Explicativo */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Conformidade Legal RCTR-C:</strong> Toda viagem de transporte rodoviário de
            cargas exige apólice ativa e número de averbação antes da saída. Sem o protocolo oficial
            da seguradora, o sistema retém o registro como "na fila" e sinaliza o bloqueio de
            segurança.
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid grid-cols-2 max-w-sm">
          <TabsTrigger value="endorsements">Dossiês de Averbação</TabsTrigger>
          <TabsTrigger value="policies">Apólices Cadastradas</TabsTrigger>
        </TabsList>

        {/* Aba 1: Averbações */}
        <TabsContent value="endorsements" className="space-y-4 pt-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operação / Viagem</TableHead>
                    <TableHead>Apólice / Seguradora</TableHead>
                    <TableHead>Valor Declarado</TableHead>
                    <TableHead>Protocolo Averbação</TableHead>
                    <TableHead>Comprovante</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Carregando averbações...
                      </TableCell>
                    </TableRow>
                  ) : endorsements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Nenhum dossiê de averbação registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    endorsements.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono font-bold text-slate-900">
                          {e.expand?.trip_id?.trip_code || 'Viagem'}
                          <div className="text-[10px] text-slate-400 font-normal">
                            {e.fiscal_key
                              ? `Chave: ${e.fiscal_key.substring(0, 15)}...`
                              : 'Chave pendente'}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-semibold text-slate-800">
                            {e.expand?.policy_id?.insurer_name || 'Seguradora'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Apólice: {e.expand?.policy_id?.policy_number || 'S/N'}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs font-bold text-slate-800">
                          {e.declared_cargo_value.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </TableCell>

                        <TableCell className="font-mono text-xs">
                          {e.endorsement_protocol ? (
                            <span className="font-bold text-slate-900">
                              {e.endorsement_protocol}
                            </span>
                          ) : (
                            <span className="text-amber-600 italic">Pendente de retorno</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs font-mono">
                          {e.proof_document ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {e.proof_document}
                            </span>
                          ) : (
                            <span className="text-slate-400">Sem comprovante</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {e.status === 'averbada' && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Averbada
                            </Badge>
                          )}
                          {e.status === 'queued' && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                              <Clock className="h-3 w-3 text-amber-600" />
                              Na Fila
                            </Badge>
                          )}
                          {e.status === 'falhou' && (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 gap-1">
                              <XCircle className="h-3 w-3 text-rose-600" />
                              Falhou
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 2: Apólices */}
        <TabsContent value="policies" className="space-y-4 pt-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seguradora</TableHead>
                    <TableHead>Número da Apólice</TableHead>
                    <TableHead>Tipo de Seguro</TableHead>
                    <TableHead>Corretora / Provedor</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-slate-900">
                        {p.insurer_name}
                        <div className="text-[10px] text-slate-400 font-mono">{p.insurer_cnpj}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.policy_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase font-mono text-[10px]">
                          {p.insurance_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {p.broker_name || 'Direto'} ({p.atm_provider || 'Manual'})
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        Até {new Date(p.end_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {p.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Nova Apólice */}
      <Dialog open={policyModalOpen} onOpenChange={setPolicyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Apólice de Carga</DialogTitle>
            <DialogDescription>
              Dados da apólice obrigatória RCTR-C ou facultativa RC-DC.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePolicy} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Seguradora *</Label>
              <Input
                value={polInsurer}
                onChange={(e) => setPolInsurer(e.target.value)}
                placeholder="Ex: Porto Seguro Cia de Seguros Gerais"
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CNPJ Seguradora</Label>
                <Input
                  value={polCnpj}
                  onChange={(e) => setPolCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs">Número da Apólice *</Label>
                <Input
                  value={polNumber}
                  onChange={(e) => setPolNumber(e.target.value)}
                  placeholder="Ex: 0544-09827361-01"
                  required
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo de Seguro *</Label>
                <Select value={polType} onValueChange={(val: InsuranceType) => setPolType(val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rctr_c">RCTR-C (Acidentes)</SelectItem>
                    <SelectItem value="rc_dc">RC-DC (Roubo/Desaparecimento)</SelectItem>
                    <SelectItem value="rcta_c">RCTA-C (Aéreo)</SelectItem>
                    <SelectItem value="outro">Outro Seguro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Corretora de Seguros</Label>
                <Input
                  value={polBroker}
                  onChange={(e) => setPolBroker(e.target.value)}
                  placeholder="Ex: Aon / Marsh"
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPolicyModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Salvar Apólice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Dossiê de Averbação */}
      <Dialog open={endModalOpen} onOpenChange={setEndModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Dossiê de Averbação</DialogTitle>
            <DialogDescription>
              Vincule a operação e informe os dados de averbação da carga.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEndorsement} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Viagem da Operação *</Label>
              <Select value={endTripId} onValueChange={setEndTripId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a viagem..." />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.trip_code} — {t.cargo_type} (R$ {t.freight_value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Apólice a Utilizar *</Label>
              <Select value={endPolicyId} onValueChange={setEndPolicyId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a apólice..." />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.insurer_name} (Nº {p.policy_number} - {p.insurance_type.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor Declarado da Carga (R$) *</Label>
                <Input
                  type="number"
                  value={endCargoValue}
                  onChange={(e) => setEndCargoValue(parseFloat(e.target.value) || 0)}
                  className="mt-1 font-bold"
                  required
                />
              </div>

              <div>
                <Label className="text-xs">Protocolo Seguradora</Label>
                <Input
                  value={endProtocol}
                  onChange={(e) => setEndProtocol(e.target.value)}
                  placeholder="Ex: AVB-PORTO-2025"
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Chave Fiscal (NF-e ou CT-e)</Label>
                <Input
                  value={endFiscalKey}
                  onChange={(e) => setEndFiscalKey(e.target.value)}
                  placeholder="44 dígitos..."
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Comprovante</Label>
                <Input
                  value={endProof}
                  onChange={(e) => setEndProof(e.target.value)}
                  placeholder="Nome do arquivo ou ID"
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEndModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Salvar Dossiê
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={INSURANCE_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
