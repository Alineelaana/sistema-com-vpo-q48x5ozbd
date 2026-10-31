import { pb } from '@/lib/pocketbase/client'
import type {
  CteDocument,
  MdfeDocument,
  CiotRecord,
  InsurancePolicy,
  InsuranceEndorsement,
  RegularizationOrchestrationResult,
  Trip,
} from '@/types/logistics'

/**
 * Serviço de Integração Fiscal, MDF-e, CIOT, Seguros & Regularização (Etapa 3)
 */

export interface FiscalTransmissionResponse {
  success: boolean
  status: 'authorized' | 'rejected' | 'pending' | 'queued'
  message: string
  isConfigured: boolean
  accessKey?: string
  protocol?: string
  xml?: string
  already_authorized?: boolean
}

export interface PrepareCteResponse {
  success: boolean
  message: string
  already_authorized?: boolean
  cte?: Partial<CteDocument>
  error?: string
}

export interface PrepareMdfeResponse {
  success: boolean
  message: string
  already_authorized?: boolean
  mdfe?: Partial<MdfeDocument>
  error?: string
}

// -------------------------------------------------------------
// Preparação Automática de CT-e e MDF-e
// -------------------------------------------------------------
export async function prepareCteFromTrip(tripId: string): Promise<PrepareCteResponse> {
  try {
    return await pb.send<PrepareCteResponse>('/backend/v1/regularization/cte/prepare-from-trip', {
      method: 'POST',
      body: { trip_id: tripId },
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha na preparação do CT-e'
    return {
      success: false,
      message: errorMsg,
      error: errorMsg,
    }
  }
}

export async function prepareMdfeFromTrip(tripId: string): Promise<PrepareMdfeResponse> {
  try {
    return await pb.send<PrepareMdfeResponse>('/backend/v1/regularization/mdfe/prepare-from-trip', {
      method: 'POST',
      body: { trip_id: tripId },
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha na preparação do MDF-e'
    return {
      success: false,
      message: errorMsg,
      error: errorMsg,
    }
  }
}

// -------------------------------------------------------------
// CT-e
// -------------------------------------------------------------
export async function getCteDocuments(): Promise<CteDocument[]> {
  try {
    const records = await pb.collection('cte_documents').getFullList<CteDocument>({
      sort: '-cte_number',
      expand: 'trip_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar CT-es:', err)
    return []
  }
}

export async function transmitCte(cteId: string): Promise<FiscalTransmissionResponse> {
  try {
    const res = await pb.send<FiscalTransmissionResponse>(
      '/backend/v1/regularization/cte/transmit',
      {
        method: 'POST',
        body: { cte_id: cteId },
      },
    )
    return res
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha na conexão com backend fiscal'
    return {
      success: false,
      status: 'queued',
      message: `Erro na transmissão: ${errorMsg}`,
      isConfigured: false,
    }
  }
}

// -------------------------------------------------------------
// MDF-e
// -------------------------------------------------------------
export async function getMdfeDocuments(): Promise<MdfeDocument[]> {
  try {
    const records = await pb.collection('mdfe_documents').getFullList<MdfeDocument>({
      sort: '-mdfe_number',
      expand: 'trip_id,vehicle_id,driver_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar MDF-es:', err)
    return []
  }
}

export async function createMdfeDocument(data: Partial<MdfeDocument>): Promise<MdfeDocument> {
  const record = await pb.collection('mdfe_documents').create<MdfeDocument>(data)
  return record
}

export async function transmitMdfe(mdfeId: string): Promise<FiscalTransmissionResponse> {
  try {
    const res = await pb.send<FiscalTransmissionResponse>(
      '/backend/v1/regularization/mdfe/transmit',
      {
        method: 'POST',
        body: { mdfe_id: mdfeId },
      },
    )
    return res
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha na conexão com backend fiscal'
    return {
      success: false,
      status: 'queued',
      message: `Erro na transmissão de MDF-e: ${errorMsg}`,
      isConfigured: false,
    }
  }
}

export async function closeMdfe(mdfeId: string): Promise<MdfeDocument> {
  return await pb.collection('mdfe_documents').update<MdfeDocument>(mdfeId, {
    status: 'closed',
    closed_at: new Date().toISOString(),
    status_message: 'MDF-e encerrado pelo transportador.',
  })
}

export async function cancelMdfe(mdfeId: string, justification?: string): Promise<MdfeDocument> {
  return await pb.collection('mdfe_documents').update<MdfeDocument>(mdfeId, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    status_message: justification ? `Cancelado: ${justification}` : 'MDF-e cancelado.',
  })
}

// -------------------------------------------------------------
// CIOT
// -------------------------------------------------------------
export async function getCiotRecords(): Promise<CiotRecord[]> {
  try {
    const records = await pb.collection('ciot_records').getFullList<CiotRecord>({
      sort: '-created',
      expand: 'trip_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar CIOTs:', err)
    return []
  }
}

export async function createCiotRecord(data: Partial<CiotRecord>): Promise<CiotRecord> {
  return await pb.collection('ciot_records').create<CiotRecord>(data)
}

export async function updateCiotRecord(id: string, data: Partial<CiotRecord>): Promise<CiotRecord> {
  return await pb.collection('ciot_records').update<CiotRecord>(id, data)
}

export async function deleteCiotRecord(id: string): Promise<boolean> {
  return await pb.collection('ciot_records').delete(id)
}

// -------------------------------------------------------------
// Seguros e Averbação
// -------------------------------------------------------------
export async function getInsurancePolicies(): Promise<InsurancePolicy[]> {
  try {
    return await pb.collection('insurance_policies').getFullList<InsurancePolicy>({
      sort: '-is_active,insurer_name',
    })
  } catch (err) {
    console.error('Erro ao buscar apólices:', err)
    return []
  }
}

export async function createInsurancePolicy(
  data: Partial<InsurancePolicy>,
): Promise<InsurancePolicy> {
  return await pb.collection('insurance_policies').create<InsurancePolicy>(data)
}

export async function updateInsurancePolicy(
  id: string,
  data: Partial<InsurancePolicy>,
): Promise<InsurancePolicy> {
  return await pb.collection('insurance_policies').update<InsurancePolicy>(id, data)
}

export async function deleteInsurancePolicy(id: string): Promise<boolean> {
  return await pb.collection('insurance_policies').delete(id)
}

export async function getInsuranceEndorsements(): Promise<InsuranceEndorsement[]> {
  try {
    return await pb.collection('insurance_endorsements').getFullList<InsuranceEndorsement>({
      sort: '-created',
      expand: 'trip_id,policy_id,cte_id',
    })
  } catch (err) {
    console.error('Erro ao buscar averbações:', err)
    return []
  }
}

export async function createInsuranceEndorsement(
  data: Partial<InsuranceEndorsement>,
): Promise<InsuranceEndorsement> {
  return await pb.collection('insurance_endorsements').create<InsuranceEndorsement>(data)
}

export async function updateInsuranceEndorsement(
  id: string,
  data: Partial<InsuranceEndorsement>,
): Promise<InsuranceEndorsement> {
  return await pb.collection('insurance_endorsements').update<InsuranceEndorsement>(id, data)
}

// -------------------------------------------------------------
// Orquestrador da Etapa 3
// -------------------------------------------------------------
export async function runRegularizationOrchestration(): Promise<RegularizationOrchestrationResult> {
  try {
    const result = await pb.send<RegularizationOrchestrationResult>(
      '/backend/v1/regularization/orchestrate',
      {
        method: 'POST',
      },
    )
    return result
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Falha na orquestração da Etapa 3'
    return {
      success: false,
      processed_trips: 0,
      ctes_checked: 0,
      ciots_checked: 0,
      endorsements_checked: 0,
      mdfes_checked: 0,
      pending_issues: [
        {
          trip_code: 'SISTEMA',
          stage: 'orquestrador',
          severity: 'bloqueio',
          message: errorMsg,
        },
      ],
      fiscal_provider_status: 'aguardando_credenciais',
      message: `Erro na execução da Etapa 3: ${errorMsg}`,
    }
  }
}

export async function getTripsForFiscalSelection(): Promise<Trip[]> {
  try {
    return await pb.collection('trips').getFullList<Trip>({
      sort: '-created',
      expand: 'vehicle_id,driver_id',
    })
  } catch (err) {
    console.error('Erro ao buscar viagens:', err)
    return []
  }
}
