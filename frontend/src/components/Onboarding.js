import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config/config';
import toast from 'react-hot-toast';
import bgImage from '../img/bg-login.jpg';
import logo from '../img/logo1.svg';
import arrowRight from '../img/ArrowRight.svg';
import arrowLeft from '../img/ArrowLeft.svg';
import secureIcon from '../img/segura.svg';

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [splashPhase, setSplashPhase] = useState('blue');

  // Datos del administrador (Paso 1)
  const [adminData, setAdminData] = useState({
    nombres: '',
    apellidos: '',
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    codigoPrestador: '',
    telefonoContacto: ''
  });

  // Datos de la organización (Paso 2)
  const [orgData, setOrgData] = useState({
    nombreOrganizacion: '',
    tipoOrganizacion: '',
    razonSocial: '',
    contactoOrganizacion: ''
  });

  const handleAdminDataChange = (field, value) => {
    setAdminData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOrgDataChange = (field, value) => {
    setOrgData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isStep1Valid = () => {
    return adminData.nombres && 
           adminData.apellidos && 
           adminData.tipoIdentificacion && 
           adminData.numeroIdentificacion && 
           adminData.codigoPrestador && 
           adminData.telefonoContacto;
  };

  const isStep2Valid = () => {
    return orgData.nombreOrganizacion && 
           orgData.tipoOrganizacion && 
           orgData.razonSocial && 
           orgData.contactoOrganizacion;
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalize = async () => {
    try {
      setLoading(true);
      
      const baseUrl = (typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function')
        ? window.getApiBaseUrl()
        : (config.API_BASE_URL || '/api');

      // Crear la plataforma empresarial
      const response = await fetch(`${baseUrl}/onboarding/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          adminData,
          orgData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al finalizar el onboarding');
      }

      const data = await response.json();
      
      toast.success('¡Plataforma creada exitosamente!');

      // Animación de splash
      setShowSplash(true);
      setSplashPhase('blue');
      setTimeout(() => setSplashPhase('slide'), 900);
      setTimeout(() => setSplashPhase('fade'), 900 + 1300);
      // Navegar justo cuando empieza el fade para transición perfecta
      setTimeout(() => {
        navigate('/agenda');
      }, 900 + 1300);
      setTimeout(() => {
        setShowSplash(false);
      }, 900 + 1300 + 300);
      
    } catch (error) {
      console.error('Error en finalización:', error);
      toast.error(error.message || 'Error al finalizar el onboarding');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="relative flex items-center justify-center mb-8">
        {/* Línea base continua */}
        <div className="absolute top-5 left-[2.05rem] right-[2rem] h-0.5 bg-gray-300"></div>
        
        {/* Progreso azul */}
        <div 
          className="absolute top-5 left-[2.05rem] h-0.5 bg-[#2f67ff] transition-all duration-500"
          style={{ 
            width: currentStep === 1 ? '23%' : 
                   currentStep === 2 ? '60.5%' : '80%'
          }}
        ></div>

        {/* Círculos y labels */}
        <div className="flex items-center justify-between w-full max-w-md">
          {/* Paso 1 */}
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 1 ? 'bg-[#2f67ff] text-white' : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <span className={`text-sm mt-3 ${currentStep >= 1 ? 'text-[#2f67ff]' : 'text-gray-600'}`}>
              Administrador
            </span>
          </div>

          {/* Paso 2 */}
          <div className="flex flex-col items-center relative px-10 z-10">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 2 ? 'bg-[#2f67ff] text-white' : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <span className={`text-sm mt-3 ${currentStep >= 2 ? 'text-[#2f67ff]' : 'text-gray-600'}`}>
              Organización
            </span>
          </div>

          {/* Paso 3 */}
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 3 ? 'bg-[#2f67ff] text-white' : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              3
            </div>
            <span className={`text-sm mt-3 ${currentStep >= 3 ? 'text-[#2f67ff]' : 'text-gray-600'}`}>
              Confirmación
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="w-full max-w-xl bg-white/95 rounded-xl shadow-lg p-8">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Información personal del Administrador</h2>
          <p className="text-sm text-gray-600">Ingresa la información del Representante legal de la organización</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Primera fila: Nombres y Apellidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <input
              type="text"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Juan"
              value={adminData.nombres}
              onChange={(e) => handleAdminDataChange('nombres', e.target.value)}
            />
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
              Nombres
            </label>
          </div>

          <div className="relative">
            <input
              type="text"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Perez"
              value={adminData.apellidos}
              onChange={(e) => handleAdminDataChange('apellidos', e.target.value)}
            />
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
              Apellidos
            </label>
          </div>
        </div>

        {/* Segunda fila: Tipo de identificación y Número de identificación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <select
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={adminData.tipoIdentificacion}
              onChange={(e) => handleAdminDataChange('tipoIdentificacion', e.target.value)}
            >
              <option value="">Selecciona una opción</option>
              <option value="CC">Cédula de Ciudadanía</option>
              <option value="CE">Cédula de Extranjería</option>
              <option value="NIT">NIT</option>
              <option value="PP">Pasaporte</option>
            </select>
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
              Tipo de identificación
            </label>
          </div>

          <div className="relative">
            <input
              type="text"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingresa tu identificación"
              value={adminData.numeroIdentificacion}
              onChange={(e) => handleAdminDataChange('numeroIdentificacion', e.target.value)}
            />
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
              Número de identificación
            </label>
          </div>
        </div>

        {/* Tercera fila: Código del prestador (ancho completo) */}
        <div className="relative">
          <input
            type="text"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Código de 12 dígitos"
            value={adminData.codigoPrestador}
            onChange={(e) => handleAdminDataChange('codigoPrestador', e.target.value)}
          />
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
            Código del prestador
          </label>
        </div>

        {/* Cuarta fila: Teléfono de Contacto (ancho completo) */}
        <div className="relative">
          <input
            type="tel"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+57 555 123 4545"
            value={adminData.telefonoContacto}
            onChange={(e) => handleAdminDataChange('telefonoContacto', e.target.value)}
          />
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
            Teléfono de Contacto
          </label>
          <p className="text-xs text-gray-500 mt-1">Tu número personal de contacto</p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleNext}
          disabled={!isStep1Valid()}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 transition disabled:bg-gray-300 disabled:text-white disabled:cursor-not-allowed disabled:hover:bg-gray-300 flex-1 justify-center"
        >
          Continuar
          <img src={arrowRight} alt="Continuar" className="h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="w-full max-w-xl bg-white/95 rounded-xl shadow-lg p-8">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Configuración Organizacional</h2>
          <p className="text-sm text-gray-600">Define la estructura organizacional</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative">
          <input
            type="text"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ingresa el nombre de la organización"
            value={orgData.nombreOrganizacion}
            onChange={(e) => handleOrgDataChange('nombreOrganizacion', e.target.value)}
          />
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
            Nombre de la organización
          </label>
        </div>

        <div className="relative">
          <select
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={orgData.tipoOrganizacion}
            onChange={(e) => handleOrgDataChange('tipoOrganizacion', e.target.value)}
          >
            <option value="">Selecciona el tipo de organización</option>
            <option value="IPS">IPS - Institución Prestadora de Servicios de Salud</option>
            <option value="EPS">EPS - Entidad Promotora de Salud</option>
            <option value="ARS">ARS - Administradora de Riesgos de Salud</option>
            <option value="CLINICA">Clínica</option>
            <option value="HOSPITAL">Hospital</option>
            <option value="CONSULTORIO">Consultorio</option>
            <option value="LABORATORIO">Laboratorio</option>
            <option value="FARMACIA">Farmacia</option>
          </select>
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
            Tipo de organización
          </label>
        </div>

        <div className="relative">
          <input
            type="text"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ingresa la razón social"
            value={orgData.razonSocial}
            onChange={(e) => handleOrgDataChange('razonSocial', e.target.value)}
          />
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
            Razón social
          </label>
        </div>

        <div className="relative">
          <input
            type="tel"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+57 555 123 4545"
            value={orgData.contactoOrganizacion}
            onChange={(e) => handleOrgDataChange('contactoOrganizacion', e.target.value)}
          />
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
            Contacto de la organización
          </label>
          <p className="text-xs text-gray-500 mt-1">Número de contacto de la Organización</p>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-6 transition"
        >
          <img src={arrowLeft} alt="Volver" className="h-4" />
          Volver
        </button>
        <button
          onClick={handleNext}
          disabled={!isStep2Valid()}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 transition disabled:bg-gray-300 disabled:text-white disabled:cursor-not-allowed disabled:hover:bg-gray-300"
        >
          Continuar
          <img src={arrowRight} alt="Continuar" className="h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="w-full max-w-xl bg-white/95 rounded-xl shadow-lg p-8">
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Confirma tu información</h2>
          <p className="text-sm text-gray-600">Verifica tu información, no podrás cambiarla después.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Información Personal */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Nombres:</span>
              <span className="font-medium">{adminData.nombres} {adminData.apellidos}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Número de identificación:</span>
              <span className="font-medium">{adminData.tipoIdentificacion} {adminData.numeroIdentificacion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Código del prestador:</span>
              <span className="font-medium">{adminData.codigoPrestador}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Teléfono de Contacto:</span>
              <span className="font-medium">{adminData.telefonoContacto}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Organizacional</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre de la organización:</span>
              <span className="font-medium">{orgData.nombreOrganizacion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo de organización:</span>
              <span className="font-medium">{orgData.tipoOrganizacion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contacto de la organización:</span>
              <span className="font-medium">{orgData.contactoOrganizacion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Razón social:</span>
              <span className="font-medium">{orgData.razonSocial}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-6 transition"
        >
          <img src={arrowLeft} alt="Volver" className="h-4" />
          Volver
        </button>
        <button
          onClick={handleFinalize}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 transition disabled:bg-gray-300 disabled:text-white disabled:cursor-not-allowed disabled:hover:bg-gray-300"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Finalizando...
            </>
          ) : (
            <>
              Finalizar
              <img src={arrowRight} alt="Finalizar" className="h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen w-full relative flex flex-col items-center justify-start"
    >
      {/* Barra azul superior */}
      <div className="w-full h-1 bg-blue-600 mb-8"></div>

      {/* Logo */}
      <div className="mb-8">
        <img src={logo} alt="ROMEDICALS+" className="h-8 md:h-10" />
      </div>

      {/* Texto descriptivo */}
      <p className="text-center text-gray-700 mb-8 max-w-md">
        Configuremos tu acceso administrativo para gestionar el sistema médico
      </p>

      {/* Indicador de progreso */}
      {renderStepIndicator()}

      {/* Contenido del paso actual */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      {/* Mensaje de seguridad */}
      <div className="mt-8 flex items-center justify-center gap-2">
        <img src={secureIcon} alt="Conexión segura" className="h-4" />
        <span className="text-xs text-gray-600">Toda la información se encripta y almacena de forma segura.</span>
      </div>

      {/* Splash de carga animado */}
      {showSplash && (
        <div className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center transition-opacity duration-700 ${splashPhase === 'fade' ? 'opacity-0' : 'opacity-100'}`}>
          {/* Logo en el fondo blanco (aparece al deslizar) */}
          <div className={`text-center transition-opacity duration-700 ${splashPhase === 'blue' ? 'opacity-0' : 'opacity-100'}`}>
            <img src={logo} alt="ROMEDICALS+" className="h-8 md:h-9 splash-logo-dark mx-auto" />
            <div className="text-gray-600 text-xs mt-2">Creando plataforma...</div>
          </div>

          {/* Panel azul que cubre y se desliza hacia arriba */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-[#4169f6] transform transition-transform duration-[1300ms] ease-[cubic-bezier(.22,.61,.36,1)] ${splashPhase === 'slide' || splashPhase === 'fade' ? 'translate-y-full' : 'translate-y-0'}`}
          >
            <div className="text-center">
              <img src={logo} alt="ROMEDICALS+" className="h-8 md:h-9 splash-logo-white mx-auto" />
              <div className="text-white/90 text-xs mt-2">Creando plataforma...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
