import type {
  InfractionType,
  FineSeverity,
  FineStatus,
  Vehicle,
  Driver,
  TrafficFine,
} from '@/types/logistics'
import type { BatchImportFineItem } from '@/services/logisticsService'

export interface ParsedCsvLine {
  lineNumber: number
  values: string[]
  raw: string
}

// Normalização de cabeçalhos (remover acentos, minúsculas, pontuação)
export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// Limpeza de texto de documento e placa
export function cleanPlate(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function cleanDocument(text: string): string {
  return text.replace(/\D/g, '')
}

// Mapeamento de tipo de infração
export const INFRACTION_MAP: Record<string, InfractionType> = {
  velocidade: 'speeding',
  excesso_velocidade: 'speeding',
  excesso_de_velocidade: 'speeding',
  speeding: 'speeding',
  radar: 'speeding',

  balanca: 'weight_scale',
  balanca_pesagem: 'weight_scale',
  pesagem: 'weight_scale',
  evasao_balanca: 'weight_scale',
  evasao_de_balanca: 'weight_scale',
  weight_scale: 'weight_scale',

  sinal_vermelho: 'red_light',
  avanco_sinal: 'red_light',
  avanco_de_sinal: 'red_light',
  avanco_sinal_vermelho: 'red_light',
  red_light: 'red_light',
  semaforo: 'red_light',

  estacionamento: 'parking',
  estacionamento_irregular: 'parking',
  parking: 'parking',
  parar_local_proibido: 'parking',

  ultrapassagem: 'overtaking',
  ultrapassagem_proibida: 'overtaking',
  contramao: 'overtaking',
  overtaking: 'overtaking',

  cinto: 'seatbelt',
  cinto_de_seguranca: 'seatbelt',
  cinto_seguranca: 'seatbelt',
  sem_cinto: 'seatbelt',
  seatbelt: 'seatbelt',

  celular: 'phone_usage',
  telefone: 'phone_usage',
  uso_celular: 'phone_usage',
  uso_de_celular: 'phone_usage',
  phone_usage: 'phone_usage',

  tacografo: 'tachograph',
  tacografo_jornada: 'tachograph',
  jornada: 'tachograph',
  tachograph: 'tachograph',

  outra: 'other',
  outro: 'other',
  outras: 'other',
  outra_infracao: 'other',
  other: 'other',
}

// Mapeamento de gravidade
export const SEVERITY_MAP: Record<string, FineSeverity> = {
  leve: 'light',
  light: 'light',
  media: 'medium',
  medium: 'medium',
  grave: 'grave',
  gravissima: 'very_grave',
  muito_grave: 'very_grave',
  very_grave: 'very_grave',
}

export const SEVERITY_DEFAULT_POINTS: Record<FineSeverity, number> = {
  light: 3,
  medium: 4,
  grave: 5,
  very_grave: 7,
}

// Mapeamento de status
export const STATUS_MAP: Record<string, FineStatus> = {
  pendente: 'pending',
  pending: 'pending',
  paga: 'paid',
  pago: 'paid',
  paid: 'paid',
  quitada: 'paid',
  quitado: 'paid',
  recorrida: 'appealed',
  recorrido: 'appealed',
  appealed: 'appealed',
  em_recurso: 'appealed',
  recurso: 'appealed',
  cancelada: 'cancelled',
  cancelado: 'cancelled',
  cancelled: 'cancelled',
  anulada: 'cancelled',
}

// Parser de valor numérico / monetário (1.234,56 ou 1234.56 ou R$ 150,00)
export function parseCurrencyOrNumber(val: string): number | null {
  if (!val) return null
  let cleaned = val
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s+/g, '')
  if (!cleaned) return null

  // Se tem ponto e vírgula, e.g. 1.234,56
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    // E.g. 130,16
    cleaned = cleaned.replace(',', '.')
  }

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Parser de data flexível: dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd
export function parseFlexibleDate(val: string): string | null {
  if (!val) return null
  const trimmed = val.trim()
  if (!trimmed) return null

  // Caso 1: ISO com ou sem hora: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10) - 1
    const day = parseInt(isoMatch[3], 10)
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0))
    if (!isNaN(d.getTime())) return d.toISOString()
  }

  // Caso 2: DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/)
  if (brMatch) {
    const day = parseInt(brMatch[1], 10)
    const month = parseInt(brMatch[2], 10) - 1
    let year = parseInt(brMatch[3], 10)
    if (year < 100) {
      year += 2000
    }
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0))
    if (!isNaN(d.getTime())) return d.toISOString()
  }

  // Tentativa com Date nativo
  const fallback = new Date(trimmed)
  if (!isNaN(fallback.getTime())) {
    return fallback.toISOString()
  }

  return null
}

// Splitter tolerante de linha CSV (suporta vírgula ou ponto-e-vírgula, e aspas)
export function parseCsvLine(
  line: string,
  delimiter?: ',' | ';',
): { values: string[]; delimiter: ',' | ';' } {
  // Se não foi definido, adivinhar entre ',' e ';' contando ocorrências fora de aspas
  let chosenDelim: ',' | ';' = delimiter || ';'
  if (!delimiter) {
    let commas = 0
    let semicolons = 0
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') inQuotes = !inQuotes
      else if (!inQuotes) {
        if (c === ',') commas++
        if (c === ';') semicolons++
      }
    }
    chosenDelim = semicolons >= commas ? ';' : ','
  }

  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // pula aspa dupla escapada
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === chosenDelim && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())

  return { values, delimiter: chosenDelim }
}

// Divide o texto completo em linhas lógicas (suportando quebra dentro de aspas)
export function splitCsvLines(content: string): string[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '"') {
      inQuotes = !inQuotes
      current += char
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++ // consome \r\n
      }
      if (current.trim().length > 0) {
        lines.push(current)
      }
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim().length > 0) {
    lines.push(current)
  }

  return lines
}

// Modelo de colunas canônico
export interface CanonicalColumnDef {
  key: string
  aliases: string[]
  label: string
  example: string
  required: boolean
}

export const CANONICAL_COLUMNS: CanonicalColumnDef[] = [
  {
    key: 'plate',
    aliases: ['placa', 'placa_veiculo', 'veiculo_placa', 'veiculo', 'placa_do_veiculo', 'plate'],
    label: 'Placa',
    example: 'BRA2E19',
    required: true,
  },
  {
    key: 'notice_number',
    aliases: [
      'auto',
      'auto_infracao',
      'auto_de_infracao',
      'ait',
      'numero_auto',
      'num_auto',
      'notice_number',
      'notificacao',
    ],
    label: 'Auto de Infração',
    example: 'PRF-SP-901234',
    required: true,
  },
  {
    key: 'driver',
    aliases: [
      'motorista',
      'condutor',
      'cpf_motorista',
      'cpf_condutor',
      'nome_motorista',
      'driver',
      'cpf',
    ],
    label: 'Motorista (Nome ou CPF)',
    example: 'Carlos Eduardo ou 123.456.789-01',
    required: false,
  },
  {
    key: 'issuing_body',
    aliases: ['orgao', 'orgao_autuador', 'orgao_emissor', 'emissor', 'autoridade', 'issuing_body'],
    label: 'Órgão Autuador',
    example: 'PRF',
    required: false,
  },
  {
    key: 'infraction_type',
    aliases: [
      'tipo',
      'tipo_infracao',
      'tipo_de_infracao',
      'infracao',
      'enquadramento',
      'infraction_type',
    ],
    label: 'Tipo de Infração',
    example: 'Excesso de Velocidade',
    required: false,
  },
  {
    key: 'severity',
    aliases: ['gravidade', 'severidade', 'grau', 'severity'],
    label: 'Gravidade',
    example: 'Média',
    required: false,
  },
  {
    key: 'points',
    aliases: ['pontos', 'pontos_cnh', 'pontuacao', 'pts', 'points'],
    label: 'Pontos na CNH',
    example: '4',
    required: false,
  },
  {
    key: 'amount',
    aliases: ['valor', 'valor_multa', 'valor_da_multa', 'preco', 'custo', 'amount'],
    label: 'Valor (R$)',
    example: '130,16',
    required: false,
  },
  {
    key: 'infraction_date',
    aliases: ['data_infracao', 'data_da_infracao', 'data_hora', 'data', 'infraction_date'],
    label: 'Data da Infração',
    example: '15/03/2025',
    required: false,
  },
  {
    key: 'due_date',
    aliases: ['vencimento', 'data_vencimento', 'data_de_vencimento', 'due_date', 'prazo'],
    label: 'Data de Vencimento',
    example: '15/04/2025',
    required: false,
  },
  {
    key: 'description',
    aliases: [
      'descricao',
      'descricao_infracao',
      'detalhes',
      'fato',
      'artigo',
      'motivo',
      'description',
    ],
    label: 'Descrição',
    example: 'Velocidade superior à máxima permitida em até 20%',
    required: false,
  },
  {
    key: 'location',
    aliases: [
      'local',
      'local_infracao',
      'local_da_infracao',
      'rodovia',
      'km',
      'municipio',
      'location',
    ],
    label: 'Local',
    example: 'BR-116, Km 230 - Curitiba/PR',
    required: false,
  },
  {
    key: 'status',
    aliases: ['status', 'situacao', 'estado'],
    label: 'Status',
    example: 'Pendente',
    required: false,
  },
  {
    key: 'payment_date',
    aliases: ['data_pagamento', 'data_do_pagamento', 'pagamento_em', 'payment_date'],
    label: 'Data Pagamento (se paga)',
    example: '',
    required: false,
  },
  {
    key: 'appeal_number',
    aliases: ['recurso', 'numero_recurso', 'protocolo_recurso', 'num_recurso', 'appeal_number'],
    label: 'Nº do Recurso (se recorrida)',
    example: '',
    required: false,
  },
  {
    key: 'notes',
    aliases: ['observacoes', 'obs', 'notas', 'anotacoes', 'notes'],
    label: 'Observações',
    example: '',
    required: false,
  },
]

// Mapeia uma coluna do cabeçalho de entrada para a canonical key
export function mapHeaderToKey(headerStr: string): string | null {
  const normalized = normalizeHeader(headerStr)
  for (const col of CANONICAL_COLUMNS) {
    if (normalized === normalizeHeader(col.key)) return col.key
    for (const alias of col.aliases) {
      if (normalized === normalizeHeader(alias)) return col.key
    }
  }
  return null
}

// Gera o modelo de CSV para download
export function generateSampleCsv(delimiter: ';' | ',' = ';'): string {
  const headers = [
    'Placa',
    'Auto de Infração',
    'Motorista',
    'Órgão Autuador',
    'Tipo de Infração',
    'Gravidade',
    'Pontos CNH',
    'Valor',
    'Data da Infração',
    'Data de Vencimento',
    'Descrição',
    'Local',
    'Status',
    'Observações',
  ]

  const row1 = [
    'BRA2E19',
    'DER-SP-991201',
    'Carlos Eduardo Silveira',
    'DER-SP',
    'Excesso de Velocidade',
    'Média',
    '4',
    '130,16',
    '10/03/2025',
    '10/04/2025',
    'Transitar em velocidade superior à máxima em até 20%',
    'SP-330 Km 84 - Campinas/SP',
    'Pendente',
    'Radar fixo pista norte',
  ]

  const row2 = [
    'RLK8F40',
    'PRF-PR-778811',
    'Marcos Roberto Fernandes',
    'PRF',
    'Evasão de Balança',
    'Grave',
    '5',
    '195,23',
    '12/03/2025',
    '12/04/2025',
    'Evasão de posto de pesagem obrigatório',
    'BR-116 Km 114 - Curitiba/PR',
    'Pendente',
    'Sem parada no posto de pesagem',
  ]

  const escapeVal = (v: string) => {
    if (v.includes(delimiter) || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`
    }
    return v
  }

  const content = [
    headers.map(escapeVal).join(delimiter),
    row1.map(escapeVal).join(delimiter),
    row2.map(escapeVal).join(delimiter),
  ].join('\r\n')

  return '\uFEFF' + content // UTF-8 BOM para abrir com acentuação correta no Excel
}

// Parser principal de texto/CSV com cruzamento contra veículos e motoristas
export function parseFinesImportData(
  content: string,
  vehicles: Vehicle[],
  drivers: Driver[],
  existingFines: TrafficFine[] = [],
): {
  items: BatchImportFineItem[]
  headerErrors: string[]
  totalLines: number
  validCount: number
  invalidCount: number
  warningCount: number
} {
  const lines = splitCsvLines(content)
  if (lines.length === 0) {
    return {
      items: [],
      headerErrors: ['O arquivo ou texto está vazio.'],
      totalLines: 0,
      validCount: 0,
      invalidCount: 0,
      warningCount: 0,
    }
  }

  // Linha 1 = cabeçalho
  const headerLine = lines[0]
  const { values: rawHeaders, delimiter } = parseCsvLine(headerLine)

  const keyMap: Record<number, string> = {}
  rawHeaders.forEach((h, index) => {
    const mapped = mapHeaderToKey(h)
    if (mapped) {
      keyMap[index] = mapped
    }
  })

  // Valida colunas essenciais
  const mappedKeys = Object.values(keyMap)
  const hasPlate = mappedKeys.includes('plate')
  const hasNotice = mappedKeys.includes('notice_number')

  const headerErrors: string[] = []
  if (!hasPlate) {
    headerErrors.push('Coluna "Placa" não foi reconhecida no cabeçalho.')
  }
  if (!hasNotice) {
    headerErrors.push('Coluna "Auto de Infração" não foi reconhecida no cabeçalho.')
  }

  if (headerErrors.length > 0) {
    return {
      items: [],
      headerErrors,
      totalLines: lines.length - 1,
      validCount: 0,
      invalidCount: lines.length - 1,
      warningCount: 0,
    }
  }

  // Mapas de lookup
  const vehicleByPlate = new Map<string, Vehicle>()
  vehicles.forEach((v) => {
    vehicleByPlate.set(cleanPlate(v.plate), v)
  })

  const driverByCpf = new Map<string, Driver>()
  const driverByName = new Map<string, Driver>()
  drivers.forEach((d) => {
    const cpfClean = cleanDocument(d.cpf)
    if (cpfClean) driverByCpf.set(cpfClean, d)
    driverByName.set(d.name.trim().toLowerCase(), d)
  })

  const existingNoticeNumbers = new Set(
    existingFines.map((f) => f.notice_number.trim().toUpperCase()),
  )
  const seenNoticeInBatch = new Set<string>()

  const items: BatchImportFineItem[] = []
  let warningCount = 0

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) continue

    const { values } = parseCsvLine(rawLine, delimiter)
    const rowData: Record<string, string> = {}
    values.forEach((val, idx) => {
      const key = keyMap[idx]
      if (key) {
        rowData[key] = val
      }
    })

    const warnings: string[] = []
    const errors: string[] = []

    // 1. Placa e Veículo
    const plateRaw = rowData.plate || ''
    const cleanedP = cleanPlate(plateRaw)
    let vehicleId: string | undefined = undefined

    if (!cleanedP) {
      errors.push('Placa ausente ou inválida')
    } else {
      const matchedVehicle = vehicleByPlate.get(cleanedP)
      if (matchedVehicle) {
        vehicleId = matchedVehicle.id
      } else {
        errors.push(`Veículo com placa "${plateRaw}" não cadastrado no sistema`)
      }
    }

    // 2. Auto de Infração
    const noticeRaw = (rowData.notice_number || '').trim().toUpperCase()
    if (!noticeRaw) {
      errors.push('Auto de infração obrigatório')
    } else {
      if (existingNoticeNumbers.has(noticeRaw)) {
        errors.push(`Auto de infração "${noticeRaw}" já existe no sistema`)
      }
      if (seenNoticeInBatch.has(noticeRaw)) {
        errors.push(`Auto de infração "${noticeRaw}" duplicado neste arquivo`)
      }
      seenNoticeInBatch.add(noticeRaw)
    }

    // 3. Motorista
    const driverInputRaw = (rowData.driver || '').trim()
    let driverId: string | undefined = undefined

    if (driverInputRaw) {
      const cleanDoc = cleanDocument(driverInputRaw)
      if (cleanDoc.length >= 11 && driverByCpf.has(cleanDoc)) {
        driverId = driverByCpf.get(cleanDoc)?.id
      } else {
        const lowerName = driverInputRaw.toLowerCase()
        const matchedByName =
          driverByName.get(lowerName) ||
          Array.from(driverByName.entries()).find(
            ([k]) => k.includes(lowerName) || lowerName.includes(k),
          )?.[1]

        if (matchedByName) {
          driverId = matchedByName.id
        } else {
          warnings.push(
            `Motorista "${driverInputRaw}" não encontrado no cadastro; será importado sem vínculo de condutor`,
          )
        }
      }
    }

    // 4. Tipo de Infração
    const rawType = (rowData.infraction_type || '').trim().toLowerCase()
    let infraction_type: InfractionType = 'other'
    if (rawType) {
      const normType = normalizeHeader(rawType)
      const mapped = INFRACTION_MAP[normType] || INFRACTION_MAP[rawType]
      if (mapped) {
        infraction_type = mapped
      } else {
        warnings.push(
          `Tipo de infração "${rawType}" não padronizado; ajustado para "Outra Infração"`,
        )
      }
    } else {
      infraction_type = 'other'
    }

    // 5. Gravidade e Pontos
    const rawSeverity = (rowData.severity || '').trim().toLowerCase()
    let severity: FineSeverity = 'medium'
    if (rawSeverity) {
      const normSev = normalizeHeader(rawSeverity)
      const mapped = SEVERITY_MAP[normSev] || SEVERITY_MAP[rawSeverity]
      if (mapped) {
        severity = mapped
      } else {
        warnings.push(`Gravidade "${rawSeverity}" não reconhecida; assumido "Média"`)
      }
    }

    const defaultPoints = SEVERITY_DEFAULT_POINTS[severity] || 4
    let points = defaultPoints
    if (rowData.points) {
      const parsedPts = parseInt(rowData.points, 10)
      if (!isNaN(parsedPts) && parsedPts >= 0) {
        points = parsedPts
      } else {
        warnings.push(
          `Pontos "${rowData.points}" inválidos; atribuído padrão (${defaultPoints} pts)`,
        )
      }
    }

    // 6. Valor
    const rawAmount = rowData.amount || ''
    let amount = 0
    if (rawAmount) {
      const parsedAmount = parseCurrencyOrNumber(rawAmount)
      if (parsedAmount !== null && parsedAmount >= 0) {
        amount = parsedAmount
      } else {
        warnings.push(`Valor "${rawAmount}" inválido; atribuído R$ 0,00`)
      }
    }

    // 7. Datas
    const todayIso = new Date().toISOString()
    const thirtyDaysAheadIso = new Date(Date.now() + 30 * 86400000).toISOString()

    let infraction_date = todayIso
    if (rowData.infraction_date) {
      const parsedDate = parseFlexibleDate(rowData.infraction_date)
      if (parsedDate) {
        infraction_date = parsedDate
      } else {
        warnings.push(
          `Data da infração "${rowData.infraction_date}" inválida; assumida data de hoje`,
        )
      }
    }

    let due_date = thirtyDaysAheadIso
    if (rowData.due_date) {
      const parsedDue = parseFlexibleDate(rowData.due_date)
      if (parsedDue) {
        due_date = parsedDue
      } else {
        warnings.push(`Data de vencimento "${rowData.due_date}" inválida; assumido +30 dias`)
      }
    }

    // 8. Órgão Autuador
    const issuing_body = (rowData.issuing_body || '').trim() || 'Órgão de Trânsito'

    // 9. Descrição
    const description =
      (rowData.description || '').trim() ||
      `Infração de trânsito - Auto ${noticeRaw || 'sem número'}`

    // 10. Status
    const rawStatus = (rowData.status || '').trim().toLowerCase()
    let status: FineStatus = 'pending'
    if (rawStatus) {
      const normStatus = normalizeHeader(rawStatus)
      const mapped = STATUS_MAP[normStatus] || STATUS_MAP[rawStatus]
      if (mapped) {
        status = mapped
      } else {
        warnings.push(`Status "${rawStatus}" desconhecido; definido como "Pendente"`)
      }
    }

    // 11. Pagamento / Recurso / Local / Observações
    let payment_date: string | undefined = undefined
    if (rowData.payment_date) {
      const parsedPay = parseFlexibleDate(rowData.payment_date)
      if (parsedPay) {
        payment_date = parsedPay
        if (status === 'pending') {
          status = 'paid'
        }
      }
    }

    const appeal_number = (rowData.appeal_number || '').trim() || undefined
    const location = (rowData.location || '').trim() || undefined
    const notes = (rowData.notes || '').trim() || undefined

    const isValid = errors.length === 0 && Boolean(vehicleId)

    if (warnings.length > 0) {
      warningCount += warnings.length
    }

    items.push({
      raw: rowData,
      lineNumber: i + 1,
      vehicle_id: vehicleId,
      driver_id: driverId,
      plateInput: plateRaw,
      driverInput: driverInputRaw,
      notice_number: noticeRaw,
      issuing_body,
      infraction_type,
      severity,
      points,
      amount,
      infraction_date,
      due_date,
      status,
      description,
      location,
      notes,
      payment_date,
      appeal_number,
      warnings,
      errors,
      isValid,
    })
  }

  const validCount = items.filter((it) => it.isValid).length
  const invalidCount = items.filter((it) => !it.isValid).length

  return {
    items,
    headerErrors: [],
    totalLines: items.length,
    validCount,
    invalidCount,
    warningCount,
  }
}
