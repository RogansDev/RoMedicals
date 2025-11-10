import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoGeneral from '../img/logo-general.svg';
import powered from '../img/powered.svg';
import iconHome from '../img/home.svg';
import iconUsers from '../img/gestion-usuarios.svg';
import iconPerms from '../img/permisos.svg';
import iconConfig from '../img/configuracion-icon.svg';
import iconHelp from '../img/ayuda-icon.svg';
import toast from 'react-hot-toast';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    toast.success('Sesión cerrada exitosamente');
    navigate('/login');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isDoctor = user?.role === 'medical_user';

  const navigation = isDoctor ? [
    { name: 'Inicio', href: '/doctor/dashboard', icon: iconHome },
    { name: 'Pacientes', href: '/patients', icon: iconUsers },
    { name: 'Agenda', href: '/agenda', icon: iconPerms },
  ] : [
    { name: 'Inicio', href: '/company-dashboard', icon: iconHome },
    { name: 'Gestion de usuarios', href: '/user-management', icon: iconUsers },
    { name: 'Permisos y roles', href: '/permissions', icon: iconPerms },
  ];

  const adminNavigation = [
    { name: 'Configuración', href: '/administration', icon: iconConfig },
    { name: 'Ayuda', href: '/help', icon: iconHelp },
  ];

  // Verificar si hay páginas anteriores en el historial
  const canGoBack = window.history.length > 1;

  // Obtener las rutas principales del menú
  const mainRoutes = [...navigation.map(item => item.href)];
  
  // Verificar si estamos en una página principal
  const isMainPage = mainRoutes.includes(location.pathname);

  // Mostrar botón de atrás solo si no estamos en una página principal
  const showBackButton = canGoBack && !isMainPage;
  const isDashboard = location.pathname === '/dashboard';
  const dateStr = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logoGeneral} alt="ROMEDICALS+" className="w-full" />
        </div>
        
        <nav className="mt-3">
          <div className="px-6 py-2 text-xs font-bold tracking-[0.2em] text-gray-400">MENU</div>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <img src={item.icon} alt="icon" className="nav-icon" />
                <span className="truncate text-[18px]">{item.name}</span>
              </Link>
            );
          })}

          {!isDoctor && (
            <div className="mt-8">
              <h3 className="px-6 py-2 text-xs font-bold tracking-[0.2em] text-gray-400">Administración</h3>
              {adminNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <img src={item.icon} alt="icon" className="nav-icon" />
                    <span className="truncate text-[18px]">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Logout inferior */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="border-t border-gray-200 px-6 py-4">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 text-orange-500 hover:text-orange-600 font-semibold">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
              Logout
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
            {isDashboard ? (
              <div className="flex items-center w-full">
                <button
                  onClick={() => setSidebarOpen(true)}
                  title="Abrir menú"
                  className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mr-4 hover:bg-gray-200 transition-colors"
                >
                  <img src={iconHome} alt="Abrir menú" className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-[22px] font-semibold text-gray-900 leading-6">Panel de Administrador</h1>
                  <p className="text-sm text-gray-500 mt-1">{user.firstName ? `Dr.  ${user.firstName} ${user.lastName}` : 'Administrador'} – {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-row items-center w-full justify-between">
                <div className="flex items-center">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <h1 className="header-title ml-4">
                    {navigation.find(item => item.href === location.pathname)?.name || 'RoMedicals'}
                  </h1>
                </div>
                <div className="header-actions">
                  <div className="flex items-center space-x-4">
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
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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