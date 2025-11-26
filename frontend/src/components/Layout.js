import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoGeneral from '../img/logo-general.svg';
import powered from '../img/powered.svg';
import iconConfig from '../img/configuracion-icon.svg';
import iconHelp from '../img/ayuda-icon.svg';
import { HomeIcon, UsersIcon, CalendarIcon, MenuSidebarIcon } from './icons/AppIcons';
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
    { name: 'Inicio', href: '/doctor/dashboard', Icon: HomeIcon },
    { name: 'Pacientes', href: '/patients', Icon: UsersIcon },
    { name: 'Agenda', href: '/agenda', Icon: CalendarIcon },
  ] : [
    { name: 'Inicio', href: '/company-dashboard', Icon: HomeIcon },
    { name: 'Gestion de usuarios', href: '/user-management', Icon: UsersIcon },
    { name: 'Permisos y roles', href: '/permissions', Icon: CalendarIcon },
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
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/doctor/dashboard' || location.pathname === '/company-dashboard';
  const isConsultation = location.pathname.startsWith('/consultation/');
  const dateStr = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Título del dashboard según el rol
  const getDashboardTitle = () => {
    if (isDoctor) return 'Dashboard Médico';
    return 'Dashboard Administrativo';
  };
  
  // Subtítulo del dashboard según el rol
  const getDashboardSubtitle = () => {
    if (isDoctor) {
      const doctorName = user.firstName ? `Dr. ${user.firstName} ${user.lastName}` : 'Médico';
      return `${doctorName} - ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}`;
    }
    // Para superadmin mostrar nombre de empresa
    const companyName = user.companyName || user.company_name || 'Empresa';
    return `${companyName} - ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}`;
  };
  
  // Título para la consulta médica
  const getConsultationTitle = () => 'Consulta médica en curso';
  
  // Subtítulo para la consulta médica
  const getConsultationSubtitle = () => {
    const doctorName = user.firstName ? `Dr. ${user.firstName} ${user.lastName}` : 'Médico';
    return `${doctorName} - ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}`;
  };

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
            const IconComponent = item.Icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <IconComponent 
                  width={20} 
                  height={20} 
                  stroke={isActive ? '#2563EB' : '#9A9A9A'} 
                  className="nav-icon"
                />
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
            <div className="flex flex-row items-center w-full justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="rounded-md transition-colors"
                >
                  <MenuSidebarIcon width={44} height={44} />
                </button>
                {isDashboard ? (
                  <div className="ml-4">
                    <h1 className="text-[22px] font-semibold text-gray-900 leading-6">{getDashboardTitle()}</h1>
                    <p className="text-sm text-gray-500 mt-1">{getDashboardSubtitle()}</p>
                  </div>
                ) : isConsultation ? (
                  <div className="ml-4">
                    <h1 className="text-[22px] font-semibold text-gray-900 leading-6">{getConsultationTitle()}</h1>
                    <p className="text-sm text-gray-500 mt-1">{getConsultationSubtitle()}</p>
                  </div>
                ) : (
                  <h1 className="header-title ml-4">
                    {navigation.find(item => item.href === location.pathname)?.name || 'RoMedicals'}
                  </h1>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Back Button */}
        <div className="px-6 pt-4 mb-4">
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