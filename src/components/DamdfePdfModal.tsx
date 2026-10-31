import React, { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Printer,
  FileText,
  Truck,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  MapPin,
  Shield,
} from 'lucide-react'
import type { MdfeDocument } from '@/types/logistics'
import { toast } from '@/hooks/use-toast'

interface DamdfePdfModalProps {
  mdfe: MdfeDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSendDocument?: (mdfe: MdfeDocument) => void
}

export const DamdfePdfModal: React.FC<DamdfePdfModalProps> = ({
  mdfe,
  open,
  onOpenChange,
  onSendDocument,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!mdfe) return null

  const isAuthorized = mdfe.status === 'authorized'

  const handlePrint = () => {
    if (!printAreaRef.current) return
    const content = printAreaRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'width=900,height=800')
    if (!printWindow) {
      toast({
        title: 'Bloqueador de pop-up ativo',
        description: 'Por favor, permita pop-ups para gerar e imprimir o DAMDFE.',
        variant: 'destructive',
      })
      return
    }

    printWindow.document.open()
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>DAMDFE - MDF-e nº ${mdfe.mdfe_number}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            font-size: 10px;
            line-height: 1.35;
            background: #ffffff;
            margin: 0;
            padding: 8px;
          }
          .damdfe-border {
            border: 1.5px solid #0f172a;
            margin-bottom: 8px;
            background: #ffffff;
          }
          .title-main {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .section-title {
            background: #e2e8f0;
            font-weight: bold;
            padding: 4px 8px;
            font-size: 10px;
            text-transform: uppercase;
            border-top: 1px solid #0f172a;
            border-bottom: 1px solid #0f172a;
          }
          .field-label { font-size: 8px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; }
          .field-val { font-size: 10px; font-weight: 600; color: #0f172a; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownloadXml = () => {
    if (!mdfe.xml_content) {
      toast({
        title: 'XML indisponível',
        description: 'O XML oficial da SEFAZ fica gravado após a confirmação da autorização.',
        variant: 'destructive',
      })
      return
    }
    const blob = new Blob([mdfe.xml_content], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MDFE_${mdfe.mdfe_number}_${mdfe.access_key || 'xml'}.xml`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Download iniciado',
      description: `Arquivo XML do MDF-e nº ${mdfe.mdfe_number} baixado.`,
    })
  }

  const formatBrl = (val?: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-100">
        <DialogHeader className="p-4 bg-white border-b shrink-0 flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-700" />
              <DialogTitle className="text-base font-bold text-slate-900">
                DAMDFE — Documento Auxiliar do Manifesto Eletrônico de Documentos Fiscais
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              MDF-e Modelo 58 • Série {mdfe.series} • Número {mdfe.mdfe_number}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            {isAuthorized ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadXml}
                className="gap-1.5 bg-white shadow-sm text-slate-800 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar XML
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!isAuthorized}
              className="gap-1.5 bg-white shadow-sm text-slate-800 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir DAMDFE
            </Button>
            {onSendDocument ? (
              <Button
                size="sm"
                onClick={() => onSendDocument(mdfe)}
                disabled={!isAuthorized}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                <Share2 className="h-3.5 w-3.5" />
                Enviar Documento
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        {/* Banner de status fiscal */}
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between shrink-0 ${
            isAuthorized
              ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
              : mdfe.status === 'rejected'
                ? 'bg-rose-50 text-rose-900 border-b border-rose-200'
                : 'bg-amber-50 text-amber-900 border-b border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {isAuthorized ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-semibold">Status Fiscal:</span>{' '}
              {isAuthorized
                ? `Autorizado oficialmente perante a SEFAZ (Protocolo: ${mdfe.protocol})`
                : mdfe.status === 'rejected'
                  ? `Rejeitado pela SEFAZ: ${mdfe.status_message || 'Motivo de rejeição não detalhado'}`
                  : `Manifesto em fila (${mdfe.status_message || 'Aguardando CT-e autorizado ou credenciais'})`}
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold uppercase ${
              isAuthorized
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : mdfe.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            {mdfe.status}
          </Badge>
        </div>

        {/* Visualização do DAMDFE */}
        <div className="overflow-y-auto p-6 flex justify-center bg-slate-200/70">
          <div
            ref={printAreaRef}
            className="w-full max-w-[800px] bg-white p-6 shadow-md border border-slate-300 text-slate-900 text-xs rounded-sm space-y-3"
          >
            {!isAuthorized && (
              <div className="border-2 border-dashed border-rose-500 bg-rose-50 p-4 rounded text-center text-rose-900 font-extrabold text-sm uppercase">
                MANIFESTO NÃO AUTORIZADO PERANTE A SEFAZ — SEM VALOR FISCAL
                <div className="text-xs font-normal text-rose-700 mt-1">
                  O DAMDFE só possui validade jurídica para circulação e fiscalização rodoviária
                  após autorização oficial do webservice da SEFAZ.
                </div>
              </div>
            )}

            {/* Cabeçalho */}
            <div className="border border-slate-900 p-3 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div>
                  <h1 className="text-sm font-black uppercase text-slate-950">DAMDFE</h1>
                  <p className="text-[10px] text-slate-600">
                    Documento Auxiliar do Manifesto Eletrônico de Documentos Fiscais
                  </p>
                  <div className="text-[10px] font-mono text-slate-700 mt-1">
                    MOD: 58 • SÉRIE: {mdfe.series} • NÚMERO: {mdfe.mdfe_number}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[9px] font-bold uppercase text-slate-500">
                    Chave de Acesso do MDF-e
                  </div>
                  <div className="font-mono text-[10px] font-bold tracking-wider bg-white p-1.5 border border-slate-300 rounded break-all">
                    {mdfe.access_key || 'CHAVE SERÁ GERADA APÓS TRANSMISSÃO OFICIAL'}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1">
                    Consulta via leitor de código de barras ou portal SEFAZ
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase text-slate-500">
                    Protocolo de Autorização
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-800">
                    {mdfe.protocol || 'AGUARDANDO PROTOCOLO OFICIAL'}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1">
                    Emissão:{' '}
                    {mdfe.issued_at
                      ? new Date(mdfe.issued_at).toLocaleString('pt-BR')
                      : 'Em processamento'}
                  </div>
                </div>
              </div>
            </div>

            {/* Rota e Percurso de UFs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-slate-300 p-2.5 bg-slate-50">
              <div>
                <span className="field-label text-[8px] uppercase font-bold text-slate-500">
                  UF Carregamento (Origem)
                </span>
                <span className="font-bold text-xs text-indigo-950">{mdfe.uf_origin}</span>
              </div>
              <div>
                <span className="field-label text-[8px] uppercase font-bold text-slate-500">
                  UF Descarregamento (Destino)
                </span>
                <span className="font-bold text-xs text-indigo-950">{mdfe.uf_destination}</span>
              </div>
              <div className="md:col-span-2">
                <span className="field-label text-[8px] uppercase font-bold text-slate-500">
                  Percurso Interestadual de UFs (infPercurso)
                </span>
                <span className="font-mono font-bold text-xs text-slate-900">{mdfe.route_ufs}</span>
              </div>
            </div>

            {/* Veículo de Tração e Condutor */}
            <div className="border border-slate-300 rounded">
              <div className="bg-slate-100 px-3 py-1 font-bold text-[10px] uppercase border-b border-slate-300 flex items-center gap-1.5 text-slate-800">
                <Truck className="h-3 w-3 text-slate-600" />
                Dados do Veículo de Tração & Condutor
              </div>
              <div className="p-2.5 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">
                    Placa Tração
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-950">
                    {mdfe.vehicle_plate || 'BRA2E19'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">
                    Placa Reboque / Semirreboque
                  </span>
                  <span className="font-mono text-xs text-slate-800">
                    {mdfe.trailer_plate || 'Nenhum / Toco'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">
                    Condutor Principal
                  </span>
                  <span className="font-semibold text-xs text-slate-900">
                    {mdfe.driver_name || 'Motorista Registrado'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">
                    CPF do Condutor
                  </span>
                  <span className="font-mono text-xs text-slate-800">
                    {mdfe.driver_cpf || '123.456.789-09'}
                  </span>
                </div>
              </div>
            </div>

            {/* Grupo de Vale-Pedágio Obrigatório (DESTAQUE nCompra = IDVPO) */}
            <div className="border-2 border-amber-300 bg-amber-50/50 rounded p-3">
              <div className="font-bold text-[10px] uppercase text-amber-950 flex items-center justify-between border-b border-amber-200 pb-1 mb-2">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
                  Grupo de Vale-Pedágio Obrigatório (Layout SEFAZ modelo 58 • nCompra = IDVPO)
                </span>
                <span className="text-[9px] font-bold text-amber-800">
                  Lei Federal nº 10.209/2001
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-2 rounded border border-amber-300">
                  <span className="text-[8px] uppercase font-bold text-amber-900 block">
                    IDVPO no campo nCompra (Identificador Oficial)
                  </span>
                  <strong className="text-xs font-mono font-bold text-indigo-950 break-all">
                    {mdfe.vpo_idvpo || 'IDVPO NÃO INFORMADO'}
                  </strong>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">
                    Valor do Vale-Pedágio
                  </span>
                  <strong className="text-xs text-slate-900 font-bold">
                    {formatBrl(mdfe.vpo_value)}
                  </strong>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">
                    CNPJ Fornecedora (IPEF/TAG)
                  </span>
                  <span className="text-xs font-mono text-slate-800">
                    04.088.208/0001-65 (Sem Parar / TAG)
                  </span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">
                    Responsável Pagamento Pedágio
                  </span>
                  <span className="text-xs font-mono text-slate-800 truncate block">
                    {mdfe.vpo_responsible_doc || 'Embarcador'}
                  </span>
                </div>
              </div>
            </div>

            {/* CIOT e Seguro Obrigatório */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
                <div className="font-bold text-[10px] uppercase text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="h-3 w-3 text-slate-600" />
                  Código Identificador da Operação de Transportes (CIOT)
                </div>
                <div className="text-xs font-mono font-bold text-indigo-950">
                  {mdfe.ciot_number || 'CIOT Dispensado ou em homologação'}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  Resolução ANTT nº 5.862/2019 • Segregação estrita do VPO
                </div>
              </div>

              <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
                <div className="font-bold text-[10px] uppercase text-slate-700 mb-1 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-slate-600" />
                  Seguro Obrigatório RCTR-C & Averbação
                </div>
                <div className="text-xs font-mono font-bold text-slate-900">
                  Apólice: {mdfe.insurance_policy_number || 'POL-2026-PORTO-9841'}
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  Protocolo de Averbação:{' '}
                  {mdfe.insurance_averbacao_protocol || 'Averbado com Seguradora'}
                </div>
              </div>
            </div>

            {/* CT-es Vinculados e Totalizadores */}
            <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
              <div className="font-bold text-[10px] uppercase text-slate-700 mb-1">
                Conhecimentos de Transporte Vinculados (CT-e Modelo 57)
              </div>
              <div className="text-[10px] font-mono text-slate-900">
                Números: {mdfe.linked_cte_numbers || 'Aguardando CT-e'}
              </div>
              <div className="text-[9px] font-mono text-slate-600 truncate mt-0.5">
                Chaves: {mdfe.linked_cte_keys || 'Vinculadas pelo manifesto'}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">
                    Valor Total da Carga
                  </span>
                  <strong className="text-xs text-slate-900">
                    {formatBrl(mdfe.total_cargo_value)}
                  </strong>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">
                    Peso Bruto Total (KG)
                  </span>
                  <strong className="text-xs text-slate-900">
                    {(mdfe.total_weight_kg || 0).toLocaleString('pt-BR')} kg
                  </strong>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">
                    Unidade de Medida
                  </span>
                  <span className="text-xs font-bold text-slate-900">01 - KG</span>
                </div>
              </div>
            </div>

            <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-slate-200">
              DAMDFE gerado pelo Sistema TMS ED Integração • O encerramento deste manifesto na UF de
              destino é obrigatório antes da abertura de novo manifesto.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
