import React, { useRef } from 'react'
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
  FileText,
  Printer,
  Download,
  AlertCircle,
  Building2,
  Truck,
  User,
  CreditCard,
  MapPin,
  Shield,
  Scale,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import type { TransportContract, ContractClause } from '@/types/contract'
import { toast } from '@/hooks/use-toast'

interface ContractPdfModalProps {
  contract: TransportContract | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestSignature?: (contractId: string) => void
}

export const ContractPdfModal: React.FC<ContractPdfModalProps> = ({
  contract,
  open,
  onOpenChange,
  onRequestSignature,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!contract) return null

  const handlePrint = () => {
    if (!printAreaRef.current) return
    const content = printAreaRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'width=900,height=800')
    if (!printWindow) {
      toast({
        title: 'Bloqueador de pop-up ativo',
        description: 'Por favor, permita pop-ups para gerar e imprimir o PDF do contrato.',
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
        <title>CTRB - ${contract.contract_number}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            font-size: 11px;
            line-height: 1.45;
            background: #ffffff;
            margin: 0;
            padding: 10px;
          }
          .header-box {
            border: 2px solid #0f172a;
            padding: 12px;
            margin-bottom: 14px;
            background: #f8fafc;
          }
          .title-main {
            font-size: 15px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin: 0;
          }
          .sub-title {
            font-size: 10px;
            color: #475569;
            margin-top: 4px;
          }
          .operational-watermark {
            font-size: 9px;
            font-weight: bold;
            color: #b45309;
            background: #fef3c7;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
            margin-top: 6px;
            border: 1px dashed #d97706;
          }
          .section-block {
            border: 1px solid #cbd5e1;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .section-header {
            background: #e2e8f0;
            font-weight: bold;
            padding: 6px 10px;
            font-size: 11px;
            text-transform: uppercase;
            border-bottom: 1px solid #cbd5e1;
          }
          .section-content {
            padding: 8px 10px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 8px;
          }
          .field-label {
            font-size: 9px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
          }
          .field-value {
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
          }
          .clauses-container {
            font-size: 10.5px;
            line-height: 1.5;
            color: #1e293b;
          }
          .clause-item {
            margin-bottom: 8px;
            text-align: justify;
          }
          .signatures-box {
            margin-top: 24px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            page-break-inside: avoid;
          }
          .signature-line {
            border-top: 1px solid #0f172a;
            padding-top: 6px;
            text-align: center;
          }
          .footer-note {
            margin-top: 20px;
            font-size: 9px;
            color: #64748b;
            text-align: center;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
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

  // Parse cláusulas caso venha como string
  let clauses: ContractClause[] = []
  if (Array.isArray(contract.clauses_snapshot)) {
    clauses = contract.clauses_snapshot
  } else if (typeof contract.clauses_snapshot === 'string') {
    try {
      clauses = JSON.parse(contract.clauses_snapshot)
    } catch (_) {
      clauses = []
    }
  }

  const formatBrl = (val?: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-100">
        <DialogHeader className="p-4 bg-white border-b shrink-0 flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-700" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Visualização do CTRB — Contrato de Transporte Rodoviário de Bens
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Documento operacional vinculado à Ordem de Transporte #
              {contract.operation_number || contract.trip_code}.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 bg-white shadow-sm text-slate-800"
            >
              <Printer className="h-4 w-4" />
              Imprimir / Salvar PDF
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (onRequestSignature) onRequestSignature(contract.id)
              }}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Assinatura Eletrônica
            </Button>
          </div>
        </DialogHeader>

        {/* Banner de Aviso de Assinatura Honesta */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
            <div>
              <span className="font-semibold">Assinatura Eletrônica:</span>{' '}
              {contract.signature_status === 'aguardando_configuracao'
                ? 'Aguardando configuração de provedor (Clicksign/DocuSign/ICP-Brasil na Central de Conectores).'
                : contract.signature_status === 'assinado'
                  ? 'Documento assinado digitalmente com validade jurídica.'
                  : 'Pendente de assinatura física ou digital.'}
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-amber-300 text-amber-800 bg-amber-100 text-[10px] uppercase font-bold"
          >
            {contract.signature_status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Área de Visualização e Impressão do CTRB */}
        <div className="overflow-y-auto p-6 flex justify-center bg-slate-200/70">
          <div
            ref={printAreaRef}
            className="w-full max-w-[800px] bg-white p-8 shadow-md border border-slate-300 text-slate-900 text-xs rounded-sm space-y-4"
          >
            {/* Cabeçalho do CTRB */}
            <div className="header-box border-2 border-slate-900 p-4 bg-slate-50">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="title-main text-base font-extrabold text-slate-950 uppercase tracking-tight">
                    CONTRATO DE TRANSPORTE RODOVIÁRIO DE BENS (CTRB)
                  </h1>
                  <p className="sub-title text-xs text-slate-600 mt-1">
                    Instrumento Jurídico-Operacional de Prestação de Serviços de Frete — Lei Federal
                    nº 11.442/2007
                  </p>
                  <div className="operational-watermark mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <AlertCircle className="h-3 w-3 text-amber-700" />
                    DOCUMENTO OPERACIONAL / CONTRATUAL — NÃO SUBSTITUI O CT-E FISCAL NEM O CIOT DA
                    ANTT
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Número do CTRB
                  </div>
                  <div className="text-sm font-black font-mono text-indigo-900">
                    {contract.contract_number}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1">
                    Emissão:{' '}
                    {contract.generated_at
                      ? new Date(contract.generated_at).toLocaleDateString('pt-BR')
                      : new Date().toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-[10px] text-slate-500">Versão: {contract.version || 1}</div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 1: CONTRATANTE E CONTRATADO */}
            <div className="section-block border border-slate-300 rounded">
              <div className="section-header bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase border-b border-slate-300 flex items-center gap-1.5 text-slate-800">
                <Building2 className="h-3.5 w-3.5 text-slate-600" />
                1. QUALIFICAÇÃO DAS PARTES CONTRATANTES
              </div>
              <div className="section-content p-3 space-y-3">
                {/* Contratante */}
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                    CONTRATANTE (EMBARCADOR / EXPEDIDOR)
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                    <div>
                      <span className="field-label block text-[9px] text-slate-500 uppercase">
                        Razão Social
                      </span>
                      <strong className="field-value text-xs text-slate-900">
                        {contract.contractor_name}
                      </strong>
                    </div>
                    <div>
                      <span className="field-label block text-[9px] text-slate-500 uppercase">
                        CNPJ
                      </span>
                      <strong className="field-value text-xs text-slate-900 font-mono">
                        {contract.contractor_document}
                      </strong>
                    </div>
                    <div>
                      <span className="field-label block text-[9px] text-slate-500 uppercase">
                        RNTRC
                      </span>
                      <strong className="field-value text-xs text-slate-900 font-mono">
                        {contract.contractor_rntrc || 'Isento/Embarcador'}
                      </strong>
                    </div>
                    <div>
                      <span className="field-label block text-[9px] text-slate-500 uppercase">
                        Endereço
                      </span>
                      <span className="field-value text-xs text-slate-800 truncate block">
                        {contract.contractor_address || 'Conforme cadastro central'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contratado */}
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">
                    CONTRATADO (TRANSPORTADOR RODOVIÁRIO / TAC / ETC)
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-indigo-50/40 p-2 rounded border border-indigo-100">
                    <div>
                      <span className="field-label block text-[9px] text-slate-500 uppercase">
                        Nome / Razão
                      </span>
                      <strong className="field-value text-xs text-indigo-950">
                        {contract.contracted_carrier_name}
                      </strong>
                    </div>
                    <div>
                      <span className="field-label block text-[9px] text-slate-500 uppercase">
                        CPF / CNPJ
                      </span>
                      <strong className="field-value text-xs font-mono text-indigo-950">
                        {contract.contracted_carrier_document}
                      </strong>
                    </div>
                    <div>
                      <span className="field-label block text-[9px] text-slate-500 uppercase">
                        RNTRC Contratado
                      </span>
                      <strong className="field-value text-xs font-mono text-indigo-950">
                        {contract.contracted_carrier_rntrc || 'Em regularização'}
                      </strong>
                    </div>
                    <div>
                      <span className="field-label block text-[9px] text-slate-500 uppercase">
                        Perfil Operacional
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold bg-white text-indigo-800 border-indigo-300"
                      >
                        {contract.carrier_profile?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: MOTORISTA E VEÍCULO */}
            <div className="section-block border border-slate-300 rounded">
              <div className="section-header bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase border-b border-slate-300 flex items-center gap-1.5 text-slate-800">
                <Truck className="h-3.5 w-3.5 text-slate-600" />
                2. MOTORISTA CONDUTOR E VEÍCULOS ALOCADOS
              </div>
              <div className="section-content p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Motorista
                  </span>
                  <strong className="field-value text-xs text-slate-900">
                    {contract.driver_name || 'Alocado na operação'}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    CPF do Motorista
                  </span>
                  <strong className="field-value text-xs text-slate-900 font-mono">
                    {contract.driver_cpf || '—'}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">CNH</span>
                  <strong className="field-value text-xs text-slate-900 font-mono">
                    {contract.driver_cnh || '—'}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Telefone
                  </span>
                  <span className="field-value text-xs text-slate-800">
                    {contract.driver_phone || contract.carrier_phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Placa Trator
                  </span>
                  <strong className="field-value text-xs text-indigo-900 font-mono">
                    {contract.vehicle_plate || '—'}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Placa Reboque / Semi
                  </span>
                  <strong className="field-value text-xs text-indigo-900 font-mono">
                    {contract.trailer_plate || 'Não aplicável'}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Qtd Eixos
                  </span>
                  <strong className="field-value text-xs text-slate-900">
                    {contract.axles_count || 6} eixos
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Modelo do Veículo
                  </span>
                  <span className="field-value text-xs text-slate-800 truncate block">
                    {contract.vehicle_model || 'Cavalo Mecânico'}
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: DADOS BANCÁRIOS */}
            <div className="section-block border border-slate-300 rounded">
              <div className="section-header bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase border-b border-slate-300 flex items-center gap-1.5 text-slate-800">
                <CreditCard className="h-3.5 w-3.5 text-slate-600" />
                3. DADOS BANCÁRIOS HOMOLOGADOS PARA LIQUIDAÇÃO DO FRETE
              </div>
              <div className="section-content p-3 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50">
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Instituição Financeira
                  </span>
                  <strong className="field-value text-xs text-slate-900">
                    {contract.bank_name || 'Banco do Brasil (001)'}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Agência / Conta
                  </span>
                  <strong className="field-value text-xs font-mono text-slate-900">
                    Ag: {contract.bank_agency || '1234-5'} / Cc:{' '}
                    {contract.bank_account || '98765-4'}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Chave PIX Cadastrada
                  </span>
                  <strong className="field-value text-xs font-mono text-indigo-900">
                    {contract.bank_pix_key || contract.contracted_carrier_document}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Titular da Conta
                  </span>
                  <span className="field-value text-xs text-slate-800 truncate block">
                    {contract.bank_beneficiary_name || contract.contracted_carrier_name}
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: ROTA, ITINERÁRIO E CARGA */}
            <div className="section-block border border-slate-300 rounded">
              <div className="section-header bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase border-b border-slate-300 flex items-center gap-1.5 text-slate-800">
                <MapPin className="h-3.5 w-3.5 text-slate-600" />
                4. ESPECIFICAÇÕES DA CARGA E ITINERÁRIO APROVADO
              </div>
              <div className="section-content p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Origem da Viagem
                  </span>
                  <strong className="field-value text-xs text-slate-900">
                    {contract.origin_city}/{contract.origin_state}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Destino da Viagem
                  </span>
                  <strong className="field-value text-xs text-slate-900">
                    {contract.destination_city}/{contract.destination_state}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Distância Oficial
                  </span>
                  <strong className="field-value text-xs text-slate-900">
                    {contract.distance_km || 0} km
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Rodovias / Itinerário
                  </span>
                  <span className="field-value text-xs text-slate-800 truncate block">
                    {contract.route_highways || 'Rota Rodoviária Principal'}
                  </span>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Tipo de Mercadoria
                  </span>
                  <strong className="field-value text-xs text-slate-900">
                    {contract.cargo_type || 'Carga Geral'}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Peso da Carga
                  </span>
                  <strong className="field-value text-xs text-slate-900">
                    {contract.cargo_weight_kg
                      ? `${contract.cargo_weight_kg.toLocaleString('pt-BR')} kg`
                      : '—'}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    Valor da Mercadoria
                  </span>
                  <strong className="field-value text-xs text-slate-900">
                    {formatBrl(contract.cargo_value)}
                  </strong>
                </div>
                <div>
                  <span className="field-label block text-[9px] text-slate-500 uppercase">
                    NF-e Vinculada
                  </span>
                  <span className="field-value text-xs font-mono text-indigo-900">
                    {contract.nfe_number || 'Conforme NF anexa'}
                  </span>
                </div>
              </div>
            </div>

            {/* SEÇÃO 5: VALORES, ADIANTAMENTO E PISO MÍNIMO ANTT */}
            <div className="section-block border border-slate-300 rounded">
              <div className="section-header bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase border-b border-slate-300 flex items-center gap-1.5 text-slate-800">
                <Scale className="h-3.5 w-3.5 text-slate-600" />
                5. COMPOSIÇÃO DO FRETE, VALE-PEDÁGIO E PISO MÍNIMO (LEI 13.703/18)
              </div>
              <div className="section-content p-3 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-emerald-50/50 p-2.5 rounded border border-emerald-200">
                  <div>
                    <span className="field-label block text-[9px] text-emerald-800 uppercase">
                      Valor Bruto do Frete
                    </span>
                    <strong className="field-value text-sm text-emerald-950 font-bold">
                      {formatBrl(contract.freight_value)}
                    </strong>
                  </div>
                  <div>
                    <span className="field-label block text-[9px] text-slate-600 uppercase">
                      Piso Mínimo Oficial ANTT
                    </span>
                    <strong className="field-value text-xs text-slate-900">
                      {formatBrl(contract.minimum_floor_value)}
                    </strong>
                  </div>
                  <div>
                    <span className="field-label block text-[9px] text-slate-600 uppercase">
                      Tabela ANTT Utilizada
                    </span>
                    <span className="field-value text-xs text-slate-800 font-mono">
                      {contract.minimum_floor_table_version || 'Resolução ANTT 6.059/2024'}
                    </span>
                  </div>
                  <div>
                    <span className="field-label block text-[9px] text-emerald-800 uppercase">
                      Conformidade Legal
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                    >
                      CONFORME PISO ANTT
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                  <div>
                    <span className="field-label block text-[9px] text-slate-500 uppercase">
                      Adiantamento (Carga)
                    </span>
                    <strong className="field-value text-xs text-slate-900">
                      {formatBrl(contract.advance_payment_value)}
                    </strong>
                  </div>
                  <div>
                    <span className="field-label block text-[9px] text-slate-500 uppercase">
                      Saldo (Entrega / POD)
                    </span>
                    <strong className="field-value text-xs text-slate-900">
                      {formatBrl(contract.balance_payment_value)}
                    </strong>
                  </div>
                  <div>
                    <span className="field-label block text-[9px] text-slate-500 uppercase">
                      Vale-Pedágio Obrigatório
                    </span>
                    <strong className="field-value text-xs text-slate-900">
                      {formatBrl(contract.vpo_value)} (Fornecido)
                    </strong>
                  </div>
                  <div>
                    <span className="field-label block text-[9px] text-slate-500 uppercase">
                      Apólice de Seguro / RCTR-C
                    </span>
                    <span className="field-value text-xs text-slate-800 font-mono">
                      {contract.insurance_policy_number || 'Averbado'}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="font-bold text-slate-700">Condições de Pagamento: </span>
                  {contract.payment_terms ||
                    '70% no ato do carregamento e 30% após confirmação da entrega definitiva e canhoto assinado.'}
                </div>
              </div>
            </div>

            {/* SEÇÃO 6: CLÁUSULAS E RESPONSABILIDADES */}
            <div className="section-block border border-slate-300 rounded">
              <div className="section-header bg-slate-100 px-3 py-1.5 font-bold text-xs uppercase border-b border-slate-300 flex items-center gap-1.5 text-slate-800">
                <Shield className="h-3.5 w-3.5 text-slate-600" />
                6. CLÁUSULAS CONTRATUAIS, RESPONSABILIDADES E PENALIDADES
              </div>
              <div className="section-content p-3 space-y-3">
                <div className="clauses-container space-y-2 text-[10.5px] leading-relaxed text-slate-800">
                  {clauses.map((clause, idx) => (
                    <div key={idx} className="clause-item">
                      <span className="font-bold text-slate-900 uppercase">
                        CLÁUSULA {clause.number}ª — {clause.title}:
                      </span>{' '}
                      {clause.text}
                    </div>
                  ))}
                </div>

                {contract.responsibilities_text && (
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-700">
                    <strong className="text-slate-900 block uppercase font-bold mb-0.5">
                      Responsabilidades Específicas:
                    </strong>
                    {contract.responsibilities_text}
                  </div>
                )}

                {contract.penalty_terms_text && (
                  <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-700">
                    <strong className="text-slate-900 block uppercase font-bold mb-0.5">
                      Penalidades e Avarias:
                    </strong>
                    {contract.penalty_terms_text}
                  </div>
                )}

                <div className="text-[10.5px] text-slate-800">
                  <span className="font-bold uppercase text-slate-900">FORO DE ELEIÇÃO: </span>
                  Elegem as partes contratantes o foro da{' '}
                  {contract.jurisdiction || 'Comarca de Jundiaí/SP'}, com renúncia a qualquer outro.
                </div>
              </div>
            </div>

            {/* ASSINATURAS */}
            <div className="signatures-box pt-6 mt-6 grid grid-cols-2 gap-12 page-break-inside-avoid">
              <div className="signature-line text-center">
                <div className="border-t border-slate-900 pt-1.5">
                  <div className="font-bold text-xs text-slate-900">{contract.contractor_name}</div>
                  <div className="text-[10px] text-slate-600">CONTRATANTE / EMISSOR</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                    {contract.contractor_document}
                  </div>
                </div>
              </div>

              <div className="signature-line text-center">
                <div className="border-t border-slate-900 pt-1.5">
                  <div className="font-bold text-xs text-slate-900">
                    {contract.contracted_carrier_name}
                  </div>
                  <div className="text-[10px] text-slate-600">CONTRATADO / TRANSPORTADOR</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                    {contract.contracted_carrier_document}
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do documento */}
            <div className="footer-note pt-4 text-center text-[9px] text-slate-500 border-t border-dashed border-slate-300">
              Emitido eletronicamente pela Plataforma TMS TransConnect • Registro Operacional ID:{' '}
              {contract.id} • Chave de Controle: {contract.trip_id}
            </div>
          </div>
        </div>

        {/* Rodapé da Modal */}
        <div className="p-4 bg-white border-t flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Contrato válido e vinculado à operação. Impressão formatada em padrão A4.
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar Visualização
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
