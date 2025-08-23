import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  // Datos de ejemplo para las estadísticas
  const stats = [
    {
      id: 1,
      name: 'Citas Hoy',
      value: '24',
      change: '+12%',
      changeType: 'positive',
      icon: '📅',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 2,
      name: 'Pacientes Activos',
      value: '1,234',
      change: '+8%',
      changeType: 'positive',
      icon: '👥',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 3,
      name: 'Ingresos Mensuales',
      value: '$45,678',
      change: '+15%',
      changeType: 'positive',
      icon: '💰',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      id: 4,
      name: 'Especialistas',
      value: '12',
      change: '+2',
      changeType: 'positive',
      icon: '👨‍⚕️',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'appointment',
      title: 'Nueva cita programada',
      description: 'Dr. García - Paciente: María López',
      time: 'Hace 5 minutos',
      icon: '📅'
    },
    {
      id: 2,
      type: 'patient',
      title: 'Paciente registrado',
      description: 'Juan Carlos Rodríguez',
      time: 'Hace 15 minutos',
      icon: '👤'
    },
    {
      id: 3,
      type: 'payment',
      title: 'Pago recibido',
      description: '$150.00 - Consulta general',
      time: 'Hace 1 hora',
      icon: '💳'
    },
    {
      id: 4,
      type: 'prescription',
      title: 'Receta generada',
      description: 'Dr. Martínez - Antibióticos',
      time: 'Hace 2 horas',
      icon: '💊'
    }
  ];

  const quickActions = [
    {
      name: 'Nueva Cita',
      href: '/agenda',
      icon: '📅',
      description: 'Programar nueva cita médica'
    },
    {
      name: 'Registrar Paciente',
      href: '/patients',
      icon: '👤',
      description: 'Agregar nuevo paciente'
    },
    {
      name: 'Generar Receta',
      href: '/prescriptions',
      icon: '💊',
      description: 'Crear nueva receta médica'
    },
    {
      name: 'Ver Reportes',
      href: '/reports',
      icon: '📊',
      description: 'Consultar estadísticas'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Bienvenido al sistema de gestión médica</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Última actualización: {new Date().toLocaleString('es-ES')}
          </span>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="dashboard-stats">
        {stats.map((stat) => (
          <div key={stat.id} className="stat-card">
            <div className="stat-icon" style={{ background: `linear-gradient(135deg, ${stat.color})` }}>
              <span>{stat.icon}</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.name}</div>
            <div className={`stat-change ${stat.changeType}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Acciones Rápidas */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Acciones Rápidas</h2>
              <p className="card-subtitle">Acceso directo a funciones principales</p>
            </div>
            
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  to={action.href}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-lg group-hover:scale-110 transition-transform">
                      <span>{action.icon}</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {action.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {action.description}
                      </p>
                    </div>
                    <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Actividad Reciente</h2>
              <p className="card-subtitle">Últimas actividades del sistema</p>
            </div>
            
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">{activity.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                to="/activity"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver toda la actividad →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Información del Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">✅</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Sistema Operativo</h3>
            <p className="text-sm text-gray-600 mt-1">Todos los servicios funcionando correctamente</p>
          </div>
        </div>

        <div className="card">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Seguridad</h3>
            <p className="text-sm text-gray-600 mt-1">Conexión segura y datos protegidos</p>
          </div>
        </div>

        <div className="card">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Base de Datos</h3>
            <p className="text-sm text-gray-600 mt-1">Sincronización automática activa</p>
          </div>
        </div>

        <div className="card">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Rendimiento</h3>
            <p className="text-sm text-gray-600 mt-1">Respuesta rápida y optimizada</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 