import { pb } from '@/lib/pocketbase/client'
import type {
  DocumentDispatchConfig,
  DocumentRecipient,
  DocumentDispatchTemplate,
  DocumentDispatchLog,
  DispatchRunResult,
} from '@/types/dispatchAgent'

/**
 * Busca a configuração global do agente de envio
 */
export async function getDocumentDispatchConfig(): Promise<DocumentDispatchConfig | null> {
  try {
    const records = await pb.collection('document_dispatch_configs').getList(1, 1, {
      filter: "name = 'Agente Principal de Envio de Documentos'",
    })
    if (records.items.length > 0) {
      return records.items[0] as unknown as DocumentDispatchConfig
    }
    // Fallback: qualquer registro da coleção
    const all = await pb.collection('document_dispatch_configs').getList(1, 1)
    if (all.items.length > 0) {
      return all.items[0] as unknown as DocumentDispatchConfig
    }
  } catch (err) {
    console.warn('Erro ao carregar document_dispatch_configs:', err)
  }
  return null
}

/**
 * Atualiza parâmetros operacionais do agente de envio
 */
export async function updateDocumentDispatchConfig(
  id: string,
  data: Partial<DocumentDispatchConfig>,
): Promise<DocumentDispatchConfig> {
  const updated = await pb.collection('document_dispatch_configs').update(id, data)
  return updated as unknown as DocumentDispatchConfig
}

/**
 * Lista destinatários cadastrados por cliente/operação
 */
export async function getDocumentRecipients(limit = 100): Promise<DocumentRecipient[]> {
  try {
    const res = await pb.collection('document_recipients').getList(1, limit, {
      sort: 'customer_name',
    })
    return res.items as unknown as DocumentRecipient[]
  } catch (err) {
    console.warn('Erro ao carregar document_recipients:', err)
    return []
  }
}

/**
 * Cria novo destinatário de documentos
 */
export async function createDocumentRecipient(
  data: Omit<DocumentRecipient, 'id' | 'created' | 'updated' | 'sent_count'>,
): Promise<DocumentRecipient> {
  const record = await pb.collection('document_recipients').create({
    ...data,
    sent_count: 0,
  })
  return record as unknown as DocumentRecipient
}

/**
 * Atualiza cadastro de destinatário
 */
export async function updateDocumentRecipient(
  id: string,
  data: Partial<DocumentRecipient>,
): Promise<DocumentRecipient> {
  const updated = await pb.collection('document_recipients').update(id, data)
  return updated as unknown as DocumentRecipient
}

/**
 * Deleta cadastro de destinatário
 */
export async function deleteDocumentRecipient(id: string): Promise<boolean> {
  return await pb.collection('document_recipients').delete(id)
}

/**
 * Lista modelos de mensagem configuráveis
 */
export async function getDocumentDispatchTemplates(
  limit = 50,
): Promise<DocumentDispatchTemplate[]> {
  try {
    const res = await pb.collection('document_dispatch_templates').getList(1, limit, {
      sort: '-is_default,name',
    })
    return res.items as unknown as DocumentDispatchTemplate[]
  } catch (err) {
    console.warn('Erro ao carregar document_dispatch_templates:', err)
    return []
  }
}

/**
 * Cria modelo de mensagem
 */
export async function createDocumentDispatchTemplate(
  data: Omit<DocumentDispatchTemplate, 'id' | 'created' | 'updated'>,
): Promise<DocumentDispatchTemplate> {
  const record = await pb.collection('document_dispatch_templates').create(data)
  return record as unknown as DocumentDispatchTemplate
}

/**
 * Atualiza modelo de mensagem
 */
export async function updateDocumentDispatchTemplate(
  id: string,
  data: Partial<DocumentDispatchTemplate>,
): Promise<DocumentDispatchTemplate> {
  const updated = await pb.collection('document_dispatch_templates').update(id, data)
  return updated as unknown as DocumentDispatchTemplate
}

/**
 * Deleta modelo de mensagem
 */
export async function deleteDocumentDispatchTemplate(id: string): Promise<boolean> {
  return await pb.collection('document_dispatch_templates').delete(id)
}

/**
 * Lista histórico e rastreabilidade de envios (logs oficiais)
 */
export async function getDocumentDispatchLogs(
  limit = 100,
  filter?: string,
): Promise<DocumentDispatchLog[]> {
  try {
    const res = await pb.collection('document_dispatch_logs').getList(1, limit, {
      sort: '-created',
      filter: filter || '',
    })
    return res.items as unknown as DocumentDispatchLog[]
  } catch (err) {
    console.warn('Erro ao carregar document_dispatch_logs:', err)
    return []
  }
}

/**
 * Disparo manual da esteira do Agente de Envio Automático
 */
export async function triggerDocumentDispatchRun(params?: {
  document_type?: string
  document_id?: string
  force_retry?: boolean
}): Promise<DispatchRunResult> {
  const url = `${pb.baseUrl}/backend/v1/agents/dispatch/run-now`
  const token = pb.authStore.token

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(params || {}),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Falha na requisição' }))
    throw new Error(errData.error || `Erro HTTP ${res.status}`)
  }

  return (await res.json()) as DispatchRunResult
}

/**
 * Reenvio manual específico de um log com falha
 */
export async function retryDispatchLog(
  logId: string,
): Promise<{ success: boolean; message: string }> {
  const url = `${pb.baseUrl}/backend/v1/agents/dispatch/retry-log`
  const token = pb.authStore.token

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ log_id: logId }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Falha ao reenviar documento' }))
    throw new Error(errData.error || `Erro HTTP ${res.status}`)
  }

  return await res.json()
}
