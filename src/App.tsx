/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'

import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { VpoPage } from './pages/VpoPage'
import { OperationsCenterPage } from './pages/OperationsCenterPage'
import { TripsPage } from './pages/TripsPage'
import { CtePage } from './pages/CtePage'
import { MdfePage } from './pages/MdfePage'
import { CiotPage } from './pages/CiotPage'
import { InsurancePage } from './pages/InsurancePage'
import { VehiclesPage } from './pages/VehiclesPage'
import { DriversPage } from './pages/DriversPage'
import { CompanyPage } from './pages/CompanyPage'
import { FinesPage } from './pages/FinesPage'
import { DeliveriesPage } from './pages/DeliveriesPage'
import { RoutingPage } from './pages/RoutingPage'
import { MinimumFloorAdminPage } from './pages/MinimumFloorAdminPage'
import { ControlTowerPage } from './pages/ControlTowerPage'
import { FreightAuditPage } from './pages/FreightAuditPage'
import { UsersPage } from './pages/UsersPage'
import { AuditTrailPage } from './pages/AuditTrailPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { AgentsCenterPage } from './pages/AgentsCenterPage'
import { EmailAgentTrainingPage } from './pages/EmailAgentTrainingPage'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Rota pública de login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas protegidas dentro do Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* Dashboard acessível a todos os perfis autenticados */}
              <Route path="/" element={<DashboardPage />} />

              {/* Módulo de Entregas & Coletas */}
              <Route element={<ProtectedRoute requiredModule="deliveries" />}>
                <Route path="/deliveries" element={<DeliveriesPage />} />
              </Route>

              {/* Módulo de Roteirização */}
              <Route element={<ProtectedRoute requiredModule="routing" />}>
                <Route path="/routing" element={<RoutingPage />} />
              </Route>

              {/* Módulo de Administração do Piso Mínimo ANTT */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/minimum-floor-admin" element={<MinimumFloorAdminPage />} />
              </Route>

              {/* Módulo Torre de Controle */}
              <Route element={<ProtectedRoute requiredModule="control_tower" />}>
                <Route path="/control-tower" element={<ControlTowerPage />} />
              </Route>

              {/* Módulo Auditoria de Frete */}
              <Route element={<ProtectedRoute requiredModule="freight_audit" />}>
                <Route path="/freight-audit" element={<FreightAuditPage />} />
              </Route>

              {/* Módulo Cálculo VPO */}
              <Route element={<ProtectedRoute requiredModule="vpo_calc" />}>
                <Route path="/vpo-calc" element={<VpoPage />} />
              </Route>

              {/* Módulo Central de Operações de Transporte (TMS Passo 1) */}
              <Route element={<ProtectedRoute requiredModule="trips" />}>
                <Route path="/operations-center" element={<OperationsCenterPage />} />
              </Route>

              {/* Módulo Viagens / Ordens de Transporte */}
              <Route element={<ProtectedRoute requiredModule="trips" />}>
                <Route path="/trips" element={<TripsPage />} />
              </Route>

              {/* Módulo CT-e, MDF-e, CIOT e Seguros */}
              <Route element={<ProtectedRoute requiredModule="cte" />}>
                <Route path="/cte" element={<CtePage />} />
                <Route path="/mdfe" element={<MdfePage />} />
                <Route path="/ciot" element={<CiotPage />} />
                <Route path="/seguros" element={<InsurancePage />} />
              </Route>

              {/* Módulo Veículos */}
              <Route element={<ProtectedRoute requiredModule="vehicles" />}>
                <Route path="/vehicles" element={<VehiclesPage />} />
              </Route>

              {/* Módulo Motoristas */}
              <Route element={<ProtectedRoute requiredModule="drivers" />}>
                <Route path="/drivers" element={<DriversPage />} />
              </Route>

              {/* Módulo Multas */}
              <Route element={<ProtectedRoute requiredModule="fines" />}>
                <Route path="/fines" element={<FinesPage />} />
              </Route>

              {/* Módulo Dados da Empresa */}
              <Route element={<ProtectedRoute requiredModule="company" />}>
                <Route path="/company" element={<CompanyPage />} />
              </Route>

              {/* Módulo Central de Agentes */}
              <Route element={<ProtectedRoute requiredModule="agents_center" />}>
                <Route path="/agents-center" element={<AgentsCenterPage />} />
              </Route>

              {/* Módulo Treinamento do Agente de E-mails (Administrador / Gestor) */}
              <Route element={<ProtectedRoute requiredModule="email_agent_training" />}>
                <Route path="/email-agent-training" element={<EmailAgentTrainingPage />} />
              </Route>

              {/* Módulo Gestão de Usuários (Apenas Administrador) */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/audit" element={<AuditTrailPage />} />
              </Route>

              {/* Política de Privacidade e Termos (Acessível a todos) */}
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
