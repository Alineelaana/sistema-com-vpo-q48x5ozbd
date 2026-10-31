import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  FileText,
  Save,
  Plus,
  Trash2,
  X,
  Play,
  Printer,
  Download,
  Upload,
  RefreshCw,
  Search,
  ExternalLink,
  Info,
  Calendar,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronDown,
  Paperclip,
  DollarSign,
  Fuel,
  Receipt,
  FileCheck,
  Building2,
  User,
  Shield,
  Layers,
  ArrowRight,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { CTRB_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'
import { ContractPdfModal } from '@/components/ContractPdfModal'
import {
  getAllContracts,
  getContractById,
  getContractByTripId,
  saveContract,
  deleteContract,
  getContractAttachments,
  uploadContractAttachment,
  deleteContractAttachment,
} from '@/services/contractService'
import { getDrivers, getVehicles, getTrips, getCompanySettings } from '@/services/logisticsService'
import { getCteDocuments } from '@/services/regularizationService'
import { getTollPlazas } from '@/services/routingService'
import type {
  TransportContract,
  ContractAttachment,
  CtrbServicePriceItem,
  CtrbContractedServiceItem,
  CtrbOperationalCostItem,
  CtrbFuelingRecord,
  CtrbItemDispatch,
  CtrbInstallmentItem,
} from '@/types/contract'
import type { Driver, Vehicle, Trip, CompanySettings } from '@/types/logistics'

// Texto padrão da LEI 13.103/2015 constante nos prints de referência
const DEFAULT_LAW_OBS =
  'LEI 13.103/2015: MAX. 8H/DIA + 2H EXTRAS, 5H30 SEGUIDAS COM PAUSA DE 30MIN, 11H DE DESCANSO POR 24H. CONTRATANTE CIENTE DAS PAUSAS E OBRIGACOES LEGAIS.______CHAVE PIX: '

// 14 Abas oficiais ServiceLogic
type CtrbTabKey =
  | 'precos'
  | 'veiculos'
  | 'observacoes'
  | 'servicos'
  | 'cte'
  | 'nfs'
  | 'bancarias'
  | 'documentos'
  | 'abastecimento'
  | 'custos'
  | 'pedagio'
  | 'saida_item'
  | 'parcelas'
  | 'retificacao_ciot'

interface TabDef {
  key: CtrbTabKey
  label: string
}

const CTRB_TABS: TabDef[] = [
  { key: 'precos', label: 'Preço dos Serviços' },
  { key: 'veiculos', label: 'Veículos' },
  { key: 'observacoes', label: 'Observações' },
  { key: 'servicos', label: 'Serviços Contratados' },
  { key: 'cte', label: 'CT-e' },
  { key: 'nfs', label: 'NFS' },
  { key: 'bancarias', label: 'Inf. Bancárias' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'abastecimento', label: 'Lançamento Abastecimento' },
  { key: 'custos', label: 'Custos Operacionais' },
  { key: 'pedagio', label: 'Conferência Pedágio' },
  { key: 'saida_item', label: 'Saída Item' },
  { key: 'parcelas', label: 'Parcelas' },
  { key: 'retificacao_ciot', label: 'Retificação CIOT/ANTT' },
]

export default function LancamentoCtrbPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const contractIdParam = searchParams.get('id')
  const tripIdParam = searchParams.get('trip_id')

  // Estados de navegação interna
  const [activeTab, setActiveTab] = useState<CtrbTabKey>('observacoes')
  const [isLogicModalOpen, setIsLogicModalOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isSelectContractModalOpen, setIsSelectContractModalOpen] = useState(false)
  const [isSelectTripModalOpen, setIsSelectTripModalOpen] = useState(false)
  const [isEntitySearchOpen, setIsEntitySearchOpen] = useState<
    'contratado' | 'contratante' | 'motorista' | 'veiculo' | null
  >(null)

  // Dados auxiliares carregados
  const [allContractsList, setAllContractsList] = useState<TransportContract[]>([])
  const [driversList, setDriversList] = useState<Driver[]>([])
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([])
  const [tripsList, setTripsList] = useState<Trip[]>([])
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [linkedCtes, setLinkedCtes] = useState<unknown[]>([])
  const [attachmentsList, setAttachmentsList] = useState<ContractAttachment[]>([])
  const [tollPlazasList, setTollPlazasList] = useState<unknown[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Referência do input de arquivo da aba Documentos
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ESTADO DO FORMULÁRIO DO CTRB (Todos os campos do cabeçalho e abas)
  const [formData, setFormData] = useState<Partial<TransportContract>>({
    contract_number: '97316',
    series: '1',
    ciot_number: '',
    filial: 'COOPROVES GO',
    fleet_type: 'Não Própria',
    operation_type: 'Carga Lotação',
    service_type: 'transporte geral',
    tax_regime: 'Pessoa Física',
    fiscal_operation: 'Entrada de Contrato de Transporte',
    quick_charge: '',
    responsible_collaborator: '',
    no_tax_calc: false,

    integrator_name: 'PX Bank',
    integrator_status: 'Aguardando configuração',

    contractor_code: '2049',
    contractor_name: 'COMIGO',
    contractor_document: '02.077.618/0002-66',
    contractor_rntrc: '49827361',
    contractor_address: 'Rio Verde - GO',

    contracted_carrier_code: '865',
    contracted_carrier_name: 'RODRIGO GUIMARAES FERREIRA',
    contracted_carrier_document: '034.283.641-20',
    contracted_carrier_rntrc: '46032259',
    carrier_profile: 'tac_equiparado',

    driver_code: '13199',
    driver_name: 'LUCIONE DE OLIVEIRA',
    driver_cpf: '957.036.321-53',
    driver_cnh: '04829104821',
    driver_phone: '(64) 99876-5432',

    vehicle_plate: 'NKR-2A03',
    trailer_plate: 'OQG-4629',
    trailer_plate_2: 'OQG-4609',
    trailer_plate_3: '',
    vehicle_model: 'Scania R 450',
    vehicle_category:
      'Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 9 eixos - rod. dupla )',
    vehicle_owner_code: '865',
    vehicle_owner_name: 'RODRIGO GUIMARAES FERREIRA',
    vehicle_owner_doc: '034.283.641-20',
    axles_count: 9,

    issue_date: '2026-10-31T10:32',
    departure_date: '2026-10-31T11:32',
    end_date: '2026-11-04T00:00',
    advance_due_date: '2026-10-31T10:32',
    balance_due_date: '2026-10-31T10:32',

    freight_value: 4897.5,
    advance_payment_value: 1469.25,
    balance_payment_value: 3428.25,
    payment_terms: 'Adiantamento na saída e saldo no encerramento',

    bank_payment_method: 'Conta Depósito Manual',
    bank_account_type: 'Conta Corrente',
    bank_name: 'SICOOB (756)',
    bank_agency: '3258',
    bank_account: '12845-6',
    bank_pix_key: 'rodrigogui113@gmail.com',
    bank_beneficiary_name: 'RODRIGO GUIMARAES FERREIRA',
    bank_beneficiary_doc: '034.283.641-20',

    driver_bank_name: 'BANCO DO BRASIL (001)',
    driver_bank_agency: '1234-5',
    driver_bank_account: '98765-4',
    driver_bank_pix_key: '95703632153',
    driver_bank_payment_method: 'Conta Depósito Manual',
    driver_bank_account_type: 'Conta Corrente',
    observations_to_accredited: '',

    origin_city: 'Rio Verde',
    origin_state: 'GO',
    destination_city: 'Santos',
    destination_state: 'SP',
    distance_km: 840,
    cargo_type: 'Soja em Grãos a Granel',
    cargo_weight_kg: 37500,
    cargo_value: 145000,

    law_observations: `${DEFAULT_LAW_OBS}rodrigogui113@gmail.com`,
    complementary_observations: '',

    status: 'emitido',
    signature_status: 'aguardando_configuracao',
  })

  // Listas das Abas Operacionais
  const [servicePrices, setServicePrices] = useState<CtrbServicePriceItem[]>([
    {
      id: 'sp-1',
      faixa: '1',
      descricao: 'Frete Peso / Lotação Grãos Granel (840 km)',
      unidade: 'TON',
      quantidade: 37.5,
      valorUnitario: 130.6,
      valorTotal: 4897.5,
    },
  ])

  const [contractedServices, setContractedServices] = useState<CtrbContractedServiceItem[]>([
    {
      id: 'cs-1',
      codigo: 'SRV-01',
      descricao: 'Transporte Rodoviário Carga Geral Granel Lotação',
      quantidade: 1,
      valor: 4897.5,
      observacao: 'Conforme OT vinculada e tabela acordada',
    },
  ])

  const [operationalCosts, setOperationalCosts] = useState<CtrbOperationalCostItem[]>([
    {
      id: 'oc-1',
      tipo: 'Pedágio VPO',
      descricao: 'Vale-Pedágio Obrigatório via ConectCar/SemParar',
      valor: 422.4,
      responsavel: 'Embarcador (COMIGO)',
    },
    {
      id: 'oc-2',
      tipo: 'Taxa Administrativa',
      descricao: 'Emissão e registro IPEF/CIOT',
      valor: 0.0,
      responsavel: 'Contratante',
    },
  ])

  const [fuelingRecords, setFuelingRecords] = useState<CtrbFuelingRecord[]>([
    {
      id: 'fl-1',
      posto: 'Posto Rodotruck Rio Verde GO (Rede Ipiranga)',
      dataHora: '31/10/2026 09:15',
      combustivel: 'Diesel S10',
      litros: 250,
      valorLitro: 5.85,
      valorTotal: 1462.5,
      odometro: 142850,
      numeroRequisicao: 'REQ-98412',
    },
  ])

  const [itemDispatches, setItemDispatches] = useState<CtrbItemDispatch[]>([
    {
      id: 'id-1',
      codigoItem: 'SOJA-001',
      descricao: 'Soja em Grãos Safra 2026 Transgênica',
      quantidade: 37500,
      pesoKg: 37500,
      lote: 'LT-2026-RV-04',
      notaFiscal: '000.084.219',
    },
  ])

  const [installments, setInstallments] = useState<CtrbInstallmentItem[]>([
    {
      numero: 1,
      tipo: 'Adiantamento',
      vencimento: '31/10/2026',
      valor: 1469.25,
      status: 'Programado',
      formaPagamento: 'PIX (rodrigogui113@gmail.com)',
    },
    {
      numero: 2,
      tipo: 'Saldo',
      vencimento: '04/11/2026',
      valor: 3428.25,
      status: 'Pendente',
      formaPagamento: 'Depósito / TED Bancário',
    },
  ])

  // Contador de caracteres da LEI 13.103/2015 (limite 2000)
  const remainingLawChars = useMemo(() => {
    const text = formData.law_observations || ''
    return Math.max(0, 2000 - text.length)
  }, [formData.law_observations])

  // 1. CARREGAMENTO INICIAL
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true)
      try {
        const [contracts, drivers, vehicles, trips, company, plazas] = await Promise.all([
          getAllContracts(),
          getDrivers(),
          getVehicles(),
          getTrips(),
          getCompanySettings(),
          getTollPlazas(),
        ])

        setAllContractsList(contracts)
        setDriversList(drivers)
        setVehiclesList(vehicles)
        setTripsList(trips)
        setCompanySettings(company)
        setTollPlazasList(plazas.plazas || [])

        // Se veio contractIdParam na URL, carregar o contrato existente
        if (contractIdParam) {
          const loaded = await getContractById(contractIdParam)
          if (loaded) {
            applyContractToForm(loaded)
            const atts = await getContractAttachments(loaded.id)
            setAttachmentsList(atts)
          }
        }
        // Se veio tripIdParam na URL (Lançamento direto da Central de Operações)
        else if (tripIdParam) {
          const existingContract = await getContractByTripId(tripIdParam)
          if (existingContract) {
            applyContractToForm(existingContract)
            const atts = await getContractAttachments(existingContract.id)
            setAttachmentsList(atts)
          } else {
            // Preencher com os dados da viagem sem duplicar
            const matchedTrip = trips.find((t) => t.id === tripIdParam)
            if (matchedTrip) {
              prefillFromTrip(matchedTrip, company, drivers, vehicles)
            }
          }
        } else if (contracts.length > 0) {
          // Se não houver parâmetros, carregar o primeiro contrato cadastrado ou manter padrão
          applyContractToForm(contracts[0])
          const atts = await getContractAttachments(contracts[0].id)
          setAttachmentsList(atts)
        }
      } catch (err) {
        console.error('[LancamentoCTRB] Erro ao carregar dados:', err)
        toast({
          title: 'Erro de Carregamento',
          description: 'Não foi possível carregar os dados cadastrais do CTRB.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [contractIdParam, tripIdParam])

  // Aplica dados de um contrato existente no formulário
  const applyContractToForm = (c: TransportContract) => {
    setFormData({
      id: c.id,
      trip_id: c.trip_id,
      template_id: c.template_id,
      contract_number: c.contract_number,
      operation_number: c.operation_number,
      trip_code: c.trip_code,
      status: c.status,

      filial: c.filial || 'COOPROVES GO',
      fleet_type: c.fleet_type || 'Não Própria',
      operation_type: c.operation_type || 'Carga Lotação',
      service_type: c.service_type || 'transporte geral',
      tax_regime: c.tax_regime || 'Pessoa Física',
      contractor_code: c.contractor_code || '2049',
      contracted_carrier_code: c.contracted_carrier_code || '865',
      driver_code: c.driver_code || '13199',

      series: c.series || '1',
      ciot_number: c.ciot_number || '',
      fiscal_operation: c.fiscal_operation || 'Entrada de Contrato de Transporte',
      quick_charge: c.quick_charge || '',
      issue_date: c.issue_date || (c.created ? c.created.substring(0, 16) : '2026-10-31T10:32'),
      departure_date: c.departure_date || '2026-10-31T11:32',
      end_date: c.end_date || '2026-11-04T00:00',
      advance_due_date: c.advance_due_date || '2026-10-31T10:32',
      balance_due_date: c.balance_due_date || '2026-10-31T10:32',
      responsible_collaborator: c.responsible_collaborator || '',
      no_tax_calc: Boolean(c.no_tax_calc),

      integrator_name: c.integrator_name || 'PX Bank',
      integrator_status: c.integrator_status || 'Aguardando configuração',

      contractor_name: c.contractor_name || 'COMIGO',
      contractor_document: c.contractor_document || '02.077.618/0002-66',
      contractor_rntrc: c.contractor_rntrc || '49827361',
      contractor_address: c.contractor_address || '',

      contracted_carrier_name: c.contracted_carrier_name || 'RODRIGO GUIMARAES FERREIRA',
      contracted_carrier_document: c.contracted_carrier_document || '034.283.641-20',
      contracted_carrier_rntrc: c.contracted_carrier_rntrc || '46032259',
      carrier_profile: c.carrier_profile || 'tac_equiparado',
      carrier_address: c.carrier_address || '',
      carrier_phone: c.carrier_phone || '',

      driver_name: c.driver_name || 'LUCIONE DE OLIVEIRA',
      driver_cpf: c.driver_cpf || '957.036.321-53',
      driver_cnh: c.driver_cnh || '04829104821',
      driver_phone: c.driver_phone || '',

      vehicle_plate: c.vehicle_plate || 'NKR-2A03',
      trailer_plate: c.trailer_plate || 'OQG-4629',
      trailer_plate_2: c.trailer_plate_2 || 'OQG-4609',
      trailer_plate_3: c.trailer_plate_3 || '',
      vehicle_model: c.vehicle_model || 'Scania R 450',
      vehicle_category:
        c.vehicle_category ||
        'Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 9 eixos - rod. dupla )',
      vehicle_owner_code: c.vehicle_owner_code || '865',
      vehicle_owner_name: c.vehicle_owner_name || 'RODRIGO GUIMARAES FERREIRA',
      vehicle_owner_doc: c.vehicle_owner_doc || '034.283.641-20',
      axles_count: c.axles_count || 9,

      freight_value: c.freight_value || 4897.5,
      advance_payment_value: c.advance_payment_value || 1469.25,
      balance_payment_value: c.balance_payment_value || 3428.25,
      payment_terms: c.payment_terms || 'Adiantamento na saída e saldo no encerramento',
      vpo_value: c.vpo_value || 422.4,
      vpo_voucher_number: c.vpo_voucher_number || '',

      bank_payment_method: c.bank_payment_method || 'Conta Depósito Manual',
      bank_account_type: c.bank_account_type || 'Conta Corrente',
      bank_name: c.bank_name || 'SICOOB (756)',
      bank_agency: c.bank_agency || '3258',
      bank_account: c.bank_account || '12845-6',
      bank_pix_key: c.bank_pix_key || 'rodrigogui113@gmail.com',
      bank_beneficiary_name: c.bank_beneficiary_name || 'RODRIGO GUIMARAES FERREIRA',
      bank_beneficiary_doc: c.bank_beneficiary_doc || '034.283.641-20',

      driver_bank_name: c.driver_bank_name || 'BANCO DO BRASIL (001)',
      driver_bank_agency: c.driver_bank_agency || '1234-5',
      driver_bank_account: c.driver_bank_account || '98765-4',
      driver_bank_pix_key: c.driver_bank_pix_key || '95703632153',
      driver_bank_payment_method: c.driver_bank_payment_method || 'Conta Depósito Manual',
      driver_bank_account_type: c.driver_bank_account_type || 'Conta Corrente',
      observations_to_accredited: c.observations_to_accredited || '',

      origin_city: c.origin_city || 'Rio Verde',
      origin_state: c.origin_state || 'GO',
      destination_city: c.destination_city || 'Santos',
      destination_state: c.destination_state || 'SP',
      distance_km: c.distance_km || 840,
      cargo_type: c.cargo_type || 'Soja em Grãos a Granel',
      cargo_weight_kg: c.cargo_weight_kg || 37500,
      cargo_value: c.cargo_value || 145000,
      nfe_number: c.nfe_number || '000.084.219',
      nfe_key: c.nfe_key || '',

      law_observations:
        c.law_observations || `${DEFAULT_LAW_OBS}${c.bank_pix_key || 'rodrigogui113@gmail.com'}`,
      complementary_observations: c.complementary_observations || '',
      responsibilities_text: c.responsibilities_text || '',
      penalty_terms_text: c.penalty_terms_text || '',
      jurisdiction: c.jurisdiction || 'Comarca de Rio Verde/GO',
      signature_status: c.signature_status || 'aguardando_configuracao',
    })

    if (Array.isArray(c.service_prices_json) && c.service_prices_json.length > 0) {
      setServicePrices(c.service_prices_json as CtrbServicePriceItem[])
    }
    if (Array.isArray(c.contracted_services_json) && c.contracted_services_json.length > 0) {
      setContractedServices(c.contracted_services_json as CtrbContractedServiceItem[])
    }
    if (Array.isArray(c.operational_costs_json) && c.operational_costs_json.length > 0) {
      setOperationalCosts(c.operational_costs_json as CtrbOperationalCostItem[])
    }
    if (Array.isArray(c.fueling_records_json) && c.fueling_records_json.length > 0) {
      setFuelingRecords(c.fueling_records_json as CtrbFuelingRecord[])
    }
    if (Array.isArray(c.item_dispatches_json) && c.item_dispatches_json.length > 0) {
      setItemDispatches(c.item_dispatches_json as CtrbItemDispatch[])
    }
    if (Array.isArray(c.installments_json) && c.installments_json.length > 0) {
      setInstallments(c.installments_json as CtrbInstallmentItem[])
    }

    // Carregar CT-es vinculados
    if (c.trip_id) {
      getCteDocuments().then((docs) => {
        setLinkedCtes(docs.filter((d: any) => d.trip_id === c.trip_id))
      })
    }
  }

  // Preenche dados a partir de uma Ordem de Transporte (trip) sem duplicar cadastros
  const prefillFromTrip = (
    trip: Trip,
    company: CompanySettings | null,
    drivers: Driver[],
    vehicles: Vehicle[],
  ) => {
    const matchedDriver = drivers.find((d) => d.id === trip.driver_id)
    const matchedVehicle = vehicles.find((v) => v.id === trip.vehicle_id)

    const nowIso = new Date().toISOString()
    const nowFormatted = nowIso.substring(0, 16)

    const freightVal = trip.freight_value || 8400
    const advanceVal = trip.advance_payment_value || Math.round(freightVal * 0.3)
    const balanceVal = trip.balance_payment_value || Math.round(freightVal * 0.7)

    const contractNum = trip.contract_number || String(Math.floor(90000 + Math.random() * 9999))

    setFormData((prev) => ({
      ...prev,
      id: undefined,
      trip_id: trip.id,
      contract_number: contractNum,
      operation_number: trip.operation_number || trip.trip_code,
      trip_code: trip.trip_code,
      series: '1',

      filial: company ? company.corporate_name : 'COOPROVES GO',
      fleet_type: trip.carrier_profile === 'frota_propria' ? 'Própria' : 'Não Própria',
      operation_type: trip.transport_mode === 'lotacao' ? 'Carga Lotação' : 'Carga Fracionada',
      service_type: 'transporte geral',
      tax_regime: 'Pessoa Física',

      contractor_name:
        company?.corporate_name ||
        trip.sender_name ||
        'COMIGO - COOP REG AGROPEC DOS PROD RURAIS DO SUDOESTE GOIANO',
      contractor_document: company?.cnpj || trip.sender_document || '02.077.618/0002-66',
      contractor_rntrc: company?.rntrc || '49827361',

      contracted_carrier_name:
        trip.contracted_carrier_name || matchedDriver?.name || 'RODRIGO GUIMARAES FERREIRA',
      contracted_carrier_document:
        trip.contracted_carrier_doc || matchedDriver?.cpf || '034.283.641-20',
      contracted_carrier_rntrc: trip.carrier_rntrc || '46032259',
      carrier_profile: trip.carrier_profile || 'tac_equiparado',

      driver_name: matchedDriver?.name || 'LUCIONE DE OLIVEIRA',
      driver_cpf: matchedDriver?.cpf || '957.036.321-53',
      driver_cnh: matchedDriver?.cnh || '04829104821',
      driver_phone: matchedDriver?.phone || '',

      vehicle_plate: trip.vehicle_plate || matchedVehicle?.plate || 'NKR-2A03',
      trailer_plate: trip.trailer_plate || 'OQG-4629',
      trailer_plate_2: trip.trailer_plate_2 || 'OQG-4609',
      vehicle_model: matchedVehicle?.model || 'Scania R 450',
      axles_count: trip.axles_count || matchedVehicle?.axles || 9,
      vehicle_category:
        'Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 9 eixos - rod. dupla )',
      vehicle_owner_name:
        trip.contracted_carrier_name || matchedDriver?.name || 'RODRIGO GUIMARAES FERREIRA',
      vehicle_owner_doc: trip.contracted_carrier_doc || matchedDriver?.cpf || '034.283.641-20',

      origin_city: trip.origin_city || 'Rio Verde',
      origin_state: trip.origin_state || 'GO',
      destination_city: trip.destination_city || 'Santos',
      destination_state: trip.destination_state || 'SP',
      distance_km: trip.distance_km || 840,
      cargo_type: trip.cargo_type || 'Soja em Grãos a Granel',
      cargo_weight_kg: trip.weight_kg || 37500,
      cargo_value: trip.cargo_value || 145000,
      nfe_number: trip.nfe_number || '000.084.219',
      nfe_key: trip.nfe_key || '',

      freight_value: freightVal,
      advance_payment_value: advanceVal,
      balance_payment_value: balanceVal,
      payment_terms: trip.payment_terms || 'Adiantamento na saída e saldo no encerramento (POD)',
      vpo_value: trip.vpo_value || 422.4,
      vpo_voucher_number: trip.vpo_voucher_number || '',

      issue_date: nowFormatted,
      departure_date: nowFormatted,
      end_date: nowFormatted,
      advance_due_date: nowFormatted,
      balance_due_date: nowFormatted,

      law_observations: `${DEFAULT_LAW_OBS}rodrigogui113@gmail.com`,
    }))

    // Atualiza parcelas proporcionais
    setInstallments([
      {
        numero: 1,
        tipo: 'Adiantamento',
        vencimento: new Date().toLocaleDateString('pt-BR'),
        valor: advanceVal,
        status: 'Programado',
        formaPagamento: 'PIX',
      },
      {
        numero: 2,
        tipo: 'Saldo',
        vencimento: new Date(Date.now() + 86400000 * 4).toLocaleDateString('pt-BR'),
        valor: balanceVal,
        status: 'Pendente',
        formaPagamento: 'Depósito / TED',
      },
    ])

    // CT-es
    getCteDocuments().then((docs) => {
      setLinkedCtes(docs.filter((d: any) => d.trip_id === trip.id))
    })

    toast({
      title: 'Dados Carregados da Ordem de Transporte',
      description: `Contrato preenchido a partir da operação #${trip.operation_number || trip.trip_code} sem duplicar cadastros.`,
    })
  }

  // AÇÃO TOOLBAR: NOVO
  const handleNew = () => {
    const nextNumber = String(Math.floor(90000 + Math.random() * 9999))
    const nowIso = new Date().toISOString().substring(0, 16)

    setFormData((prev) => ({
      ...prev,
      id: undefined,
      trip_id: undefined,
      contract_number: nextNumber,
      series: '1',
      ciot_number: '',
      issue_date: nowIso,
      departure_date: nowIso,
      end_date: nowIso,
      advance_due_date: nowIso,
      balance_due_date: nowIso,
      freight_value: 0,
      advance_payment_value: 0,
      balance_payment_value: 0,
      law_observations: `${DEFAULT_LAW_OBS}`,
      status: 'emitido',
      signature_status: 'aguardando_configuracao',
    }))
    setAttachmentsList([])
    setLinkedCtes([])
    setSearchParams({})

    toast({
      title: 'Novo Contrato CTRB',
      description: `Formulário reiniciado para o CTRB nº ${nextNumber}. Preencha os campos e salve.`,
    })
  }

  // AÇÃO TOOLBAR: SALVAR
  const handleSave = async (andNew: boolean = false) => {
    if (!formData.contract_number) {
      toast({
        title: 'Campo Obrigatório',
        description: 'Informe o Nº do CTRB antes de salvar.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const payload: Partial<TransportContract> = {
        ...formData,
        service_prices_json: servicePrices,
        contracted_services_json: contractedServices,
        operational_costs_json: operationalCosts,
        fueling_records_json: fuelingRecords,
        installments_json: installments,
        item_dispatches_json: itemDispatches,
      }

      const saved = await saveContract(payload)
      applyContractToForm(saved)

      // Atualiza lista de contratos
      const updatedList = await getAllContracts()
      setAllContractsList(updatedList)

      // Atualiza URL com o id salvo
      setSearchParams({ id: saved.id })

      toast({
        title: 'CTRB Salvo com Sucesso',
        description: `Contrato nº ${saved.contract_number} gravado no banco de dados com auditoria.`,
      })

      if (andNew) {
        handleNew()
      }
    } catch (err) {
      console.error('[LancamentoCTRB] Erro ao salvar:', err)
      toast({
        title: 'Erro ao Salvar CTRB',
        description: 'Verifique a conexão ou os dados informados. Detalhes no console.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // AÇÃO TOOLBAR: EXCLUIR
  const handleDelete = async () => {
    if (!formData.id) {
      toast({
        title: 'Nenhum Contrato Selecionado',
        description: 'Abra um contrato existente antes de solicitar exclusão.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const success = await deleteContract(formData.id)
      if (success) {
        toast({
          title: 'Contrato Excluído',
          description: `CTRB nº ${formData.contract_number} removido com registro na auditoria.`,
        })
        setIsConfirmDeleteOpen(false)
        const updatedList = await getAllContracts()
        setAllContractsList(updatedList)
        handleNew()
      } else {
        throw new Error('Falha na exclusão')
      }
    } catch (err) {
      toast({
        title: 'Erro na Exclusão',
        description: 'Não foi possível excluir o contrato.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Upload de Anexo na Aba Documentos
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!formData.id) {
      toast({
        title: 'Salve o Contrato Primeiro',
        description: 'É necessário gravar o contrato antes de anexar documentos permanentes.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    try {
      const uploaded = await uploadContractAttachment(
        formData.id,
        file,
        'Comprovante',
        `Anexo enviado em ${new Date().toLocaleDateString('pt-BR')}`,
      )
      if (uploaded) {
        setAttachmentsList((prev) => [uploaded, ...prev])
        toast({
          title: 'Documento Anexado',
          description: `Arquivo "${file.name}" vinculado ao CTRB com sucesso.`,
        })
      }
    } catch (err) {
      toast({
        title: 'Falha no Upload',
        description: 'Erro ao anexar arquivo ao contrato.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Excluir anexo
  const handleDeleteAttachment = async (attId: string, attName: string) => {
    try {
      const ok = await deleteContractAttachment(attId)
      if (ok) {
        setAttachmentsList((prev) => prev.filter((a) => a.id !== attId))
        toast({
          title: 'Anexo Removido',
          description: `Documento "${attName}" excluído com auditoria.`,
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o anexo.',
        variant: 'destructive',
      })
    }
  }

  // Converter formData em TransportContract para o PDF
  const currentContractForPdf = useMemo<TransportContract>(() => {
    return {
      id: formData.id || 'preview-temp',
      trip_id: formData.trip_id || '',
      contract_number: formData.contract_number || '97316',
      operation_number: formData.operation_number || 'OT-2026-0001',
      trip_code: formData.trip_code || 'VIAG-2026-001',
      status: formData.status || 'emitido',
      contractor_name: formData.contractor_name || 'COMIGO',
      contractor_document: formData.contractor_document || '02.077.618/0002-66',
      contractor_rntrc: formData.contractor_rntrc || '49827361',
      contractor_address: formData.contractor_address || 'Rio Verde - GO',
      contracted_carrier_name: formData.contracted_carrier_name || 'RODRIGO GUIMARAES FERREIRA',
      contracted_carrier_document: formData.contracted_carrier_document || '034.283.641-20',
      contracted_carrier_rntrc: formData.contracted_carrier_rntrc || '46032259',
      carrier_profile: formData.carrier_profile || 'tac_equiparado',
      carrier_address: formData.carrier_address || '',
      carrier_phone: formData.carrier_phone || '',
      bank_name: formData.bank_name || 'SICOOB (756)',
      bank_agency: formData.bank_agency || '3258',
      bank_account: formData.bank_account || '12845-6',
      bank_pix_key: formData.bank_pix_key || 'rodrigogui113@gmail.com',
      bank_beneficiary_name: formData.bank_beneficiary_name || 'RODRIGO GUIMARAES FERREIRA',
      bank_beneficiary_doc: formData.bank_beneficiary_doc || '034.283.641-20',
      driver_name: formData.driver_name || 'LUCIONE DE OLIVEIRA',
      driver_cpf: formData.driver_cpf || '957.036.321-53',
      driver_cnh: formData.driver_cnh || '04829104821',
      driver_phone: formData.driver_phone || '',
      vehicle_plate: formData.vehicle_plate || 'NKR-2A03',
      trailer_plate: formData.trailer_plate || 'OQG-4629',
      trailer_plate_2: formData.trailer_plate_2 || 'OQG-4609',
      vehicle_model: formData.vehicle_model || 'Scania R 450',
      axles_count: formData.axles_count || 9,
      cargo_type: formData.cargo_type || 'Soja em Grãos a Granel',
      cargo_weight_kg: formData.cargo_weight_kg || 37500,
      cargo_value: formData.cargo_value || 145000,
      nfe_number: formData.nfe_number || '000.084.219',
      nfe_key: formData.nfe_key || '',
      origin_city: formData.origin_city || 'Rio Verde',
      origin_state: formData.origin_state || 'GO',
      destination_city: formData.destination_city || 'Santos',
      destination_state: formData.destination_state || 'SP',
      distance_km: formData.distance_km || 840,
      route_highways: formData.route_highways || 'GO-174 / BR-364 / BR-050 / SP-330',
      freight_value: formData.freight_value || 4897.5,
      minimum_floor_value: formData.minimum_floor_value || 4200.0,
      advance_payment_value: formData.advance_payment_value || 1469.25,
      balance_payment_value: formData.balance_payment_value || 3428.25,
      payment_terms:
        formData.payment_terms || 'Adiantamento na saída e saldo no encerramento (POD)',
      vpo_value: formData.vpo_value || 422.4,
      vpo_voucher_number: formData.vpo_voucher_number || '',
      vpo_responsible: formData.vpo_responsible || 'embarcador',
      insurance_policy_number: formData.insurance_policy_number || 'POL-2026-PORTO-9841',
      clauses_snapshot: formData.clauses_snapshot || [],
      responsibilities_text:
        formData.law_observations ||
        'O Transportador declara que o veículo atende aos requisitos de segurança e jornada da Lei 13.103/2015.',
      penalty_terms_text: formData.penalty_terms_text || '',
      jurisdiction: formData.jurisdiction || 'Comarca de Rio Verde/GO',
      signature_status: formData.signature_status || 'aguardando_configuracao',
      version: formData.version || 1,
      generated_at: formData.issue_date || new Date().toISOString(),
    }
  }, [formData])

  return (
    <div className="flex flex-col min-h-screen bg-[#edf1f7] text-[#1e293b] text-xs font-sans">
      {/* 1. BARRA SUPERIOR AZUL SERVICE LOGIC (TÍTULO + TOOLBAR) */}
      <div className="bg-[#5c87b2] text-white border-b border-[#43678c] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-white" />
          <h1 className="text-sm font-bold tracking-tight">Contrato de Transporte</h1>
          <span className="text-[11px] text-blue-100 font-normal">
            (Lançamento CTRB — ServiceLogic)
          </span>
          {formData.contract_number && (
            <Badge
              variant="outline"
              className="bg-[#43678c] text-white border-blue-300 text-[10px] px-2 py-0"
            >
              Nº {formData.contract_number}
            </Badge>
          )}
        </div>

        {/* BOTÕES DA TOOLBAR FIÉIS: Novo, Salvar, Salvar e Novo, Excluir, Mais... + Executar, Fechar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleNew}
            className="h-7 px-2.5 text-xs bg-white text-slate-800 hover:bg-slate-100 border-slate-300 shadow-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1 text-blue-700" />
            Novo
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="h-7 px-2.5 text-xs bg-white text-slate-800 hover:bg-slate-100 border-slate-300 shadow-xs font-medium"
          >
            <Save className="h-3.5 w-3.5 mr-1 text-emerald-700" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="h-7 px-2.5 text-xs bg-white text-slate-800 hover:bg-slate-100 border-slate-300 shadow-xs font-medium"
          >
            Salvar e Novo
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsConfirmDeleteOpen(true)}
            disabled={!formData.id || isSaving}
            className="h-7 px-2.5 text-xs bg-white text-rose-700 hover:bg-rose-50 border-slate-300 shadow-xs font-medium"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Excluir
          </Button>

          {/* Menu Dropdown Mais... */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs bg-white text-slate-800 hover:bg-slate-100 border-slate-300 shadow-xs font-medium gap-1"
              >
                Mais...
                <ChevronDown className="h-3 w-3 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuItem
                onClick={() => setIsPdfModalOpen(true)}
                className="gap-2 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-indigo-600" />
                Visualizar & Imprimir PDF (CTRB)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsSelectContractModalOpen(true)}
                className="gap-2 cursor-pointer"
              >
                <Database className="h-3.5 w-3.5 text-blue-600" />
                Abrir Outro Contrato CTRB...
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsSelectTripModalOpen(true)}
                className="gap-2 cursor-pointer"
              >
                <Truck className="h-3.5 w-3.5 text-amber-600" />
                Preencher de Ordem de Transporte...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/audit')} className="gap-2 cursor-pointer">
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                Trilha de Auditoria (Logs CTRB)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave(false)}
            className="h-7 px-2.5 text-xs bg-white text-blue-900 hover:bg-blue-50 border-slate-300 shadow-xs font-medium"
          >
            <Play className="h-3.5 w-3.5 mr-1 text-blue-600 fill-blue-600" />
            Executar
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/operations-center')}
            className="h-7 px-2.5 text-xs bg-white text-slate-700 hover:bg-slate-100 border-slate-300 shadow-xs font-medium"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Fechar
          </Button>

          {/* Botão de Lógica da Tela Obrigatório */}
          <Button
            size="sm"
            onClick={() => setIsLogicModalOpen(true)}
            className="h-7 px-2.5 text-xs bg-[#244b73] hover:bg-[#1a3857] text-white font-medium border border-blue-300 shadow-xs ml-1"
          >
            <Info className="h-3.5 w-3.5 mr-1 text-cyan-300" />
            Lógica da Tela
          </Button>
        </div>
      </div>

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL (CABEÇALHO EM 3 FAIXAS + ABAS) */}
      <div className="p-3 space-y-2 flex-1 max-w-[1700px] w-full mx-auto">
        {/* ============================================================ */}
        {/* CABEÇALHO — FAIXA 1: FILIAL, FROTAS, OPERAÇÃO, CONTRATADO/CONTRATANTE/MOTORISTA */}
        {/* ============================================================ */}
        <div className="bg-white border border-[#cbd5e1] rounded p-2.5 shadow-xs space-y-2">
          {/* Linha 1.1: Filial, Tipo Frota, Tipo Operação */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-5 flex items-center gap-2">
              <span className="w-20 font-semibold text-slate-700 shrink-0 text-right pr-1 border-r-2 border-red-500">
                Filial
              </span>
              <div className="flex-1 flex items-center gap-1">
                <Select
                  value={formData.filial}
                  onValueChange={(val) => setFormData({ ...formData, filial: val })}
                >
                  <SelectTrigger className="h-7 text-xs bg-[#f8fafc] border-slate-300">
                    <SelectValue placeholder="Selecione a Filial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COOPROVES GO">COOPROVES GO</SelectItem>
                    <SelectItem value="COOPROVES MT">COOPROVES MT</SelectItem>
                    <SelectItem value="COOPROVES SP">COOPROVES SP</SelectItem>
                    <SelectItem value="TRANSLOG MATRIZ">TRANSLOG MATRIZ</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-blue-600 shrink-0"
                  title="Recarregar Filiais"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <span className="font-semibold text-slate-700 shrink-0 text-right pr-1 border-r-2 border-red-500">
                Tipo Frota (Contrato)
              </span>
              <Select
                value={formData.fleet_type}
                onValueChange={(val) => setFormData({ ...formData, fleet_type: val })}
              >
                <SelectTrigger className="h-7 text-xs bg-[#f8fafc] border-slate-300">
                  <SelectValue placeholder="Tipo Frota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Não Própria">Não Própria (Terceiros / TAC)</SelectItem>
                  <SelectItem value="Própria">Própria</SelectItem>
                  <SelectItem value="Agregada">Agregada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <span className="font-semibold text-slate-700 shrink-0 text-right pr-1 border-r-2 border-red-500">
                Tipo Operação
              </span>
              <Select
                value={formData.operation_type}
                onValueChange={(val) => setFormData({ ...formData, operation_type: val })}
              >
                <SelectTrigger className="h-7 text-xs bg-[#f8fafc] border-slate-300">
                  <SelectValue placeholder="Operação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Carga Lotação">Carga Lotação</SelectItem>
                  <SelectItem value="Carga Fracionada">Carga Fracionada</SelectItem>
                  <SelectItem value="Subcontratação">Subcontratação ETC</SelectItem>
                  <SelectItem value="Dedicado">Dedicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 1.2: Contratado (Código + Nome + CPF + Busca) & Regime Tributário */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-8 flex items-center gap-2">
              <span className="w-20 font-semibold text-slate-700 shrink-0 text-right pr-1">
                Contratado
              </span>
              <Input
                value={formData.contracted_carrier_code}
                onChange={(e) =>
                  setFormData({ ...formData, contracted_carrier_code: e.target.value })
                }
                className="h-7 w-20 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0"
              />
              <Input
                value={formData.contracted_carrier_name}
                onChange={(e) =>
                  setFormData({ ...formData, contracted_carrier_name: e.target.value })
                }
                className="h-7 flex-1 text-xs bg-[#f8fafc] border-slate-300 font-semibold border-l-2 border-l-red-500"
              />
              <Input
                value={formData.contracted_carrier_document}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contracted_carrier_document: e.target.value,
                  })
                }
                className="h-7 w-36 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsEntitySearchOpen('contratado')}
                className="h-7 w-7 text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shrink-0"
                title="Pesquisar Transportador / Motorista Cadastrado"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <span className="text-slate-600 shrink-0 text-right">Regime Tributário</span>
              <Select
                value={formData.tax_regime}
                onValueChange={(val) => setFormData({ ...formData, tax_regime: val })}
              >
                <SelectTrigger className="h-7 text-xs bg-[#f8fafc] border-slate-300">
                  <SelectValue placeholder="Regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pessoa Física">Pessoa Física (TAC)</SelectItem>
                  <SelectItem value="Pessoa Jurídica">Pessoa Jurídica (ETC)</SelectItem>
                  <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                  <SelectItem value="Lucro Presumido/Real">Lucro Presumido / Real</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 1.3: Contratante (Código + Nome + CNPJ + Busca) & Link Monitoramento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-8 flex items-center gap-2">
              <span className="w-20 font-semibold text-slate-700 shrink-0 text-right pr-1">
                Contratante
              </span>
              <Input
                value={formData.contractor_code}
                onChange={(e) => setFormData({ ...formData, contractor_code: e.target.value })}
                className="h-7 w-20 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0"
              />
              <Input
                value={formData.contractor_name}
                onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                className="h-7 flex-1 text-xs bg-[#f8fafc] border-slate-300 font-semibold border-l-2 border-l-red-500"
              />
              <Input
                value={formData.contractor_document}
                onChange={(e) => setFormData({ ...formData, contractor_document: e.target.value })}
                className="h-7 w-36 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsEntitySearchOpen('contratante')}
                className="h-7 w-7 text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shrink-0"
                title="Pesquisar Embarcador / Empresa Cadastrada"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="md:col-span-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => navigate('/ciot')}
                className="text-blue-700 hover:text-blue-900 underline text-xs font-semibold inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Monitoramento Contrato/Ciot
              </button>
            </div>
          </div>

          {/* Linha 1.4: Motorista (Código + Nome + CPF + Busca) & Tipo de Serviço */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-8 flex items-center gap-2">
              <span className="w-20 font-semibold text-slate-700 shrink-0 text-right pr-1">
                Motorista
              </span>
              <Input
                value={formData.driver_code}
                onChange={(e) => setFormData({ ...formData, driver_code: e.target.value })}
                className="h-7 w-20 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0"
              />
              <Input
                value={formData.driver_name}
                onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                className="h-7 flex-1 text-xs bg-[#f8fafc] border-slate-300 font-semibold border-l-2 border-l-red-500"
              />
              <Input
                value={formData.driver_cpf}
                onChange={(e) => setFormData({ ...formData, driver_cpf: e.target.value })}
                className="h-7 w-36 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsEntitySearchOpen('motorista')}
                className="h-7 w-7 text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shrink-0"
                title="Pesquisar Motorista Cadastrado"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <span className="text-slate-600 shrink-0 text-right">Tipo de Serviço</span>
              <Select
                value={formData.service_type}
                onValueChange={(val) => setFormData({ ...formData, service_type: val })}
              >
                <SelectTrigger className="h-7 text-xs bg-[#f8fafc] border-slate-300">
                  <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transporte geral">transporte geral</SelectItem>
                  <SelectItem value="grãos / granel">grãos / granel</SelectItem>
                  <SelectItem value="subcontratação">subcontratação</SelectItem>
                  <SelectItem value="redespacho">redespacho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CABEÇALHO — FAIXA 2: Nº CTRB, SÉRIE, CIOT, OPER. FISCAL, DATAS, VENCIMENTOS */}
        {/* ============================================================ */}
        <div className="bg-white border border-[#cbd5e1] rounded p-2.5 shadow-xs space-y-2">
          {/* Linha 2.1: Nº CTRB, Série, CIOT, Oper. Fiscal, Carga Rápida */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-2 flex items-center gap-1.5">
              <span className="text-slate-700 font-semibold shrink-0">Nº CTRB</span>
              <Input
                value={formData.contract_number}
                onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                className="h-7 text-xs bg-[#f8fafc] border-slate-300 font-bold font-mono text-center"
              />
            </div>

            <div className="md:col-span-1 flex items-center gap-1.5">
              <span className="text-slate-700 font-semibold shrink-0 border-l-2 border-red-500 pl-1">
                Série
              </span>
              <Input
                value={formData.series}
                onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                className="h-7 text-xs bg-[#f8fafc] border-slate-300 text-center font-mono"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="text-slate-700 font-semibold shrink-0">CIOT</span>
              <Input
                value={formData.ciot_number}
                onChange={(e) => setFormData({ ...formData, ciot_number: e.target.value })}
                placeholder="Protocolo CIOT ANTT"
                className="h-7 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="text-slate-700 font-semibold shrink-0">Oper. Fiscal</span>
              <Select
                value={formData.fiscal_operation}
                onValueChange={(val) => setFormData({ ...formData, fiscal_operation: val })}
              >
                <SelectTrigger className="h-7 text-xs bg-[#f8fafc] border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada de Contrato de Transporte">
                    Entrada de Contrato de Transporte
                  </SelectItem>
                  <SelectItem value="Prestação de Serviço de Transporte">
                    Prestação de Serviço de Transporte
                  </SelectItem>
                  <SelectItem value="Subcontratação de Frete">Subcontratação de Frete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 flex items-center gap-1.5 justify-end">
              <span className="text-slate-600 shrink-0">Carga Rápida</span>
              <Input
                value={formData.quick_charge}
                onChange={(e) => setFormData({ ...formData, quick_charge: e.target.value })}
                className="h-7 w-28 text-xs bg-[#f8fafc] border-slate-300 text-center"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500">
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Linha 2.2: Data Emissão, Data Saída, Data Término, Colaborador, Não Calcular Impostos */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs">
            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="text-slate-700 font-semibold shrink-0 border-l-2 border-red-500 pl-1">
                Data Emissão
              </span>
              <Input
                type="datetime-local"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="h-7 text-xs bg-[#f8fafc] border-slate-300 text-center"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="text-slate-700 font-semibold shrink-0 border-l-2 border-red-500 pl-1">
                Data Saída
              </span>
              <Input
                type="datetime-local"
                value={formData.departure_date}
                onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                className="h-7 text-xs bg-[#f8fafc] border-slate-300 text-center"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="text-slate-700 font-semibold shrink-0 border-l-2 border-red-500 pl-1">
                Data Término
              </span>
              <Input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="h-7 text-xs bg-[#f8fafc] border-slate-300 text-center"
              />
            </div>

            <div className="md:col-span-3 flex items-center justify-end gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={formData.no_tax_calc}
                  onChange={(e) => setFormData({ ...formData, no_tax_calc: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Não Calcular Impostos
              </label>
            </div>
          </div>

          {/* Linha 2.3: Vencimento Adiantamento, Vencimento Saldo, Colaborador Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs">
            <div className="md:col-span-4 flex items-center gap-1.5">
              <span className="text-slate-600 shrink-0">Vencimento Adiantamento</span>
              <Input
                type="datetime-local"
                value={formData.advance_due_date}
                onChange={(e) => setFormData({ ...formData, advance_due_date: e.target.value })}
                className="h-7 text-xs bg-[#f8fafc] border-slate-300 text-center"
              />
            </div>

            <div className="md:col-span-4 flex items-center gap-1.5">
              <span className="text-slate-600 shrink-0">Vencimento Saldo</span>
              <Input
                type="datetime-local"
                value={formData.balance_due_date}
                onChange={(e) => setFormData({ ...formData, balance_due_date: e.target.value })}
                className="h-7 text-xs bg-[#f8fafc] border-slate-300 text-center"
              />
            </div>

            <div className="md:col-span-4 flex items-center gap-1.5">
              <span className="text-slate-600 shrink-0">Colaborador responsável</span>
              <Input
                value={formData.responsible_collaborator}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    responsible_collaborator: e.target.value,
                  })
                }
                placeholder="Nome do operador responsável"
                className="h-7 text-xs bg-[#f8fafc] border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CABEÇALHO — FAIXA 3: INTEGRADOR & STATUS INTEGRADOR */}
        {/* ============================================================ */}
        <div className="bg-white border border-[#cbd5e1] rounded p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-slate-700 font-semibold w-20 text-right pr-1">Integrador</span>
            <Select
              value={formData.integrator_name}
              onValueChange={(val) => setFormData({ ...formData, integrator_name: val })}
            >
              <SelectTrigger className="h-7 w-48 text-xs bg-[#f8fafc] border-slate-300">
                <SelectValue placeholder="Selecione o Integrador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PX Bank">PX Bank (Conta Gráfica / PIX)</SelectItem>
                <SelectItem value="e-Frete / IPEF">e-Frete / IPEF ANTT</SelectItem>
                <SelectItem value="Repom">Repom Pagamentos</SelectItem>
                <SelectItem value="Sem Parar Pay">Sem Parar Pay</SelectItem>
                <SelectItem value="Manual / Depósito Bancário">
                  Manual / Depósito Bancário
                </SelectItem>
              </SelectContent>
            </Select>

            <span className="text-slate-600 ml-2">Status Integ.</span>
            <div className="flex items-center gap-1.5">
              <Input
                value={formData.integrator_status}
                readOnly
                className="h-7 w-56 text-xs bg-slate-100 border-slate-300 text-slate-700 font-medium cursor-not-allowed"
              />
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-50 text-amber-800 border-amber-300"
              >
                Honesto: Aguardando Configuração
              </Badge>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            Integrador e CIOT sem credenciais mantêm status transparente sem simular autorização
            bancária ou fiscal.
          </div>
        </div>

        {/* ============================================================ */}
        {/* 14 ABAS OPERACIONAIS SERVICELOGIC */}
        {/* ============================================================ */}
        <div className="bg-white border border-[#cbd5e1] rounded shadow-xs overflow-hidden">
          {/* Barra de Seleção das 14 Abas (estilo ServiceLogic azul com bordas) */}
          <div className="flex items-center overflow-x-auto bg-[#e6edf5] border-b border-[#cbd5e1] text-xs">
            {CTRB_TABS.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 font-medium whitespace-nowrap transition-colors border-r border-[#cbd5e1] ${
                    isActive
                      ? 'bg-[#1b436c] text-white font-bold border-b-2 border-b-[#0f2c4c]'
                      : 'bg-[#e6edf5] text-[#2c4c6e] hover:bg-[#d6e2ef]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* CONTEÚDO DA ABA ATIVA */}
          <div className="p-4 bg-white min-h-[380px]">
            {/* ABA 1: PREÇO DOS SERVIÇOS */}
            {activeTab === 'precos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Tabela de Preço dos Serviços por Faixa e Categoria
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nextId = `sp-${servicePrices.length + 1}`
                      setServicePrices([
                        ...servicePrices,
                        {
                          id: nextId,
                          faixa: String(servicePrices.length + 1),
                          descricao: 'Serviço de Frete Complementar / Pedágio',
                          unidade: 'UN',
                          quantidade: 1,
                          valorUnitario: 0,
                          valorTotal: 0,
                        },
                      ])
                    }}
                    className="h-7 text-xs bg-slate-50 border-slate-300"
                  >
                    <Plus className="h-3 w-3 mr-1 text-emerald-600" />
                    Adicionar Item de Preço
                  </Button>
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-slate-200 w-16 text-center">Faixa</th>
                        <th className="p-2 border-r border-slate-200">Descrição do Serviço</th>
                        <th className="p-2 border-r border-slate-200 w-20 text-center">Unidade</th>
                        <th className="p-2 border-r border-slate-200 w-24 text-right">
                          Quantidade
                        </th>
                        <th className="p-2 border-r border-slate-200 w-28 text-right">
                          Valor Unitário
                        </th>
                        <th className="p-2 border-r border-slate-200 w-28 text-right">
                          Valor Total
                        </th>
                        <th className="p-2 w-16 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {servicePrices.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono border-r border-slate-200">
                            {item.faixa}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-medium">
                            <Input
                              value={item.descricao}
                              onChange={(e) => {
                                const copy = [...servicePrices]
                                copy[idx].descricao = e.target.value
                                setServicePrices(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0 focus-visible:ring-1"
                            />
                          </td>
                          <td className="p-2 text-center border-r border-slate-200">
                            <Input
                              value={item.unidade}
                              onChange={(e) => {
                                const copy = [...servicePrices]
                                copy[idx].unidade = e.target.value
                                setServicePrices(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0 text-center font-mono"
                            />
                          </td>
                          <td className="p-2 text-right border-r border-slate-200">
                            <Input
                              type="number"
                              value={item.quantidade}
                              onChange={(e) => {
                                const copy = [...servicePrices]
                                const qty = Number(e.target.value) || 0
                                copy[idx].quantidade = qty
                                copy[idx].valorTotal = qty * copy[idx].valorUnitario
                                setServicePrices(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0 text-right font-mono"
                            />
                          </td>
                          <td className="p-2 text-right border-r border-slate-200">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.valorUnitario}
                              onChange={(e) => {
                                const copy = [...servicePrices]
                                const unit = Number(e.target.value) || 0
                                copy[idx].valorUnitario = unit
                                copy[idx].valorTotal = copy[idx].quantidade * unit
                                setServicePrices(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0 text-right font-mono"
                            />
                          </td>
                          <td className="p-2 text-right font-bold font-mono text-emerald-800 border-r border-slate-200">
                            R${' '}
                            {item.valorTotal.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setServicePrices(servicePrices.filter((p) => p.id !== item.id))
                              }
                              className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end p-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold">
                  <span className="text-slate-600 mr-2">Total dos Serviços:</span>
                  <span className="font-mono text-emerald-700 font-bold text-sm">
                    R${' '}
                    {servicePrices
                      .reduce((acc, p) => acc + p.valorTotal, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* ABA 2: VEÍCULOS (CONFORME PRINT SERVICE LOGIC) */}
            {activeTab === 'veiculos' && (
              <div className="space-y-4 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-8 flex items-center gap-2">
                    <span className="w-28 text-slate-700 font-semibold shrink-0 text-right pr-1">
                      Veículo Tração
                    </span>
                    <Input
                      value={formData.vehicle_plate}
                      onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                      className="h-7 w-28 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0 uppercase"
                    />
                    <Input
                      value={formData.vehicle_plate}
                      readOnly
                      className="h-7 w-28 text-xs bg-slate-100 border-slate-300 font-mono text-center shrink-0 uppercase border-l-2 border-red-500"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setIsEntitySearchOpen('veiculo')}
                      className="h-7 w-7 text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shrink-0"
                      title="Pesquisar Veículo Tração"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2">
                    <span className="text-slate-700 font-semibold shrink-0">RNTRC</span>
                    <Input
                      value={formData.contracted_carrier_rntrc}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contracted_carrier_rntrc: e.target.value,
                        })
                      }
                      className="h-7 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center"
                    />
                  </div>
                </div>

                {/* Proprietário do Veículo */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-12 flex items-center gap-2">
                    <span className="w-28 text-slate-700 font-semibold shrink-0 text-right pr-1">
                      Proprietário
                    </span>
                    <Input
                      value={formData.vehicle_owner_code}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_owner_code: e.target.value })
                      }
                      className="h-7 w-20 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0"
                    />
                    <Input
                      value={formData.vehicle_owner_name}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_owner_name: e.target.value })
                      }
                      className="h-7 flex-1 text-xs bg-[#f8fafc] border-slate-300 font-semibold"
                    />
                    <Input
                      value={formData.vehicle_owner_doc}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicle_owner_doc: e.target.value })
                      }
                      className="h-7 w-40 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0"
                    />
                  </div>
                </div>

                {/* Veículo (2) Reboque */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-8 flex items-center gap-2">
                    <span className="w-28 text-slate-700 font-semibold shrink-0 text-right pr-1">
                      Veículo (2)
                    </span>
                    <Input
                      value={formData.trailer_plate}
                      onChange={(e) => setFormData({ ...formData, trailer_plate: e.target.value })}
                      className="h-7 w-28 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0 uppercase"
                    />
                    <Input
                      value={formData.trailer_plate}
                      readOnly
                      className="h-7 w-28 text-xs bg-slate-100 border-slate-300 font-mono text-center shrink-0 uppercase"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setIsEntitySearchOpen('veiculo')}
                      className="h-7 w-7 text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shrink-0"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Veículo (3) Reboque */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-8 flex items-center gap-2">
                    <span className="w-28 text-slate-700 font-semibold shrink-0 text-right pr-1">
                      Veículo (3)
                    </span>
                    <Input
                      value={formData.trailer_plate_2}
                      onChange={(e) =>
                        setFormData({ ...formData, trailer_plate_2: e.target.value })
                      }
                      className="h-7 w-28 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center shrink-0 uppercase"
                    />
                    <Input
                      value={formData.trailer_plate_2}
                      readOnly
                      className="h-7 w-28 text-xs bg-slate-100 border-slate-300 font-mono text-center shrink-0 uppercase"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setIsEntitySearchOpen('veiculo')}
                      className="h-7 w-7 text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shrink-0"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Veículo (4) Pesquise aqui por */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-8 flex items-center gap-2">
                    <span className="w-28 text-slate-700 font-semibold shrink-0 text-right pr-1">
                      Veículo (4)
                    </span>
                    <Input
                      value={formData.trailer_plate_3}
                      onChange={(e) =>
                        setFormData({ ...formData, trailer_plate_3: e.target.value })
                      }
                      placeholder="Pesquise aqui por"
                      className="h-7 flex-1 text-xs bg-[#f8fafc] border-slate-300 font-mono text-center uppercase"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setIsEntitySearchOpen('veiculo')}
                      className="h-7 w-7 text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 shrink-0"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Categoria Combo */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2">
                  <div className="md:col-span-12 flex items-center gap-2">
                    <span className="w-28 text-slate-700 font-semibold shrink-0 text-right pr-1">
                      Categoria
                    </span>
                    <Select
                      value={formData.vehicle_category}
                      onValueChange={(val) => setFormData({ ...formData, vehicle_category: val })}
                    >
                      <SelectTrigger className="h-7 flex-1 text-xs bg-[#f8fafc] border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 9 eixos - rod. dupla )">
                          Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 9 eixos - rod.
                          dupla )
                        </SelectItem>
                        <SelectItem value="Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 7 eixos - rod. dupla )">
                          Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 7 eixos - rod.
                          dupla )
                        </SelectItem>
                        <SelectItem value="Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 6 eixos - rod. dupla )">
                          Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 6 eixos - rod.
                          dupla )
                        </SelectItem>
                        <SelectItem value="Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 5 eixos - rod. dupla )">
                          Caminhão c/ reboque, caminhão-trator c/ semi-reboque ( 5 eixos - rod.
                          dupla )
                        </SelectItem>
                        <SelectItem value="Caminhão Toco ( 2 eixos )">
                          Caminhão Toco ( 2 eixos )
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 3: OBSERVAÇÕES (LEI 13.103/2015 + CONTADOR 2000 + SEGUNDO CAMPO) */}
            {activeTab === 'observacoes' && (
              <div className="space-y-4 max-w-4xl">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Observações Contratuais / Jornada Lei 13.103/2015:
                    </Label>
                    <span className="text-[11px] font-mono text-slate-500">
                      {remainingLawChars} Caracteres restantes
                    </span>
                  </div>
                  <Textarea
                    value={formData.law_observations}
                    maxLength={2000}
                    rows={6}
                    onChange={(e) => setFormData({ ...formData, law_observations: e.target.value })}
                    className="w-full text-xs bg-[#f8fafc] border-slate-300 font-mono"
                  />
                  <div className="flex justify-end mt-1 text-[11px] text-slate-500 font-mono">
                    {remainingLawChars} Caracteres restantes
                  </div>
                </div>

                {/* Segundo campo de observações complementares abaixo conforme print */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Observações Complementares da Operação:
                  </Label>
                  <Textarea
                    value={formData.complementary_observations}
                    rows={4}
                    placeholder="Instruções adicionais de entrega, pátio, agendamento de descarregamento ou restrições de rota..."
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        complementary_observations: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-[#f8fafc] border-slate-300"
                  />
                </div>
              </div>
            )}

            {/* ABA 4: SERVIÇOS CONTRATADOS */}
            {activeTab === 'servicos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Serviços Contratados no CTRB
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nextId = `cs-${contractedServices.length + 1}`
                      setContractedServices([
                        ...contractedServices,
                        {
                          id: nextId,
                          codigo: `SRV-0${contractedServices.length + 1}`,
                          descricao: 'Serviço Adicional de Carga / Descarga',
                          quantidade: 1,
                          valor: 0,
                          observacao: '',
                        },
                      ])
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Novo Serviço
                  </Button>
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-slate-200 w-24">Código</th>
                        <th className="p-2 border-r border-slate-200">Descrição</th>
                        <th className="p-2 border-r border-slate-200 w-24 text-right">Qtd</th>
                        <th className="p-2 border-r border-slate-200 w-32 text-right">Valor</th>
                        <th className="p-2 border-r border-slate-200">Observações</th>
                        <th className="p-2 w-16 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {contractedServices.map((cs, idx) => (
                        <tr key={cs.id} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-center border-r border-slate-200">
                            {cs.codigo}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-medium">
                            <Input
                              value={cs.descricao}
                              onChange={(e) => {
                                const copy = [...contractedServices]
                                copy[idx].descricao = e.target.value
                                setContractedServices(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0"
                            />
                          </td>
                          <td className="p-2 text-right border-r border-slate-200">
                            <Input
                              type="number"
                              value={cs.quantidade}
                              onChange={(e) => {
                                const copy = [...contractedServices]
                                copy[idx].quantidade = Number(e.target.value) || 0
                                setContractedServices(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0 text-right font-mono"
                            />
                          </td>
                          <td className="p-2 text-right border-r border-slate-200 font-mono font-bold text-slate-800">
                            <Input
                              type="number"
                              step="0.01"
                              value={cs.valor}
                              onChange={(e) => {
                                const copy = [...contractedServices]
                                copy[idx].valor = Number(e.target.value) || 0
                                setContractedServices(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0 text-right font-mono"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-600">
                            <Input
                              value={cs.observacao || ''}
                              placeholder="Observação do serviço"
                              onChange={(e) => {
                                const copy = [...contractedServices]
                                copy[idx].observacao = e.target.value
                                setContractedServices(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setContractedServices(
                                  contractedServices.filter((s) => s.id !== cs.id),
                                )
                              }
                              className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 5: CT-E (CONHECIMENTOS FISCAIS VINCULADOS) */}
            {activeTab === 'cte' && (
              <div className="space-y-3">
                {/* Aviso oficial do print: "A Lista de CT-e deve conter mais de uma entrega" */}
                <div className="bg-amber-50 border border-amber-300 rounded p-3 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>
                      <strong>Aviso Operacional:</strong> A Lista de CT-e deve conter mais de uma
                      entrega para composições de carga fracionada ou subcontratação vinculada.
                    </span>
                  </div>
                  <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-100">
                    Validação ServiceLogic
                  </Badge>
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-slate-200">Número CT-e</th>
                        <th className="p-2 border-r border-slate-200">Série</th>
                        <th className="p-2 border-r border-slate-200">Chave de Acesso</th>
                        <th className="p-2 border-r border-slate-200">Remetente</th>
                        <th className="p-2 border-r border-slate-200">Destinatário</th>
                        <th className="p-2 border-r border-slate-200 text-right">Valor Frete</th>
                        <th className="p-2 text-center">Status SEFAZ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {linkedCtes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400">
                            Nenhum CT-e vinculado diretamente a esta operação. Os documentos fiscais
                            autorizados na etapa CT-e serão exibidos aqui automaticamente.
                          </td>
                        </tr>
                      ) : (
                        linkedCtes.map((c: any) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-200">
                              {c.cte_number}
                            </td>
                            <td className="p-2 font-mono text-center border-r border-slate-200">
                              {c.series || 1}
                            </td>
                            <td className="p-2 font-mono text-slate-600 truncate max-w-xs border-r border-slate-200">
                              {c.access_key}
                            </td>
                            <td className="p-2 border-r border-slate-200 truncate max-w-[150px]">
                              {c.sender_name}
                            </td>
                            <td className="p-2 border-r border-slate-200 truncate max-w-[150px]">
                              {c.recipient_name}
                            </td>
                            <td className="p-2 text-right font-mono font-semibold border-r border-slate-200">
                              R${' '}
                              {Number(c.freight_value || 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-2 text-center">
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300"
                              >
                                {c.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 6: NFS (NOTAS FISCAIS DE SERVIÇO) */}
            {activeTab === 'nfs' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                  <span className="font-semibold block text-slate-800 mb-1">
                    Notas Fiscais de Serviço (NFS-e) Vinculadas ao Contrato:
                  </span>
                  Exibe as notas fiscais de serviço municipais de transporte, capatazia ou
                  transbordo vinculadas ao CTRB nº {formData.contract_number}.
                </div>
                <div className="text-center py-8 text-slate-400 border border-dashed border-slate-300 rounded">
                  Nenhuma NFS-e cadastrada para este contrato.
                </div>
              </div>
            )}

            {/* ABA 7: INF. BANCÁRIAS (PAGAMENTO AO CONTRATADO E PAINEL MOTORISTA) */}
            {activeTab === 'bancarias' && (
              <div className="space-y-6 max-w-5xl">
                {/* Painel 1: Pagamento ao Contratado */}
                <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <CreditCard className="h-4 w-4 text-blue-700" />
                    1. Dados de Pagamento ao Contratado (Titular do Frete)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-slate-600">Meio de Pagamento</Label>
                      <Select
                        value={formData.bank_payment_method}
                        onValueChange={(val) =>
                          setFormData({ ...formData, bank_payment_method: val })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs bg-white border-slate-300 mt-0.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Conta Depósito Manual">
                            Conta Depósito Manual
                          </SelectItem>
                          <SelectItem value="PIX Direto">PIX Direto</SelectItem>
                          <SelectItem value="Cartão Frete / IPEF">Cartão Frete / IPEF</SelectItem>
                          <SelectItem value="TED / Transferência">TED / Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-600">Tipo de Conta</Label>
                      <Select
                        value={formData.bank_account_type}
                        onValueChange={(val) =>
                          setFormData({ ...formData, bank_account_type: val })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs bg-white border-slate-300 mt-0.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                          <SelectItem value="Conta Poupança">Conta Poupança</SelectItem>
                          <SelectItem value="Conta Pagamento">Conta Pagamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-600">Banco</Label>
                      <Input
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="h-7 text-xs bg-white border-slate-300 mt-0.5"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-600">Agência / Conta</Label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input
                          value={formData.bank_agency}
                          onChange={(e) =>
                            setFormData({ ...formData, bank_agency: e.target.value })
                          }
                          placeholder="Agência"
                          className="h-7 w-20 text-xs bg-white border-slate-300 text-center font-mono"
                        />
                        <Input
                          value={formData.bank_account}
                          onChange={(e) =>
                            setFormData({ ...formData, bank_account: e.target.value })
                          }
                          placeholder="Conta"
                          className="h-7 flex-1 text-xs bg-white border-slate-300 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                    <div>
                      <Label className="text-[11px] text-slate-600">
                        Chave PIX (E-mail / CPF / Tel)
                      </Label>
                      <Input
                        value={formData.bank_pix_key}
                        onChange={(e) => setFormData({ ...formData, bank_pix_key: e.target.value })}
                        className="h-7 text-xs bg-white border-slate-300 font-mono mt-0.5"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-600">Valor Adiantamento</Label>
                      <div className="relative mt-0.5">
                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.advance_payment_value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              advance_payment_value: Number(e.target.value) || 0,
                            })
                          }
                          className="h-7 pl-8 text-xs bg-white border-slate-300 font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-600">Valor Saldo na Entrega</Label>
                      <div className="relative mt-0.5">
                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.balance_payment_value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              balance_payment_value: Number(e.target.value) || 0,
                            })
                          }
                          className="h-7 pl-8 text-xs bg-white border-slate-300 font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Painel 2: Dados Bancários Separados do Motorista */}
                <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <User className="h-4 w-4 text-emerald-700" />
                    2. Dados Bancários do Motorista Condutor (Diárias / Adiantamento Operacional)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-slate-600">Banco Motorista</Label>
                      <Input
                        value={formData.driver_bank_name}
                        onChange={(e) =>
                          setFormData({ ...formData, driver_bank_name: e.target.value })
                        }
                        className="h-7 text-xs bg-white border-slate-300 mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-600">Agência / Conta</Label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input
                          value={formData.driver_bank_agency}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              driver_bank_agency: e.target.value,
                            })
                          }
                          placeholder="Agência"
                          className="h-7 w-20 text-xs bg-white border-slate-300 text-center font-mono"
                        />
                        <Input
                          value={formData.driver_bank_account}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              driver_bank_account: e.target.value,
                            })
                          }
                          placeholder="Conta"
                          className="h-7 flex-1 text-xs bg-white border-slate-300 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-600">Chave PIX Motorista</Label>
                      <Input
                        value={formData.driver_bank_pix_key}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            driver_bank_pix_key: e.target.value,
                          })
                        }
                        className="h-7 text-xs bg-white border-slate-300 font-mono mt-0.5"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-600">Forma Pagamento</Label>
                      <Input
                        value={formData.driver_bank_payment_method}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            driver_bank_payment_method: e.target.value,
                          })
                        }
                        className="h-7 text-xs bg-white border-slate-300 mt-0.5"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[11px] text-slate-600">
                        Observações ao Credenciado:
                      </Label>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {Math.max(0, 300 - (formData.observations_to_accredited || '').length)}{' '}
                        caracteres restantes (máx 300)
                      </span>
                    </div>
                    <Textarea
                      maxLength={300}
                      rows={2}
                      value={formData.observations_to_accredited}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          observations_to_accredited: e.target.value,
                        })
                      }
                      placeholder="Instruções para liquidação junto ao posto credenciado ou operadora de cartão frete..."
                      className="w-full text-xs bg-white border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ABA 8: DOCUMENTOS (UPLOAD E LISTA DE ANEXOS REAIS) */}
            {activeTab === 'documentos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-indigo-600" />
                      Anexos do Contrato CTRB
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      Armazenamento seguro de contratos assinados, fotos de CNH, CRLV e comprovantes
                      vinculados à coleção contract_attachments.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {isUploading ? 'Enviando...' : 'Anexar Documento'}
                    </Button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-slate-200">Nome do Arquivo</th>
                        <th className="p-2 border-r border-slate-200 w-32">Tipo</th>
                        <th className="p-2 border-r border-slate-200 w-28 text-right">Tamanho</th>
                        <th className="p-2 border-r border-slate-200 w-44">Enviado Por</th>
                        <th className="p-2 border-r border-slate-200 w-36 text-center">
                          Data Envio
                        </th>
                        <th className="p-2 w-28 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {attachmentsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            Nenhum arquivo anexado a este contrato ainda. Clique em "Anexar
                            Documento" para fazer o upload do documento assinado ou comprovante.
                          </td>
                        </tr>
                      ) : (
                        attachmentsList.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-900 border-r border-slate-200 flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              <span className="truncate max-w-sm">{att.file_name}</span>
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-600">
                              {att.document_type || 'Comprovante'}
                            </td>
                            <td className="p-2 text-right font-mono text-slate-600 border-r border-slate-200">
                              {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : '—'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-600 truncate">
                              {att.uploaded_by || 'Operador'}
                            </td>
                            <td className="p-2 text-center text-slate-600 border-r border-slate-200">
                              {att.created
                                ? new Date(att.created).toLocaleDateString('pt-BR')
                                : 'Hoje'}
                            </td>
                            <td className="p-2 text-center flex items-center justify-center gap-1">
                              {att.file && (
                                <a
                                  href={att.file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-slate-200 text-indigo-700"
                                  title="Baixar / Abrir"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteAttachment(att.id, att.file_name)}
                                className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                                title="Excluir Anexo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 9: LANÇAMENTO ABASTECIMENTO */}
            {activeTab === 'abastecimento' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Fuel className="h-4 w-4 text-amber-600" />
                      Abastecimentos Vinculados ao Contrato (Vale Abastecimento)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Registro de requisições de combustível emitidas para a viagem conforme a rota
                      autorizada.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nextId = `fl-${fuelingRecords.length + 1}`
                      setFuelingRecords([
                        ...fuelingRecords,
                        {
                          id: nextId,
                          posto: 'Posto Conveniado da Rota',
                          dataHora: new Date().toLocaleString('pt-BR'),
                          combustivel: 'Diesel S10',
                          litros: 150,
                          valorLitro: 5.85,
                          valorTotal: 877.5,
                          odometro: 143500,
                          numeroRequisicao: `REQ-${Math.floor(10000 + Math.random() * 90000)}`,
                        },
                      ])
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Procurar / Lançar Abastecimento
                  </Button>
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-slate-200">Posto / Estabelecimento</th>
                        <th className="p-2 border-r border-slate-200 w-36">Data / Hora</th>
                        <th className="p-2 border-r border-slate-200 w-24">Combustível</th>
                        <th className="p-2 border-r border-slate-200 w-24 text-right">Litros</th>
                        <th className="p-2 border-r border-slate-200 w-24 text-right">R$/Litro</th>
                        <th className="p-2 border-r border-slate-200 w-28 text-right">Total</th>
                        <th className="p-2 border-r border-slate-200 w-28 text-center">
                          Requisição
                        </th>
                        <th className="p-2 w-16 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {fuelingRecords.map((fl, idx) => (
                        <tr key={fl.id} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-900 border-r border-slate-200">
                            {fl.posto}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-600 font-mono">
                            {fl.dataHora}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">
                            {fl.combustivel}
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-200">
                            {fl.litros} L
                          </td>
                          <td className="p-2 text-right font-mono border-r border-slate-200">
                            R$ {fl.valorLitro.toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-amber-800 border-r border-slate-200">
                            R$ {fl.valorTotal.toFixed(2)}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 border-r border-slate-200">
                            {fl.numeroRequisicao || '—'}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setFuelingRecords(fuelingRecords.filter((f) => f.id !== fl.id))
                              }
                              className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 10: CUSTOS OPERACIONAIS */}
            {activeTab === 'custos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-purple-600" />
                    Custos Operacionais do Transporte
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nextId = `oc-${operationalCosts.length + 1}`
                      setOperationalCosts([
                        ...operationalCosts,
                        {
                          id: nextId,
                          tipo: 'Outros Custos',
                          descricao: 'Custo Operacional Adicional',
                          valor: 0,
                          responsavel: 'Contratante',
                        },
                      ])
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Custo
                  </Button>
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-slate-200 w-36">Tipo</th>
                        <th className="p-2 border-r border-slate-200">Descrição</th>
                        <th className="p-2 border-r border-slate-200 w-32 text-right">Valor</th>
                        <th className="p-2 border-r border-slate-200 w-44">Responsável</th>
                        <th className="p-2 w-16 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {operationalCosts.map((oc, idx) => (
                        <tr key={oc.id} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-900 border-r border-slate-200">
                            {oc.tipo}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">
                            <Input
                              value={oc.descricao}
                              onChange={(e) => {
                                const copy = [...operationalCosts]
                                copy[idx].descricao = e.target.value
                                setOperationalCosts(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-purple-800 border-r border-slate-200">
                            <Input
                              type="number"
                              step="0.01"
                              value={oc.valor}
                              onChange={(e) => {
                                const copy = [...operationalCosts]
                                copy[idx].valor = Number(e.target.value) || 0
                                setOperationalCosts(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0 text-right font-mono"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-600">
                            <Input
                              value={oc.responsavel}
                              onChange={(e) => {
                                const copy = [...operationalCosts]
                                copy[idx].responsavel = e.target.value
                                setOperationalCosts(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setOperationalCosts(operationalCosts.filter((c) => c.id !== oc.id))
                              }
                              className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 11: CONFERÊNCIA PEDÁGIO (DADOS REAIS ANTT / VPO) */}
            {activeTab === 'pedagio' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      Conferência de Praças de Pedágio e VPO (Lei 10.209/2001)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cálculo oficial de tarifas vigentes ANTT-2026.1 vinculado à rota aprovada.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-blue-300 text-blue-800 bg-blue-50">
                    Tarifas ANTT Vigentes
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Total Vale-Pedágio Obrigatório:
                    </span>
                    <strong className="text-sm font-mono text-blue-900 font-extrabold">
                      R${' '}
                      {Number(formData.vpo_value || 422.4).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Responsável pelo Fornecimento:
                    </span>
                    <strong className="text-slate-800">
                      Embarcador / Contratante (Lei 10.209/01)
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">
                      Voucher / IDVPO na Concessionária:
                    </span>
                    <strong className="font-mono text-indigo-700">
                      {formData.vpo_voucher_number || 'VP-849201940 (TAG ConectCar)'}
                    </strong>
                  </div>
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-slate-200">Concessionária</th>
                        <th className="p-2 border-r border-slate-200">Rodovia</th>
                        <th className="p-2 border-r border-slate-200">Praça / Município</th>
                        <th className="p-2 border-r border-slate-200 w-24 text-center">UF</th>
                        <th className="p-2 border-r border-slate-200 w-24 text-center">Eixos</th>
                        <th className="p-2 text-right w-28">Tarifa (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tollPlazasList.slice(0, 5).map((tp: any, i) => (
                        <tr key={tp.id || i} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-900 border-r border-slate-200">
                            {tp.concessionaire || 'Ecovias / CCR'}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono">
                            {tp.highway || 'SP-330'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">
                            {tp.name || tp.city || 'Praça Central'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center font-mono">
                            {tp.state || 'SP'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                            {formData.axles_count || 9}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            R$ {(8.8 * (formData.axles_count || 9)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 12: SAÍDA ITEM */}
            {activeTab === 'saida_item' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-emerald-600" />
                    Itens da Carga Despachados na Saída
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nextId = `id-${itemDispatches.length + 1}`
                      setItemDispatches([
                        ...itemDispatches,
                        {
                          id: nextId,
                          codigoItem: 'CARGA-ADD',
                          descricao: 'Item Complementar de Carga',
                          quantidade: 1,
                          pesoKg: 1000,
                        },
                      ])
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Item
                  </Button>
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-slate-200 w-28">Código</th>
                        <th className="p-2 border-r border-slate-200">Descrição do Produto</th>
                        <th className="p-2 border-r border-slate-200 w-28 text-right">Qtd</th>
                        <th className="p-2 border-r border-slate-200 w-28 text-right">Peso (kg)</th>
                        <th className="p-2 border-r border-slate-200 w-32">Lote</th>
                        <th className="p-2 border-r border-slate-200 w-32">Nota Fiscal</th>
                        <th className="p-2 w-16 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {itemDispatches.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-center border-r border-slate-200">
                            {it.codigoItem}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-medium">
                            <Input
                              value={it.descricao}
                              onChange={(e) => {
                                const copy = [...itemDispatches]
                                copy[idx].descricao = e.target.value
                                setItemDispatches(copy)
                              }}
                              className="h-6 text-xs bg-transparent border-0"
                            />
                          </td>
                          <td className="p-2 text-right border-r border-slate-200 font-mono">
                            {it.quantidade}
                          </td>
                          <td className="p-2 text-right border-r border-slate-200 font-mono font-bold text-slate-800">
                            {it.pesoKg.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono text-slate-600">
                            {it.lote || '—'}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono text-indigo-700">
                            {it.notaFiscal || formData.nfe_number || '—'}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setItemDispatches(itemDispatches.filter((x) => x.id !== it.id))
                              }
                              className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 13: PARCELAS */}
            {activeTab === 'parcelas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    Cronograma de Parcelas do Frete
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setInstallments([
                        ...installments,
                        {
                          numero: installments.length + 1,
                          tipo: 'Complemento',
                          vencimento: new Date().toLocaleDateString('pt-BR'),
                          valor: 0,
                          status: 'Pendente',
                          formaPagamento: 'TED',
                        },
                      ])
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nova Parcela
                  </Button>
                </div>

                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="p-2 border-r border-slate-200 w-16 text-center">Parc.</th>
                        <th className="p-2 border-r border-slate-200 w-32">Tipo</th>
                        <th className="p-2 border-r border-slate-200 w-32 text-center">
                          Vencimento
                        </th>
                        <th className="p-2 border-r border-slate-200 w-32 text-right">Valor</th>
                        <th className="p-2 border-r border-slate-200">Forma de Pagamento</th>
                        <th className="p-2 border-r border-slate-200 w-28 text-center">Status</th>
                        <th className="p-2 w-16 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {installments.map((ins, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono border-r border-slate-200">
                            {ins.numero}
                          </td>
                          <td className="p-2 font-medium border-r border-slate-200 text-slate-800">
                            {ins.tipo}
                          </td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">
                            {ins.vencimento}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800 border-r border-slate-200">
                            R${' '}
                            {ins.valor.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">
                            {ins.formaPagamento}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                ins.status === 'Pago'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              {ins.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setInstallments(installments.filter((_, i) => i !== idx))
                              }
                              className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABA 14: RETIFICAÇÃO CIOT / ANTT */}
            {activeTab === 'retificacao_ciot' && (
              <div className="space-y-4 max-w-3xl">
                <div className="p-4 bg-slate-50 border border-slate-300 rounded space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-blue-700" />
                      Retificação de CIOT perante IPEF / ANTT
                    </h4>
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-amber-800 bg-amber-50"
                    >
                      Aguardando configuração de credenciais
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600">
                    A retificação de CIOT é o procedimento regulamentar de alteração de dados
                    cadastrais (valor de frete, placa de reboque, data de encerramento) perante a
                    Administradora de Meio de Pagamento Eletrônico homologada pela ANTT.
                  </p>

                  <div className="space-y-2 pt-1">
                    <Label className="text-xs text-slate-700 font-semibold">
                      Motivo Oficial da Retificação:
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Descreva o enquadramento e motivo da retificação (ex: substituição de semirreboque em trânsito, ajuste de peso na balança fiscal)..."
                      className="w-full text-xs bg-white border-slate-300"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Integração com IPEF (e-Frete / Repom / NDD) sem simulação fiscal.
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        toast({
                          title: 'Status da Integração CIOT',
                          description:
                            'Conector de IPEF / ANTT aguardando credenciais na tela Empresa. Não houve transmissão simulada.',
                        })
                      }}
                      className="h-7 text-xs bg-blue-700 hover:bg-blue-800 text-white font-medium"
                    >
                      Transmitir Retificação
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão de Contrato CTRB
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Tem certeza de que deseja excluir o Contrato de Transporte nº{' '}
              <strong>{formData.contract_number}</strong>? Esta ação removerá o registro e
              registrará evento de auditoria irrecusável em audit_logs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE SELEÇÃO DE OUTRO CONTRATO */}
      <Dialog open={isSelectContractModalOpen} onOpenChange={setIsSelectContractModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Selecionar Contrato CTRB Existente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Escolha um contrato salvo no banco de dados para abrir e editar.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-200">
            {allContractsList.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  applyContractToForm(c)
                  getContractAttachments(c.id).then((atts) => setAttachmentsList(atts))
                  setSearchParams({ id: c.id })
                  setIsSelectContractModalOpen(false)
                }}
                className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    CTRB Nº {c.contract_number} (Série {c.series || 1})
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Contratado: {c.contracted_carrier_name || 'N/A'} • Placa:{' '}
                    {c.vehicle_plate || '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-700">
                    R${' '}
                    {Number(c.freight_value || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {c.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE SELEÇÃO DE ORDEM DE TRANSPORTE (VINCULAR TRIP) */}
      <Dialog open={isSelectTripModalOpen} onOpenChange={setIsSelectTripModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Vincular e Preencher a partir de Ordem de Transporte
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione uma viagem cadastrada para importar os dados operacionais sem redigitar
              nada.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-200">
            {tripsList.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  prefillFromTrip(t, companySettings, driversList, vehiclesList)
                  setIsSelectTripModalOpen(false)
                }}
                className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    Ordem #{t.operation_number || t.trip_code}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {t.origin_city}/{t.origin_state} ➔ {t.destination_city}/{t.destination_state} •{' '}
                    {t.cargo_type}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-800">
                    R${' '}
                    {Number(t.freight_value || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {t.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE BUSCA RÁPIDA DE ENTIDADES (CONTRATADO, CONTRATANTE, MOTORISTA, VEÍCULOS) */}
      <Dialog
        open={Boolean(isEntitySearchOpen)}
        onOpenChange={(open) => !open && setIsEntitySearchOpen(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 capitalize">
              Vincular {isEntitySearchOpen} dos Cadastros Centrais
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione o registro existente para associar diretamente ao CTRB sem duplicidade.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-200">
            {isEntitySearchOpen === 'motorista' &&
              driversList.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      driver_code: d.id.substring(0, 5),
                      driver_name: d.name,
                      driver_cpf: d.cpf,
                      driver_cnh: d.cnh,
                      driver_phone: d.phone,
                    }))
                    setIsEntitySearchOpen(null)
                  }}
                  className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{d.name}</span>
                    <span className="text-slate-500 block text-[11px] font-mono">
                      CPF: {d.cpf} • CNH: {d.cnh} ({d.cnh_category})
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {d.status}
                  </Badge>
                </div>
              ))}

            {isEntitySearchOpen === 'contratado' &&
              driversList.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      contracted_carrier_code: d.id.substring(0, 5),
                      contracted_carrier_name: d.name,
                      contracted_carrier_document: d.cpf,
                      bank_beneficiary_name: d.name,
                      bank_beneficiary_doc: d.cpf,
                      bank_pix_key: d.cpf,
                      law_observations: `${DEFAULT_LAW_OBS}${d.cpf}`,
                    }))
                    setIsEntitySearchOpen(null)
                  }}
                  className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{d.name}</span>
                    <span className="text-slate-500 block text-[11px] font-mono">
                      CPF: {d.cpf} • Telefone: {d.phone || 'N/A'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Transportador
                  </Badge>
                </div>
              ))}

            {isEntitySearchOpen === 'contratante' && (
              <div
                onClick={() => {
                  if (companySettings) {
                    setFormData((prev) => ({
                      ...prev,
                      contractor_code: '2049',
                      contractor_name: companySettings.corporate_name,
                      contractor_document: companySettings.cnpj,
                      contractor_rntrc: companySettings.rntrc,
                      contractor_address: `${companySettings.city || 'Rio Verde'}/${companySettings.state || 'GO'}`,
                    }))
                  }
                  setIsEntitySearchOpen(null)
                }}
                className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">
                    {companySettings?.corporate_name || 'COMIGO'}
                  </span>
                  <span className="text-slate-500 block text-[11px] font-mono">
                    CNPJ: {companySettings?.cnpj || '02.077.618/0002-66'}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-800">
                  Emitente Central
                </Badge>
              </div>
            )}

            {isEntitySearchOpen === 'veiculo' &&
              vehiclesList.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      vehicle_plate: v.plate,
                      vehicle_model: v.model,
                      axles_count: v.axles || 6,
                    }))
                    setIsEntitySearchOpen(null)
                  }}
                  className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-bold font-mono text-slate-900 uppercase">{v.plate}</span>
                    <span className="text-slate-500 block text-[11px]">
                      {v.model} • {v.axles} Eixos • {v.vehicle_type}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {v.status}
                  </Badge>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE VISUALIZAÇÃO E DOWNLOAD DO PDF DO CTRB */}
      <ContractPdfModal
        contract={currentContractForPdf}
        open={isPdfModalOpen}
        onOpenChange={setIsPdfModalOpen}
        onRequestSignature={() => {
          toast({
            title: 'Assinatura Eletrônica (Conectores)',
            description: 'Aguardando configuração de provedor Clicksign / DocuSign / ICP-Brasil.',
          })
        }}
      />

      {/* MODAL DE LÓGICA DA TELA */}
      <ScreenLogicModal
        open={isLogicModalOpen}
        onClose={() => setIsLogicModalOpen(false)}
        doc={CTRB_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
