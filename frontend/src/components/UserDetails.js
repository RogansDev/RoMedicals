import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, UserIcon, CalendarIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { usersAPI, patientsAPI } from '../config/api';

const UserDetails = () => {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const userType = searchParams.get('type') || 'medico';
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserDetails();
  }, [userId, userType]);

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (userType === 'paciente') {
        const response = await patientsAPI.getById(userId);
        console.log('📋 Respuesta completa paciente:', response);
        // Axios envuelve la respuesta en data
        const patientData = response.data?.patient || response.patient;
        console.log('📋 Datos del paciente:', patientData);
        if (patientData) {
          setUser(patientData);
        } else {
          setError('Paciente no encontrado');
        }
      } else if (userType === 'medico' || userType === 'enfermero') {
        // Obtener lista de usuarios y buscar el específico
        const response = await usersAPI.getDoctors();
        console.log('📋 Respuesta completa médico:', response);
        // La respuesta de axios tiene .data
        const doctors = response.data || response;
        const foundUser = Array.isArray(doctors) 
          ? doctors.find(u => u.id === userId)
          : null;
        
        console.log('📋 Usuario encontrado:', foundUser);
        if (foundUser) {
          setUser(foundUser);
        } else {
          setError('Usuario no encontrado');
        }
      }
    } catch (error) {
      console.error('Error cargando detalles del usuario:', error);
      toast.error('Error al cargar los detalles del usuario');
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/user-management?tab=' + (userType === 'paciente' ? 'pacientes' : userType === 'enfermero' ? 'enfermeria' : 'medicos'));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando detalles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Usuario no encontrado'}</p>
          <button 
            onClick={handleBack}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header con botón de regreso */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          <span>Volver a gestión de usuarios</span>
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">
          Detalles de {userType === 'paciente' ? 'Paciente' : userType === 'medico' ? 'Médico' : 'Enfermero'}
        </h1>
      </div>

      {/* Información del usuario */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          {/* Header con avatar */}
          <div className="flex items-start space-x-4 mb-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
              <UserIcon className="w-10 h-10 text-gray-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user.first_name || user.firstName} {user.last_name || user.lastName}
              </h2>
              <p className="text-gray-600">{user.email || ''}</p>
              {user.specialty && <p className="text-sm text-blue-600">{user.specialty}</p>}
            </div>
          </div>

          {/* Información personal */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información personal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Nombre(s)" value={user.first_name || user.firstName} />
              <InfoField label="Apellido(s)" value={user.last_name || user.lastName} />
              
              {user.email && (
                <InfoField 
                  label="Correo electrónico" 
                  value={user.email} 
                  icon={<EnvelopeIcon className="w-4 h-4 text-gray-400" />}
                />
              )}
              
              {(user.phone || user.mobile_phone) && (
                <InfoField 
                  label="Teléfono" 
                  value={user.phone || user.mobile_phone}
                  icon={<PhoneIcon className="w-4 h-4 text-gray-400" />}
                />
              )}
              
              {user.isActive !== undefined && (
                <InfoField 
                  label="Estado" 
                  value={user.isActive ? 'Activo' : 'Inactivo'}
                />
              )}
              
              {user.lastLogin && (
                <InfoField 
                  label="Último acceso" 
                  value={new Date(user.lastLogin).toLocaleDateString('es-CO')}
                  icon={<CalendarIcon className="w-4 h-4 text-gray-400" />}
                />
              )}
              
              {user.birth_date && (
                <InfoField 
                  label="Fecha de nacimiento" 
                  value={new Date(user.birth_date).toLocaleDateString('es-CO')}
                  icon={<CalendarIcon className="w-4 h-4 text-gray-400" />}
                />
              )}
              
              {user.age && (
                <InfoField label="Edad" value={`${user.age} años`} />
              )}
              
              {user.gender && (
                <InfoField label="Género" value={user.gender} />
              )}
              
              {userType === 'paciente' && user.identification_type && (
                <InfoField label="Tipo de documento" value={user.identification_type} />
              )}
              
              {userType === 'paciente' && user.identification_number && (
                <InfoField label="Número de documento" value={user.identification_number} />
              )}
              
              {user.blood_type && (
                <InfoField label="Grupo sanguíneo" value={user.blood_type} />
              )}
              
              {user.address && (
                <InfoField label="Dirección" value={user.address} />
              )}
              
              {user.city && (
                <InfoField label="Ciudad" value={user.city} />
              )}
              
              {user.eps && (
                <InfoField label="EPS" value={user.eps} />
              )}
            </div>
          </div>

          {/* Información médica (solo para pacientes) */}
          {userType === 'paciente' && (user.allergies?.length > 0 || user.conditions?.length > 0) && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información médica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.allergies?.length > 0 && (
                  <InfoField label="Alergias" value={user.allergies.join(', ')} />
                )}
                {user.conditions?.length > 0 && (
                  <InfoField label="Condiciones médicas" value={user.conditions.join(', ')} />
                )}
              </div>
            </div>
          )}

          {/* Fechas de registro */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información de registro</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.created_at && (
                <InfoField 
                  label="Fecha de registro" 
                  value={new Date(user.created_at).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                />
              )}
              
              {user.updated_at && (
                <InfoField 
                  label="Última actualización" 
                  value={new Date(user.updated_at).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente auxiliar para mostrar campos de información
const InfoField = ({ label, value, icon }) => (
  <div>
    <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
    <div className="flex items-center space-x-2">
      {icon}
      <span className="text-sm text-gray-900">{value || 'No especificado'}</span>
    </div>
  </div>
);

export default UserDetails;

