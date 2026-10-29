export type DocumentType = 'cte' | 'mdfe' | 'ciot' | 'insurance' | 'vpo' | 'bundle'

export type RecipientRole =
  | 'shipper'
  | 'receiver'
  | 'carrier'
  | 'driver'
  | 'broker'
  | 'accountant'
  | 'other'

export interface DocumentDispatchConfig {
  id: string
  name: string
  is_active: boolean
  check_interval_minutes: number
  max_retry_attempts: number
  status: 'active' | 'paused' | 'error'
  last_run_at?: string
  next_run_at?: string
  last_run_status?: string
  last_error_message?: string
  sent_count_total: number
  failed_count_total: number
  pending_retries_count: number
  connected_accounts_summary?: string
  notes?: string
  created?: string
  updated?: string
}

export interface DocumentRecipient {
  id: string
  customer_name: string
  customer_document?: string
  contact_name?: string
  email: string
  cc_emails?: string
  recipient_role: RecipientRole
  allowed_document_types: DocumentType[]
  is_active: boolean
  notes?: string
  sent_count: number
  last_sent_at?: string
  created?: string
  updated?: string
}

export interface DocumentDispatchTemplate {
  id: string
  name: string
  document_type: DocumentType
  subject_template: string
  body_template: string
  is_default: boolean
  is_active: boolean
  description?: string
  created?: string
  updated?: string
}

export type DispatchLogStatus = 'sent' | 'failed' | 'retry_pending' | 'cancelled'

export interface DocumentDispatchLog {
  id: string
  dispatch_key: string
  document_type: DocumentType
  document_id: string
  document_number: string
  document_auth_protocol?: string
  trip_id?: string
  trip_code?: string
  recipient_id?: string
  recipient_name: string
  recipient_email: string
  recipient_role?: string
  sender_account?: string
  provider_used: 'gmail' | 'outlook' | 'system_email' | 'manual'
  template_id?: string
  template_name?: string
  email_subject: string
  email_body_preview?: string
  attachments_summary?: string
  status: DispatchLogStatus
  sent_at?: string
  error_reason?: string
  retry_count: number
  max_retries: number
  next_retry_at?: string
  notification_sent: boolean
  dispatched_by?: string
  created: string
  updated?: string
}

export interface DispatchRunResult {
  success: boolean
  message: string
  details?: {
    sentCount: number
    skippedDuplicate: number
    pendingRetries: number
    errorsCount: number
    documentsFound: number
  }
}
