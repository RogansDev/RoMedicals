import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
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

// Componente para rutas protegidas
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  return token ? children : <Navigate to="/login" replace />;
};

// Componente para rutas públicas (solo si no está autenticado)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  return token ? <Navigate to="/agenda" replace /> : children;
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
          {/* Ruta pública */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          
          {/* Agenda - Dashboard principal */}
          <Route
            path="/agenda"
            element={
              <ProtectedRoute>
                <Layout>
                  <Agenda />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          {/* Dashboard original */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
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

          {/* Administración */}
          <Route
            path="/administration"
            element={
              <ProtectedRoute>
                <Layout>
                  <Administration />
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
            element={<Navigate to="/agenda" replace />}
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
