import React from 'react';
import { Link } from 'react-router-dom';

const Administration = () => {
  const adminModules = [
    {
      name: 'Especialistas',
      href: '/specialists',
      icon: '👨‍⚕️',
      description: 'Gestionar especialistas médicos',
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Especialidades',
      href: '/specialties',
      icon: '🏥',
      description: 'Configurar especialidades médicas',
      color: 'from-green-500 to-green-600'
    },
    {
      name: 'Consentimientos',
      href: '/consents',
      icon: '🧾',
      description: 'Plantillas de consentimientos',
      color: 'from-teal-500 to-teal-600'
    },
    {
      name: 'Horarios',
      href: '/schedules',
      icon: '📅',
      description: 'Gestionar horarios de especialistas',
      color: 'from-purple-500 to-purple-600'
    },
    {
      name: 'Usuarios',
      href: '/users',
      icon: '👤',
      description: 'Administrar usuarios del sistema',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administración</h1>
          <p className="text-gray-600 mt-1">Gestión del sistema médico</p>
        </div>
      </div>

      {/* Módulos de Administración */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminModules.map((module) => (
          <Link
            key={module.name}
            to={module.href}
            className="card hover:scale-105 transition-transform duration-200 group"
          >
            <div className="text-center">
              <div 
                className={`w-16 h-16 bg-gradient-to-r ${module.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
              >
                <span className="text-white text-2xl">{module.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {module.name}
              </h3>
              <p className="text-sm text-gray-600">
                {module.description}
              </p>
              <div className="mt-4 flex items-center justify-center text-blue-600 group-hover:text-blue-800 transition-colors">
                <span className="text-sm font-medium">Acceder</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Estadísticas del Sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Resumen del Sistema</h2>
            <p className="card-subtitle">Información general de la plataforma</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Especialistas Activos</span>
              <span className="font-semibold text-gray-900">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Especialidades</span>
              <span className="font-semibold text-gray-900">9</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Usuarios Registrados</span>
              <span className="font-semibold text-gray-900">25</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pacientes</span>
              <span className="font-semibold text-gray-900">1,234</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Estado del Sistema</h2>
            <p className="card-subtitle">Monitoreo en tiempo real</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Base de datos</span>
              <span className="ml-auto text-sm font-medium text-green-600">Operativo</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">API REST</span>
              <span className="ml-auto text-sm font-medium text-green-600">Operativo</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">Frontend</span>
              <span className="ml-auto text-sm font-medium text-green-600">Operativo</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-600">SSL/HTTPS</span>
              <span className="ml-auto text-sm font-medium text-green-600">Activo</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Acciones Rápidas</h2>
            <p className="card-subtitle">Funciones administrativas</p>
          </div>
          
          <div className="space-y-3">
            <button className="w-full btn-primary">
              <span style={{ fontSize: '14px', marginRight: '8px' }}>📊</span>
              Generar Reporte
            </button>
            <button className="w-full btn-secondary">
              <span style={{ fontSize: '14px', marginRight: '8px' }}>🔧</span>
              Configuración
            </button>
            <button className="w-full btn-secondary">
              <span style={{ fontSize: '14px', marginRight: '8px' }}>💾</span>
              Respaldo
            </button>
            <button className="w-full btn-secondary">
              <span style={{ fontSize: '14px', marginRight: '8px' }}>📋</span>
              Logs del Sistema
            </button>
          </div>
        </div>
      </div>

      {/* Información de la Versión */}
      <div className="card">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">RoMedicals v1.0.0</h3>
          <p className="text-sm text-gray-600">
            Sistema de Gestión Médica - Desarrollado para cumplir con las regulaciones colombianas
          </p>
          <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-500">
            <span>© 2024 RoMedicals</span>
            <span>•</span>
            <span>Todos los derechos reservados</span>
            <span>•</span>
            <span>Colombia</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Administration; 