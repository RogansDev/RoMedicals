import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  ChevronDownIcon,
  UserIcon,
  CalendarIcon,
  EnvelopeIcon,
  PlusIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { specialtiesAPI, usersAPI, patientsAPI } from '../config/api';

const UserManagement = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Leer el parámetro tab de la URL al inicializar el estado
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl && ['medicos', 'pacientes', 'enfermeria'].includes(tabFromUrl) ? tabFromUrl : 'medicos';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [userType, setUserType] = useState('');
  const [users, setUsers] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos iniciales y actualizar cuando cambie el tab activo
  useEffect(() => {
    // Leer el parámetro tab de la URL
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['medicos', 'pacientes', 'enfermeria'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);
  
  // Cargar datos cuando cambie el tab activo o el parámetro de búsqueda
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar especialidades (solo si no se han cargado)
        if (specialties.length === 0) {
          const specialtiesResponse = await specialtiesAPI.getAll();
          setSpecialties(specialtiesResponse.data || []);
        }
        
        // Cargar usuarios según el tab activo
        let usersData = [];
        if (activeTab === 'medicos') {
          const doctorsResponse = await usersAPI.getDoctors();
          usersData = doctorsResponse.data || [];
        } else if (activeTab === 'pacientes') {
          const patientsResponse = await patientsAPI.getAll();
          // Transformar datos de pacientes al formato esperado por UserCard
          const patients = patientsResponse.data?.patients || patientsResponse.patients || [];
          usersData = patients.map(p => ({
            id: p.id,
            firstName: p.first_name || p.firstName,
            lastName: p.last_name || p.lastName,
            email: p.email || '',
            specialty: '',
            lastLogin: p.created_at || '',
            isActive: p.is_active !== undefined ? p.is_active : true
          }));
        } else if (activeTab === 'enfermeria') {
          // TODO: Implementar endpoint de enfermería
          usersData = [];
        }
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error cargando datos:', error);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchParams]);

  const handleAddNewSpecialist = () => {
    navigate('/user-management/new-specialist');
  };

  const handleAddPatient = () => {
    navigate('/user-management/new-patient');
  };

  const handleAddNursing = () => {
    // TODO: Implementar ruta para agregar enfermería
    navigate('/user-management');
  };

  const tabs = [
    { id: 'medicos', label: 'Médicos' },
    { id: 'pacientes', label: 'Pacientes' },
    { id: 'enfermeria', label: 'Enfermería' }
  ];

  const UserCard = ({ user, showPrefix = true, showToggle = true, userType = 'medico' }) => {
    const formatDate = (dateString) => {
      if (!dateString) return 'Nunca';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO');
    };

    const getSessionCount = () => {
      // TODO: Implementar conteo de sesiones real
      return Math.floor(Math.random() * 300) + 50;
    };

    const getDisplayName = () => {
      if (!user.firstName && !user.lastName) return user.email;
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      return showPrefix ? `Dr. ${fullName}` : fullName;
    };

    const handleViewDetails = () => {
      // Redirigir a la página de detalles con el tipo de usuario
      navigate(`/user-details/${user.id}?type=${userType}`);
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
        {/* Nombre con título en la parte superior izquierda */}
        <h3 className="text-base font-bold text-gray-900 mb-4">
          {getDisplayName()}
        </h3>
        
        {/* Layout en dos columnas: Info a la izquierda, Estado/Detalles a la derecha */}
        <div className="flex items-start gap-6">
          {/* Columna izquierda: Avatar + Información */}
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Avatar circular */}
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-8 h-8 text-gray-500" />
            </div>
            
            {/* Información del usuario */}
            <div className="flex-1 min-w-0">
              {/* Email y Especialidad */}
              <div className="flex items-center mb-2 text-xs text-gray-600">
                <EnvelopeIcon className="w-4 h-4 mr-1 flex-shrink-0 text-gray-400" />
                <span className="truncate">{user.email || 'Sin email'}</span>
                {user.specialty && (
                  <>
                    <span className="mx-1 text-gray-400">•</span>
                    <span>{user.specialty}</span>
                  </>
                )}
              </div>
              
              {/* Último acceso y sesiones */}
              <div className="flex items-center text-xs text-gray-500">
                <CalendarIcon className="w-4 h-4 mr-1 flex-shrink-0 text-gray-400" />
                <span>Último acceso: {formatDate(user.lastLogin)}</span>
                <span className="mx-1 text-gray-400">•</span>
                <span>{getSessionCount()} sesiones</span>
              </div>
            </div>
          </div>
          
          {/* Separador vertical */}
          <div className="w-px bg-gray-200 h-20 flex-shrink-0"></div>
          
          {/* Columna derecha: Estado y Detalles */}
          <div className="flex flex-col items-center space-y-2 flex-shrink-0 w-20">
            {showToggle ? (
              <>
                {/* Estado Activo */}
                <span className={`text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </span>
                
                {/* Toggle Switch */}
                <div 
                  className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                    user.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${
                    user.isActive ? 'right-0.5' : 'left-0.5'
                  }`}></div>
                </div>
                
                {/* Detalles */}
                <button 
                  onClick={handleViewDetails}
                  className="flex flex-col items-center space-y-1 text-gray-700 hover:text-blue-600 transition-colors mt-2"
                >
                  <span className="text-xs">Detalles</span>
                  <div className="relative">
                    <UserIcon className="w-5 h-5" />
                    <PencilIcon className="w-4 h-4 absolute -bottom-1 -right-1" />
                  </div>
                </button>
              </>
            ) : (
              /* Solo Detalles para pacientes/enfermeros */
              <button 
                onClick={handleViewDetails}
                className="flex flex-col items-center space-y-1 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <span className="text-xs">Detalles</span>
                <div className="relative">
                  <UserIcon className="w-5 h-5" />
                  <PencilIcon className="w-4 h-4 absolute -bottom-1 -right-1" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando usuarios...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar especialidades (solo si no se han cargado)
        if (specialties.length === 0) {
          const specialtiesResponse = await specialtiesAPI.getAll();
          setSpecialties(specialtiesResponse.data || []);
        }
        
        // Cargar usuarios según el tab activo
        let usersData = [];
        if (activeTab === 'medicos') {
          const doctorsResponse = await usersAPI.getDoctors();
          usersData = doctorsResponse.data || [];
        } else if (activeTab === 'pacientes') {
          const patientsResponse = await patientsAPI.getAll();
          // Transformar datos de pacientes al formato esperado por UserCard
          const patients = patientsResponse.data?.patients || patientsResponse.patients || [];
          usersData = patients.map(p => ({
            id: p.id,
            firstName: p.first_name || p.firstName,
            lastName: p.last_name || p.lastName,
            email: p.email || '',
            specialty: '',
            lastLogin: p.created_at || '',
            isActive: p.is_active !== undefined ? p.is_active : true
          }));
        } else if (activeTab === 'enfermeria') {
          // TODO: Implementar endpoint de enfermería
          usersData = [];
        }
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error cargando datos:', error);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={handleRetry}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestión de usuarios</h1>
        <p className="text-gray-600">Administra los usuarios de tu organización</p>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar por Nombre o Documento
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ingresa el Nombre o Documento de identidad"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* User Type Dropdown */}
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de usuario
            </label>
            <div className="relative">
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                <option value="medico">Médico</option>
                <option value="paciente">Paciente</option>
                <option value="enfermero">Enfermero</option>
                <option value="administrativo">Administrativo</option>
              </select>
              <ChevronDownIcon className="w-5 h-5 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Search Button */}
          <div className="sm:w-24 flex items-end">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* User Type Tabs */}
      <div>
        <div className="flex items-end justify-between">
          <nav className="flex space-x-0 gap-4 relative bottom-[-1px]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-[6px] font-medium text-sm rounded-t-lg border border-gray-200 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 border-b-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          
          {/* Botones de agregar - visibles según el tab activo */}
          {activeTab === 'medicos' && (
            <div className="flex items-center space-x-2 mb-3">
              <button
                onClick={() => navigate('/user-management/doctor-schedule')}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-1 rounded-lg hover:bg-green-700 transition-colors"
                title="Configurar horarios de disponibilidad de médicos"
              >
                <span>📅</span>
                <span>Configurar Horarios</span>
              </button>
              <button
                onClick={handleAddNewSpecialist}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Agregar médico</span>
              </button>
            </div>
          )}
          
          {activeTab === 'pacientes' && (
            <button
              onClick={handleAddPatient}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 transition-colors mb-3"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Agregar paciente</span>
            </button>
          )}
          
          {activeTab === 'enfermeria' && (
            <button
              onClick={handleAddNursing}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-1 rounded-lg hover:bg-blue-700 transition-colors mb-3"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Agregar enfermería</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenido con fondo blanco */}
      <div className="bg-white rounded-lg rounded-tl-none border border-gray-200 p-6">
        {users.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {users.map((user) => (
              <UserCard 
                key={user.id} 
                user={user} 
                showPrefix={activeTab === 'medicos'}
                showToggle={activeTab === 'medicos'}
                userType={activeTab === 'pacientes' ? 'paciente' : activeTab === 'enfermeria' ? 'enfermero' : 'medico'}
              />
            ))}
          </div>
        ) : (
        <div className="text-center py-12">
          <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'medicos' ? 'No hay médicos registrados' : 
             activeTab === 'pacientes' ? 'No hay pacientes registrados' : 
             'No hay personal de enfermería registrado'}
          </p>
          
          {/* Botones de acción según el tab */}
          {activeTab === 'medicos' && (
            <button
              onClick={handleAddNewSpecialist}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Agregar primer médico</span>
            </button>
          )}
          
          {activeTab === 'pacientes' && (
            <button
              onClick={handleAddPatient}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Agregar primer paciente</span>
            </button>
          )}
          
          {activeTab === 'enfermeria' && (
            <button
              onClick={handleAddNursing}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Agregar personal de enfermería</span>
            </button>
          )}
        </div>
        )}

        {/* Load More Button */}
        {users.length > 0 && (
          <div className="mt-6 text-center">
            <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors">
              Cargar más usuarios
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;