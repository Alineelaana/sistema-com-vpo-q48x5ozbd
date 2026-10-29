export interface CargoAgentConfig {
  id: string
  name: string
  is_active: boolean
  min_matching_signals: number
  match_plate: boolean
  match_client_document: boolean
  match_dates_window_days: number
  match_driver: boolean
  match_cargo_weight: boolean
  check_fiscal_duplicates: boolean
  auto_link_when_confident: boolean
  last_run_at?: string
  last_run_summary?: string
  total_processed_count: number
  auto_linked_count: number
  pending_review_count: number
  duplicates_blocked_count: number
  notes?: string
  created?: string
  updated?: string
}

export type FiscalDocumentStatus =
  | 'pending_match'
  | 'linked'
  | 'ambiguous'
  | 'divergent'
  | 'duplicate_rejected'
  | 'manual_review'

export interface ReceivedFiscalDocument {
  id: string
  access_key: string
  nfe_number: string
  series?: string
  issuer_name: string
  issuer_cnpj: string
  recipient_name: string
  recipient_cnpj: string
  issue_date?: string
  total_value: number
  weight_kg: number
  items_summary?: string
  detected_plate?: string
  detected_driver_name?: string
  detected_driver_cpf?: string
  detected_carrier_name?: string
  detected_carrier_cnpj?: string
  raw_xml_snippet?: string
  source_email_id?: string
  source_email_subject?: string
  source_email_sender?: string
  status: FiscalDocumentStatus
  created?: string
  updated?: string
}

export type CargoMatchStatus =
  | 'auto_matched'
  | 'pending_human_review'
  | 'manually_confirmed'
  | 'manually_rejected'
  | 'duplicate_detected'

export interface CargoIdentification {
  id: string
  fiscal_document_id: string
  trip_id?: string
  trip_code?: string
  match_status: CargoMatchStatus
  confidence_score: number
  matching_signals?: string[] | string
  divergence_reasons?: string
  possible_trip_ids?: string
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  missing_fields_for_cte?: string
  cte_ready: boolean
  created?: string
  updated?: string
  expand?: {
    fiscal_document_id?: ReceivedFiscalDocument
    trip_id?: {
      id: string
      trip_code: string
      origin_city: string
      origin_state: string
      destination_city: string
      destination_state: string
      cargo_type: string
      weight_kg: number
      freight_value: number
      vehicle_id?: string
      driver_id?: string
      status: string
    }
  }
}

export interface CargoAgentRunResult {
  processedCount: number
  autoLinkedCount: number
  pendingHumanCount: number
  duplicatesFoundCount: number
  executedAt: string
}
