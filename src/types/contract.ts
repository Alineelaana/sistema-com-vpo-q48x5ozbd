import { Trip } from './logistics'

export type CarrierProfile = 'tac_independente' | 'tac_equiparado' | 'etc' | 'ctc' | 'geral'

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

export interface TransportContract {
  id: string
  trip_id: string
  template_id?: string
  contract_number: string
  operation_number?: string
  trip_code?: string
  status: ContractStatus

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

  // Dados Bancários
  bank_name?: string
  bank_agency?: string
  bank_account?: string
  bank_pix_key?: string
  bank_beneficiary_name?: string
  bank_beneficiary_doc?: string

  // Motorista
  driver_name?: string
  driver_cpf?: string
  driver_cnh?: string
  driver_phone?: string

  // Veículo e Carga
  vehicle_plate?: string
  trailer_plate?: string
  trailer_plate_2?: string
  vehicle_model?: string
  axles_count?: number
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

  // Cláusulas e Snapshot
  clauses_snapshot?: ContractClause[] | string
  responsibilities_text?: string
  penalty_terms_text?: string
  jurisdiction?: string

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
