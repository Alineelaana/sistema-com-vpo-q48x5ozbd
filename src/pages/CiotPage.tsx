import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { CIOT_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import {
  getCiotRecords,
  createCiotRecord,
  updateCiotRecord,
  getTripsForFiscalSelection,
} from '@/services/regularizationService'
import type { CiotRecord, Trip, CarrierProfile } from '@/types/logistics'
import {
  IdCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Building2,
  Truck,
  FileCheck,
  ShieldCheck,
} from 'lucide-react'

export function CiotPage() {
  const { toast } = useToast()
  const [records, setRecords] = useState<CiotRecord[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [logicModalOpen, setLogicModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<CiotRecord | null>(null)

  // Formulário
  const [formTripId, setFormTripId] = useState('')
  const [formRntrc, setFormRntrc] = useState('49827361')
  const [formProfile, setFormProfile] = useState<CarrierProfile>('tac_equiparado')
  const [formCiotNumber, setFormCiotNumber] = useState('')
  const [formInstitution, setFormInstitution] = useState('Repom / Edenred Soluções')
  const [formVoucher, setFormVoucher] = useState('')
  const [formFreight, setFormFreight] = useState(8400)
  const [formNotes, setFormNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [ciots, allTrips] = await Promise.all([getCiotRecords(), getTripsForFiscalSelection()])
    setRecords(ciots)
    setTrips(allTrips)
    setLoading(false)
  }

  const handleTripSelect = (tripId: string) => {
    setFormTripId(tripId)
    const trip = trips.find((t) => t.id === tripId)
    if (trip) {
      setFormFreight(trip.freight_value || 8000)
    }
  }

  const handleOpenCreate = () => {
    setEditRecord(null)
    setFormTripId('')
    setFormCiotNumber('')
    setFormVoucher('')
    setFormNotes('')
    setCreateModalOpen(true)
  }

  const handleOpenEdit = (rec: CiotRecord) => {
    setEditRecord(rec)
    setFormTripId(rec.trip_id)
    setFormRntrc(rec.carrier_rntrc)
    setFormProfile(rec.carrier_profile)
    setFormCiotNumber(rec.ciot_number || '')
    setFormInstitution(rec.institution_provider || 'Repom / Edenred Soluções')
    setFormVoucher(rec.voucher_document || '')
    setFormFreight(rec.freight_value || 0)
    setFormNotes(rec.notes || '')
    setCreateModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTripId) {
      toast({ title: 'Selecione uma viagem', variant: 'destructive' })
      return
    }

    const trip = trips.find((t) => t.id === formTripId)
    const tripCode = trip?.trip_code || 'VIAG-OPER'

    // Status honesto: se o usuário informou o CIOT e comprovante, está registrado. Senão, fica pendente na fila.
    const isRegistered = Boolean(formCiotNumber.trim() && formVoucher.trim())

    try {
      if (editRecord) {
        await updateCiotRecord(editRecord.id, {
          carrier_rntrc: formRntrc,
          carrier_profile: formProfile,
          ciot_number: formCiotNumber.trim(),
          institution_provider: formInstitution,
          voucher_document: formVoucher.trim(),
          freight_value: formFreight,
          notes: formNotes,
          status: isRegistered ? 'registered' : 'pending',
          status_message: isRegistered
            ? 'CIOT validado com comprovante de registro na IPEF credenciada.'
            : 'Registro de CIOT pendente de geração ou preenchimento de comprovante.',
          registered_at: isRegistered ? new Date().toISOString() : undefined,
        })
        toast({ title: 'Registro de CIOT atualizado!' })
      } else {
        await createCiotRecord({
          trip_id: formTripId,
          trip_code: tripCode,
          carrier_rntrc: formRntrc,
          carrier_profile: formProfile,
          ciot_number: formCiotNumber.trim(),
          institution_provider: formInstitution,
          voucher_document: formVoucher.trim(),
          freight_value: formFreight,
          is_mandatory: true,
          contractor_document: '12.345.678/0001-90',
          status: isRegistered ? 'registered' : 'pending',
          status_message: isRegistered
            ? 'CIOT cadastrado com comprovante de protocolo.'
            : 'CIOT cadastrado na fila aguardando comprovante ou integração IPEF.',
          registered_at: isRegistered ? new Date().toISOString() : undefined,
          notes: formNotes,
        })
        toast({ title: 'Registro de CIOT incluído com sucesso!' })
      }
      setCreateModalOpen(false)
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao salvar CIOT', variant: 'destructive' })
    }
  }

  const filteredRecords = records.filter((r) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      (r.trip_code && r.trip_code.toLowerCase().includes(term)) ||
      r.carrier_rntrc.includes(term) ||
      (r.ciot_number && r.ciot_number.includes(term)) ||
      (r.institution_provider && r.institution_provider.toLowerCase().includes(term)) ||
      (r.voucher_document && r.voucher_document.toLowerCase().includes(term))

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <IdCard className="h-6 w-6 text-indigo-600" />
            Código Identificador da Operação de Transportes (CIOT)
          </h1>
          <p className="text-sm text-slate-500">
            Controle de obrigatoriedade legal (Res. ANTT nº 5.862/2019), com perfil do transportador
            e vínculo à viagem.
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

          <Button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Registrar CIOT
          </Button>
        </div>
      </div>

      {/* Banner de Esclarecimento Legal (Regra do Usuário) */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
          <span>
            <strong>Distinção e Integridade ANTT:</strong> CIOT e VPO são obrigações distintas com
            coleções próprias. Não há emissão mágica direta na ANTT sem custo: a geração do código
            ocorre via IPEF credenciada (Repom, Sem Parar, PagBem) ou por inserção manual auditada
            do protocolo.
          </span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por viagem, RNTRC, número de CIOT ou protocolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Status:</span>
          <div className="flex gap-1">
            {['all', 'registered', 'pending', 'failed'].map((st) => (
              <Button
                key={st}
                type="button"
                variant={statusFilter === st ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className={`text-xs h-8 ${statusFilter === st ? 'bg-slate-800' : ''}`}
              >
                {st === 'all' && 'Todos'}
                {st === 'registered' && 'Registrados'}
                {st === 'pending' && 'Pendentes'}
                {st === 'failed' && 'Com Falha'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de CIOT */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operação / Viagem</TableHead>
                <TableHead>Perfil / RNTRC</TableHead>
                <TableHead>Número CIOT (16 dígitos)</TableHead>
                <TableHead>IPEF / Instituição</TableHead>
                <TableHead>Comprovante / Protocolo</TableHead>
                <TableHead>Status ANTT</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Carregando registros de CIOT...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Nenhum registro de CIOT localizado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-bold text-slate-900">
                      {r.trip_code || 'Viagem vinculada'}
                      <div className="text-[10px] text-slate-500 font-normal">
                        Frete:{' '}
                        {(r.freight_value || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800 capitalize">
                        {r.carrier_profile === 'tac_equiparado' &&
                          'TAC-Equiparado (Até 3 veículos)'}
                        {r.carrier_profile === 'etc' && 'ETC (Empresa de Transporte)'}
                        {r.carrier_profile === 'tac_independente' && 'TAC-Independente (Autônomo)'}
                        {r.carrier_profile === 'ctc' && 'Cooperativa (CTC)'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        RNTRC: {r.carrier_rntrc}
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs">
                      {r.ciot_number ? (
                        <span className="font-bold text-slate-900">{r.ciot_number}</span>
                      ) : (
                        <span className="text-amber-600 italic">Pendente de emissão</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-700">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {r.institution_provider || 'IPEF Homologada'}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono">
                      {r.voucher_document ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {r.voucher_document}
                        </span>
                      ) : (
                        <span className="text-slate-400">Sem comprovante</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {r.status === 'registered' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Registrado
                        </Badge>
                      )}
                      {r.status === 'pending' && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                          <Clock className="h-3 w-3 text-amber-600" />
                          Pendente
                        </Badge>
                      )}
                      {r.status === 'failed' && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 gap-1">
                          <XCircle className="h-3 w-3 text-rose-600" />
                          Falhou
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(r)}
                        className="text-xs text-indigo-600"
                      >
                        Editar / Comprovante
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Criar / Editar CIOT */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editRecord ? 'Atualizar CIOT e Comprovante' : 'Novo Registro de CIOT'}
            </DialogTitle>
            <DialogDescription>
              Vincule a viagem e informe os dados da IPEF ou comprovante de protocolo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Viagem da Operação *</Label>
              <Select
                value={formTripId}
                onValueChange={handleTripSelect}
                disabled={Boolean(editRecord)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a viagem..." />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.trip_code} — {t.origin_city} ➔ {t.destination_city} (R$ {t.freight_value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">RNTRC Transportador *</Label>
                <Input
                  value={formRntrc}
                  onChange={(e) => setFormRntrc(e.target.value)}
                  className="mt-1 font-mono"
                  required
                />
              </div>

              <div>
                <Label className="text-xs">Perfil Transportador *</Label>
                <Select
                  value={formProfile}
                  onValueChange={(val: CarrierProfile) => setFormProfile(val)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tac_equiparado">TAC-Equiparado</SelectItem>
                    <SelectItem value="etc">ETC (Empresa)</SelectItem>
                    <SelectItem value="tac_independente">TAC-Independente</SelectItem>
                    <SelectItem value="ctc">CTC (Cooperativa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Instituição de Pagamento / IPEF Credenciada</Label>
              <Select value={formInstitution} onValueChange={setFormInstitution}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Repom / Edenred Soluções">Repom / Edenred Soluções</SelectItem>
                  <SelectItem value="Sem Parar Empresas">Sem Parar Empresas</SelectItem>
                  <SelectItem value="PagBem IPEF">PagBem Soluções de Pagamento</SelectItem>
                  <SelectItem value="Pamcard / Roadcard">Pamcard / Roadcard</SelectItem>
                  <SelectItem value="IPEF Própria / Outra">Outra Homologada ANTT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código CIOT (16 dígitos)</Label>
                <Input
                  value={formCiotNumber}
                  onChange={(e) => setFormCiotNumber(e.target.value)}
                  placeholder="0000000000000000"
                  maxLength={16}
                  className="mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs">Protocolo / Comprovante</Label>
                <Input
                  value={formVoucher}
                  onChange={(e) => setFormVoucher(e.target.value)}
                  placeholder="Ex: CIOT-PROTO-2025"
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Observações da Operação</Label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Observações de fiscalização ou subcontratação..."
                className="mt-1"
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              Preenchendo o número do CIOT e o comprovante, o registro ganha status{' '}
              <strong>Registrado</strong>. Sem eles, permanece <strong>Pendente</strong>, ativando
              as salvaguardas da viagem.
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Salvar Registro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={CIOT_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
