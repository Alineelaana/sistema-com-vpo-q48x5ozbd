import { pb } from '../lib/pocketbase/client'
import {
  ContractTemplate,
  TransportContract,
  GenerateContractParams,
  GenerateContractResponse,
  RequestSignatureResponse,
} from '../types/contract'

/**
 * Serviço de Gestão de Contratos de Transporte / CTRB (Passo 4 ED Integração)
 * Integração com PocketBase, Anti-duplicação, Auditoria e Bloqueio de Piso Mínimo
 */

/**
 * Busca a lista de modelos de contrato ativos/cadastrados
 */
export async function getContractTemplates(): Promise<ContractTemplate[]> {
  try {
    const records = await pb.collection('contract_templates').getFullList({
      sort: '-is_default,-is_active,title',
    })
    return records.map((rec) => {
      let parsedClauses = []
      try {
        parsedClauses =
          typeof rec.clauses === 'string' ? JSON.parse(rec.clauses) : rec.clauses || []
      } catch (_) {
        parsedClauses = []
      }
      return {
        id: rec.id,
        title: rec.title,
        carrier_profile: rec.carrier_profile,
        transport_mode: rec.transport_mode,
        is_active: rec.is_active,
        is_default: rec.is_default,
        version: rec.version || 1,
        preamble_template: rec.preamble_template,
        clauses: parsedClauses,
        responsibilities_text: rec.responsibilities_text,
        penalty_terms_text: rec.penalty_terms_text,
        jurisdiction_city: rec.jurisdiction_city,
        jurisdiction_state: rec.jurisdiction_state,
        notes: rec.notes,
        created: rec.created,
        updated: rec.updated,
      } as ContractTemplate
    })
  } catch (err) {
    console.error('[contractService:getContractTemplates] Erro:', err)
    return []
  }
}

/**
 * Cria ou atualiza um modelo contratual (para administração de cláusulas)
 */
export async function saveContractTemplate(
  template: Partial<ContractTemplate> & { title: string; carrier_profile: string },
): Promise<ContractTemplate> {
  const clausesPayload =
    typeof template.clauses === 'object' ? JSON.stringify(template.clauses) : template.clauses

  const payload: Record<string, unknown> = {
    title: template.title,
    carrier_profile: template.carrier_profile,
    transport_mode: template.transport_mode || 'todos',
    is_active: template.is_active ?? true,
    is_default: template.is_default ?? false,
    version: (template.version || 1) + (template.id ? 1 : 0),
    preamble_template: template.preamble_template || '',
    clauses: clausesPayload,
    responsibilities_text: template.responsibilities_text || '',
    penalty_terms_text: template.penalty_terms_text || '',
    jurisdiction_city: template.jurisdiction_city || 'Jundiaí',
    jurisdiction_state: template.jurisdiction_state || 'SP',
    notes: template.notes || '',
  }

  let rec
  if (template.id) {
    rec = await pb.collection('contract_templates').update(template.id, payload)
  } else {
    rec = await pb.collection('contract_templates').create(payload)
  }

  // Trilha de auditoria
  try {
    await pb.collection('audit_logs').create({
      actor_name: pb.authStore.record?.name || 'Administrador',
      actor_email: pb.authStore.record?.email || 'admin@transconnect.local',
      actor_id: pb.authStore.record?.id || '',
      action: template.id ? 'contract_template_update' : 'contract_template_create',
      description: `${template.id ? 'Atualização' : 'Criação'} do modelo contratual: "${template.title}" (Perfil: ${template.carrier_profile}).`,
      details: JSON.stringify({ templateId: rec.id, title: template.title }),
    })
  } catch {
    /* intentionally ignored */
  }

  return rec as unknown as ContractTemplate
}

/**
 * Busca o contrato CTRB vinculado a uma Ordem de Transporte (trip_id)
 */
export async function getContractByTripId(tripId: string): Promise<TransportContract | null> {
  try {
    const records = await pb.collection('transport_contracts').getList(1, 1, {
      filter: `trip_id = "${tripId}"`,
      sort: '-created',
      expand: 'template_id',
    })
    if (records.items.length === 0) return null

    const rec = records.items[0]
    let parsedClauses = []
    try {
      parsedClauses =
        typeof rec.clauses_snapshot === 'string'
          ? JSON.parse(rec.clauses_snapshot)
          : rec.clauses_snapshot || []
    } catch (_) {
      parsedClauses = []
    }

    return {
      id: rec.id,
      trip_id: rec.trip_id,
      template_id: rec.template_id,
      contract_number: rec.contract_number,
      operation_number: rec.operation_number,
      trip_code: rec.trip_code,
      status: rec.status,
      contractor_name: rec.contractor_name,
      contractor_document: rec.contractor_document,
      contractor_rntrc: rec.contractor_rntrc,
      contractor_address: rec.contractor_address,
      contracted_carrier_name: rec.contracted_carrier_name,
      contracted_carrier_document: rec.contracted_carrier_document,
      contracted_carrier_rntrc: rec.contracted_carrier_rntrc,
      carrier_profile: rec.carrier_profile,
      carrier_address: rec.carrier_address,
      carrier_phone: rec.carrier_phone,
      bank_name: rec.bank_name,
      bank_agency: rec.bank_agency,
      bank_account: rec.bank_account,
      bank_pix_key: rec.bank_pix_key,
      bank_beneficiary_name: rec.bank_beneficiary_name,
      bank_beneficiary_doc: rec.bank_beneficiary_doc,
      driver_name: rec.driver_name,
      driver_cpf: rec.driver_cpf,
      driver_cnh: rec.driver_cnh,
      driver_phone: rec.driver_phone,
      vehicle_plate: rec.vehicle_plate,
      trailer_plate: rec.trailer_plate,
      trailer_plate_2: rec.trailer_plate_2,
      vehicle_model: rec.vehicle_model,
      axles_count: rec.axles_count,
      cargo_type: rec.cargo_type,
      cargo_weight_kg: rec.cargo_weight_kg,
      cargo_value: rec.cargo_value,
      nfe_number: rec.nfe_number,
      nfe_key: rec.nfe_key,
      origin_city: rec.origin_city,
      origin_state: rec.origin_state,
      destination_city: rec.destination_city,
      destination_state: rec.destination_state,
      distance_km: rec.distance_km,
      route_highways: rec.route_highways,
      pickup_address: rec.pickup_address,
      delivery_address: rec.delivery_address,
      freight_value: rec.freight_value,
      minimum_floor_value: rec.minimum_floor_value,
      minimum_floor_table_version: rec.minimum_floor_table_version,
      minimum_floor_status: rec.minimum_floor_status,
      payment_terms: rec.payment_terms,
      advance_payment_value: rec.advance_payment_value,
      balance_payment_value: rec.balance_payment_value,
      vpo_value: rec.vpo_value,
      vpo_voucher_number: rec.vpo_voucher_number,
      vpo_responsible: rec.vpo_responsible,
      insurance_policy_number: rec.insurance_policy_number,
      insurance_averbacao_protocol: rec.insurance_averbacao_protocol,
      clauses_snapshot: parsedClauses,
      responsibilities_text: rec.responsibilities_text,
      penalty_terms_text: rec.penalty_terms_text,
      jurisdiction: rec.jurisdiction,
      signature_status: rec.signature_status,
      signature_provider: rec.signature_provider,
      signature_document_id: rec.signature_document_id,
      signature_url: rec.signature_url,
      signed_at: rec.signed_at,
      signed_by_carrier_at: rec.signed_by_carrier_at,
      signed_by_contractor_at: rec.signed_by_contractor_at,
      generated_by: rec.generated_by,
      generated_at: rec.generated_at,
      version: rec.version,
      created: rec.created,
      updated: rec.updated,
    } as TransportContract
  } catch (err) {
    console.error('[contractService:getContractByTripId] Erro:', err)
    return null
  }
}

/**
 * Gera ou regera o contrato CTRB via endpoint do orquestrador
 * Verifica piso mínimo, dados cadastrais, dados bancários e anti-duplicação
 */
export async function generateContract(
  params: GenerateContractParams,
): Promise<GenerateContractResponse> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl || ''
  const url = `${baseUrl}/backend/v1/contracts/generate`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(params),
  })

  const data = await res.json()
  return data as GenerateContractResponse
}

/**
 * Solicitação de assinatura eletrônica (valida provedor conectado de forma honesta)
 */
export async function requestElectronicSignature(
  contractId: string,
): Promise<RequestSignatureResponse> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl || ''
  const url = `${baseUrl}/backend/v1/contracts/request-signature`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({ contract_id: contractId }),
  })

  const data = await res.json()
  return data as RequestSignatureResponse
}
