import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Clock,
  User,
  Activity,
  FileSpreadsheet,
  FileJson,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { AuditLog, AuditAction } from '@/types/userManagement'
import { AUDIT_ACTION_LABELS } from '@/types/userManagement'
import { getAuditLogs } from '@/services/userManagementService'
import { ScreenLogicModal } from '@/components/ScreenLogicModal'
import { AUDIT_TRAIL_SCREEN_LOGIC_DOC } from '@/docs/screenDocs'

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [userQuery, setUserQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [logicModalOpen, setLogicModalOpen] = useState(false)

  const { toast } = useToast()

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await getAuditLogs({
        action: actionFilter,
        actorEmail: userQuery.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 150,
      })
      setLogs(data)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao carregar auditoria',
        description:
          (err as { message?: string })?.message || 'Verifique suas permissões de administrador.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [actionFilter, startDate, endDate])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadLogs()
  }

  const exportAuditReport = (format: 'json' | 'csv') => {
    if (logs.length === 0) {
      toast({ title: 'Sem dados para exportar' })
      return
    }

    const filename = `trilha_auditoria_lgpd_${Date.now()}`

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const rows: string[] = []
      rows.push('Data/Hora,Acao,Autor,Email Autor,Alvo Email,Descricao,IP')
      logs.forEach((l) => {
        rows.push(
          `"${l.created}","${l.action}","${l.actor_name || ''}","${l.actor_email || ''}","${l.target_user_email || ''}","${l.description.replace(/"/g, '""')}","${l.ip_address || ''}"`,
        )
      })
      const csvContent = '\uFEFF' + rows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }

    toast({
      title: 'Relatório exportado',
      description: `Arquivo ${format.toUpperCase()} gerado com ${logs.length} registros.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Trilha de Auditoria (Registro de Operações)
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-indigo-50 border-indigo-200 text-indigo-700"
            >
              LGPD Art. 37
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registro imutável de acessos (login/logout), alterações de cadastros, anonimizações e
            exportações.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLogicModalOpen(true)}
            className="text-xs font-semibold gap-1.5"
          >
            Lógica da Tela
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAuditReport('csv')}
            className="text-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAuditReport('json')}
            className="text-xs"
          >
            <FileJson className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
            Exportar JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Caixa de Conformidade LGPD */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-600/30 text-indigo-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-white">
              Princípio da Responsabilização e Prestação de Contas (Accountability)
            </div>
            <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
              O Art. 37 da LGPD exige que o controlador mantenha registro das operações de
              tratamento de dados pessoais. Esta trilha grava quem realizou cada ação, quando
              ocorreu, endereço de IP e dados técnicos contextuais.
            </p>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded border border-slate-800 shrink-0">
          Append-Only • Imutável
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {/* Busca por usuário */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Buscar por e-mail ou nome..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Filtro de Ação */}
          <div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Tipo de Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Operações</SelectItem>
                {Object.entries(AUDIT_ACTION_LABELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>
                    {val.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Início */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 whitespace-nowrap">De:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Data Fim + Botão */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 whitespace-nowrap">Até:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs"
            />
            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0"
            >
              Filtrar
            </Button>
          </div>
        </form>
      </div>

      {/* Tabela de Logs */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5 pl-4">Data / Hora</th>
                <th className="p-3.5">Operação (Ação)</th>
                <th className="p-3.5">Agente / Responsável</th>
                <th className="p-3.5">Titular / Alvo</th>
                <th className="p-3.5">Descrição do Evento</th>
                <th className="p-3.5 pr-4">IP / Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Carregando trilha de auditoria...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum registro de auditoria encontrado com os filtros informados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = AUDIT_ACTION_LABELS[log.action] || {
                    label: log.action,
                    badge: 'bg-slate-100 text-slate-700 border-slate-200',
                  }
                  const formattedDate = new Date(log.created).toLocaleString('pt-BR')

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Data / Hora */}
                      <td className="p-3.5 pl-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-900 font-medium font-mono text-[11px]">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formattedDate}
                        </div>
                      </td>

                      {/* Ação */}
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge variant="outline" className={`text-[10px] border ${meta.badge}`}>
                          {meta.label}
                        </Badge>
                      </td>

                      {/* Agente / Ator */}
                      <td className="p-3.5">
                        <div className="font-medium text-slate-900">
                          {log.actor_name || 'Sistema'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {log.actor_email || 'automático'}
                        </div>
                      </td>

                      {/* Alvo */}
                      <td className="p-3.5">
                        {log.target_user_email ? (
                          <div className="text-slate-800 font-medium">{log.target_user_email}</div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Geral / Próprio</span>
                        )}
                      </td>

                      {/* Descrição */}
                      <td className="p-3.5 max-w-sm">
                        <div className="text-slate-700 text-[11px] leading-snug">
                          {log.description}
                        </div>
                      </td>

                      {/* IP */}
                      <td className="p-3.5 pr-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {log.ip_address || 'Rede Interna'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ScreenLogicModal
        open={logicModalOpen}
        onClose={() => setLogicModalOpen(false)}
        doc={AUDIT_TRAIL_SCREEN_LOGIC_DOC}
      />
    </div>
  )
}
