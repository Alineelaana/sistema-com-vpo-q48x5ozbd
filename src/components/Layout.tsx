import React, { useState, useEffect, useMemo, useId } from 'react'
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
  ChevronDown,
  ChevronRight,
  ExternalLink,
  History,
  User,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Briefcase,
  FileCheck2,
  Contact2,
  SlidersHorizontal,
  FolderDot,
  Bot,
  GraduationCap,
  Receipt,
  Layers,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NotificationCenter } from '@/components/NotificationCenter'
import type { AppModule } from '@/types/userManagement'
import { ProfileModal } from '@/components/ProfileModal'
import { ForceChangePasswordModal } from '@/components/ForceChangePasswordModal'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'

interface NavItemDef {
  id: string
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  highlight?: boolean
  module?: AppModule
  adminOnly?: boolean
  keywords?: string[]
}

interface NavSectionDef {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItemDef[]
}

// Definição estruturada por setores / áreas com itens associados
const NAV_SECTIONS: NavSectionDef[] = [
  {
    id: 'visao_geral',
    title: 'Visão Geral',
    icon: LayoutDashboard,
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        to: '/',
        icon: LayoutDashboard,
        module: 'dashboard',
        keywords: ['painel', 'indicadores', 'kpis', 'resumo', 'gráficos', 'visão'],
      },
    ],
  },
  {
    id: 'operacao',
    title: 'Operação',
    icon: Briefcase,
    items: [
      {
        id: 'deliveries',
        label: 'Entregas & Coletas',
        to: '/deliveries',
        icon: Package,
        badge: 'Fusion',
        module: 'deliveries',
        keywords: ['pedidos', 'comprovante', 'pod', 'remessas', 'status'],
      },
      {
        id: 'routing',
        label: 'Roteirização',
        to: '/routing',
        icon: Navigation,
        badge: 'Fusion',
        module: 'routing',
        keywords: ['rotas', 'paradas', 'otimização', 'distância', 'trajeto', 'mapa'],
      },
      {
        id: 'control_tower',
        label: 'Torre de Controle',
        to: '/control-tower',
        icon: Radio,
        badge: 'Realtime',
        module: 'control_tower',
        keywords: ['rastreamento', 'tempo real', 'ocorrências', 'monitoramento', 'alertas'],
      },
      {
        id: 'trips',
        label: 'Viagens & Cargas',
        to: '/trips',
        icon: Truck,
        module: 'trips',
        keywords: ['fretes', 'manifesto', 'cargas', 'motoristas', 'despacho'],
      },
    ],
  },
  {
    id: 'fiscal',
    title: 'Fiscal & VPO',
    icon: FileCheck2,
    items: [
      {
        id: 'ciot',
        label: 'CIOT (ANTT)',
        to: '/ciot',
        icon: Receipt,
        badge: 'Obrigatório',
        module: 'cte',
        keywords: ['ciot', 'antt', 'ipef', 'rntrc', 'tac', 'equiparado', 'protocolo'],
      },
      {
        id: 'cte',
        label: 'Documentos CT-e',
        to: '/cte',
        icon: FileText,
        module: 'cte',
        keywords: ['conhecimento', 'xml', 'sefaz', 'dacte', 'fiscal', 'emissão'],
      },
      {
        id: 'mdfe',
        label: 'MDF-e (Manifesto)',
        to: '/mdfe',
        icon: Layers,
        module: 'cte',
        keywords: ['mdfe', 'manifesto', 'carga', 'damdfe', 'sefaz', 'encerramento'],
      },
      {
        id: 'insurance',
        label: 'Seguros & Averbação',
        to: '/seguros',
        icon: ShieldAlert,
        badge: 'RCTR-C',
        module: 'cte',
        keywords: ['seguro', 'averbação', 'apólice', 'rctr-c', 'rc-dc', 'porto', 'atm'],
      },
      {
        id: 'vpo_calc',
        label: 'Vale-Pedágio (VPO)',
        to: '/vpo-calc',
        icon: Calculator,
        highlight: true,
        module: 'vpo_calc',
        keywords: ['pedágio', 'vale pedágio', 'antt', 'eixos', 'tarifa', 'roteirizador'],
      },
    ],
  },
  {
    id: 'cadastros',
    title: 'Cadastros',
    icon: Contact2,
    items: [
      {
        id: 'company',
        label: 'Dados da Empresa',
        to: '/company',
        icon: Building2,
        module: 'company',
        keywords: ['transportadora', 'cnpj', 'inscrição', 'endereço', 'configuração'],
      },
      {
        id: 'drivers',
        label: 'Motoristas',
        to: '/drivers',
        icon: UsersIcon,
        module: 'drivers',
        keywords: ['condutores', 'cnh', 'cpf', 'celular', 'frota'],
      },
      {
        id: 'vehicles',
        label: 'Veículos / Frota',
        to: '/vehicles',
        icon: Truck,
        module: 'vehicles',
        keywords: ['placas', 'caminhões', 'carretas', 'eixos', 'capacidade'],
      },
    ],
  },
  {
    id: 'gestao',
    title: 'Gestão & Auditoria',
    icon: SlidersHorizontal,
    items: [
      {
        id: 'freight_audit',
        label: 'Auditoria de Frete',
        to: '/freight-audit',
        icon: Scale,
        badge: 'Fusion',
        module: 'freight_audit',
        keywords: ['divergência', 'conferência', 'faturas', 'glosas', 'preço'],
      },
      {
        id: 'agents_center',
        label: 'Central de Agentes',
        to: '/agents-center',
        icon: Bot,
        badge: 'Agentes',
        module: 'agents_center',
        keywords: [
          'agentes',
          'e-mails',
          'automação',
          'central',
          'processamento',
          'triagem',
          'fluxo',
        ],
      },
      {
        id: 'fines',
        label: 'Multas & Infrações',
        to: '/fines',
        icon: AlertTriangle,
        module: 'fines',
        keywords: ['renainf', 'ait', 'recurso', 'trânsito', 'gravidade', 'pontos'],
      },
      {
        id: 'email_agent_training',
        label: 'Treinamento do Agente de E-mails',
        to: '/email-agent-training',
        icon: GraduationCap,
        adminOnly: true,
        module: 'email_agent_training',
        keywords: [
          'treinamento',
          'regras',
          'agente',
          'ia',
          'intervalo',
          'conectores',
          'gmail',
          'outlook',
        ],
      },
    ],
  },
  {
    id: 'administracao',
    title: 'Administração & LGPD',
    icon: ShieldCheck,
    items: [
      {
        id: 'privacy_policy',
        label: 'Política de Privacidade',
        to: '/privacy-policy',
        icon: ShieldCheck,
        module: 'privacy_policy',
        keywords: ['lgpd', 'termos', 'privacidade', 'dados', 'conformidade'],
      },
      {
        id: 'audit',
        label: 'Trilha de Auditoria',
        to: '/audit',
        icon: History,
        badge: 'Art. 37',
        adminOnly: true,
        module: 'audit',
        keywords: ['logs', 'rastreabilidade', 'acessos', 'segurança', 'lgpd'],
      },
      {
        id: 'users',
        label: 'Usuários & LGPD',
        to: '/users',
        icon: UsersIcon,
        badge: 'LGPD',
        adminOnly: true,
        module: 'users',
        keywords: ['contas', 'perfis', 'senhas', 'bloqueio', 'permissões'],
      },
    ],
  },
]

const STORAGE_COLLAPSED_KEY = 'ed_sidebar_collapsed_v1'

export default function Layout() {
  const { user, currentUser, role, roleConfig, hasPermission, logout, mustChangePasswordPending } =
    useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const searchInputId = useId()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Estado de recolhimento da sidebar desktop com persistência
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COLLAPSED_KEY)
      return saved === 'true'
    } catch {
      return false
    }
  })

  // Estado de seção aberta: sanfona exclusiva (apenas uma seção aberta por vez ou nenhuma).
  // Por padrão, todos os grupos iniciam FECHADOS ao carregar o sistema.
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)

  // Salva no localStorage quando o usuário alternar recolher/expandir
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Alterna a seção no modo sanfona exclusivo:
  // Se clicar na que já está aberta, fecha.
  // Se clicar em outra, abre apenas ela e fecha as outras.
  const toggleSection = (sectionId: string) => {
    setActiveSectionId((current) => (current === sectionId ? null : sectionId))
  }

  // Avatar URL helper
  const avatarUrl = user?.avatar ? pb.files.getURL(user, user.avatar, { thumb: '100x100' }) : null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Permissão por item
  const canAccessItem = (item: NavItemDef) => {
    if (role === 'admin') return true
    if (item.adminOnly) return false
    if (item.module && !hasPermission(item.module)) return false
    return true
  }

  // Processa as seções e itens:
  // 1. Filtra por permissão (RBAC)
  // 2. Ordena os itens alfabeticamente pelo label
  // 3. Ordena as seções alfabeticamente pelo title (com exceção opcional da 'Visão Geral' se desejado, mas o usuário pediu "ordene por ordem alfabetica as telas" tanto grupos quanto itens dentro dos grupos)
  // 4. Aplica busca em tempo real sobre nome do item, títulos e palavras-chave
  const processedSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    // 1. Filtra por permissão
    const filteredByRole = NAV_SECTIONS.map((sec) => {
      const allowedItems = sec.items.filter(canAccessItem)
      return {
        ...sec,
        items: allowedItems,
      }
    }).filter((sec) => sec.items.length > 0)

    // 2. Ordena itens alfabeticamente por label dentro de cada grupo
    const sortedItems = filteredByRole.map((sec) => ({
      ...sec,
      items: [...sec.items].sort((a, b) =>
        a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }),
      ),
    }))

    // 3. Ordena os grupos alfabeticamente pelo title
    const sortedSections = [...sortedItems].sort((a, b) =>
      a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }),
    )

    // 4. Aplica filtro de pesquisa, se houver
    if (!q) {
      return sortedSections
    }

    return sortedSections
      .map((sec) => {
        const matchingItems = sec.items.filter((item) => {
          const matchLabel = item.label.toLowerCase().includes(q)
          const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q))
          const matchSection = sec.title.toLowerCase().includes(q)
          return matchLabel || matchKeywords || matchSection
        })
        return {
          ...sec,
          items: matchingItems,
        }
      })
      .filter((sec) => sec.items.length > 0)
  }, [role, hasPermission, searchQuery])

  // Total de itens encontrados (para feedback de busca vazia)
  const totalFoundItems = useMemo(() => {
    return processedSections.reduce((acc, sec) => acc + sec.items.length, 0)
  }, [processedSections])

  // Exceção obrigatória da busca:
  // Quando há busca ativa, todos os grupos com resultados ficam abertos/expandidos automaticamente.
  // Quando a busca é limpa, volta ao estado sanfona normal (activeSectionId).
  const isSearching = searchQuery.trim().length > 0

  // Renderiza um NavItem no modo recolhido (ícone + tooltip)
  const renderCollapsedItem = (item: NavItemDef) => {
    const Icon = item.icon
    const isActive =
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)

    return (
      <Tooltip key={item.to} delayDuration={150}>
        <TooltipTrigger asChild>
          <NavLink
            to={item.to}
            aria-label={item.label}
            className={cn(
              'flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-xs font-medium transition-all relative',
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80',
              item.highlight && !isActive && 'border border-indigo-500/30 text-indigo-300',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.highlight && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-slate-900" />
            )}
            {item.badge === 'Realtime' && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
            )}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700 shadow-xl">
          <div className="font-semibold text-xs flex items-center gap-1.5">
            <span>{item.label}</span>
            {item.badge && (
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 border-indigo-400 text-indigo-300"
              >
                {item.badge}
              </Badge>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Se estiver na tela de login, não mostra sidebar
  if (location.pathname === '/login') {
    return (
      <main className="min-h-screen">
        <Outlet />
      </main>
    )
  }

  // Renderiza um NavItem no modo expandido (com badge e cascata)
  const renderExpandedItem = (item: NavItemDef, onNavigate?: () => void) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'group flex items-center justify-between pl-3 pr-2.5 py-2 rounded-lg text-xs font-medium transition-all border-l-2',
            isActive
              ? 'bg-indigo-600/90 text-white shadow-sm border-indigo-300 font-semibold'
              : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/70 hover:border-slate-600',
            item.highlight &&
              !isActive &&
              'border-l-indigo-400/50 text-indigo-200 bg-indigo-950/20',
          )
        }
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
          <span className="truncate">{item.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {item.highlight && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 border-indigo-400 text-indigo-300 bg-indigo-950/60"
            >
              ANTT
            </Badge>
          )}
          {item.badge && !item.highlight && (
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] px-1.5 py-0',
                item.badge === 'Realtime'
                  ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/50'
                  : 'border-indigo-400/30 text-indigo-300 bg-indigo-950/40',
              )}
            >
              {item.badge}
            </Badge>
          )}
        </div>
      </NavLink>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop Fixa (Fixed) */}
      <aside
        aria-label="Menu Lateral do Sistema"
        className={cn(
          'hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-200 select-none shadow-xl',
          isCollapsed ? 'w-20' : 'w-72',
        )}
      >
        {/* Cabeçalho da Sidebar / Branding & Botão de Recolher */}
        <div className="p-3.5 border-b border-slate-800/90 flex items-center justify-between shrink-0 bg-slate-950/30">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white tracking-tight flex items-center gap-1 leading-none text-base truncate">
                  Ed <span className="text-indigo-400">Integração</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                  Gestão Rodoviária & VPO
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Truck className="h-5 w-5" />
            </div>
          )}

          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                className={cn(
                  'text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0 shrink-0',
                  isCollapsed && 'mx-auto mt-2',
                )}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700">
              {isCollapsed ? 'Expandir menu (Ctrl+B)' : 'Recolher menu'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Campo de Pesquisa de Telas (apenas visível quando expandido) */}
        {!isCollapsed && (
          <div className="p-3 border-b border-slate-800/80 bg-slate-950/20 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                id={searchInputId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar telas..."
                aria-label="Pesquisar telas do menu"
                className="pl-8 pr-7 h-8 text-xs bg-slate-950/60 border-slate-700/80 text-white placeholder:text-slate-500 rounded-lg focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar pesquisa"
                  className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs p-0.5 rounded hover:bg-slate-800"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lista de Telas com Rolagem Própria */}
        <nav
          aria-label="Navegação Principal"
          className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-3 custom-scrollbar"
        >
          {totalFoundItems === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 space-y-1.5">
              <FolderDot className="h-6 w-6 mx-auto text-slate-500 stroke-1" />
              <p className="font-medium text-slate-300">Nenhuma tela encontrada</p>
              <p className="text-[11px] text-slate-500">
                Nenhum resultado para &ldquo;{searchQuery}&rdquo;
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs border-slate-700 text-slate-300 hover:bg-slate-800 h-7"
              >
                Limpar busca
              </Button>
            </div>
          ) : (
            processedSections.map((section) => {
              const SectionIcon = section.icon
              const isOpen = isSearching ? true : activeSectionId === section.id
              const hasActiveChild = section.items.some((item) =>
                item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
              )

              // Modo recolhido: mostra apenas ícones dos itens, agrupados com divisor sutil
              if (isCollapsed) {
                return (
                  <div
                    key={section.id}
                    className="space-y-1 pb-2 border-b border-slate-800/60 last:border-0"
                  >
                    {section.items.map(renderCollapsedItem)}
                  </div>
                )
              }

              // Modo expandido: estrutura em cascata com cabeçalho de seção colapsável
              return (
                <div
                  key={section.id}
                  className="rounded-lg bg-slate-950/20 border border-slate-800/40 overflow-hidden"
                >
                  {/* Botão de Toggle da Seção / Cabeçalho do Grupo */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-wider transition-colors',
                      hasActiveChild
                        ? 'text-indigo-300 bg-indigo-950/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40',
                    )}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <SectionIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{section.title}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({section.items.length})
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}
                  </button>

                  {/* Subitens da Seção em Cascata (Indentados) */}
                  {isOpen && (
                    <div className="p-1 space-y-0.5 border-t border-slate-800/40 bg-slate-900/40 pl-2">
                      {section.items.map((item) => renderExpandedItem(item))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </nav>

        {/* Rodapé do Usuário & Logout Desktop */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 shrink-0">
          {!isCollapsed ? (
            <>
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(true)}
                  className="min-w-0 pr-2 text-left hover:opacity-85 transition-opacity flex items-center gap-2"
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
                      {user?.name || 'Operador'}
                    </div>
                    <div className="text-[10px] text-indigo-400 font-medium truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{roleConfig.label}</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProfileModalOpen(true)}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 w-7 p-0"
                    title="Meu Perfil"
                    aria-label="Abrir perfil"
                  >
                    <User className="h-3.5 w-3.5" />
                  </Button>
                  <NotificationCenter />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-7 w-7 p-0"
                    title="Sair"
                    aria-label="Encerrar sessão"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-400 truncate">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Ed Integração
                </span>
                <a
                  href="https://sistemasconnect.com.br/doc-e.html#calc"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-0.5 text-[10px] shrink-0"
                >
                  Doc-e
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    aria-label="Abrir Perfil"
                    className="focus:outline-none"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.name || 'Avatar'}
                        className="w-8 h-8 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 flex items-center justify-center font-bold text-xs uppercase">
                        {(user?.name || 'U').charAt(0)}
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700">
                  <p className="font-semibold text-xs">{user?.name || 'Usuário'}</p>
                  <p className="text-[10px] text-indigo-300">{roleConfig.label}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 h-8 w-8 p-0"
                    aria-label="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700">
                  Sair do sistema
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      {/* Header Mobile Fixo */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <Truck className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm">Ed Integração</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white hover:bg-slate-800 p-1 h-8 w-8"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Menu Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 text-white p-3 space-y-3 border-b border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto">
          {/* Busca Mobile */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar telas..."
              className="pl-8 pr-7 h-8 text-xs bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 rounded-lg"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Telas Agrupadas no Mobile */}
          {totalFoundItems === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Nenhuma tela encontrada para &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div className="space-y-3">
              {processedSections.map((section) => (
                <div key={section.id} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                    <span>{section.title}</span>
                    <span className="text-[9px] text-slate-500">{section.items.length}</span>
                  </div>
                  <div className="space-y-1 pl-1">
                    {section.items.map((item) =>
                      renderExpandedItem(item, () => setMobileMenuOpen(false)),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé Mobile */}
          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400 truncate max-w-[180px]">{user?.email}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProfileModalOpen(true)
                  setMobileMenuOpen(false)
                }}
                className="text-xs text-indigo-300 h-7 px-2"
              >
                Perfil
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-rose-400 text-xs h-7 px-2"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal — Com margem esquerda compensando a sidebar fixa no desktop */}
      <main
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-200',
          isCollapsed ? 'md:ml-20' : 'md:ml-72',
        )}
      >
        {' '}
        {/* Barra Superior Desktop Fixa no Topo do Conteúdo */}
        <header className="hidden md:flex sticky top-0 z-30 items-center justify-between px-6 py-3 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Sistema Ativo • Ed Integração & Gestão de Frotas</span>
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
              className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg transition-colors text-left"
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
        {/* Área de Visualização das Páginas */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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
