import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  Truck,
  Users as UsersIcon,
  Navigation,
  FileText,
  Calculator,
  Building2,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Package,
  Radio,
  Scale,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Shield,
  History,
  Lock,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationCenter } from '@/components/NotificationCenter'
import type { AppModule } from '@/types/userManagement'
import { ProfileModal } from '@/components/ProfileModal'
import { ForceChangePasswordModal } from '@/components/ForceChangePasswordModal'
import pb from '@/lib/pocketbase/client'

export default function Layout() {
  const {
    user,
    currentUser,
    role,
    roleConfig,
    hasPermission,
    logout,
    isAuthenticated,
    mustChangePasswordPending,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  // Avatar URL helper
  const avatarUrl = user?.avatar ? pb.files.getURL(user, user.avatar, { thumb: '100x100' }) : null

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

  interface NavItemDef {
    label: string
    to: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
    highlight?: boolean
    module?: AppModule
    adminOnly?: boolean
  }

  const allNavItems: NavItemDef[] = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard, module: 'dashboard' },
    // Módulos Fusion by nstech
    {
      label: 'Entregas & Coletas',
      to: '/deliveries',
      icon: Package,
      badge: 'Fusion',
      module: 'deliveries',
    },
    { label: 'Roteirização', to: '/routing', icon: Navigation, badge: 'Fusion', module: 'routing' },
    {
      label: 'Torre de Controle',
      to: '/control-tower',
      icon: Radio,
      badge: 'Realtime',
      module: 'control_tower',
    },
    {
      label: 'Auditoria de Frete',
      to: '/freight-audit',
      icon: Scale,
      badge: 'Fusion',
      module: 'freight_audit',
    },
    // Operações de Frota e VPO
    {
      label: 'Cálculo VPO',
      to: '/vpo-calc',
      icon: Calculator,
      highlight: true,
      module: 'vpo_calc',
    },
    { label: 'Viagens & Cargas', to: '/trips', icon: Truck, module: 'trips' },
    { label: 'Documentos CT-e', to: '/cte', icon: FileText, module: 'cte' },
    { label: 'Veículos / Frota', to: '/vehicles', icon: Truck, module: 'vehicles' },
    { label: 'Motoristas', to: '/drivers', icon: UsersIcon, module: 'drivers' },
    { label: 'Multas & Infrações', to: '/fines', icon: AlertTriangle, module: 'fines' },
    { label: 'Dados da Empresa', to: '/company', icon: Building2, module: 'company' },
    // Gestão de Usuários & LGPD (Admin only)
    {
      label: 'Usuários & LGPD',
      to: '/users',
      icon: UsersIcon,
      badge: 'LGPD',
      adminOnly: true,
      module: 'users',
    },
    {
      label: 'Trilha de Auditoria',
      to: '/audit',
      icon: History,
      badge: 'Art. 37',
      adminOnly: true,
      module: 'audit',
    },
    // Termos de Privacidade
    {
      label: 'Política Privacidade',
      to: '/privacy-policy',
      icon: ShieldCheck,
      module: 'privacy_policy',
    },
  ]

  // Filtra itens de menu conforme o perfil autenticado
  const navItems = allNavItems.filter((item) => {
    if (role === 'admin') return true
    if (item.adminOnly) return false
    if (item.module && !hasPermission(item.module)) return false
    return true
  })

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
                {item.badge && !item.highlight && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      item.badge === 'Realtime'
                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/40'
                        : 'border-indigo-400/30 text-indigo-300 bg-indigo-950/30'
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Rodapé do Usuário & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="min-w-0 pr-2 text-left hover:opacity-80 transition-opacity flex items-center gap-2"
              title="Clique para gerenciar seu perfil"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name || 'Avatar'}
                  className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {(user?.name || 'U').charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.name || 'Operador Connect'}
                </div>
                <div className="text-[10px] text-indigo-400 font-medium truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {roleConfig.label}
                </div>
              </div>
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProfileModalOpen(true)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
                title="Meu Perfil"
              >
                <User className="h-4 w-4" />
              </Button>
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
            <Badge variant="outline" className={`ml-2 text-[10px] ${roleConfig.badgeColor}`}>
              Perfil: {roleConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="border-r border-slate-200 pr-3">
              <div className="bg-slate-900 rounded-lg p-0.5">
                <NotificationCenter />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded-lg transition-colors text-left"
              title="Gerenciar Meu Perfil"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.name || 'Avatar'}
                  className="w-7 h-7 rounded-full object-cover border border-indigo-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                  {(user?.name || 'U').charAt(0)}
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-slate-700 block leading-tight">
                  {user?.name || 'Usuário'}
                </span>
                <span className="text-[10px] text-slate-400 block leading-none">
                  {currentUser?.role_title || roleConfig.label}
                </span>
              </div>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>

        {/* Modal de Gestão do Próprio Perfil */}
        <ProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

        {/* Modal Forçado de Troca de Senha Obrigatória no Próximo Acesso */}
        <ForceChangePasswordModal open={mustChangePasswordPending} onSuccess={() => {}} />
      </main>
    </div>
  )
}
