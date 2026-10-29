import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

import type { UserRole, AppUser } from '@/types/userManagement'
import { USER_ROLES_CONFIG } from '@/types/userManagement'
import { logAuditEvent } from '@/services/userManagementService'

interface AuthContextType {
  user: RecordModel | null
  currentUser: AppUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  role: UserRole
  roleConfig: (typeof USER_ROLES_CONFIG)[UserRole]
  hasPermission: (module: import('@/types/userManagement').AppModule) => boolean
  canViewValues: boolean
  login: (email: string, pass: string) => Promise<void>
  signup: (email: string, pass: string, name: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updateProfile: (data: { name?: string; phone?: string; password?: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record)
  const [token, setToken] = useState<string | null>(pb.authStore.token)
  const [isLoading, setIsLoading] = useState(true)

  const currentUser: AppUser | null = user
    ? {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: (user.role as UserRole) || 'admin',
        role_title: user.role_title || '',
        status: user.status || 'active',
        privacy_consent_date: user.privacy_consent_date || '',
        privacy_policy_version: user.privacy_policy_version || '',
        data_treatment_purpose: user.data_treatment_purpose || '',
        is_anonymized: !!user.is_anonymized,
        created: user.created,
        updated: user.updated,
      }
    : null

  const currentRole: UserRole = currentUser?.role || 'readonly'
  const roleConfig = USER_ROLES_CONFIG[currentRole] || USER_ROLES_CONFIG.readonly

  const hasPermission = (module: import('@/types/userManagement').AppModule): boolean => {
    if (currentRole === 'admin') return true
    return roleConfig.allowedModules.includes(module)
  }

  const canViewValues = currentRole === 'admin' ? true : roleConfig.canViewValues

  useEffect(() => {
    // Escuta mudanças de auth store
    const unsubscribe = pb.authStore.onChange((token, record) => {
      setUser(record)
      setToken(token)
    })

    // Se já estiver logado, checa validade
    if (pb.authStore.isValid) {
      setUser(pb.authStore.record)
      setToken(pb.authStore.token)
    }

    setIsLoading(false)
    return () => {
      unsubscribe()
    }
  }, [])

  // Expiração de sessão por inatividade (LGPD e Segurança da Informação)
  // Logout automático após 30 minutos de inatividade
  useEffect(() => {
    if (!token || !user) return

    let timeoutId: ReturnType<typeof setTimeout>
    const INACTIVITY_LIMIT_MS = 30 * 60 * 1000 // 30 minutos

    const resetInactivityTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        logAuditEvent({
          action: 'logout',
          description: 'Sessão expirada por inatividade do usuário',
          target_user_id: user.id,
          target_user_email: user.email,
          details: { reason: 'inactivity_timeout' },
        })
        pb.authStore.clear()
        setUser(null)
        setToken(null)
      }, INACTIVITY_LIMIT_MS)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }))
    resetInactivityTimer()

    return () => {
      clearTimeout(timeoutId)
      events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer))
    }
  }, [token, user])

  const login = async (email: string, pass: string) => {
    const authData = await pb.collection('users').authWithPassword(email, pass)

    // Se o usuário foi desativado ou anonimizado, rejeita o acesso
    if (authData.record.status === 'inactive' || authData.record.status === 'anonymized') {
      pb.authStore.clear()
      setUser(null)
      setToken(null)
      throw new Error(
        authData.record.status === 'inactive'
          ? 'Sua conta está desativada. Entre em contato com o administrador do sistema.'
          : 'Conta de usuário desativada por solicitação de anonimização (LGPD).',
      )
    }

    setUser(authData.record)
    setToken(authData.token)

    // Log de auditoria de login
    await logAuditEvent({
      action: 'login',
      description: `Acesso realizado por ${authData.record.name || email}`,
      target_user_id: authData.record.id,
      target_user_email: authData.record.email,
      actorOverride: {
        id: authData.record.id,
        name: authData.record.name,
        email: authData.record.email,
      },
    })
  }

  const signup = async (email: string, pass: string, name: string) => {
    const now = new Date().toISOString()
    await pb.collection('users').create({
      email,
      password: pass,
      passwordConfirm: pass,
      name,
      role: 'operator',
      status: 'active',
      privacy_consent_date: now,
      privacy_policy_version: 'v1.0',
      data_treatment_purpose:
        'Operação logística e emissão de conhecimentos de transporte rodoviário',
    })
    // Auto login
    await login(email, pass)
  }

  const updateProfile = async (data: { name?: string; phone?: string; password?: string }) => {
    if (!user) throw new Error('Não autenticado')

    const payload: Record<string, unknown> = {}
    if (data.name) payload.name = data.name
    if (data.phone !== undefined) payload.phone = data.phone
    if (data.password) {
      payload.password = data.password
      payload.passwordConfirm = data.password
    }

    const updated = await pb.collection('users').update(user.id, payload)
    setUser(updated)

    if (data.password) {
      await logAuditEvent({
        action: 'password_change',
        description: `Usuário ${updated.name} alterou sua própria senha de acesso`,
        target_user_id: user.id,
        target_user_email: user.email,
      })
    } else {
      await logAuditEvent({
        action: 'update_user',
        description: `Usuário ${updated.name} atualizou seus dados cadastrais de perfil`,
        target_user_id: user.id,
        target_user_email: user.email,
        details: { fields: Object.keys(data).filter((k) => k !== 'password') },
      })
    }
  }

  const requestPasswordReset = async (email: string) => {
    await pb.collection('users').requestPasswordReset(email)
  }

  const logout = () => {
    if (user) {
      logAuditEvent({
        action: 'logout',
        description: `Logout manual por ${user.name || user.email}`,
        target_user_id: user.id,
        target_user_email: user.email,
      })
    }
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        role: currentRole,
        roleConfig,
        hasPermission,
        canViewValues,
        login,
        signup,
        requestPasswordReset,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
