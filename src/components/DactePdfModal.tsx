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
  Building2,
  Truck,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
} from 'lucide-react'
import type { CteDocument } from '@/types/logistics'
import { toast } from '@/hooks/use-toast'

interface DactePdfModalProps {
  cte: CteDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSendDocument?: (cte: CteDocument) => void
}

export const DactePdfModal: React.FC<DactePdfModalProps> = ({
  cte,
  open,
  onOpenChange,
  onSendDocument,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!cte) return null

  const isAuthorized = cte.status === 'authorized'

  const handlePrint = () => {
    if (!printAreaRef.current) return
    const content = printAreaRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'width=900,height=800')
    if (!printWindow) {
      toast({
        title: 'Bloqueador de pop-up ativo',
        description: 'Por favor, permita pop-ups para gerar e imprimir o DACTE.',
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
        <title>DACTE - CT-e nº ${cte.cte_number}</title>
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
          .dacte-border {
            border: 1.5px solid #0f172a;
            margin-bottom: 8px;
            background: #ffffff;
          }
          .dacte-header {
            background: #f8fafc;
            border-bottom: 1.5px solid #0f172a;
            padding: 8px;
          }
          .title-main {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
          }
          .sub-title {
            font-size: 9px;
            color: #475569;
            margin-top: 2px;
          }
          .barcode-box {
            font-family: monospace;
            letter-spacing: 2px;
            background: #f1f5f9;
            padding: 4px 6px;
            border: 1px dashed #94a3b8;
            font-size: 9px;
            word-break: break-all;
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
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; }
          .field-label { font-size: 8px; text-transform: uppercase; color: #64748b; font-weight: 700; display: block; }
          .field-val { font-size: 10px; font-weight: 600; color: #0f172a; }
          .watermark-unauth {
            border: 2px dashed #dc2626;
            background: #fef2f2;
            color: #991b1b;
            font-weight: 800;
            text-align: center;
            padding: 10px;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
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
    if (!cte.xml_content) {
      toast({
        title: 'XML indisponível',
        description: 'O XML oficial da SEFAZ fica gravado após a confirmação da autorização.',
        variant: 'destructive',
      })
      return
    }
    const blob = new Blob([cte.xml_content], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CTE_${cte.cte_number}_${cte.access_key || 'xml'}.xml`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Download iniciado',
      description: `Arquivo XML do CT-e nº ${cte.cte_number} baixado.`,
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
                DACTE — Documento Auxiliar do Conhecimento de Transporte Eletrônico
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              CT-e Modelo 57 • Série {cte.series} • Número {cte.cte_number}
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
              Imprimir DACTE
            </Button>
            {onSendDocument ? (
              <Button
                size="sm"
                onClick={() => onSendDocument(cte)}
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
              : cte.status === 'rejected'
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
                ? `Autorizado oficialmente perante a SEFAZ (Protocolo: ${cte.protocol})`
                : cte.status === 'rejected'
                  ? `Rejeitado pela SEFAZ: ${cte.status_message || 'Motivo de rejeição não detalhado'}`
                  : `Documento em fila (${cte.status_message || 'Aguardando configuração de credenciais'})`}
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold uppercase ${
              isAuthorized
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : cte.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            {cte.status}
          </Badge>
        </div>

        {/* Visualização do DACTE */}
        <div className="overflow-y-auto p-6 flex justify-center bg-slate-200/70">
          <div
            ref={printAreaRef}
            className="w-full max-w-[800px] bg-white p-6 shadow-md border border-slate-300 text-slate-900 text-xs rounded-sm space-y-3"
          >
            {!isAuthorized && (
              <div className="border-2 border-dashed border-rose-500 bg-rose-50 p-4 rounded text-center text-rose-900 font-extrabold text-sm uppercase">
                DOCUMENTO NÃO AUTORIZADO PERANTE A SEFAZ — SEM VALOR FISCAL
                <div className="text-xs font-normal text-rose-700 mt-1">
                  Conforme a legislação tributária brasileira, este conhecimento não confere direito
                  a crédito fiscal nem substitui a via oficial até sua transmissão e autorização com
                  protocolo.
                </div>
              </div>
            )}

            {/* Cabeçalho do DACTE */}
            <div className="border border-slate-900 p-3 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div>
                  <h1 className="text-sm font-black uppercase text-slate-950">DACTE</h1>
                  <p className="text-[10px] text-slate-600">
                    Documento Auxiliar do Conhecimento de Transporte Eletrônico
                  </p>
                  <div className="text-[10px] font-mono text-slate-700 mt-1">
                    MOD: 57 • SÉRIE: {cte.series} • NÚMERO: {cte.cte_number}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[9px] font-bold uppercase text-slate-500">
                    Chave de Acesso SEFAZ
                  </div>
                  <div className="font-mono text-[10px] font-bold tracking-wider bg-white p-1.5 border border-slate-300 rounded break-all">
                    {cte.access_key || 'CHAVE SERÁ GERADA APÓS TRANSMISSÃO OFICIAL'}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1">
                    Consulta de autenticidade no portal nacional da SEFAZ
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[9px] font-bold uppercase text-slate-500">
                    Protocolo de Autorização
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-800">
                    {cte.protocol || 'AGUARDANDO AUTORIZAÇÃO'}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1">
                    Emissão:{' '}
                    {cte.issued_at
                      ? new Date(cte.issued_at).toLocaleString('pt-BR')
                      : 'Em processamento'}
                  </div>
                </div>
              </div>
            </div>

            {/* Natureza da Operação e CFOP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border border-slate-300 p-2.5 bg-slate-50">
              <div>
                <span className="field-label text-[8px] uppercase font-bold text-slate-500">
                  CFOP
                </span>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {cte.cfop || '6353'}
                </span>
              </div>
              <div className="md:col-span-2">
                <span className="field-label text-[8px] uppercase font-bold text-slate-500">
                  Natureza da Operação
                </span>
                <span className="text-xs font-semibold text-slate-900">
                  {cte.nat_op || 'PRESTAÇÃO DE SERVIÇO DE TRANSPORTE RODOVIÁRIO DE CARGA'}
                </span>
              </div>
              <div>
                <span className="field-label text-[8px] uppercase font-bold text-slate-500">
                  Tomador do Serviço
                </span>
                <span className="text-xs font-semibold text-slate-900 uppercase">
                  {cte.taker_type || 'Remetente'}
                </span>
              </div>
            </div>

            {/* Emitente */}
            <div className="border border-slate-300 rounded">
              <div className="bg-slate-100 px-3 py-1 font-bold text-[10px] uppercase border-b border-slate-300 flex items-center gap-1.5 text-slate-800">
                <Building2 className="h-3 w-3 text-slate-600" />
                Emitente do CT-e (Transportador)
              </div>
              <div className="p-2.5 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">
                    Razão Social
                  </span>
                  <span className="font-bold text-xs text-slate-950">
                    TransConnect Logística e Transportes Rodoviários Ltda
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">
                    CNPJ / Inscrição Estadual
                  </span>
                  <span className="font-mono text-xs text-slate-800">
                    12.345.678/0001-90 • IE: 123.456.789.000
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">
                    RNTRC Transportador
                  </span>
                  <span className="font-mono font-bold text-xs text-indigo-900">
                    49827361 (ANTT)
                  </span>
                </div>
              </div>
            </div>

            {/* Remetente e Destinatário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
                <div className="font-bold text-[10px] uppercase text-slate-700 mb-1">
                  Remetente da Carga
                </div>
                <div className="text-xs font-bold text-slate-900">{cte.sender_name}</div>
                <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                  CNPJ/CPF: {cte.sender_document}
                </div>
              </div>

              <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
                <div className="font-bold text-[10px] uppercase text-slate-700 mb-1">
                  Destinatário da Carga
                </div>
                <div className="text-xs font-bold text-slate-900">{cte.recipient_name}</div>
                <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                  CNPJ/CPF: {cte.recipient_document}
                </div>
              </div>
            </div>

            {/* Destaque Obrigatório do VPO e Composição do Frete */}
            <div className="border-2 border-indigo-200 bg-indigo-50/40 rounded p-3">
              <div className="font-bold text-[10px] uppercase text-indigo-950 flex items-center justify-between border-b border-indigo-200 pb-1 mb-2">
                <span>Composição da Prestação de Serviço & Destaque do Vale-Pedágio (VPO)</span>
                <span className="text-[9px] font-bold text-indigo-700">Lei nº 10.209/2001</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    Frete Valor
                  </span>
                  <strong className="text-xs text-slate-900">{formatBrl(cte.freight_value)}</strong>
                </div>
                <div className="bg-amber-50 p-1.5 rounded border border-amber-200">
                  <span className="text-[9px] uppercase font-bold text-amber-800 block">
                    Vale-Pedágio Obrigatório (VPO)
                  </span>
                  <strong className="text-xs text-amber-950 font-bold">
                    {formatBrl(cte.vpo_value)}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    Valor da Carga Averbada
                  </span>
                  <strong className="text-xs text-slate-900">{formatBrl(cte.cargo_value)}</strong>
                </div>
                <div className="bg-indigo-100/70 p-1.5 rounded border border-indigo-300">
                  <span className="text-[9px] uppercase font-bold text-indigo-900 block">
                    Valor Total da Prestação
                  </span>
                  <strong className="text-sm font-black text-indigo-950">
                    {formatBrl(cte.total_cte_value)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Documentos Vinculados (NF-e) */}
            <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
              <div className="font-bold text-[10px] uppercase text-slate-700 mb-1">
                Documentos Originários Vinculados (NF-e)
              </div>
              <div className="text-[10px] font-mono text-slate-800">
                {cte.linked_nfe_keys || 'Conforme manifesto de carga da Ordem de Transporte'}
              </div>
            </div>

            {/* Informações Complementares */}
            <div className="border border-slate-300 rounded p-2.5 bg-slate-50">
              <div className="font-bold text-[10px] uppercase text-slate-700 mb-1">
                Informações Complementares de Interesse do Contribuinte
              </div>
              <div className="text-[10px] text-slate-700">
                {cte.additional_info ||
                  'Prestação sob responsabilidade do emitente. Vale-pedágio fornecido antecipadamente pelo embarcador conforme legislação federal.'}
              </div>
            </div>

            <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-slate-200">
              DACTE gerado pelo Sistema TMS ED Integração • Protocolo registrado na SEFAZ apenas
              após confirmação do webservice
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
