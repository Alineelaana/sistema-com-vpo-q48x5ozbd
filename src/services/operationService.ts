import { pb } from '@/lib/pocketbase/client'
import { ConnectorContract, Trip, TripWorkflowStages } from '@/types/logistics'

export interface CreateFromNfeResponse {
  success: boolean
  message: string
  operation?: {
    id: string
    operation_number: string
    trip_code: string
    nfe_number: string
    sender_name: string
    recipient_name: string
    freight_value: number
    vpo_value: number
  }
  error?: string
  trip_id?: string
}

export interface AdvanceStageResponse {
  success: boolean
  message: string
  workflow_stages?: TripWorkflowStages
  operation_status?: string
  error?: string
}

export interface ConnectorsStatusResponse {
  success: boolean
  connectors: ConnectorContract[]
  summary: {
    total: number
    configured: number
    waiting_config: number
    in_progress: number
  }
  error?: string
}

/**
 * Cria uma Ordem de Transporte oficial estendendo a viagem existente
 * a partir de uma NF-e identificada pelo agente de cargas.
 */
export async function createOperationFromNfe(fiscalDocId: string): Promise<CreateFromNfeResponse> {
  return await pb.send<CreateFromNfeResponse>('/backend/v1/operations/create-from-nfe', {
    method: 'POST',
    body: { fiscal_document_id: fiscalDocId },
  })
}

/**
 * Aciona a máquina de estados para processar ou reprocessar uma etapa específica da operação.
 */
export async function advanceOperationStage(
  tripId: string,
  stage: string,
  action: 'process' | 'reprocess' | 'skip' = 'process',
): Promise<AdvanceStageResponse> {
  return await pb.send<AdvanceStageResponse>('/backend/v1/operations/advance-stage', {
    method: 'POST',
    body: { trip_id: tripId, stage, action },
  })
}

/**
 * Obtém o estado e catálogo dos contratos de integração / conectores de terceiros.
 * Conectores sem credenciais aparecem como "Aguardando configuração".
 */
export async function getConnectorsStatus(): Promise<ConnectorsStatusResponse> {
  return await pb.send<ConnectorsStatusResponse>('/backend/v1/operations/connectors-status', {
    method: 'GET',
  })
}

/**
 * Busca todas as Ordens de Transporte ativas com paginação e filtro.
 */
export async function getTransportOrders(
  filter = '',
  page = 1,
  perPage = 50,
): Promise<{ items: Trip[]; totalItems: number }> {
  const res = await pb.collection('trips').getList<Trip>(page, perPage, {
    filter,
    sort: '-created',
    expand: 'vehicle_id,driver_id,fiscal_document_id',
  })
  return { items: res.items, totalItems: res.totalItems }
}

/**
 * Atualiza campos cadastrais da Ordem de Transporte.
 */
export async function updateTransportOrder(id: string, data: Partial<Trip>): Promise<Trip> {
  return await pb.collection('trips').update<Trip>(id, data)
}
