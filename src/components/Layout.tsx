import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  Truck,
  Users,
  Navigation,
  FileText,
  Calculator,
  Building2,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationCenter } from '@/components/NotificationCenter'

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Se estiver na tela de login, não mostra sidebar
  if (location.pathname === '/login') {
    return (
      <main className="min-h-screen">
        <Outlet />
      </main>
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Cálculo VPO', to: '/vpo-calc', icon: Calculator, highlight: true },
    { label: 'Viagens & Rotas', to: '/trips', icon: Navigation },
    { label: 'Documentos CT-e', to: '/cte', icon: FileText },
    { label: 'Veículos / Frota', to: '/vehicles', icon: Truck },
    { label: 'Motoristas', to: '/drivers', icon: Users },
    { label: 'Multas & Infrações', to: '/fines', icon: AlertTriangle },
    { label: 'Dados da Empresa', to: '/company', icon: Building2 },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-white tracking-tight flex items-center gap-1 leading-none text-base">
                Connect <span className="text-indigo-400">VPO</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium mt-1">
                Emissor CT-e & Pedágio
              </div>
            </div>
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  } ${item.highlight ? 'border border-indigo-500/30 text-indigo-200' : ''}`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.highlight && (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 border-indigo-400 text-indigo-300 bg-indigo-950/40"
                  >
                    ANTT
                  </Badge>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Rodapé do Usuário & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-white truncate">
                {user?.name || 'Operador Connect'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user?.email || 'admin@sistema.com'}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <NotificationCenter />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-8 w-8 p-0"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sistemas Connect
            </span>
            <a
              href="https://sistemasconnect.com.br/doc-e.html#calc"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline flex items-center gap-0.5 text-[10px]"
            >
              Doc-e
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </aside>

      {/* Header Mobile */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <Truck className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm">Connect VPO</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white hover:bg-slate-800 p-1"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Menu Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 text-white p-4 space-y-2 border-b border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                    isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">{user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-rose-400 text-xs"
            >
              Sair
            </Button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Barra Superior Desktop com Notificações e Perfil */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Sistema Ativo • Connect VPO & Gestão de Frotas
          </div>
          <div className="flex items-center gap-3">
            <div className="border-r border-slate-200 pr-3">
              <div className="bg-slate-900 rounded-lg p-0.5">
                <NotificationCenter />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                {(user?.name || 'U').charAt(0)}
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {user?.name || 'Usuário'}
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
