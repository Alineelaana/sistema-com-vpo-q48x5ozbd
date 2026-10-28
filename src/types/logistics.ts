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
  expand?: {
    vehicle_id?: Vehicle
    driver_id?: Driver
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
  issued_at?: string
  expand?: {
    trip_id?: Trip
  }
  created?: string
  updated?: string
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
