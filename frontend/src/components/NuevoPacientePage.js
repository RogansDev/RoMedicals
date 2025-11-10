import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import patientService from '../services/patientService';
import toast from 'react-hot-toast';

const NuevoPacientePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Información personal
    guardianId: '',
    firstName: '',
    lastName: '',
    identificationType: 'CC',
    residenceCountry: 'Colombia',
    originCountry: 'Colombia',
    identificationNumber: '',
    isForeigner: false,
    gender: 'Masculino',
    birthDay: '1',
    birthMonth: 'Enero',
    birthYear: '',
    bloodType: '',
    disability: 'Ninguna',
    occupation: '',
    maritalStatus: '',
    
    // Datos adicionales
    educationLevel: '',
    activityProfession: '',
    patientType: 'particular',
    eps: 'Ninguna',
    email: '',
    address: '',
    city: '',
    department: '',
    residentialZone: '',
    landlinePhone: '',
    mobilePhoneCountry: '+57',
    mobilePhone: '',
    companionName: '',
    companionPhone: '',
    responsibleName: '',
    responsiblePhone: '',
    responsibleRelationship: '',
    agreement: 'Sin Convenio',
    observations: '',
    reference: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Opciones para los dropdowns
  const idTypeOptions = [
    { value: 'CC', label: 'CC - Cédula de Ciudadanía' },
    { value: 'CE', label: 'CE - Cédula de Extranjería' },
    { value: 'TI', label: 'TI - Tarjeta de Identidad' },
    { value: 'RC', label: 'RC - Registro Civil' },
    { value: 'PA', label: 'PA - Pasaporte' }
  ];

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const days = Array.from({length: 31}, (_, i) => i + 1);
  const years = Array.from({length: 100}, (_, i) => new Date().getFullYear() - i);

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

  const validateForm = () => {
    const newErrors = {};

    // Validación básica
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }
    if (!formData.identificationNumber.trim()) {
      newErrors.identificationNumber = 'El número de identificación es requerido';
    }
    if (!formData.birthYear.trim()) {
      newErrors.birthYear = 'El año de nacimiento es requerido';
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
      // El backend espera birthDay, birthMonth y birthYear por separado
      const patientData = {
        ...formData,
        birthDay: formData.birthDay,
        birthMonth: formData.birthMonth,
        birthYear: formData.birthYear
      };

      await patientService.createPatient(patientData);
      toast.success('Paciente creado exitosamente');
      
      // Navegar de vuelta a la gestión de usuarios
      navigate('/user-management?tab=pacientes');
      
    } catch (error) {
      console.error('Error creando paciente:', error);
      toast.error('Error al crear el paciente. Inténtalo de nuevo.');
      setErrors({ submit: 'Error al crear el paciente. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/user-management?tab=pacientes');
  };

  const isFormValid = formData.firstName.trim() && 
                     formData.lastName.trim() && 
                     formData.identificationNumber.trim() &&
                     formData.birthYear.trim();

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
        
        <h1 className="text-2xl font-bold text-gray-900">Nuevo paciente</h1>
        <p className="text-gray-600">Registra un nuevo paciente en el sistema</p>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Sección de Información Personal */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información personal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombres */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombres *
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
                  Apellidos *
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
                  value={formData.identificationType}
                  onChange={(e) => handleInputChange('identificationType', e.target.value)}
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
                  Número de identificación *
                </label>
                <input
                  type="text"
                  value={formData.identificationNumber}
                  onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.identificationNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.identificationNumber && (
                  <p className="text-red-600 text-sm mt-1">{errors.identificationNumber}</p>
                )}
              </div>

              {/* Género */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sexo
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Fecha de nacimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de nacimiento *
                </label>
                <div className="flex space-x-2">
                  <select
                    value={formData.birthDay}
                    onChange={(e) => handleInputChange('birthDay', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select
                    value={formData.birthMonth}
                    onChange={(e) => handleInputChange('birthMonth', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {months.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  <select
                    value={formData.birthYear}
                    onChange={(e) => handleInputChange('birthYear', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.birthYear ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Año</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                {errors.birthYear && (
                  <p className="text-red-600 text-sm mt-1">{errors.birthYear}</p>
                )}
              </div>

              {/* Grupo sanguíneo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grupo sanguíneo
                </label>
                <select
                  value={formData.bloodType}
                  onChange={(e) => handleInputChange('bloodType', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* Teléfono móvil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono móvil
                </label>
                <div className="flex space-x-2">
                  <select
                    value={formData.mobilePhoneCountry}
                    onChange={(e) => handleInputChange('mobilePhoneCountry', e.target.value)}
                    className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="+1">🇺🇸 🇨🇦 +1</option>
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+54">🇦🇷 +54</option>
                    <option value="+55">🇧🇷 +55</option>
                    <option value="+56">🇨🇱 +56</option>
                    <option value="+57">🇨🇴 +57</option>
                    <option value="+51">🇵🇪 +51</option>
                    <option value="+58">🇻🇪 +58</option>
                    <option value="+593">🇪🇨 +593</option>
                    <option value="+595">🇵🇾 +595</option>
                    <option value="+596">🇲🇶 +596</option>
                    <option value="+597">🇸🇷 +597</option>
                    <option value="+598">🇺🇾 +598</option>
                    <option value="+500">🇫🇰 +500</option>
                    <option value="+501">🇧🇿 +501</option>
                    <option value="+502">🇬🇹 +502</option>
                    <option value="+503">🇸🇻 +503</option>
                    <option value="+504">🇭🇳 +504</option>
                    <option value="+505">🇳🇮 +505</option>
                    <option value="+506">🇨🇷 +506</option>
                    <option value="+507">🇵🇦 +507</option>
                    <option value="+509">🇭🇹 +509</option>
                    <option value="+591">🇧🇴 +591</option>
                  </select>
                  <input
                    type="tel"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.mobilePhone}
                    onChange={(e) => handleInputChange('mobilePhone', e.target.value)}
                  />
                </div>
              </div>

              {/* Correo electrónico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* EPS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EPS
                </label>
                <select
                  value={formData.eps}
                  onChange={(e) => handleInputChange('eps', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Ninguna">Ninguna</option>
                  <option value="Sura">Sura</option>
                  <option value="Nueva EPS">Nueva EPS</option>
                  <option value="Famisanar">Famisanar</option>
                  <option value="Compensar">Compensar</option>
                  <option value="Salud Total">Salud Total</option>
                </select>
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
              <span>Agregar paciente</span>
              <CheckIcon className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevoPacientePage;

