import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { RefreshCw, ShieldAlert } from 'lucide-react'
import type { AppModule } from '@/types/userManagement'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  requiredModule?: AppModule
  adminOnly?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredModule, adminOnly }) => {
  const { isAuthenticated, isLoading, role, hasPermission } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <RefreshCw className="h-6 w-6 animate-spin mr-2 text-indigo-500" />
        <span>Carregando sessão...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && role !== 'admin') {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-500">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
        <p className="text-sm text-slate-500">
          Esta área é restrita a administradores do sistema conforme a política de controle de
          acesso (LGPD Art. 46).
        </p>
        <Button onClick={() => window.history.back()} variant="outline">
          Voltar à tela anterior
        </Button>
      </div>
    )
  }

  if (requiredModule && !hasPermission(requiredModule)) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-500">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Módulo Não Autorizado</h2>
        <p className="text-sm text-slate-500">
          Seu perfil ({role}) não possui permissão para acessar este módulo operacional. Entre em
          contato com seu gestor.
        </p>
        <Button onClick={() => window.history.back()} variant="outline">
          Voltar à tela anterior
        </Button>
      </div>
    )
  }

  return <Outlet />
}
