export type EmailAgentStatus = 'active' | 'paused' | 'error'

export interface EmailAgentConfig {
  id: string
  name: string
  is_active: boolean
  check_interval_minutes: number
  status: EmailAgentStatus
  last_run_at?: string
  next_run_at?: string
  last_run_status?: string
  last_error_message?: string
  processed_count_total: number
  auto_classified_count: number
  exceptions_count: number
  connected_accounts_summary?: string
  notes?: string
  created?: string
  updated?: string
}

export type EmailTriggerType = 'nfe_received' | 'cte_request' | 'complementary_doc' | 'unknown'

export type EmailActionType =
  | 'start_process'
  | 'identify_cargo'
  | 'link_operation'
  | 'send_for_analysis'

export type RuleApprovalStatus = 'pending_approval' | 'approved' | 'rejected'

export interface EmailAgentRule {
  id: string
  name: string
  description?: string
  trigger_type: EmailTriggerType
  subject_keywords?: string
  sender_pattern?: string
  file_extensions?: string
  action_type: EmailActionType
  action_target_process?: string
  approval_status: RuleApprovalStatus
  approved_by?: string
  approved_at?: string
  is_active: boolean
  order_priority: number
  match_count: number
  created?: string
  updated?: string
}

export type EmailProcessingStatus = 'processed' | 'duplicate' | 'needs_analysis' | 'error'

export interface EmailAttachmentInfo {
  name: string
  type: string
  size?: number
}

export interface EmailProcessingLog {
  id: string
  message_id: string
  provider: 'gmail' | 'outlook' | 'manual'
  sender: string
  recipient?: string
  subject: string
  received_date?: string
  snippet?: string
  attachments_summary?: string
  attachments_details?: EmailAttachmentInfo[] | string
  classification: EmailTriggerType
  matched_rule_id?: string
  matched_rule_name?: string
  customer_identified?: string
  company_identified?: string
  trip_identified_id?: string
  trip_code?: string
  process_status: EmailProcessingStatus
  execution_result?: string
  exception_details?: string
  is_duplicate: boolean
  notification_sent: boolean
  processed_at?: string
  created?: string
  updated?: string
}

export interface AgentRunResult {
  processedNow: number
  duplicateCount: number
  autoClassified: number
  exceptionsCount: number
  executedAt: string
}
