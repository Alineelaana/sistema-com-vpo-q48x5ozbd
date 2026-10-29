import React, { useEffect, useState, useId } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  getCteDocuments,
  updateCteDocument,
  deleteCteDocument,
  getTrips,
  getCompanySettings,
  createCteDocument,
} from '@/services/logisticsService'
import type { CteDocument, Trip } from '@/types/logistics'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { CTE_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Eye,
  Download,
  Send,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'

export const CtePage: React.FC = () => {
  const cteNumberId = useId()
  const seriesId = useId()
  const senderNameId = useId()
  const senderDocId = useId()
  const recipientNameId = useId()
  const recipientDocId = useId()
  const cargoValId = useId()
  const freightValId = useId()
  const vpoValId = useId()

  const { toast } = useToast()
  const [documents, setDocuments] = useState<CteDocument[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Visualizador de CT-e / DACTE simplificado
  const [viewDoc, setViewDoc] = useState<CteDocument | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

  // Emissão manual de CT-e
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [logicModalOpen, setLogicModalOpen] = useState(false)
  const [manualForm, setManualForm] = useState({
    cte_number: 1043,
    series: 1,
    sender_name: '',
    sender_document: '',
    recipient_name: '',
    recipient_document: '',
    cargo_value: 80000,
    freight_value: 5500,
    vpo_included: true,
    vpo_value: 280,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [docs, tripsList] = await Promise.all([getCteDocuments(), getTrips()])
    setDocuments(docs)
    setTrips(tripsList)
    setLoading(false)
  }

  const handleOpenCreate = async () => {
    const comp = await getCompanySettings()
    const nextNum = (comp?.cte_current_number || 1042) + 1
    setManualForm({
      cte_number: nextNum,
      series: comp?.cte_series || 1,
      sender_name: 'Indústria Metalúrgica do Vale S/A',
      sender_document: '11.222.333/0001-44',
      recipient_name: 'Comércio Atacadista Logístico Ltda',
      recipient_document: '22.333.444/0001-55',
      cargo_value: 120000,
      freight_value: 6800,
      vpo_included: true,
      vpo_value: 360,
    })
    setCreateModalOpen(true)
  }

  const [transmittingId, setTransmittingId] = useState<string | null>(null)

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const total = manualForm.vpo_included
        ? manualForm.freight_value + manualForm.vpo_value
        : manualForm.freight_value

      // NUNCA simular autorização fiscal: criado em fila 'pending' para transmissão oficial
      await createCteDocument({
        cte_number: manualForm.cte_number,
        series: manualForm.series,
        access_key: '',
        sender_name: manualForm.sender_name,
        sender_document: manualForm.sender_document,
        recipient_name: manualForm.recipient_name,
        recipient_document: manualForm.recipient_document,
        cargo_value: manualForm.cargo_value,
        freight_value: manualForm.freight_value,
        vpo_included: manualForm.vpo_included,
        vpo_value: manualForm.vpo_value,
        total_cte_value: total,
        status: 'pending',
        status_message: 'Documento criado na fila — aguardando transmissão oficial à SEFAZ',
        protocol: '',
      })

      toast({
        title: `CT-e nº ${manualForm.cte_number} colocado na fila!`,
        description: 'Documento registrado aguardando transmissão via provedor fiscal.',
      })
      setCreateModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao registrar CT-e',
        variant: 'destructive',
      })
    }
  }

  const handleTransmitCte = async (doc: CteDocument) => {
    if (doc.status === 'authorized') {
      toast({
        title: 'Documento já autorizado',
        description: 'Não é permitida nova transmissão para documento já autorizado pela SEFAZ.',
      })
      return
    }
    setTransmittingId(doc.id)
    try {
      // Import dynamic or direct call
      const { transmitCte } = await import('@/services/regularizationService')
      const res = await transmitCte(doc.id)
      if (res.status === 'authorized') {
        toast({
          title: `CT-e ${doc.cte_number} autorizado!`,
          description: res.message,
        })
      } else if (res.status === 'rejected') {
        toast({
          title: `CT-e ${doc.cte_number} rejeitado pela SEFAZ`,
          description: res.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Documento na fila de transmissão',
          description: res.message,
        })
      }
      loadData()
    } catch (err) {
      toast({
        title: 'Falha na transmissão',
        description: 'Verifique as credenciais do provedor fiscal na tela Empresa.',
        variant: 'destructive',
      })
    } finally {
      setTransmittingId(null)
    }
  }

  const handleCancelCte = async (doc: CteDocument) => {
    try {
      await updateCteDocument(doc.id, {
        status: 'cancelled',
        status_message: 'Cancelamento solicitado pelo transportador.',
      })
      toast({
        title: `CT-e ${doc.cte_number} cancelado`,
      })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao cancelar CT-e', variant: 'destructive' })
    }
  }

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.cte_number.toString().includes(searchTerm) ||
      d.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.access_key && d.access_key.includes(searchTerm))

    const matchesStatus = statusFilter === 'all' || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            Documentos Fiscais (CT-e)
          </h1>
          <p className="text-sm text-slate-500">
            Acompanhe a autorização na SEFAZ e garanta que o VPO está devidamente destacado e
            averbado.
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
            Emitir CT-e Manual
          </Button>
        </div>
      </div>

      {/* Banner de Integridade Fiscal */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Emissão Fiscal Real:</strong> A autorização depende da resposta oficial da SEFAZ
            via provedor configurado. Sem credenciais cadastradas na tela Empresa, os documentos são
            mantidos com segurança na fila de transmissão.
          </span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por número, tomador ou chave de acesso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filtrar status:</span>
          <div className="flex gap-1">
            {['all', 'authorized', 'pending', 'rejected'].map((st) => (
              <Button
                key={st}
                type="button"
                variant={statusFilter === st ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className={`text-xs h-8 ${statusFilter === st ? 'bg-slate-800' : ''}`}
              >
                {st === 'all' && 'Todos'}
                {st === 'authorized' && 'Autorizados'}
                {st === 'pending' && 'Pendentes'}
                {st === 'rejected' && 'Rejeitados'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de CT-e */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número / Série</TableHead>
                <TableHead>Emissão / Chave de Acesso</TableHead>
                <TableHead>Remetente ➔ Destinatário</TableHead>
                <TableHead>Frete</TableHead>
                <TableHead>VPO Destacado</TableHead>
                <TableHead>Total CT-e</TableHead>
                <TableHead>Status SEFAZ</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Carregando documentos fiscais...
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    Nenhum CT-e encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono font-bold text-slate-900">
                      Nº {doc.cte_number}
                      <div className="text-[10px] text-slate-400 font-normal">
                        Série {doc.series}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-700">
                        {doc.issued_at
                          ? new Date(doc.issued_at).toLocaleDateString('pt-BR')
                          : 'Hoje'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]">
                        {doc.access_key || 'Chave pendente'}
                      </div>
                    </TableCell>

                    <TableCell className="max-w-[200px]">
                      <div className="font-medium text-xs text-slate-900 truncate">
                        {doc.sender_name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        ➔ {doc.recipient_name}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-slate-800">
                      {doc.freight_value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="font-bold text-indigo-700 bg-indigo-50 border-indigo-200"
                      >
                        {(doc.vpo_value || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-bold text-slate-900 text-sm">
                      {doc.total_cte_value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>

                    <TableCell>
                      {doc.status === 'authorized' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Autorizado
                        </Badge>
                      )}
                      {doc.status === 'pending' && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                          <Clock className="h-3 w-3 text-amber-600" />
                          Pendente SEFAZ
                        </Badge>
                      )}
                      {doc.status === 'rejected' && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 gap-1">
                          <XCircle className="h-3 w-3 text-rose-600" />
                          Rejeitado
                        </Badge>
                      )}
                      {doc.status === 'cancelled' && <Badge variant="secondary">Cancelado</Badge>}
                    </TableCell>

                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewDoc(doc)
                          setViewModalOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4 text-slate-600" />
                      </Button>
                      {doc.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={transmittingId === doc.id}
                          onClick={() => handleTransmitCte(doc)}
                          title="Transmitir para SEFAZ via Provedor Fiscal"
                        >
                          <Send className="h-4 w-4 text-indigo-600" />
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

      {/* Modal Visualizar Detalhes / DACTE */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes do CT-e Nº {viewDoc?.cte_number}</span>
              <Badge variant="outline" className="font-mono text-xs">
                Série {viewDoc?.series}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Demonstrativo de valores com composição do Vale Pedágio Obrigatório (Lei 10.209/01).
            </DialogDescription>
          </DialogHeader>

          {viewDoc && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-3 bg-slate-50 rounded border space-y-2">
                <div className="text-xs text-slate-500 uppercase font-semibold">
                  Chave de Acesso (44 dígitos)
                </div>
                <div className="font-mono text-xs text-slate-900 break-all bg-white p-2 rounded border">
                  {viewDoc.access_key || 'Chave de acesso em processamento'}
                </div>
                <div className="flex justify-between text-xs text-slate-600 pt-1">
                  <span>
                    Protocolo: <strong>{viewDoc.protocol || 'Aguardando protocolo'}</strong>
                  </span>
                  <span>
                    Data:{' '}
                    <strong>
                      {viewDoc.issued_at
                        ? new Date(viewDoc.issued_at).toLocaleString('pt-BR')
                        : 'Hoje'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded border">
                  <div className="text-xs font-semibold text-slate-500">Remetente / Tomador</div>
                  <div className="font-bold text-slate-800 text-sm">{viewDoc.sender_name}</div>
                  <div className="text-xs font-mono text-slate-500">{viewDoc.sender_document}</div>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="text-xs font-semibold text-slate-500">Destinatário</div>
                  <div className="font-bold text-slate-800 text-sm">{viewDoc.recipient_name}</div>
                  <div className="text-xs font-mono text-slate-500">
                    {viewDoc.recipient_document}
                  </div>
                </div>
              </div>

              {/* Quadro de Valores com VPO */}
              <div className="p-4 bg-indigo-50/60 rounded-lg border border-indigo-200 space-y-2">
                <div className="text-xs font-bold text-indigo-900 uppercase">
                  Composição do Frete e Pedágio
                </div>
                <div className="flex justify-between py-1 border-b border-indigo-100">
                  <span className="text-slate-600">
                    Valor da Prestação de Serviço (Frete Líquido):
                  </span>
                  <span className="font-semibold text-slate-800">
                    {viewDoc.freight_value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-indigo-100">
                  <span className="text-indigo-900 font-medium">
                    Vale Pedágio Obrigatório (VPO destacado):
                  </span>
                  <span className="font-bold text-indigo-700">
                    {(viewDoc.vpo_value || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-base font-bold text-slate-900">
                  <span>Valor Total do CT-e a Cobrar:</span>
                  <span className="text-indigo-900">
                    {viewDoc.total_cte_value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-100 rounded text-xs text-slate-600 flex items-center justify-between">
                <span>
                  Status SEFAZ:{' '}
                  <strong className="text-slate-800">
                    {viewDoc.status_message || viewDoc.status}
                  </strong>
                </span>
              </div>

              <DialogFooter className="pt-2 flex justify-between sm:justify-between w-full">
                <div className="flex gap-2">
                  {viewDoc.status === 'pending' && (
                    <Button
                      type="button"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      size="sm"
                      disabled={transmittingId === viewDoc.id}
                      onClick={() => {
                        handleTransmitCte(viewDoc)
                        setViewModalOpen(false)
                      }}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Transmitir à SEFAZ
                    </Button>
                  )}
                  {viewDoc.status !== 'cancelled' && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        handleCancelCte(viewDoc)
                        setViewModalOpen(false)
                      }}
                    >
                      Cancelar CT-e
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

      {/* Modal Emitir Manual */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Emitir Conhecimento de Transporte (CT-e)</DialogTitle>
            <DialogDescription>
              Emissão avulsa com inserção automática do Vale Pedágio Obrigatório.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveManual} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={cteNumberId} className="text-xs">
                  Número CT-e *
                </Label>
                <Input
                  id={cteNumberId}
                  type="number"
                  value={manualForm.cte_number}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, cte_number: parseInt(e.target.value, 10) || 1 })
                  }
                  required
                  className="mt-1 font-bold"
                />
              </div>
              <div>
                <Label htmlFor={seriesId} className="text-xs">
                  Série
                </Label>
                <Input
                  id={seriesId}
                  type="number"
                  value={manualForm.series}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, series: parseInt(e.target.value, 10) || 1 })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor={senderNameId} className="text-xs">
                Razão Social Tomador / Remetente *
              </Label>
              <Input
                id={senderNameId}
                value={manualForm.sender_name}
                onChange={(e) => setManualForm({ ...manualForm, sender_name: e.target.value })}
                placeholder="Nome do cliente pagador do frete"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={senderDocId} className="text-xs">
                CNPJ Remetente *
              </Label>
              <Input
                id={senderDocId}
                value={manualForm.sender_document}
                onChange={(e) => setManualForm({ ...manualForm, sender_document: e.target.value })}
                placeholder="00.000.000/0000-00"
                required
                className="mt-1 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={recipientNameId} className="text-xs">
                  Destinatário *
                </Label>
                <Input
                  id={recipientNameId}
                  value={manualForm.recipient_name}
                  onChange={(e) => setManualForm({ ...manualForm, recipient_name: e.target.value })}
                  placeholder="Nome do destinatário"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={recipientDocId} className="text-xs">
                  CNPJ/CPF Destinatário
                </Label>
                <Input
                  id={recipientDocId}
                  value={manualForm.recipient_document}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, recipient_document: e.target.value })
                  }
                  placeholder="00.000.000/0000-00"
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={cargoValId} className="text-xs">
                  Valor da Carga (R$)
                </Label>
                <Input
                  id={cargoValId}
                  type="number"
                  value={manualForm.cargo_value}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, cargo_value: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={freightValId} className="text-xs">
                  Valor Frete Base (R$) *
                </Label>
                <Input
                  id={freightValId}
                  type="number"
                  value={manualForm.freight_value}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, freight_value: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="mt-1 font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 rounded border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor={vpoValId} className="text-xs font-bold text-indigo-900">
                  Valor do VPO (Pedágio Obrigatório)
                </Label>
                <Badge className="bg-indigo-600 text-white text-[10px]">Lei 10.209</Badge>
              </div>
              <Input
                id={vpoValId}
                type="number"
                step="0.01"
                value={manualForm.vpo_value}
                onChange={(e) =>
                  setManualForm({ ...manualForm, vpo_value: parseFloat(e.target.value) || 0 })
                }
                className="font-bold text-indigo-700 bg-white"
              />
              <div className="text-xs text-slate-600 mt-2 flex justify-between font-medium">
                <span>Total Final do CT-e:</span>
                <span className="font-bold text-slate-900">
                  {((manualForm.freight_value || 0) + (manualForm.vpo_value || 0)).toLocaleString(
                    'pt-BR',
                    { style: 'currency', currency: 'BRL' },
                  )}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Autorizar CT-e
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={CTE_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
