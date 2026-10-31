import { Trip } from './logistics'

export type CarrierProfile =
  | 'tac_independente'
  | 'tac_equiparado'
  | 'etc'
  | 'ctc'
  | 'geral'
  | 'frota_propria'

export interface ContractClause {
  number: number
  title: string
  text: string
}

export interface ContractTemplate {
  id: string
  title: string
  carrier_profile: CarrierProfile
  transport_mode?: 'lotacao' | 'fracionada' | 'dedicado' | 'subcontratacao' | 'todos'
  is_active: boolean
  is_default: boolean
  version: number
  preamble_template?: string
  clauses: ContractClause[] | string
  responsibilities_text?: string
  penalty_terms_text?: string
  jurisdiction_city?: string
  jurisdiction_state?: string
  notes?: string
  created?: string
  updated?: string
}

export type ContractStatus = 'emitido' | 'assinado' | 'aguardando_assinatura' | 'cancelado'
export type SignatureStatus =
  | 'aguardando_configuracao'
  | 'pendente_assinatura'
  | 'assinado'
  | 'dispensado'

// Item de Preço de Serviços (Aba 1)
export interface CtrbServicePriceItem {
  id: string
  faixa: string
  descricao: string
  unidade: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
}

// Item de Serviço Contratado (Aba 4)
export interface CtrbContractedServiceItem {
  id: string
  codigo: string
  descricao: string
  quantidade: number
  valor: number
  observacao?: string
}

// Item de Custo Operacional (Aba 10)
export interface CtrbOperationalCostItem {
  id: string
  tipo: string
  descricao: string
  valor: number
  responsavel: string
}

// Item de Lançamento de Abastecimento (Aba 9)
export interface CtrbFuelingRecord {
  id: string
  posto: string
  dataHora: string
  combustivel: string
  litros: number
  valorLitro: number
  valorTotal: number
  odometro?: number
  numeroRequisicao?: string
}

// Item de Saída de Item / Carga (Aba 12)
export interface CtrbItemDispatch {
  id: string
  codigoItem: string
  descricao: string
  quantidade: number
  pesoKg: number
  lote?: string
  notaFiscal?: string
}

// Item de Parcela Financeira (Aba 13)
export interface CtrbInstallmentItem {
  numero: number
  tipo: 'Adiantamento' | 'Saldo' | 'Complemento'
  vencimento: string
  valor: number
  status: 'Pendente' | 'Programado' | 'Pago'
  formaPagamento: string
}

// Retificação CIOT / ANTT (Aba 14)
export interface CtrbCiotRectification {
  protocoloRetificacao?: string
  motivoRetificacao?: string
  dataRetificacao?: string
  responsavel?: string
  statusIntegracao: string // 'Aguardando configuração'
  detalhes?: string
}

// Anexo de Documento do CTRB (Aba 8)
export interface ContractAttachment {
  id: string
  contract_id: string
  file_name: string
  document_type?: string
  description?: string
  file?: string
  file_size?: number
  uploaded_by?: string
  created?: string
  updated?: string
}

export interface TransportContract {
  id: string
  trip_id: string
  template_id?: string
  contract_number: string
  operation_number?: string
  trip_code?: string
  status: ContractStatus

  // ServiceLogic CTRB - Cabeçalho Faixa 1
  filial?: string
  fleet_type?: string
  operation_type?: string
  service_type?: string
  tax_regime?: string
  contractor_code?: string
  contracted_carrier_code?: string
  driver_code?: string

  // ServiceLogic CTRB - Cabeçalho Faixa 2
  series?: string
  ciot_number?: string
  fiscal_operation?: string
  quick_charge?: string
  issue_date?: string
  departure_date?: string
  end_date?: string
  advance_due_date?: string
  balance_due_date?: string
  responsible_collaborator?: string
  no_tax_calc?: boolean

  // ServiceLogic CTRB - Cabeçalho Faixa 3
  integrator_name?: string
  integrator_status?: string

  // Dados do Contratante
  contractor_name: string
  contractor_document: string
  contractor_rntrc?: string
  contractor_address?: string

  // Dados do Contratado
  contracted_carrier_name: string
  contracted_carrier_document: string
  contracted_carrier_rntrc?: string
  carrier_profile: CarrierProfile
  carrier_address?: string
  carrier_phone?: string

  // Dados Bancários do Contratado
  bank_name?: string
  bank_agency?: string
  bank_account?: string
  bank_pix_key?: string
  bank_beneficiary_name?: string
  bank_beneficiary_doc?: string
  bank_payment_method?: string
  bank_account_type?: string

  // Dados Bancários do Motorista (painel separado)
  driver_bank_name?: string
  driver_bank_agency?: string
  driver_bank_account?: string
  driver_bank_pix_key?: string
  driver_bank_payment_method?: string
  driver_bank_account_type?: string
  observations_to_accredited?: string

  // Motorista
  driver_name?: string
  driver_cpf?: string
  driver_cnh?: string
  driver_phone?: string

  // Veículos (Aba Veículos)
  vehicle_plate?: string
  trailer_plate?: string
  trailer_plate_2?: string
  trailer_plate_3?: string
  vehicle_model?: string
  axles_count?: number
  vehicle_category?: string
  vehicle_owner_code?: string
  vehicle_owner_name?: string
  vehicle_owner_doc?: string

  // Carga
  cargo_type?: string
  cargo_weight_kg?: number
  cargo_value?: number
  nfe_number?: string
  nfe_key?: string

  // Rota
  origin_city: string
  origin_state: string
  destination_city: string
  destination_state: string
  distance_km?: number
  route_highways?: string
  pickup_address?: string
  delivery_address?: string

  // Frete, Adiantamento e Piso Mínimo
  freight_value: number
  minimum_floor_value?: number
  minimum_floor_table_version?: string
  minimum_floor_status?: string
  payment_terms?: string
  advance_payment_value?: number
  balance_payment_value?: number
  vpo_value?: number
  vpo_voucher_number?: string
  vpo_responsible?: string

  // Seguro
  insurance_policy_number?: string
  insurance_averbacao_protocol?: string

  // Cláusulas e Observações (Aba Observações)
  clauses_snapshot?: ContractClause[] | string
  law_observations?: string
  complementary_observations?: string
  responsibilities_text?: string
  penalty_terms_text?: string
  jurisdiction?: string

  // Estruturas JSON das Abas ServiceLogic
  service_prices_json?: CtrbServicePriceItem[] | string
  contracted_services_json?: CtrbContractedServiceItem[] | string
  operational_costs_json?: CtrbOperationalCostItem[] | string
  fueling_records_json?: CtrbFuelingRecord[] | string
  installments_json?: CtrbInstallmentItem[] | string
  item_dispatches_json?: CtrbItemDispatch[] | string
  ciot_rectification_json?: CtrbCiotRectification | string

  // Assinatura Eletrônica (Clicksign/DocuSign/ICP-Brasil)
  signature_status: SignatureStatus
  signature_provider?: string
  signature_document_id?: string
  signature_url?: string
  signed_at?: string
  signed_by_carrier_at?: string
  signed_by_contractor_at?: string

  generated_by?: string
  generated_at?: string
  version?: number
  created?: string
  updated?: string

  expand?: {
    trip_id?: Trip
    template_id?: ContractTemplate
  }
}

export interface GenerateContractParams {
  trip_id: string
  template_id?: string
  carrier_address?: string
  carrier_phone?: string
  bank_details?: {
    bank_name?: string
    bank_agency?: string
    bank_account?: string
    bank_pix_key?: string
    beneficiary_name?: string
    beneficiary_doc?: string
  }
  notes?: string
}

export interface GenerateContractResponse {
  success: boolean
  message: string
  error?: string
  blocker?: string
  minimum_floor_value?: number
  freight_value?: number
  contract?: TransportContract
}

export interface RequestSignatureResponse {
  success: boolean
  status: SignatureStatus
  message: string
  notes?: string
}
