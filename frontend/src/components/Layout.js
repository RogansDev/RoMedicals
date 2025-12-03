import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoGeneral from '../img/logo-general.svg';
import powered from '../img/powered.svg';
import iconConfig from '../img/configuracion-icon.svg';
import iconHelp from '../img/ayuda-icon.svg';
import { HomeIcon, UsersIcon, CalendarIcon, MenuSidebarIcon } from './icons/AppIcons';
import toast from 'react-hot-toast';

// Icono de Integraciones (API/Plug)
const IntegrationsIcon = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

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
    { name: 'Integraciones', href: '/integrations', icon: 'integrations', IconComponent: IntegrationsIcon },
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
  
  // Estado para saber si hay una videollamada activa
  const [isTelemedicineActive, setIsTelemedicineActive] = useState(false);
  
  // Escuchar evento de telemedicina desde MedicalConsultation
  useEffect(() => {
    const handleTelemedicineStatus = (event) => {
      setIsTelemedicineActive(event.detail?.isActive || false);
    };
    
    window.addEventListener('telemedicine-status', handleTelemedicineStatus);
    return () => window.removeEventListener('telemedicine-status', handleTelemedicineStatus);
  }, []);
  
  // Función para finalizar la llamada
  const handleEndCall = () => {
    window.dispatchEvent(new CustomEvent('end-telemedicine-call'));
  };
  
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
                    {item.IconComponent ? (
                      <item.IconComponent 
                        className="nav-icon"
                        stroke={isActive ? '#2563EB' : '#9A9A9A'}
                      />
                    ) : (
                      <img src={item.icon} alt="icon" className="nav-icon" />
                    )}
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
              
              {/* Botón Finalizar llamada - Solo visible en telemedicina (alineado a la derecha) */}
              {isConsultation && isTelemedicineActive && (
                <button
                  onClick={handleEndCall}
                  className="flex items-center gap-2 px-4 py-2 bg-[#C53030] hover:bg-[#9B2C2C] text-white rounded-lg transition-colors font-medium"
                >
                  <span>Finalizar llamada</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_endcall)">
                      <path d="M6.73397 9.2653C7.45986 9.99096 8.30047 10.5919 9.22197 11.044C9.35965 11.1072 9.51477 11.1216 9.66176 11.0849C9.80875 11.0482 9.93886 10.9625 10.0306 10.842L10.2673 10.532C10.3915 10.3664 10.5525 10.232 10.7377 10.1394C10.9228 10.0468 11.127 9.99863 11.334 9.99863H13.334C13.6876 9.99863 14.0267 10.1391 14.2768 10.3892C14.5268 10.6392 14.6673 10.9783 14.6673 11.332V13.332C14.6673 13.6856 14.5268 14.0247 14.2768 14.2748C14.0267 14.5248 13.6876 14.6653 13.334 14.6653C11.7581 14.6653 10.1977 14.3549 8.74174 13.7519C7.28583 13.1488 5.96295 12.2649 4.84863 11.1506M14.6673 1.33203L1.33398 14.6654M3.17398 9.05336C1.97132 7.1398 1.33351 4.92549 1.33398 2.66536C1.33398 2.31174 1.47446 1.9726 1.72451 1.72256C1.97456 1.47251 2.3137 1.33203 2.66732 1.33203H4.66732C5.02094 1.33203 5.36008 1.47251 5.61013 1.72256C5.86018 1.9726 6.00065 2.31174 6.00065 2.66536V4.66536C6.00065 4.87236 5.95246 5.07651 5.85989 5.26165C5.76732 5.44679 5.63291 5.60784 5.46732 5.73203L5.15532 5.96603C5.03293 6.05948 4.94666 6.19242 4.91118 6.34226C4.87569 6.49211 4.89317 6.64962 4.96065 6.78803C5.01287 6.89416 5.0671 6.99929 5.12332 7.10336" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
                    </g>
                    <defs>
                      <clipPath id="clip0_endcall">
                        <rect width="16" height="16" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>
                </button>
              )}
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