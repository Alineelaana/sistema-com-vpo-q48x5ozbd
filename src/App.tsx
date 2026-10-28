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
import { TripsPage } from './pages/TripsPage'
import { CtePage } from './pages/CtePage'
import { VehiclesPage } from './pages/VehiclesPage'
import { DriversPage } from './pages/DriversPage'
import { CompanyPage } from './pages/CompanyPage'
import { FinesPage } from './pages/FinesPage'
import { DeliveriesPage } from './pages/DeliveriesPage'
import { RoutingPage } from './pages/RoutingPage'
import { ControlTowerPage } from './pages/ControlTowerPage'
import { FreightAuditPage } from './pages/FreightAuditPage'
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
              <Route path="/" element={<DashboardPage />} />
              <Route path="/deliveries" element={<DeliveriesPage />} />
              <Route path="/routing" element={<RoutingPage />} />
              <Route path="/control-tower" element={<ControlTowerPage />} />
              <Route path="/freight-audit" element={<FreightAuditPage />} />
              <Route path="/vpo-calc" element={<VpoPage />} />
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/cte" element={<CtePage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/fines" element={<FinesPage />} />
              <Route path="/company" element={<CompanyPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
