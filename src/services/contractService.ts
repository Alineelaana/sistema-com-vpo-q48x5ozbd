import { pb } from '../lib/pocketbase/client'
import {
  ContractTemplate,
  TransportContract,
  ContractAttachment,
  GenerateContractParams,
  GenerateContractResponse,
  RequestSignatureResponse,
} from '../types/contract'

/**
 * Serviço de Gestão de Contratos de Transporte / CTRB (Passo 4 ED Integração & ServiceLogic)
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
 * Helper para converter registro do PocketBase em TransportContract
 */
function mapContractRecord(rec: Record<string, unknown>): TransportContract {
  let parsedClauses = []
  try {
    parsedClauses =
      typeof rec.clauses_snapshot === 'string'
        ? JSON.parse(rec.clauses_snapshot)
        : (rec.clauses_snapshot as unknown[]) || []
  } catch (_) {
    parsedClauses = []
  }

  const parseJsonField = (val: unknown) => {
    if (!val) return undefined
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch {
        return undefined
      }
    }
    return val
  }

  return {
    id: rec.id as string,
    trip_id: rec.trip_id as string,
    template_id: rec.template_id as string,
    contract_number: rec.contract_number as string,
    operation_number: rec.operation_number as string,
    trip_code: rec.trip_code as string,
    status: rec.status as TransportContract['status'],

    // ServiceLogic CTRB Campos
    filial: (rec.filial as string) || 'COOPROVES GO',
    fleet_type: (rec.fleet_type as string) || 'Não Própria',
    operation_type: (rec.operation_type as string) || 'Carga Lotação',
    service_type: (rec.service_type as string) || 'transporte geral',
    tax_regime: (rec.tax_regime as string) || 'Pessoa Física',
    contractor_code: (rec.contractor_code as string) || '2049',
    contracted_carrier_code: (rec.contracted_carrier_code as string) || '865',
    driver_code: (rec.driver_code as string) || '13199',

    series: (rec.series as string) || '1',
    ciot_number: (rec.ciot_number as string) || '',
    fiscal_operation: (rec.fiscal_operation as string) || 'Entrada de Contrato de Transporte',
    quick_charge: (rec.quick_charge as string) || '',
    issue_date: (rec.issue_date as string) || '',
    departure_date: (rec.departure_date as string) || '',
    end_date: (rec.end_date as string) || '',
    advance_due_date: (rec.advance_due_date as string) || '',
    balance_due_date: (rec.balance_due_date as string) || '',
    responsible_collaborator: (rec.responsible_collaborator as string) || '',
    no_tax_calc: Boolean(rec.no_tax_calc),

    integrator_name: (rec.integrator_name as string) || 'PX Bank',
    integrator_status: (rec.integrator_status as string) || 'Aguardando configuração',

    contractor_name: (rec.contractor_name as string) || '',
    contractor_document: (rec.contractor_document as string) || '',
    contractor_rntrc: (rec.contractor_rntrc as string) || '',
    contractor_address: (rec.contractor_address as string) || '',

    contracted_carrier_name: (rec.contracted_carrier_name as string) || '',
    contracted_carrier_document: (rec.contracted_carrier_document as string) || '',
    contracted_carrier_rntrc: (rec.contracted_carrier_rntrc as string) || '',
    carrier_profile:
      (rec.carrier_profile as TransportContract['carrier_profile']) || 'tac_equiparado',
    carrier_address: (rec.carrier_address as string) || '',
    carrier_phone: (rec.carrier_phone as string) || '',

    bank_name: (rec.bank_name as string) || '',
    bank_agency: (rec.bank_agency as string) || '',
    bank_account: (rec.bank_account as string) || '',
    bank_pix_key: (rec.bank_pix_key as string) || '',
    bank_beneficiary_name: (rec.bank_beneficiary_name as string) || '',
    bank_beneficiary_doc: (rec.bank_beneficiary_doc as string) || '',
    bank_payment_method: (rec.bank_payment_method as string) || 'Conta Depósito Manual',
    bank_account_type: (rec.bank_account_type as string) || 'Conta Corrente',

    driver_bank_name: (rec.driver_bank_name as string) || '',
    driver_bank_agency: (rec.driver_bank_agency as string) || '',
    driver_bank_account: (rec.driver_bank_account as string) || '',
    driver_bank_pix_key: (rec.driver_bank_pix_key as string) || '',
    driver_bank_payment_method: (rec.driver_bank_payment_method as string) || '',
    driver_bank_account_type: (rec.driver_bank_account_type as string) || '',
    observations_to_accredited: (rec.observations_to_accredited as string) || '',

    driver_name: (rec.driver_name as string) || '',
    driver_cpf: (rec.driver_cpf as string) || '',
    driver_cnh: (rec.driver_cnh as string) || '',
    driver_phone: (rec.driver_phone as string) || '',

    vehicle_plate: (rec.vehicle_plate as string) || '',
    trailer_plate: (rec.trailer_plate as string) || '',
    trailer_plate_2: (rec.trailer_plate_2 as string) || '',
    trailer_plate_3: (rec.trailer_plate_3 as string) || '',
    vehicle_model: (rec.vehicle_model as string) || '',
    axles_count: Number(rec.axles_count) || 6,
    vehicle_category:
      (rec.vehicle_category as string) ||
      'Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 9 eixos - rod. dupla )',
    vehicle_owner_code: (rec.vehicle_owner_code as string) || '',
    vehicle_owner_name: (rec.vehicle_owner_name as string) || '',
    vehicle_owner_doc: (rec.vehicle_owner_doc as string) || '',

    cargo_type: (rec.cargo_type as string) || '',
    cargo_weight_kg: Number(rec.cargo_weight_kg) || 0,
    cargo_value: Number(rec.cargo_value) || 0,
    nfe_number: (rec.nfe_number as string) || '',
    nfe_key: (rec.nfe_key as string) || '',

    origin_city: (rec.origin_city as string) || '',
    origin_state: (rec.origin_state as string) || '',
    destination_city: (rec.destination_city as string) || '',
    destination_state: (rec.destination_state as string) || '',
    distance_km: Number(rec.distance_km) || 0,
    route_highways: (rec.route_highways as string) || '',
    pickup_address: (rec.pickup_address as string) || '',
    delivery_address: (rec.delivery_address as string) || '',

    freight_value: Number(rec.freight_value) || 0,
    minimum_floor_value: Number(rec.minimum_floor_value) || 0,
    minimum_floor_table_version: (rec.minimum_floor_table_version as string) || '',
    minimum_floor_status: (rec.minimum_floor_status as string) || '',
    payment_terms: (rec.payment_terms as string) || '',
    advance_payment_value: Number(rec.advance_payment_value) || 0,
    balance_payment_value: Number(rec.balance_payment_value) || 0,
    vpo_value: Number(rec.vpo_value) || 0,
    vpo_voucher_number: (rec.vpo_voucher_number as string) || '',
    vpo_responsible: (rec.vpo_responsible as string) || '',

    insurance_policy_number: (rec.insurance_policy_number as string) || '',
    insurance_averbacao_protocol: (rec.insurance_averbacao_protocol as string) || '',

    clauses_snapshot: parsedClauses,
    law_observations: (rec.law_observations as string) || '',
    complementary_observations: (rec.complementary_observations as string) || '',
    responsibilities_text: (rec.responsibilities_text as string) || '',
    penalty_terms_text: (rec.penalty_terms_text as string) || '',
    jurisdiction: (rec.jurisdiction as string) || '',

    service_prices_json: parseJsonField(rec.service_prices_json),
    contracted_services_json: parseJsonField(rec.contracted_services_json),
    operational_costs_json: parseJsonField(rec.operational_costs_json),
    fueling_records_json: parseJsonField(rec.fueling_records_json),
    installments_json: parseJsonField(rec.installments_json),
    item_dispatches_json: parseJsonField(rec.item_dispatches_json),
    ciot_rectification_json: parseJsonField(rec.ciot_rectification_json),

    signature_status:
      (rec.signature_status as TransportContract['signature_status']) || 'aguardando_configuracao',
    signature_provider: (rec.signature_provider as string) || '',
    signature_document_id: (rec.signature_document_id as string) || '',
    signature_url: (rec.signature_url as string) || '',
    signed_at: (rec.signed_at as string) || '',
    signed_by_carrier_at: (rec.signed_by_carrier_at as string) || '',
    signed_by_contractor_at: (rec.signed_by_contractor_at as string) || '',

    generated_by: (rec.generated_by as string) || '',
    generated_at: (rec.generated_at as string) || '',
    version: Number(rec.version) || 1,
    created: rec.created as string,
    updated: rec.updated as string,
  }
}

/**
 * Busca todos os contratos CTRB
 */
export async function getAllContracts(): Promise<TransportContract[]> {
  try {
    const records = await pb.collection('transport_contracts').getFullList({
      sort: '-contract_number,-created',
      expand: 'trip_id,template_id',
    })
    return records.map((r) => mapContractRecord(r as unknown as Record<string, unknown>))
  } catch (err) {
    console.error('[contractService:getAllContracts] Erro:', err)
    return []
  }
}

/**
 * Busca o contrato CTRB por ID
 */
export async function getContractById(contractId: string): Promise<TransportContract | null> {
  try {
    const rec = await pb.collection('transport_contracts').getOne(contractId, {
      expand: 'trip_id,template_id',
    })
    return mapContractRecord(rec as unknown as Record<string, unknown>)
  } catch (err) {
    console.error('[contractService:getContractById] Erro:', err)
    return null
  }
}

/**
 * Busca o contrato CTRB por Número (ex. 97316 ou CTRB-2026-0001)
 */
export async function getContractByNumber(
  contractNumber: string,
): Promise<TransportContract | null> {
  try {
    const records = await pb.collection('transport_contracts').getList(1, 1, {
      filter: `contract_number = "${contractNumber}"`,
      expand: 'trip_id,template_id',
    })
    if (records.items.length === 0) return null
    return mapContractRecord(records.items[0] as unknown as Record<string, unknown>)
  } catch (err) {
    console.error('[contractService:getContractByNumber] Erro:', err)
    return null
  }
}

/**
 * Busca o contrato CTRB vinculado a uma Ordem de Transporte (trip_id)
 */
export async function getContractByTripId(tripId: string): Promise<TransportContract | null> {
  try {
    const records = await pb.collection('transport_contracts').getList(1, 1, {
      filter: `trip_id = "${tripId}"`,
      sort: '-created',
      expand: 'trip_id,template_id',
    })
    if (records.items.length === 0) return null
    return mapContractRecord(records.items[0] as unknown as Record<string, unknown>)
  } catch (err) {
    console.error('[contractService:getContractByTripId] Erro:', err)
    return null
  }
}

/**
 * Salva (cria ou atualiza) um contrato CTRB diretamente da tela "Lançamento CTRB"
 */
export async function saveContract(
  contract: Partial<TransportContract>,
): Promise<TransportContract> {
  const serializeIfObject = (val: unknown) => {
    if (val === undefined || val === null) return undefined
    if (typeof val === 'object') return JSON.stringify(val)
    return val
  }

  const payload: Record<string, unknown> = {
    trip_id: contract.trip_id,
    template_id: contract.template_id || null,
    contract_number: contract.contract_number,
    operation_number: contract.operation_number,
    trip_code: contract.trip_code,
    status: contract.status || 'emitido',

    filial: contract.filial || 'COOPROVES GO',
    fleet_type: contract.fleet_type || 'Não Própria',
    operation_type: contract.operation_type || 'Carga Lotação',
    service_type: contract.service_type || 'transporte geral',
    tax_regime: contract.tax_regime || 'Pessoa Física',
    contractor_code: contract.contractor_code || '2049',
    contracted_carrier_code: contract.contracted_carrier_code || '865',
    driver_code: contract.driver_code || '13199',

    series: contract.series || '1',
    ciot_number: contract.ciot_number || '',
    fiscal_operation: contract.fiscal_operation || 'Entrada de Contrato de Transporte',
    quick_charge: contract.quick_charge || '',
    issue_date: contract.issue_date || new Date().toISOString(),
    departure_date: contract.departure_date || null,
    end_date: contract.end_date || null,
    advance_due_date: contract.advance_due_date || null,
    balance_due_date: contract.balance_due_date || null,
    responsible_collaborator: contract.responsible_collaborator || '',
    no_tax_calc: Boolean(contract.no_tax_calc),

    integrator_name: contract.integrator_name || 'PX Bank',
    integrator_status: contract.integrator_status || 'Aguardando configuração',

    contractor_name: contract.contractor_name,
    contractor_document: contract.contractor_document,
    contractor_rntrc: contract.contractor_rntrc,
    contractor_address: contract.contractor_address,

    contracted_carrier_name: contract.contracted_carrier_name,
    contracted_carrier_document: contract.contracted_carrier_document,
    contracted_carrier_rntrc: contract.contracted_carrier_rntrc,
    carrier_profile: contract.carrier_profile || 'tac_equiparado',
    carrier_address: contract.carrier_address,
    carrier_phone: contract.carrier_phone,

    bank_name: contract.bank_name,
    bank_agency: contract.bank_agency,
    bank_account: contract.bank_account,
    bank_pix_key: contract.bank_pix_key,
    bank_beneficiary_name: contract.bank_beneficiary_name,
    bank_beneficiary_doc: contract.bank_beneficiary_doc,
    bank_payment_method: contract.bank_payment_method || 'Conta Depósito Manual',
    bank_account_type: contract.bank_account_type || 'Conta Corrente',

    driver_bank_name: contract.driver_bank_name || '',
    driver_bank_agency: contract.driver_bank_agency || '',
    driver_bank_account: contract.driver_bank_account || '',
    driver_bank_pix_key: contract.driver_bank_pix_key || '',
    driver_bank_payment_method: contract.driver_bank_payment_method || '',
    driver_bank_account_type: contract.driver_bank_account_type || '',
    observations_to_accredited: contract.observations_to_accredited || '',

    driver_name: contract.driver_name,
    driver_cpf: contract.driver_cpf,
    driver_cnh: contract.driver_cnh,
    driver_phone: contract.driver_phone,

    vehicle_plate: contract.vehicle_plate,
    trailer_plate: contract.trailer_plate,
    trailer_plate_2: contract.trailer_plate_2,
    trailer_plate_3: contract.trailer_plate_3,
    vehicle_model: contract.vehicle_model,
    axles_count: contract.axles_count || 6,
    vehicle_category: contract.vehicle_category,
    vehicle_owner_code: contract.vehicle_owner_code,
    vehicle_owner_name: contract.vehicle_owner_name,
    vehicle_owner_doc: contract.vehicle_owner_doc,

    cargo_type: contract.cargo_type,
    cargo_weight_kg: contract.cargo_weight_kg || 0,
    cargo_value: contract.cargo_value || 0,
    nfe_number: contract.nfe_number,
    nfe_key: contract.nfe_key,

    origin_city: contract.origin_city,
    origin_state: contract.origin_state,
    destination_city: contract.destination_city,
    destination_state: contract.destination_state,
    distance_km: contract.distance_km || 0,
    route_highways: contract.route_highways,
    pickup_address: contract.pickup_address,
    delivery_address: contract.delivery_address,

    freight_value: contract.freight_value || 0,
    minimum_floor_value: contract.minimum_floor_value || 0,
    minimum_floor_table_version: contract.minimum_floor_table_version,
    minimum_floor_status: contract.minimum_floor_status,
    payment_terms: contract.payment_terms,
    advance_payment_value: contract.advance_payment_value || 0,
    balance_payment_value: contract.balance_payment_value || 0,
    vpo_value: contract.vpo_value || 0,
    vpo_voucher_number: contract.vpo_voucher_number,
    vpo_responsible: contract.vpo_responsible,

    insurance_policy_number: contract.insurance_policy_number,
    insurance_averbacao_protocol: contract.insurance_averbacao_protocol,

    clauses_snapshot: serializeIfObject(contract.clauses_snapshot),
    law_observations: contract.law_observations,
    complementary_observations: contract.complementary_observations,
    responsibilities_text: contract.responsibilities_text,
    penalty_terms_text: contract.penalty_terms_text,
    jurisdiction: contract.jurisdiction,

    service_prices_json: serializeIfObject(contract.service_prices_json),
    contracted_services_json: serializeIfObject(contract.contracted_services_json),
    operational_costs_json: serializeIfObject(contract.operational_costs_json),
    fueling_records_json: serializeIfObject(contract.fueling_records_json),
    installments_json: serializeIfObject(contract.installments_json),
    item_dispatches_json: serializeIfObject(contract.item_dispatches_json),
    ciot_rectification_json: serializeIfObject(contract.ciot_rectification_json),

    signature_status: contract.signature_status || 'aguardando_configuracao',
    signature_provider: contract.signature_provider,
    signature_document_id: contract.signature_document_id,
    signature_url: contract.signature_url,
    version: (contract.version || 1) + (contract.id ? 1 : 0),
  }

  // Remove campos undefined
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k]
  })

  let rec
  const isUpdate = Boolean(contract.id)
  if (contract.id) {
    rec = await pb.collection('transport_contracts').update(contract.id, payload)
  } else {
    // Gerar número de CTRB se não informado
    if (!payload.contract_number) {
      const year = new Date().getFullYear()
      const rand = Math.floor(10000 + Math.random() * 90000)
      payload.contract_number = `${rand}`
      payload.series = '1'
    }
    rec = await pb.collection('transport_contracts').create(payload)
  }

  // Trilha de Auditoria
  try {
    await pb.collection('audit_logs').create({
      actor_name: pb.authStore.record?.name || 'Operador CTRB',
      actor_email: pb.authStore.record?.email || 'operador@transconnect.local',
      actor_id: pb.authStore.record?.id || '',
      action: isUpdate ? 'ctrb_save' : 'ctrb_create',
      description: `${isUpdate ? 'Atualização' : 'Criação'} do CTRB nº ${rec.contract_number} (Contratado: ${rec.contracted_carrier_name || 'N/A'}).`,
      details: JSON.stringify({
        contractId: rec.id,
        contractNumber: rec.contract_number,
        tripId: rec.trip_id,
        freightValue: rec.freight_value,
      }),
    })
  } catch {
    /* intentionally ignored */
  }

  return mapContractRecord(rec as unknown as Record<string, unknown>)
}

/**
 * Exclui um contrato CTRB com registro na auditoria
 */
export async function deleteContract(contractId: string): Promise<boolean> {
  try {
    const contract = await pb.collection('transport_contracts').getOne(contractId)
    await pb.collection('transport_contracts').delete(contractId)

    // Auditoria
    try {
      await pb.collection('audit_logs').create({
        actor_name: pb.authStore.record?.name || 'Operador CTRB',
        actor_email: pb.authStore.record?.email || 'operador@transconnect.local',
        actor_id: pb.authStore.record?.id || '',
        action: 'ctrb_delete',
        description: `Exclusão do Contrato CTRB nº ${contract.contract_number} (ID: ${contractId}).`,
        details: JSON.stringify({
          contractId,
          contractNumber: contract.contract_number,
          tripId: contract.trip_id,
        }),
      })
    } catch {
      /* ignore */
    }

    return true
  } catch (err) {
    console.error('[contractService:deleteContract] Erro:', err)
    return false
  }
}

/**
 * Anexos do Contrato: Lista anexos
 */
export async function getContractAttachments(contractId: string): Promise<ContractAttachment[]> {
  try {
    const records = await pb.collection('contract_attachments').getFullList({
      filter: `contract_id = "${contractId}"`,
      sort: '-created',
    })
    return records.map((r) => ({
      id: r.id,
      contract_id: r.contract_id,
      file_name: r.file_name,
      document_type: r.document_type || 'Outro',
      description: r.description || '',
      file: r.file ? pb.files.getURL(r, r.file) : undefined,
      file_size: r.file_size || 0,
      uploaded_by: r.uploaded_by || '',
      created: r.created,
      updated: r.updated,
    }))
  } catch (err) {
    console.error('[contractService:getContractAttachments] Erro:', err)
    return []
  }
}

/**
 * Anexos do Contrato: Upload de novo anexo
 */
export async function uploadContractAttachment(
  contractId: string,
  file: File,
  documentType: string = 'Outro',
  description: string = '',
): Promise<ContractAttachment | null> {
  try {
    const formData = new FormData()
    formData.append('contract_id', contractId)
    formData.append('file_name', file.name)
    formData.append('document_type', documentType)
    formData.append('description', description)
    formData.append('file_size', String(file.size))
    formData.append(
      'uploaded_by',
      pb.authStore.record?.name || pb.authStore.record?.email || 'Operador',
    )
    formData.append('file', file)

    const record = await pb.collection('contract_attachments').create(formData)

    // Trilha de auditoria
    try {
      await pb.collection('audit_logs').create({
        actor_name: pb.authStore.record?.name || 'Operador CTRB',
        actor_email: pb.authStore.record?.email || 'operador@transconnect.local',
        actor_id: pb.authStore.record?.id || '',
        action: 'ctrb_attach_doc',
        description: `Upload de documento anexo "${file.name}" para o CTRB ID ${contractId}.`,
        details: JSON.stringify({
          contractId,
          fileName: file.name,
          documentType,
          fileSize: file.size,
        }),
      })
    } catch {
      /* ignore */
    }

    return {
      id: record.id,
      contract_id: record.contract_id,
      file_name: record.file_name,
      document_type: record.document_type,
      description: record.description,
      file: record.file ? pb.files.getURL(record, record.file) : undefined,
      file_size: record.file_size,
      uploaded_by: record.uploaded_by,
      created: record.created,
      updated: record.updated,
    }
  } catch (err) {
    console.error('[contractService:uploadContractAttachment] Erro:', err)
    return null
  }
}

/**
 * Anexos do Contrato: Remove um anexo
 */
export async function deleteContractAttachment(attachmentId: string): Promise<boolean> {
  try {
    const att = await pb.collection('contract_attachments').getOne(attachmentId)
    await pb.collection('contract_attachments').delete(attachmentId)

    try {
      await pb.collection('audit_logs').create({
        actor_name: pb.authStore.record?.name || 'Operador CTRB',
        actor_email: pb.authStore.record?.email || 'operador@transconnect.local',
        actor_id: pb.authStore.record?.id || '',
        action: 'ctrb_delete_doc',
        description: `Remoção do anexo "${att.file_name}" do CTRB ID ${att.contract_id}.`,
        details: JSON.stringify({ attachmentId, fileName: att.file_name }),
      })
    } catch {
      /* ignore */
    }

    return true
  } catch (err) {
    console.error('[contractService:deleteContractAttachment] Erro:', err)
    return false
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
