import { pb } from '@/lib/pocketbase/client'
import { PlazaTollBreakdown, RouteWaypoint, TollPlaza, TollTariff } from '@/types/logistics'

export interface PlazasResponse {
  success: boolean
  plazas: TollPlaza[]
  count: number
  version_summary: string
  error?: string
}

export interface RoutingCalculateParams {
  plaza_ids: string[]
  axles: number
  distance_km: number
  is_return?: boolean
}

export interface RoutingCalculateResponse {
  success: boolean
  axles?: number
  is_return?: boolean
  distance_km?: number
  plaza_count?: number
  total_toll_cost: number
  avg_rate_per_axle?: number
  tariff_version_used?: string
  tariff_source_used?: string
  estimated_duration_hours?: number
  plazas_breakdown?: PlazaTollBreakdown[]
  limitations?: string
  warning?: string
  error?: string
}

export interface RoutingApproveParams {
  trip_id: string
  origin: {
    city: string
    state: string
    address?: string
  }
  destination: {
    city: string
    state: string
    address?: string
  }
  waypoints?: RouteWaypoint[]
  distance_km: number
  highways?: string
  plaza_ids: string[]
  axles: number
  is_return?: boolean
  force_reapprove?: boolean
}

export interface RoutingApproveResponse {
  success: boolean
  message: string
  already_approved?: boolean
  route?: {
    trip_id: string
    operation_number: string
    distance_km: number
    origin: string
    destination: string
    waypoints_count: number
    highways: string
    axles: number
    toll_tollgate_count: number
    vpo_value: number
    tariff_version_used: string
    minimum_floor_value: number
    minimum_floor_status: string
    approved_at: string
  }
  error?: string
}

/**
 * Consulta praças de pedágio e suas tarifas vigentes cadastradas no banco de dados.
 */
export async function getTollPlazas(filters?: {
  highway?: string
  state?: string
}): Promise<PlazasResponse> {
  const query = new URLSearchParams()
  if (filters?.highway) query.set('highway', filters.highway)
  if (filters?.state) query.set('state', filters.state)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  return await pb.send<PlazasResponse>(`/backend/v1/routing/plazas${queryString}`, {
    method: 'GET',
  })
}

/**
 * Executa o cálculo de custo de pedágio por praça e quantidade de eixos
 * consultando estritamente a versão tarifária vigente no banco.
 */
export async function calculateRouteTolls(
  params: RoutingCalculateParams,
): Promise<RoutingCalculateResponse> {
  return await pb.send<RoutingCalculateResponse>('/backend/v1/routing/calculate', {
    method: 'POST',
    body: params,
  })
}

/**
 * Aprova formalmente a rota para a Ordem de Transporte, atualizando
 * o VPO (Lei 10.209/01), o piso mínimo ANTT preliminar e o percurso do MDF-e.
 * Possui salvaguarda estrita contra duplicação de recálculos.
 */
export async function approveTransportOrderRoute(
  params: RoutingApproveParams,
): Promise<RoutingApproveResponse> {
  return await pb.send<RoutingApproveResponse>('/backend/v1/routing/approve', {
    method: 'POST',
    body: params,
  })
}
