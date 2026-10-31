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
import { MDFE_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import { DamdfePdfModal } from '@/components/DamdfePdfModal'
import {
  getMdfeDocuments,
  transmitMdfe,
  closeMdfe,
  cancelMdfe,
  createMdfeDocument,
  getTripsForFiscalSelection,
  prepareMdfeFromTrip,
} from '@/services/regularizationService'
import { getCteDocuments } from '@/services/regularizationService'
import type { MdfeDocument, Trip, CteDocument } from '@/types/logistics'
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  Send,
  FileCheck2,
  Ban,
  FileText,
  Printer,
  Sparkles,
} from 'lucide-react'

export function MdfePage() {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<MdfeDocument[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [ctes, setCtes] = useState<CteDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [logicModalOpen, setLogicModalOpen] = useState(false)
  const [viewDoc, setViewDoc] = useState<MdfeDocument | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [damdfeModalOpen, setDamdfeModalOpen] = useState(false)
  const [damdfeDoc, setDamdfeDoc] = useState<MdfeDocument | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [transmittingId, setTransmittingId] = useState<string | null>(null)
  const [preparingTripId, setPreparingTripId] = useState<string | null>(null)

  const [formTripId, setFormTripId] = useState('')
  const [formOrigin, setFormOrigin] = useState('SP')
  const [formDest, setFormDest] = useState('MG')
  const [formRoute, setFormRoute] = useState('SP,MG')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [mdfes, allTrips, allCtes] = await Promise.all([
      getMdfeDocuments(),
      getTripsForFiscalSelection(),
      getCteDocuments(),
    ])
    setDocuments(mdfes)
    setTrips(allTrips)
    setCtes(allCtes)
    setLoading(false)
  }

  const handleTripSelect = (tripId: string) => {
    setFormTripId(tripId)
    const trip = trips.find((t) => t.id === tripId)
    if (trip) {
      setFormOrigin(trip.origin_state || 'SP')
      setFormDest(trip.destination_state || 'MG')
      setFormRoute(`${trip.origin_state || 'SP'},${trip.destination_state || 'MG'}`)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTripId) {
      toast({ title: 'Selecione uma viagem', variant: 'destructive' })
      return
    }

    const trip = trips.find((t) => t.id === formTripId)
    const tripCtes = ctes.filter((c) => c.trip_id === formTripId && c.status === 'authorized')
    const authorizedCteNumbers = tripCtes.map((c) => String(c.cte_number)).join(', ')
    const authorizedCteKeys = tripCtes
      .map((c) => c.access_key || '')
      .filter(Boolean)
      .join(', ')

    const nextNumber =
      documents.length > 0 ? Math.max(...documents.map((d) => d.mdfe_number)) + 1 : 501

    try {
      await createMdfeDocument({
        mdfe_number: nextNumber,
        series: 1,
        status: 'draft',
        status_message:
          tripCtes.length > 0
            ? 'Rascunho criado com CT-es autorizados vinculados. Pronto para transmissão.'
            : 'Rascunho criado com pendência: Requer pelo menos 1 CT-e autorizado na viagem.',
        uf_origin: formOrigin,
        uf_destination: formDest,
        route_ufs: formRoute,
        trip_id: formTripId,
        vehicle_id: trip?.vehicle_id,
        driver_id: trip?.driver_id,
        linked_cte_numbers: authorizedCteNumbers || 'Nenhum autorizado ainda',
        linked_cte_keys: authorizedCteKeys,
        total_cargo_value: tripCtes.reduce((acc, c) => acc + (c.cargo_value || 0), 0) || 50000,
        total_weight_kg: trip?.weight_kg || 15000,
      })

      toast({
        title: `MDF-e nº ${nextNumber} registrado!`,
        description: 'Documento criado na fila. Transmita quando os CT-es estiverem autorizados.',
      })
      setCreateModalOpen(false)
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao gerar MDF-e', variant: 'destructive' })
    }
  }

  const handleTransmit = async (doc: MdfeDocument) => {
    if (doc.status === 'authorized') {
      toast({ title: 'MDF-e já autorizado perante a SEFAZ' })
      return
    }
    setTransmittingId(doc.id)
    try {
      const res = await transmitMdfe(doc.id)
      if (res.status === 'authorized') {
        toast({ title: `MDF-e ${doc.mdfe_number} autorizado!`, description: res.message })
      } else if (res.status === 'rejected') {
        toast({
          title: `MDF-e ${doc.mdfe_number} rejeitado`,
          description: res.message,
          variant: 'destructive',
        })
      } else {
        toast({ title: 'MDF-e retido na fila', description: res.message })
      }
      loadData()
    } catch (err) {
      toast({ title: 'Falha na transmissão', variant: 'destructive' })
    } finally {
      setTransmittingId(null)
    }
  }

  const handleClose = async (doc: MdfeDocument) => {
    try {
      await closeMdfe(doc.id)
      toast({ title: `MDF-e ${doc.mdfe_number} encerrado com sucesso` })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao encerrar MDF-e', variant: 'destructive' })
    }
  }

  const handleCancel = async (doc: MdfeDocument) => {
    try {
      await cancelMdfe(doc.id, 'Cancelamento solicitado pelo emitente na central')
      toast({ title: `MDF-e ${doc.mdfe_number} cancelado` })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao cancelar MDF-e', variant: 'destructive' })
    }
  }

  const filteredDocs = documents.filter((d) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      d.mdfe_number.toString().includes(term) ||
      (d.access_key && d.access_key.includes(term)) ||
      (d.uf_origin && d.uf_origin.toLowerCase().includes(term)) ||
      (d.uf_destination && d.uf_destination.toLowerCase().includes(term)) ||
      (d.linked_cte_numbers && d.linked_cte_numbers.includes(term))

    const matchesStatus = statusFilter === 'all' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" />
            Manifesto Eletrônico de Documentos Fiscais (MDF-e)
          </h1>
          <p className="text-sm text-slate-500">
            Agrupe os CT-es autorizados da operação, valide o percurso interestadual e transmita o
            MDF-e oficial.
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
            onClick={() => setCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo MDF-e
          </Button>
        </div>
      </div>

      {/* Banner de Integridade Fiscal */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Regra Legal MDF-e:</strong> O manifesto consolida apenas conhecimentos de
            transporte válidos. Sem credenciais ativas do provedor fiscal, o manifesto é salvo e
            enfileirado com honestidade fiscal — nunca marcado como autorizado artificialmente.
          </span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por número, UF ou CT-es vinculados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Status:</span>
          <div className="flex gap-1">
            {['all', 'draft', 'queued', 'authorized', 'closed', 'cancelled'].map((st) => (
              <Button
                key={st}
                type="button"
                variant={statusFilter === st ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className={`text-xs h-8 ${statusFilter === st ? 'bg-slate-800' : ''}`}
              >
                {st === 'all' && 'Todos'}
                {st === 'draft' && 'Rascunho'}
                {st === 'queued' && 'Na Fila'}
                {st === 'authorized' && 'Autorizados'}
                {st === 'closed' && 'Encerrados'}
                {st === 'cancelled' && 'Cancelados'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de MDF-e */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número / Série</TableHead>
                <TableHead>Percurso Interestadual</TableHead>
                <TableHead>CT-es Vinculados</TableHead>
                <TableHead>Carga / Peso</TableHead>
                <TableHead>Status SEFAZ</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Carregando manifestos eletrônicos...
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum MDF-e encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono font-bold text-slate-900">
                      MDF-e nº {doc.mdfe_number}
                      <div className="text-[10px] text-slate-400 font-normal">
                        Série {doc.series}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800">
                        {doc.uf_origin} ➔ {doc.uf_destination}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Percurso: {doc.route_ufs || `${doc.uf_origin},${doc.uf_destination}`}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-medium text-slate-700 flex items-center gap-1">
                        <FileText className="h-3 w-3 text-indigo-600" />
                        CT-e: {doc.linked_cte_numbers || 'Nenhum'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                        {doc.access_key || 'Chave em geração'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800">
                        {(doc.total_cargo_value || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {(doc.total_weight_kg || 0).toLocaleString('pt-BR')} kg
                      </div>
                    </TableCell>

                    <TableCell>
                      {doc.status === 'authorized' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Autorizado
                        </Badge>
                      )}
                      {(doc.status === 'queued' || doc.status === 'draft') && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                          <Clock className="h-3 w-3 text-amber-600" />
                          {doc.status === 'draft' ? 'Rascunho' : 'Aguardando Transmissão'}
                        </Badge>
                      )}
                      {doc.status === 'closed' && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1">
                          <FileCheck2 className="h-3 w-3 text-blue-600" />
                          Encerrado
                        </Badge>
                      )}
                      {doc.status === 'cancelled' && (
                        <Badge variant="secondary" className="gap-1">
                          <Ban className="h-3 w-3" />
                          Cancelado
                        </Badge>
                      )}
                      {doc.status === 'rejected' && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 gap-1">
                          <XCircle className="h-3 w-3 text-rose-600" />
                          Rejeitado
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDamdfeDoc(doc)
                          setDamdfeModalOpen(true)
                        }}
                        title="Visualizar / Imprimir DAMDFE"
                      >
                        <Printer className="h-4 w-4 text-indigo-600" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewDoc(doc)
                          setViewModalOpen(true)
                        }}
                        title="Ver Detalhes do Manifesto"
                      >
                        <Eye className="h-4 w-4 text-slate-600" />
                      </Button>

                      {doc.status !== 'authorized' &&
                        doc.status !== 'closed' &&
                        doc.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={transmittingId === doc.id}
                            onClick={() => handleTransmit(doc)}
                            title="Transmitir à SEFAZ via Provedor Fiscal"
                          >
                            <Send className="h-4 w-4 text-indigo-600" />
                          </Button>
                        )}

                      {doc.status === 'authorized' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClose(doc)}
                          title="Encerrar MDF-e no destino"
                        >
                          <FileCheck2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Detalhes DAMDFE */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>DAMDFE / Manifesto Eletrônico Nº {viewDoc?.mdfe_number}</span>
              <Badge variant="outline" className="font-mono text-xs">
                Série {viewDoc?.series}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Documento Fiscal de Consolidação de Carga Interestadual (Ajuste SINIEF 21/2010).
            </DialogDescription>
          </DialogHeader>

          {viewDoc && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-3 bg-slate-50 rounded border space-y-2">
                <div className="text-xs text-slate-500 uppercase font-semibold">
                  Chave de Acesso MDF-e
                </div>
                <div className="font-mono text-xs text-slate-900 break-all bg-white p-2 rounded border">
                  {viewDoc.access_key || 'Chave em geração pelo provedor fiscal'}
                </div>
                <div className="flex justify-between text-xs text-slate-600 pt-1">
                  <span>
                    Protocolo: <strong>{viewDoc.protocol || 'Sem protocolo SEFAZ'}</strong>
                  </span>
                  <span>
                    Data:{' '}
                    <strong>
                      {viewDoc.issued_at
                        ? new Date(viewDoc.issued_at).toLocaleString('pt-BR')
                        : 'Aguardando'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded border">
                  <div className="text-xs font-semibold text-slate-500">Percurso da Operação</div>
                  <div className="font-bold text-slate-800 text-sm">
                    Origem: {viewDoc.uf_origin} ➔ Destino: {viewDoc.uf_destination}
                  </div>
                  <div className="text-xs font-mono text-slate-500">UFs: {viewDoc.route_ufs}</div>
                </div>

                <div className="p-3 bg-white rounded border">
                  <div className="text-xs font-semibold text-slate-500">CT-es Vinculados</div>
                  <div className="font-bold text-slate-800 text-sm">
                    Nº(s): {viewDoc.linked_cte_numbers}
                  </div>
                  <div className="text-xs text-slate-500">Somente documentos válidos</div>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded text-xs text-slate-700 space-y-1">
                <div>
                  Status do Processamento:{' '}
                  <strong>{viewDoc.status_message || viewDoc.status}</strong>
                </div>
              </div>

              <DialogFooter className="pt-2 flex justify-between sm:justify-between w-full">
                <div className="flex gap-2">
                  {viewDoc.status !== 'authorized' &&
                    viewDoc.status !== 'closed' &&
                    viewDoc.status !== 'cancelled' && (
                      <Button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        size="sm"
                        disabled={transmittingId === viewDoc.id}
                        onClick={() => {
                          handleTransmit(viewDoc)
                          setViewModalOpen(false)
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Transmitir à SEFAZ
                      </Button>
                    )}
                  {viewDoc.status === 'authorized' && (
                    <Button
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                      onClick={() => {
                        handleClose(viewDoc)
                        setViewModalOpen(false)
                      }}
                    >
                      Encerrar Manifesto
                    </Button>
                  )}
                  {viewDoc.status !== 'cancelled' && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        handleCancel(viewDoc)
                        setViewModalOpen(false)
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
                <Button type="button" variant="outline" onClick={() => setViewModalOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Criar Novo MDF-e */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar Novo Manifesto (MDF-e)</DialogTitle>
            <DialogDescription>
              Vincule a viagem identificada para consolidar os CT-es autorizados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Viagem da Operação *</Label>
              <Select value={formTripId} onValueChange={handleTripSelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a viagem..." />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.trip_code} — {t.origin_city}/{t.origin_state} ➔ {t.destination_city}/
                      {t.destination_state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">UF Origem *</Label>
                <Input
                  value={formOrigin}
                  onChange={(e) => setFormOrigin(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="mt-1 font-mono uppercase"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">UF Destino *</Label>
                <Input
                  value={formDest}
                  onChange={(e) => setFormDest(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="mt-1 font-mono uppercase"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">
                Percurso Interestadual (UFs separadas por vírgula) *
              </Label>
              <Input
                value={formRoute}
                onChange={(e) => setFormRoute(e.target.value.toUpperCase())}
                placeholder="Ex: SP,MG"
                className="mt-1 font-mono uppercase"
                required
              />
            </div>

            <div className="p-3 bg-slate-50 border rounded text-xs text-slate-600">
              O sistema irá associar automaticamente os CT-es autorizados desta viagem. Se nenhum
              CT-e estiver autorizado, o MDF-e ficará retido como rascunho com salvaguarda.
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Criar MDF-e
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal DAMDFE Completo */}
      <DamdfePdfModal
        mdfe={damdfeDoc}
        open={damdfeModalOpen}
        onOpenChange={setDamdfeModalOpen}
        onSendDocument={(doc) => {
          toast({
            title: 'Documento encaminhado ao Agente de Envio',
            description: `DAMDFE do MDF-e nº ${doc.mdfe_number} adicionado à esteira de envio de documentos.`,
          })
        }}
      />

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={MDFE_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
