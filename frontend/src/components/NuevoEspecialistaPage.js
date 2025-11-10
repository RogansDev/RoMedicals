import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { specialtiesAPI, usersAPI } from '../config/api';

const NuevoEspecialistaPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Especialidades
    specialties: [],
    
    // Información personal
    title: 'Dr',
    firstName: 'Juan',
    lastName: 'Perez',
    idType: 'CC',
    idNumber: '',
    providerCode: '',
    
    // Información de contacto
    phone: '+57 555 123 4545',
    email: '',
    
    // Credenciales
    password: '',
    confirmPassword: ''
  });

  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Opciones para los dropdowns
  const titleOptions = [
    { value: 'Dr', label: 'Dr' },
    { value: 'Dra', label: 'Dra' },
    { value: 'Prof', label: 'Prof' },
    { value: 'Prof Dra', label: 'Prof Dra' }
  ];

  const idTypeOptions = [
    { value: 'CC', label: 'CC' },
    { value: 'CE', label: 'CE' },
    { value: 'TI', label: 'TI' },
    { value: 'RC', label: 'RC' },
    { value: 'PA', label: 'PA' }
  ];

  // Cargar especialidades al montar el componente
  useEffect(() => {
    loadSpecialties();
    generateTempPassword();
  }, []);

  // Generar contraseña temporal automáticamente
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({
      ...prev,
      password: password,
      confirmPassword: password
    }));
  };

  const loadSpecialties = async () => {
    try {
      setLoadingSpecialties(true);
      const response = await specialtiesAPI.getAll();
      console.log('NuevoEspecialista - Respuesta completa:', response);
      console.log('NuevoEspecialista - Datos de especialidades:', response.data);
      
      const specialtiesData = response.data || response;
      // Asegurar que siempre sea un array
      setSpecialties(Array.isArray(specialtiesData) ? specialtiesData : []);
      
      console.log('NuevoEspecialista - Especialidades cargadas:', specialtiesData);
    } catch (error) {
      console.error('Error cargando especialidades:', error);
      setSpecialties([]); // En caso de error, establecer array vacío
    } finally {
      setLoadingSpecialties(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo modificado
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleSpecialtyChange = (specialtyId) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialtyId)
        ? prev.specialties.filter(id => id !== specialtyId)
        : [...prev.specialties, specialtyId]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validar especialidades
    if (formData.specialties.length === 0) {
      newErrors.specialties = 'Debe seleccionar al menos una especialidad';
    }

    // Validar información personal
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Los nombres son requeridos';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Los apellidos son requeridos';
    }
    if (!formData.idNumber.trim()) {
      newErrors.idNumber = 'El número de identificación es requerido';
    }
    if (!formData.providerCode.trim()) {
      newErrors.providerCode = 'El código del prestador es requerido';
    }

    // Validar información de contacto
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }

    // Validar credenciales
    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirma la contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const doctorData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        idType: formData.idType,
        idNumber: formData.idNumber,
        providerCode: formData.providerCode,
        title: formData.title,
        specialties: formData.specialties,
        role: 'medical_user',
        password: formData.password
      };

      await usersAPI.createDoctor(doctorData);
      
      // Navegar de vuelta a la gestión de usuarios
      navigate('/user-management?tab=medicos');
      
    } catch (error) {
      console.error('Error creando médico:', error);
      setErrors({ submit: 'Error al crear el médico. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/user-management?tab=medicos');
  };

  const isFormValid = formData.specialties.length > 0 && 
                     formData.firstName.trim() && 
                     formData.lastName.trim() && 
                     formData.idNumber.trim() && 
                     formData.providerCode.trim() && 
                     formData.phone.trim() && 
                     formData.email.trim() &&
                     formData.password.trim() &&
                     formData.confirmPassword.trim() &&
                     formData.password === formData.confirmPassword;

  return (
    <div className="p-6">
      {/* Header con botón de regreso */}
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          <span>Volver a gestión de usuarios</span>
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">Nuevo especialista</h1>
        <p className="text-gray-600">Agrega un nuevo médico a tu equipo</p>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Sección de Especialidades */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Especialidad</h3>
              <button
                type="button"
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <span>Gestiona las especialidades</span>
                <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
              </button>
            </div>
            
            {errors.specialties && (
              <p className="text-red-600 text-sm mb-3">{errors.specialties}</p>
            )}
            
            {loadingSpecialties ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Cargando especialidades...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {console.log('NuevoEspecialista - Estado specialties:', specialties, 'Longitud:', specialties.length)}
                {Array.isArray(specialties) && specialties.length > 0 ? (
                  specialties.map((specialty) => (
                    <label key={specialty.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.specialties.includes(specialty.id)}
                        onChange={() => handleSpecialtyChange(specialty.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{specialty.name}</span>
                    </label>
                  ))
                ) : (
                  <div className="col-span-full text-center py-4 text-gray-500">
                    No hay especialidades disponibles
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sección de Información Personal */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información personal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título
                </label>
                <select
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {titleOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nombres */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombres
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.firstName && (
                  <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              {/* Apellidos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apellidos
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.lastName && (
                  <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              {/* Tipo de identificación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de identificación
                </label>
                <select
                  value={formData.idType}
                  onChange={(e) => handleInputChange('idType', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {idTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Número de identificación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de identificación
                </label>
                <input
                  type="text"
                  placeholder="Ingresa tu identificación"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.idNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.idNumber && (
                  <p className="text-red-600 text-sm mt-1">{errors.idNumber}</p>
                )}
              </div>

              {/* Código del prestador */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código del prestador
                </label>
                <input
                  type="text"
                  placeholder="Código de 12 dígitos"
                  value={formData.providerCode}
                  onChange={(e) => handleInputChange('providerCode', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.providerCode ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.providerCode && (
                  <p className="text-red-600 text-sm mt-1">{errors.providerCode}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sección de Información de Contacto */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información de contacto</h3>
            
            <div className="space-y-4">
              {/* Teléfono de Contacto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">Tu número personal de contacto</p>
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Correo electrónico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sección de Credenciales */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Credenciales de acceso</h3>
            
            <div className="space-y-4">
              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña temporal
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Contraseña temporal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generateTempPassword}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Generar nueva
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">El médico usará esta contraseña para acceder al sistema</p>
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Confirma la contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          {/* Error general */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                isFormValid && !loading
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Agregar médico</span>
              <CheckIcon className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevoEspecialistaPage;
