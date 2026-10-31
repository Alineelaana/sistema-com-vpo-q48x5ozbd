// src/services/minimumFloorService.ts
/**
 * Serviço de integração com o Motor do Piso Mínimo ANTT
 * Lei nº 13.703/2018 e Resoluções ANTT nº 5.867/2020 e 6.059/2024
 */

export interface FloorCoefficientItem {
  id?: string
  table_id?: string
  table_type: 'tabela_a' | 'tabela_b' | 'tabela_c' | 'tabela_d'
  cargo_category: string
  cargo_category_label: string
  axles: number
  ccd_cost_per_km: number
  cc_loading_unloading: number
}

export interface FloorTableRecord {
  id: string
  version_code: string
  name: string
  legal_act: string
  source_url?: string
  effective_from: string
  effective_to?: string
  is_current: boolean
  validation_status: 'oficial_validada' | 'aguardando_validacao_oficial' | 'revogada'
  diesel_reference_price?: number
  ipca_accumulated_percent?: number
  notes?: string
  imported_by?: string
  coefficients_count?: number
  coefficients?: FloorCoefficientItem[]
}

export interface FloorCalculationDetails {
  table_version: string
  table_name: string
  legal_act: string
  source_url?: string
  validation_status: string
  table_type: string
  table_type_label: string
  cargo_category: string
  cargo_category_label: string
  axles: number
  distance_km: number
  ccd_cost_per_km: number
  cc_loading_unloading: number
  displacement_cost: number
  loading_unloading_cost: number
  empty_return_applicable: boolean
  empty_return_value: number
  base_floor: number
  total_minimum_floor: number
  freight_negotiated: number
  difference: number
  percentage_difference: number
  status: string
  calculated_at: string
}

export interface FloorCalculationParams {
  trip_id: string
  distance_km?: number
  is_applicable?: boolean
  non_applicable_reason?: string
  carrier_profile?: string
  is_own_cargo?: boolean
  table_type?: 'tabela_a' | 'tabela_b'
  cargo_category?: string
  axles?: number
  empty_return_applicable?: boolean
  freight_value?: number
  table_id?: string
}

export interface FloorCalculationResponse {
  success: boolean
  applicable: boolean
  status:
    | 'conforme'
    | 'bloqueado_abaixo_piso'
    | 'regularizado_frete_ajustado'
    | 'justificativa_aprovada'
    | 'nao_aplicavel'
  status_label: string
  reason?: string
  minimum_floor_value: number
  freight_value: number
  difference: number
  table_version: string
  table_name?: string
  calculation?: FloorCalculationDetails
  workflow_stages?: Record<string, unknown>
  is_compliant: boolean
  is_duplicate_avoided?: boolean
  error?: string
}

export interface FloorRegularizeParams {
  trip_id: string
  action_type: 'adjust_freight' | 'legal_justification'
  new_freight_value?: number
  justification?: string
}

export interface FloorRegularizeResponse {
  success: boolean
  message: string
  floor_regularization_status: string
  freight_value: number
  workflow_stages?: Record<string, unknown>
  error?: string
}

export interface FloorTablesListResponse {
  success: boolean
  tables: FloorTableRecord[]
  count: number
  current_version: FloorTableRecord | null
  error?: string
}

export interface FloorImportParams {
  version_code: string
  name: string
  legal_act: string
  source_url?: string
  effective_from: string
  is_current?: boolean
  validation_status?: 'oficial_validada' | 'aguardando_validacao_oficial' | 'revogada'
  diesel_reference_price?: number
  ipca_accumulated_percent?: number
  notes?: string
  coefficients?: FloorCoefficientItem[]
}

export interface FloorImportResponse {
  success: boolean
  message: string
  table_id?: string
  version_code?: string
  coefficients_saved?: number
  error?: string
}

import { pb } from '@/lib/pocketbase/client'

/**
 * Calcula o piso mínimo oficial da operação rodoviária
 */
export async function calculateMinimumFloor(
  params: FloorCalculationParams,
): Promise<FloorCalculationResponse> {
  const data = await pb.send<FloorCalculationResponse>('/backend/v1/minimum-floor/calculate', {
    method: 'POST',
    body: params,
  })

  if (!data || !data.success) {
    throw new Error(data?.error || 'Erro ao calcular piso mínimo ANTT.')
  }
  return data
}

/**
 * Regulariza contrato/frete com bloqueio de piso mínimo
 */
export async function regularizeMinimumFloor(
  params: FloorRegularizeParams,
): Promise<FloorRegularizeResponse> {
  const data = await pb.send<FloorRegularizeResponse>('/backend/v1/minimum-floor/regularize', {
    method: 'POST',
    body: params,
  })

  if (!data || !data.success) {
    throw new Error(data?.error || 'Erro ao regularizar piso mínimo.')
  }
  return data
}

/**
 * Lista tabelas e histórico de versões do Piso Mínimo ANTT
 */
export async function getFloorTables(): Promise<FloorTablesListResponse> {
  const data = await pb.send<FloorTablesListResponse>('/backend/v1/minimum-floor/tables', {
    method: 'GET',
  })

  if (!data || !data.success) {
    throw new Error(data?.error || 'Erro ao listar tabelas de piso mínimo.')
  }
  return data
}

/**
 * Importa nova versão oficial de coeficientes
 */
export async function importFloorTable(params: FloorImportParams): Promise<FloorImportResponse> {
  const data = await pb.send<FloorImportResponse>('/backend/v1/minimum-floor/tables/import', {
    method: 'POST',
    body: params,
  })

  if (!data || !data.success) {
    throw new Error(data?.error || 'Erro ao importar versão de piso mínimo.')
  }
  return data
}

/**
 * Define versão como vigente
 */
export async function setFloorTableCurrent(
  tableId: string,
): Promise<{ success: boolean; message: string }> {
  const data = await pb.send<{ success: boolean; message: string; error?: string }>(
    '/backend/v1/minimum-floor/tables/set-current',
    {
      method: 'POST',
      body: { table_id: tableId },
    },
  )

  if (!data || !data.success) {
    throw new Error(data?.error || 'Erro ao definir versão vigente.')
  }
  return data
}
