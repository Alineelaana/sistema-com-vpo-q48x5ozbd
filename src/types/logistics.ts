export interface CompanySettings {
  id: string
  corporate_name: string
  trade_name?: string
  cnpj: string
  state_registration?: string
  rntrc?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  certificate_name?: string
  certificate_validity?: string
  certificate_status?: 'configured' | 'missing' | 'expired'
  sefaz_environment?: 'homologation' | 'production'
  cte_series?: number
  cte_current_number?: number
  fiscal_provider?: 'nuvemfiscal' | 'focusnfe' | 'tecnospeed' | 'none'
  fiscal_api_token?: string
  fiscal_client_id?: string
  fiscal_client_secret?: string
  fvpo_provider?: 'semparar' | 'repom' | 'conectcar' | 'veloe' | 'movemais' | 'none'
  ciot_enabled?: boolean
  insurance_blocking_enabled?: boolean
  created?: string
  updated?: string
}

export type NotificationType = 'due_soon' | 'overdue'

export interface FineNotification {
  id: string
  fine_id: string
  type: NotificationType
  title: string
  message: string
  days_diff?: number
  is_read?: boolean
  read_at?: string
  created?: string
  updated?: string
  expand?: {
    fine_id?: TrafficFine
  }
}

export type VehicleType = 'truck' | 'semi_trailer' | 'bitrem' | 'rodotrem' | 'vuc' | 'toco'

export interface Vehicle {
  id: string
  plate: string
  model: string
  brand?: string
  axles: number
  vehicle_type: VehicleType
  tare_weight_kg?: number
  capacity_kg?: number
  renavam?: string
  status?: 'active' | 'maintenance' | 'inactive'
  created?: string
  updated?: string
}

export interface Driver {
  id: string
  name: string
  cpf: string
  cnh: string
  cnh_category?: 'C' | 'D' | 'E'
  phone?: string
  status?: 'available' | 'on_trip' | 'vacation' | 'inactive'
  created?: string
  updated?: string
}

export type WorkflowStageStatus =
  | 'pendente'
  | 'em_processamento'
  | 'concluida'
  | 'requer_atencao'
  | 'erro'

export interface WorkflowStageInfo {
  status: WorkflowStageStatus
  updated_at?: string
  message?: string
  details?: Record<string, unknown>
}

export type OperationStatus =
  | 'rascunho'
  | 'aguardando_dados'
  | 'em_processamento'
  | 'requer_atencao'
  | 'pronto_para_liberacao'
  | 'liberada'
  | 'em_transito'
  | 'concluida'
  | 'cancelada'

export type TransportMode = 'lotacao' | 'fracionada' | 'dedicado' | 'subcontratacao'
export type MinimumFloorStatus = 'validado' | 'abaixo_piso' | 'dispensado' | 'pendente'
export type ContractStatus = 'pendente' | 'assinado' | 'dispensado' | 'cancelado'

export interface RouteWaypoint {
  id?: string
  order: number
  city: string
  state: string
  address?: string
  instructions?: string
}

export interface TollTariff {
  id: string
  plaza_id: string
  vehicle_category: string
  axles: number
  rate_per_axle: number
  total_amount: number
  effective_from: string
  effective_to?: string
  tariff_version: string
  source: string
  is_current: boolean
  created?: string
  updated?: string
}

export interface TollPlaza {
  id: string
  name: string
  concessionaire: string
  highway: string
  km: number
  city: string
  state: string
  lat?: number
  lng?: number
  is_active: boolean
  notes?: string
  tariffs?: TollTariff[]
  created?: string
  updated?: string
}

export interface PlazaTollBreakdown {
  plaza_id: string
  plaza_name: string
  concessionaire: string
  highway: string
  km: number
  city: string
  state: string
  axles: number
  rate_per_axle: number
  unit_amount: number
  effective_amount: number
  tariff_version: string
  tariff_source: string
}

export interface TripWorkflowStages {
  nfe?: WorkflowStageInfo
  ordem?: WorkflowStageInfo
  veiculo_motorista?: WorkflowStageInfo
  roteirizacao?: WorkflowStageInfo
  piso_minimo?: WorkflowStageInfo
  cte?: WorkflowStageInfo
  contrato?: WorkflowStageInfo
  ciot?: WorkflowStageInfo
  vpo?: WorkflowStageInfo
  mdfe?: WorkflowStageInfo
  envio?: WorkflowStageInfo
  liberacao?: WorkflowStageInfo
}

export interface ConnectorContract {
  id: string
  name: string
  category:
    | 'fiscal'
    | 'regulamentar'
    | 'pedagio'
    | 'logistica'
    | 'seguros'
    | 'comunicacao'
    | 'juridico'
  provider: string
  status: 'configurado' | 'aguardando_configuracao' | 'em_implantacao' | 'erro'
  status_label: string
  description: string
  has_credentials: boolean
  simulation_allowed: boolean
  notes: string
}

export interface Trip {
  id: string
  trip_code: string
  origin_city: string
  origin_state: string
  destination_city: string
  destination_state: string
  distance_km?: number
  vehicle_id?: string
  driver_id?: string
  cargo_type?: string
  weight_kg?: number
  freight_value: number
  axles_count: number
  toll_tollgate_count?: number
  toll_rate_per_axle?: number
  vpo_value: number
  vpo_responsible?: 'embarcador' | 'transportador' | 'destinatario'
  vpo_voucher_number?: string
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled'

  // Ordem de Transporte (TMS Passo 1)
  operation_number?: string
  transport_mode?: TransportMode
  sender_name?: string
  sender_document?: string
  recipient_name?: string
  recipient_document?: string
  shipper_name?: string
  shipper_document?: string
  receiver_name?: string
  receiver_document?: string
  pickup_address?: string
  delivery_address?: string
  nfe_key?: string
  nfe_number?: string
  nfe_series?: string
  fiscal_document_id?: string
  cargo_value?: number
  cargo_volume_m3?: number
  vehicle_plate?: string
  trailer_plate?: string
  trailer_plate_2?: string
  carrier_rntrc?: string
  carrier_profile?: 'frota_propria' | 'etc' | 'tac_equiparado' | 'tac_independente' | 'ctc'
  contracted_carrier_name?: string
  contracted_carrier_doc?: string
  minimum_floor_value?: number
  minimum_floor_status?: MinimumFloorStatus
  floor_table_version?: string
  floor_table_id?: string
  floor_applicable?: boolean
  floor_non_applicable_reason?: string
  floor_table_type?: string
  floor_cargo_category?: string
  floor_ccd?: number
  floor_cc?: number
  floor_distance_km?: number
  floor_empty_return_applicable?: boolean
  floor_empty_return_value?: number
  floor_freight_difference?: number
  floor_regularization_status?:
    | 'conforme'
    | 'bloqueado_abaixo_piso'
    | 'regularizado_frete_ajustado'
    | 'justificativa_aprovada'
    | 'nao_aplicavel'
  floor_regularization_reason?: string
  floor_regularized_at?: string
  floor_regularized_by?: string
  floor_calculation_details?: string
  payment_terms?: string
  advance_payment_value?: number
  balance_payment_value?: number
  insurance_policy_number?: string
  insurance_averbacao_protocol?: string
  contract_number?: string
  contract_status?: ContractStatus
  operation_status?: OperationStatus
  workflow_stages?: string | TripWorkflowStages
  dispatch_released_at?: string
  dispatch_released_by?: string

  // Roteirizador Inteligente (Passo 2)
  waypoints?: string | RouteWaypoint[]
  highways?: string
  estimated_duration_hours?: number
  route_approved?: boolean
  route_approved_at?: string
  route_approved_by?: string
  tariff_version_used?: string
  selected_plazas_details?: string | PlazaTollBreakdown[]
  routing_provider?: string
  routing_distance_source?: 'manual_rodoviaria' | 'provedor_externo' | 'roteirizador_connect'

  expand?: {
    vehicle_id?: Vehicle
    driver_id?: Driver
    fiscal_document_id?: unknown
  }
  created?: string
  updated?: string
}

export interface CteDocument {
  id: string
  cte_number: number
  series: number
  access_key?: string
  trip_id?: string
  sender_name: string
  sender_document: string
  recipient_name: string
  recipient_document: string
  cargo_value?: number
  freight_value: number
  vpo_included?: boolean
  vpo_value?: number
  total_cte_value: number
  status: 'draft' | 'pending' | 'authorized' | 'rejected' | 'cancelled'
  status_message?: string
  protocol?: string
  xml_content?: string
  issued_at?: string
  expand?: {
    trip_id?: Trip
  }
  created?: string
  updated?: string
}

export interface MdfeDocument {
  id: string
  mdfe_number: number
  series: number
  status: 'draft' | 'queued' | 'pending' | 'authorized' | 'rejected' | 'closed' | 'cancelled'
  access_key?: string
  protocol?: string
  status_message?: string
  xml_content?: string
  uf_origin: string
  uf_destination: string
  route_ufs: string
  trip_id?: string
  vehicle_id?: string
  driver_id?: string
  linked_cte_numbers?: string
  linked_cte_keys?: string
  total_cargo_value?: number
  total_weight_kg?: number
  issued_at?: string
  closed_at?: string
  cancelled_at?: string
  created?: string
  updated?: string
  expand?: {
    trip_id?: Trip
    vehicle_id?: Vehicle
    driver_id?: Driver
  }
}

export type CarrierProfile = 'etc' | 'tac_equiparado' | 'tac_independente' | 'ctc'

export interface CiotRecord {
  id: string
  trip_id: string
  trip_code?: string
  carrier_rntrc: string
  carrier_profile: CarrierProfile
  ciot_number?: string
  institution_provider?: string
  status: 'pending' | 'registering' | 'registered' | 'failed' | 'cancelled'
  voucher_document?: string
  is_mandatory: boolean
  contractor_document?: string
  freight_value?: number
  registered_at?: string
  status_message?: string
  notes?: string
  created?: string
  updated?: string
  expand?: {
    trip_id?: Trip
  }
}

export type InsuranceType = 'rctr_c' | 'rc_dc' | 'rcta_c' | 'rctrc_estipulado' | 'outro'

export interface InsurancePolicy {
  id: string
  insurer_name: string
  insurer_cnpj?: string
  policy_number: string
  insurance_type: InsuranceType
  start_date: string
  end_date: string
  insured_cnpjs?: string
  broker_name?: string
  atm_provider?: string
  is_mandatory_all_trips: boolean
  is_active: boolean
  notes?: string
  created?: string
  updated?: string
}

export interface InsuranceEndorsement {
  id: string
  trip_id: string
  cte_id?: string
  policy_id: string
  endorsement_protocol?: string
  status: 'pending' | 'queued' | 'averbada' | 'falhou' | 'dispensada'
  declared_cargo_value: number
  fiscal_key?: string
  carrier_document?: string
  status_message?: string
  proof_document?: string
  averbada_at?: string
  is_mandatory: boolean
  created?: string
  updated?: string
  expand?: {
    trip_id?: Trip
    policy_id?: InsurancePolicy
    cte_id?: CteDocument
  }
}

export interface RegularizationOrchestrationResult {
  success: boolean
  processed_trips: number
  ctes_checked: number
  ciots_checked: number
  endorsements_checked: number
  mdfes_checked: number
  pending_issues: Array<{
    trip_code: string
    stage: string
    severity: 'bloqueio' | 'aviso'
    message: string
  }>
  fiscal_provider_status: 'configurado' | 'aguardando_credenciais'
  message: string
}

export type InfractionType =
  | 'speeding'
  | 'weight_scale'
  | 'red_light'
  | 'parking'
  | 'overtaking'
  | 'seatbelt'
  | 'phone_usage'
  | 'tachograph'
  | 'other'

export type FineSeverity = 'light' | 'medium' | 'grave' | 'very_grave'

export type FineStatus = 'pending' | 'paid' | 'appealed' | 'cancelled'

export interface TrafficFine {
  id: string
  vehicle_id: string
  driver_id?: string
  infraction_date: string
  description: string
  location?: string
  infraction_type: InfractionType
  severity: FineSeverity
  points: number
  amount: number
  notice_number: string
  issuing_body: string
  due_date: string
  status: FineStatus
  payment_date?: string
  appeal_number?: string
  notes?: string
  expand?: {
    vehicle_id?: Vehicle
    driver_id?: Driver
  }
  created?: string
  updated?: string
}

// Fusion by nstech - Entregas & Coletas, Roteirização, Torre de Controle, POD e Auditoria
export type DeliveryType = 'delivery' | 'pickup'
export type DeliveryStatus = 'scheduled' | 'in_transit' | 'delivered' | 'incident' | 'cancelled'
export type AuditStatus = 'pending' | 'ok' | 'divergent'

export interface Delivery {
  id: string
  type: DeliveryType
  customer_name: string
  customer_document?: string
  customer_phone?: string
  recipient_contact?: string
  // Endereço
  street: string
  number: string
  neighborhood?: string
  city: string
  state: string
  zip_code?: string
  latitude?: number
  longitude?: number
  // Carga
  invoice_number?: string
  packages_count?: number
  weight_kg?: number
  volume_m3?: number
  cargo_value?: number
  // Janela
  delivery_window_start?: string
  delivery_window_end?: string
  // Status
  status: DeliveryStatus
  sequence_order?: number
  route_code?: string
  // Relações
  vehicle_id?: string
  driver_id?: string
  trip_id?: string
  // POD
  receiver_name?: string
  receiver_document?: string
  signature_base64?: string
  pod_photo?: string
  completed_at?: string
  // Auditoria de frete
  expected_freight_value?: number
  invoiced_freight_value?: number
  audit_difference?: number
  audit_status?: AuditStatus
  audit_notes?: string
  expand?: {
    vehicle_id?: Vehicle
    driver_id?: Driver
    trip_id?: Trip
    incidents?: DeliveryIncident[]
  }
  created?: string
  updated?: string
}

export type IncidentType =
  | 'client_absent'
  | 'wrong_address'
  | 'cargo_damage'
  | 'customer_refused'
  | 'traffic_delay'
  | 'payment_issue'
  | 'bad_weather'
  | 'other'

export interface DeliveryIncident {
  id: string
  delivery_id: string
  type: IncidentType
  description: string
  reported_at: string
  resolved?: boolean
  resolution_notes?: string
  resolved_at?: string
  expand?: {
    delivery_id?: Delivery
  }
  created?: string
  updated?: string
}
