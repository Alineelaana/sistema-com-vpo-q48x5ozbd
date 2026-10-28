import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getFineNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  triggerCheckNotifications,
} from '@/services/logisticsService'
import type { FineNotification } from '@/types/logistics'
import pb from '@/lib/pocketbase/client'

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<FineNotification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const loadNotifications = async () => {
    try {
      const list = await getFineNotifications()
      setNotifications(list)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadNotifications()

    // Escutar eventos realtime de fine_notifications e traffic_fines para atualizar na hora
    let unsubscribeNotif: (() => void) | null = null
    let unsubscribeFines: (() => void) | null = null

    pb.collection('fine_notifications')
      .subscribe('*', () => {
        loadNotifications()
      })
      .then((unsub) => {
        unsubscribeNotif = unsub
      })
      .catch(() => {})

    pb.collection('traffic_fines')
      .subscribe('*', () => {
        loadNotifications()
      })
      .then((unsub) => {
        unsubscribeFines = unsub
      })
      .catch(() => {})

    return () => {
      if (unsubscribeNotif) unsubscribeNotif()
      if (unsubscribeFines) unsubscribeFines()
    }
  }, [])

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
        ),
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await triggerCheckNotifications()
      await loadNotifications()
    } finally {
      setLoading(false)
    }
  }

  const handleNavigateToFine = (fineId: string, notifId?: string) => {
    if (notifId) {
      markNotificationAsRead(notifId).catch(() => {})
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)))
    }
    setOpen(false)
    navigate(`/fines?highlight=${fineId}#fine-${fineId}`)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão Sininho */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="relative text-slate-300 hover:text-white hover:bg-slate-800 h-9 w-9 p-0 rounded-lg transition-colors"
        title="Central de Notificações de Multas"
        aria-label="Central de Notificações"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Painel Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Cabeçalho do Dropdown */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">
                  Notificações de Multas
                </h4>
                <p className="text-[10px] text-slate-400">
                  {unreadCount === 0
                    ? 'Nenhuma notificação não lida'
                    : `${unreadCount} ${unreadCount === 1 ? 'pendência não lida' : 'pendências não lidas'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                title="Verificar vencimentos agora"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="h-7 text-[11px] text-indigo-300 hover:text-white hover:bg-slate-800 gap-1 px-2"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-3 w-3" />
                  Marcar lidas
                </Button>
              )}
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-10 h-10 rounded-full bg-slate-800/60 mx-auto flex items-center justify-center text-slate-500 mb-2">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-slate-300">Tudo em dia!</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Não há multas próximas do vencimento ou vencidas sem pagamento.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isOverdue = notif.type === 'overdue'
                const fine = notif.expand?.fine_id

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNavigateToFine(notif.fine_id, notif.id)}
                    className={`p-3 text-left transition-colors cursor-pointer group flex items-start gap-2.5 ${
                      notif.is_read
                        ? 'bg-slate-900/40 hover:bg-slate-800/60 opacity-80'
                        : 'bg-slate-800/40 hover:bg-slate-800 border-l-2 ' +
                          (isOverdue ? 'border-rose-500' : 'border-amber-500')
                    }`}
                  >
                    {/* Ícone de alerta ou relógio */}
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isOverdue
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                      }`}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                    </div>

                    {/* Conteúdo textual */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isOverdue ? 'text-rose-300' : 'text-amber-200'
                          }`}
                        >
                          {notif.title}
                        </span>
                        {!notif.is_read ? (
                          <span
                            onClick={(e) => handleMarkAsRead(e, notif.id)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-200 flex items-center gap-0.5 font-medium shrink-0 cursor-pointer"
                            title="Marcar como lida"
                          >
                            <Check className="h-3 w-3" />
                            Lida
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500">Lida</span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Informações detalhadas da multa se expandida */}
                      {fine && (
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                          {fine.due_date && (
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                              Vencimento: {new Date(fine.due_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          <span className="text-emerald-400 font-semibold">
                            {fine.amount.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-400 group-hover:text-slate-300">
                        <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                          Ver multa e pagar
                          <ArrowRight className="h-2.5 w-2.5" />
                        </span>
                        {notif.created && (
                          <span className="text-slate-500">
                            {new Date(notif.created).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Rodapé com link para Central de Multas */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                navigate('/fines')
              }}
              className="w-full text-xs text-indigo-300 hover:text-white hover:bg-slate-800 h-8 justify-center gap-1.5"
            >
              <span>Ir para Gestão de Multas & Infrações</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
