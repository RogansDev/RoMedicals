import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import DoctorOnboarding from './components/DoctorOnboarding';
import AdminDashboard from './components/AdminDashboard';
import RomedicalsDashboard from './components/RomedicalsDashboard';
import CredentialsSetup from './components/CredentialsSetup';
import QuickCredentialsFix from './components/QuickCredentialsFix';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Agenda from './components/Agenda';
import PatientFicha from './components/PatientFicha';
import Specialists from './components/Specialists';
import Specialties from './components/Specialties';
import Consents from './components/Consents';
import SpecialistSchedule from './components/SpecialistSchedule';
import Patients from './components/Patients';
import Administration from './components/Administration';
import Configuration from './components/Configuration';
import DoctorDashboard from './components/DoctorDashboard';
import Permissions from './components/Permissions';
import UserManagement from './components/UserManagement';
import NuevoEspecialistaPage from './components/NuevoEspecialistaPage';
import NuevoPacientePage from './components/NuevoPacientePage';
import UserDetails from './components/UserDetails';
import MedicalConsultation from './components/MedicalConsultation';
import NewConsultation from './components/NewConsultation';
import DoctorScheduleConfig from './components/DoctorScheduleConfig';
import Integrations from './components/Integrations';

// Componente para rutas protegidas por autenticación y/o rol
const ProtectedRoute = ({ children, allowRoles = null, redirectTo = '/login' }) => {
  const token = localStorage.getItem('authToken');
  const userRaw = localStorage.getItem('user');
  const user = (() => { try { return JSON.parse(userRaw || 'null'); } catch { return null; } })();
  const isAllowed = !!token && (!allowRoles || (user && allowRoles.includes(user.role)));
  return isAllowed ? children : <Navigate to={redirectTo} replace />;
};

// Componente para rutas públicas (redirige si ya autenticado)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  const userRaw = localStorage.getItem('user');
  const user = (() => { try { return JSON.parse(userRaw || 'null'); } catch { return null; } })();
  
  if (token && user) {
    // Redirigir según el rol del usuario
    if (user.role === 'romedicals_admin') {
      return <Navigate to="/dashboard" replace />;
    } else if (user.role === 'super_user') {
      return <Navigate to="/company-dashboard" replace />;
    } else if (user.role === 'medical_user') {
      return <Navigate to="/doctor/dashboard" replace />;
    } else {
      return <Navigate to="/agenda" replace />;
    }
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <Routes>
          {/* Login general */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Login para Superadmin -> solo permite rol super_user */}
          <Route
            path="/admin"
            element={
              <PublicRoute>
                <Login expectedRole="super_user" postLoginRedirect="/company-dashboard" />
              </PublicRoute>
            }
          />

          {/* Login para Médico -> solo permite rol medical_user */}
          <Route
            path="/doctor"
            element={
              <PublicRoute>
                <Login expectedRole="medical_user" postLoginRedirect="/agenda" />
              </PublicRoute>
            }
          />

          {/* Onboarding - Solo para super_users que necesitan configuración inicial */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <Onboarding />
              </ProtectedRoute>
            }
          />

          {/* Doctor Onboarding - Para médicos que necesitan configuración inicial */}
          <Route
            path="/doctor-onboarding"
            element={<DoctorOnboarding />}
          />
          
          {/* Agenda - Dashboard principal */}
          <Route
            path="/agenda"
            element={
              <ProtectedRoute allowRoles={["super_user", "medical_user", "administrative", "nursing"]}>
                <Layout>
                  <Agenda />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Dashboard Médico */}
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowRoles={["medical_user"]}>
                <Layout>
                  <DoctorDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Dashboard ROMEDICALS - Solo para romedicals_admin */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowRoles={["romedicals_admin"]}>
                <RomedicalsDashboard />
              </ProtectedRoute>
            }
          />

          {/* Dashboard de Empresa Cliente - Solo para super_user */}
          <Route
            path="/company-dashboard"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Integraciones API - Solo para super_user */}
          <Route
            path="/integrations"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <Integrations />
              </ProtectedRoute>
            }
          />

          {/* Dashboard de Administración de Superadmins - Solo para ROMEDICALS */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowRoles={["romedicals_admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Configuración de Credenciales ROMEDICALS - Accesible para cualquier usuario autenticado */}
          <Route
            path="/setup-credentials"
            element={
              <ProtectedRoute allowRoles={null}>
                <CredentialsSetup />
              </ProtectedRoute>
            }
          />

          {/* Configuración Rápida de Credenciales - Sin restricciones */}
          <Route
            path="/fix-credentials"
            element={
              <ProtectedRoute allowRoles={null}>
                <QuickCredentialsFix />
              </ProtectedRoute>
            }
          />
          
          {/* Ficha del paciente */}
          <Route
            path="/patients/:patientId/ficha"
            element={
              <ProtectedRoute>
                <Layout>
                  <PatientFicha />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Consulta médica */}
          <Route
            path="/consultation/:patientId"
            element={
              <ProtectedRoute allowRoles={["medical_user"]}>
                <Layout>
                  <MedicalConsultation />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Nueva consulta - selección de paciente */}
          <Route
            path="/new-consultation"
            element={
              <ProtectedRoute allowRoles={["medical_user"]}>
                <Layout>
                  <NewConsultation />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Gestión de Especialistas */}
          <Route
            path="/specialists"
            element={
              <ProtectedRoute>
                <Layout>
                  <Specialists />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Gestión de Especialidades */}
          <Route
            path="/specialties"
            element={
              <ProtectedRoute>
                <Layout>
                  <Specialties />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Gestión de Consentimientos */}
          <Route
            path="/consents"
            element={
              <ProtectedRoute>
                <Layout>
                  <Consents />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Gestión de usuarios */}
          <Route
            path="/user-management"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Nuevo especialista */}
          <Route
            path="/user-management/new-specialist"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <Layout>
                  <NuevoEspecialistaPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Nuevo paciente */}
          <Route
            path="/user-management/new-patient"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <Layout>
                  <NuevoPacientePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Configuración de horario de médico */}
          <Route
            path="/user-management/doctor-schedule/:doctorId?"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <DoctorScheduleConfig />
              </ProtectedRoute>
            }
          />

          {/* Detalles de usuario */}
          <Route
            path="/user-details/:userId"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <Layout>
                  <UserDetails />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Permisos y roles */}
          <Route
            path="/permissions"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <Layout>
                  <Permissions />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Horarios de Especialistas */}
          <Route
            path="/schedules"
            element={
              <ProtectedRoute>
                <Layout>
                  <SpecialistSchedule />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Gestión de Pacientes */}
          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <Layout>
                  <Patients />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Configuración */}
          <Route
            path="/administration"
            element={
              <ProtectedRoute allowRoles={["super_user"]}>
                <Layout>
                  <Configuration />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/cashier"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Gestión de Cajas
                    </h2>
                    <p className="text-gray-600">
                      Módulo en desarrollo - próximamente disponible
                    </p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/collections"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Recaudación
                    </h2>
                    <p className="text-gray-600">
                      Módulo en desarrollo - próximamente disponible
                    </p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
          

          
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Reportes
                    </h2>
                    <p className="text-gray-600">
                      Módulo en desarrollo - próximamente disponible
                    </p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/modules"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Módulos
                    </h2>
                    <p className="text-gray-600">
                      Módulo en desarrollo - próximamente disponible
                    </p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/crm"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      CRM
                    </h2>
                    <p className="text-gray-600">
                      Módulo en desarrollo - próximamente disponible
                    </p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Ruta por defecto */}
          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />
          
          {/* Ruta 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-xl text-gray-600 mb-8">
                    Página no encontrada
                  </p>
                  <a
                    href="/agenda"
                    className="btn-primary"
                  >
                    Volver a la Agenda
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
