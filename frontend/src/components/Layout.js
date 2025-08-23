import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Sesión cerrada exitosamente');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const navigation = [
    { name: 'Agenda', href: '/agenda', icon: '📅' },
    { name: 'Pacientes', href: '/patients', icon: '👥' },
    { name: 'Cajas', href: '/cashier', icon: '💰', hidden: true },
    { name: 'Recaudación', href: '/collections', icon: '💳', hidden: true },
    { name: 'Administración', href: '/administration', icon: '⚙️' },
    { name: 'Reportes', href: '/reports', icon: '📊' },
    { name: 'Módulos', href: '/modules', icon: '🔧', hidden: true },
    { name: 'CRM', href: '/crm', icon: '📞', hidden: true },
  ];

  const adminNavigation = [
    { name: 'Especialistas', href: '/specialists', icon: '👨‍⚕️' },
    { name: 'Especialidades', href: '/specialties', icon: '🏥' },
    { name: 'Consentimientos', href: '/consents', icon: '🧾' },
    { name: 'Horarios', href: '/schedules', icon: '📅' },
    { name: 'Usuarios', href: '/users', icon: '👤' },
  ];

  // Verificar si hay páginas anteriores en el historial
  const canGoBack = window.history.length > 1;

  // Obtener las rutas principales del menú
  const mainRoutes = [...navigation.map(item => item.href)];
  
  // Verificar si estamos en una página principal
  const isMainPage = mainRoutes.includes(location.pathname);

  // Mostrar botón de atrás solo si no estamos en una página principal
  const showBackButton = canGoBack && !isMainPage;

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">RoMedicals</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            title={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
        
        <nav className="mt-6">
          {navigation.filter(item => !item.hidden).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span style={{ fontSize: '18px', marginRight: '12px' }}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}

          {/* Menú de Administración */}
          {location.pathname.startsWith('/administration') && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-6">
                Administración
              </h3>
              {adminNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span style={{ fontSize: '16px', marginRight: '12px' }}>{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user.firstName ? `${user.firstName} ${user.lastName}` : 'Usuario'}
              </p>
              <p className="text-xs text-gray-500">{user.email || 'usuario@romedicals.com'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="flex flex-row items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <h1 className="header-title ml-4">
                {navigation.find(item => item.href === location.pathname)?.name || 
                 adminNavigation.find(item => item.href === location.pathname)?.name || 
                 'RoMedicals'}
              </h1>
            </div>

            <div className="header-actions">
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.19 4.19C4.19 4.19 4.19 4.19 4.19 4.19M4.19 4.19C4.19 4.19 4.19 4.19 4.19 4.19M4.19 4.19C4.19 4.19 4.19 4.19 4.19 4.19" />
                  </svg>
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
                </button>

                {/* User menu */}
                <div className="relative">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    <span className="hidden md:block text-sm font-medium">
                      {user.firstName ? `${user.firstName} ${user.lastName}` : 'Usuario'}
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Back Button */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 mb-4">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Atrás</span>
            </button>
          )}
        </div>

        {/* Page content */}
        <main className="fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 