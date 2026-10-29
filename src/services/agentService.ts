import pb from '@/lib/pocketbase/client'
import type {
  EmailAgentConfig,
  EmailAgentRule,
  EmailProcessingLog,
  AgentRunResult,
} from '@/types/agent'

/**
 * Obtém ou inicializa a configuração do Agente de E-mails
 */
export async function getEmailAgentConfig(): Promise<EmailAgentConfig | null> {
  try {
    const list = await pb.collection('email_agent_configs').getList<EmailAgentConfig>(1, 1, {
      filter: "name = 'Agente Principal de E-mails'",
      sort: '-created',
    })
    if (list.items.length > 0) {
      return list.items[0]
    }

    // Se ainda não existir por algum motivo, retorna primeiro disponível
    const anyList = await pb.collection('email_agent_configs').getList<EmailAgentConfig>(1, 1)
    return anyList.items[0] || null
  } catch (err) {
    console.error('Erro ao buscar configuração do agente de e-mails:', err)
    return null
  }
}

/**
 * Atualiza parâmetros do agente de e-mails (intervalo, status ativo/pausado)
 */
export async function updateEmailAgentConfig(
  id: string,
  data: Partial<
    Pick<EmailAgentConfig, 'is_active' | 'check_interval_minutes' | 'status' | 'notes'>
  >,
): Promise<EmailAgentConfig> {
  return await pb.collection('email_agent_configs').update<EmailAgentConfig>(id, data)
}

/**
 * Busca todas as regras cadastradas do agente
 */
export async function getEmailAgentRules(): Promise<EmailAgentRule[]> {
  try {
    const records = await pb.collection('email_agent_rules').getFullList<EmailAgentRule>({
      sort: 'order_priority,-created',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar regras do agente:', err)
    return []
  }
}

/**
 * Cria nova regra com status pendente de aprovação se não for admin
 */
export async function createEmailAgentRule(
  data: Omit<EmailAgentRule, 'id' | 'created' | 'updated' | 'match_count'>,
): Promise<EmailAgentRule> {
  return await pb.collection('email_agent_rules').create<EmailAgentRule>({
    ...data,
    match_count: 0,
  })
}

/**
 * Atualiza regra existente. Se campos de acionamento forem alterados por não-admin, volta para pendente de aprovação
 */
export async function updateEmailAgentRule(
  id: string,
  data: Partial<EmailAgentRule>,
): Promise<EmailAgentRule> {
  return await pb.collection('email_agent_rules').update<EmailAgentRule>(id, data)
}

/**
 * Aprovação administrativa de regra (somente após aprovação a regra se torna executável)
 */
export async function approveEmailAgentRule(
  id: string,
  adminNameOrEmail: string,
): Promise<EmailAgentRule> {
  return await pb.collection('email_agent_rules').update<EmailAgentRule>(id, {
    approval_status: 'approved',
    approved_by: adminNameOrEmail,
    approved_at: new Date().toISOString(),
    is_active: true,
  })
}

/**
 * Rejeição ou desativação de regra
 */
export async function rejectEmailAgentRule(
  id: string,
  adminNameOrEmail: string,
): Promise<EmailAgentRule> {
  return await pb.collection('email_agent_rules').update<EmailAgentRule>(id, {
    approval_status: 'rejected',
    approved_by: adminNameOrEmail,
    approved_at: new Date().toISOString(),
    is_active: false,
  })
}

/**
 * Exclui uma regra
 */
export async function deleteEmailAgentRule(id: string): Promise<boolean> {
  try {
    await pb.collection('email_agent_rules').delete(id)
    return true
  } catch (err) {
    console.error('Erro ao excluir regra:', err)
    return false
  }
}

/**
 * Lista o histórico de processamento de e-mails
 */
export async function getEmailProcessingLogs(limit = 100): Promise<EmailProcessingLog[]> {
  try {
    const records = await pb
      .collection('email_processing_logs')
      .getList<EmailProcessingLog>(1, limit, {
        sort: '-received_date,-created',
      })
    return records.items
  } catch (err) {
    console.error('Erro ao listar logs de processamento de e-mails:', err)
    return []
  }
}

/**
 * Disparo manual do Agente de E-mails via rota customizada do backend
 */
export async function triggerEmailAgentRun(): Promise<{
  success: boolean
  message: string
  details?: AgentRunResult
}> {
  try {
    const url = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/agents/emails/run-now`
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
      throw new Error(data.error || 'Falha ao acionar execução do agente de e-mails.')
    }

    return data
  } catch (err) {
    console.error('Erro ao disparar execução do agente:', err)
    throw err
  }
}
