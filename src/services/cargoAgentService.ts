import pb from '@/lib/pocketbase/client'
import type {
  CargoAgentConfig,
  ReceivedFiscalDocument,
  CargoIdentification,
  CargoAgentRunResult,
} from '@/types/cargoAgent'

/**
 * Obtém configuração do Agente de Identificação de Cargas
 */
export async function getCargoAgentConfig(): Promise<CargoAgentConfig | null> {
  try {
    const list = await pb.collection('cargo_agent_configs').getList<CargoAgentConfig>(1, 1, {
      filter: "name = 'Agente de Identificação de Cargas'",
      sort: '-created',
    })
    if (list.items.length > 0) {
      return list.items[0]
    }
    const anyList = await pb.collection('cargo_agent_configs').getList<CargoAgentConfig>(1, 1)
    return anyList.items[0] || null
  } catch (err) {
    console.error('Erro ao buscar configuração do agente de cargas:', err)
    return null
  }
}

/**
 * Atualiza parâmetros e critérios de cruzamento do Agente de Cargas
 */
export async function updateCargoAgentConfig(
  id: string,
  data: Partial<CargoAgentConfig>,
): Promise<CargoAgentConfig> {
  return await pb.collection('cargo_agent_configs').update<CargoAgentConfig>(id, data)
}

/**
 * Obtém todos os documentos fiscais recebidos
 */
export async function getReceivedFiscalDocuments(limit = 100): Promise<ReceivedFiscalDocument[]> {
  try {
    const records = await pb
      .collection('received_fiscal_documents')
      .getList<ReceivedFiscalDocument>(1, limit, {
        sort: '-created',
      })
    return records.items
  } catch (err) {
    console.error('Erro ao listar documentos fiscais recebidos:', err)
    return []
  }
}

/**
 * Obtém histórico e pendências de identificação de cargas
 */
export async function getCargoIdentifications(limit = 100): Promise<CargoIdentification[]> {
  try {
    const records = await pb
      .collection('cargo_identifications')
      .getList<CargoIdentification>(1, limit, {
        sort: '-created',
        expand: 'fiscal_document_id,trip_id',
      })
    return records.items
  } catch (err) {
    console.error('Erro ao listar identificações de carga:', err)
    return []
  }
}

/**
 * Disparo manual do Agente de Identificação de Cargas
 */
export async function triggerCargoAgentRun(): Promise<{
  success: boolean
  message: string
  details?: CargoAgentRunResult
}> {
  const url = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/agents/cargo/identify-now`
  const token = pb.authStore.token

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Falha ao acionar identificação de cargas.')
  }

  return data
}

/**
 * Resolução manual de vínculo por responsável humano (confirmar viagem ou rejeitar)
 */
export async function resolveCargoLink(params: {
  identification_id: string
  trip_id?: string
  action: 'confirm' | 'reject'
  notes?: string
}): Promise<{ success: boolean; message: string }> {
  const url = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/agents/cargo/resolve-link`
  const token = pb.authStore.token

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(params),
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Falha ao resolver vínculo de carga.')
  }

  return data
}
