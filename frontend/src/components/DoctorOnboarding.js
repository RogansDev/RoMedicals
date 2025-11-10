import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config/config';
import toast from 'react-hot-toast';
import logo from '../img/logo1.svg';
import arrowRight from '../img/ArrowRight.svg';
import arrowLeft from '../img/ArrowLeft.svg';
import secureIcon from '../img/segura.svg';
import { usersAPI, onboardingAPI, specialtiesAPI } from '../config/api';

const DoctorOnboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [splashPhase, setSplashPhase] = useState('blue');

  // Datos del médico (Paso 1)
  const [doctorData, setDoctorData] = useState({
    firstName: '',
    lastName: '',
    idType: 'CC',
    idNumber: '',
    providerCode: '',
    phone: ''
  });

  // Datos profesionales (Paso 2)
  const [professionalData, setProfessionalData] = useState({
    email: '',
    title: 'Dr',
    specialties: [],
    password: '',
    confirmPassword: ''
  });

  // Estados adicionales
  const [specialties, setSpecialties] = useState([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Estados para firma digital
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' o 'upload'
  const [signatureData, setSignatureData] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasRef, setCanvasRef] = useState(null);
  
  // Estados para drag and drop
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Estados para foto de perfil
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [isProfileDragOver, setIsProfileDragOver] = useState(false);

  useEffect(() => {
    console.log('🚀 DoctorOnboarding montado, iniciando carga de datos...');
    loadDoctorData();
    loadSpecialties();
    // No generar contraseña temporal - el usuario la definirá en el paso 1
  }, []);

  // Log para verificar cambios en doctorData
  useEffect(() => {
    console.log('📊 doctorData actualizado:', doctorData);
  }, [doctorData]);

  // Log para verificar cambios en professionalData
  useEffect(() => {
    console.log('📊 professionalData actualizado:', professionalData);
  }, [professionalData]);

  const loadDoctorData = async () => {
    try {
      console.log('🔄 Cargando datos del médico desde localStorage...');
      
      // Obtener datos del usuario desde localStorage (guardados durante el login)
      const userDataString = localStorage.getItem('user');
      console.log('📋 UserData desde localStorage:', userDataString);
      
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        console.log('✅ Datos del médico encontrados:', userData);
        
        setDoctorData({
          id: userData.id, // Guardar el ID del usuario
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          idType: userData.idType || 'CC',
          idNumber: userData.idNumber || '',
          providerCode: userData.providerCode || '',
          phone: userData.phone || ''
        });
        
        setProfessionalData(prev => ({
          ...prev,
          email: userData.email || '',
          title: userData.title || 'Dr',
          specialties: userData.specialties || []
        }));
      } else {
        console.log('⚠️ No hay userData en localStorage, usando datos de ejemplo');
        // Usar datos de ejemplo
        setDoctorData({
          firstName: 'Dr. Rafael Sebastian',
          lastName: 'Yepes Beltrán',
          idType: 'CC',
          idNumber: '10160235845',
          providerCode: '645 15161 189',
          phone: '313 2698 562'
        });
        
        setProfessionalData(prev => ({
          ...prev,
          email: 'rafael.yepes@romedicals.com',
          title: 'Dr',
          specialties: []
        }));
      }
    } catch (error) {
      console.error('❌ Error cargando datos del médico:', error);
      
      // En caso de error, usar datos de ejemplo
      console.log('⚠️ Usando datos de ejemplo debido al error');
      setDoctorData({
        firstName: 'Dr. Rafael Sebastian',
        lastName: 'Yepes Beltrán',
        idType: 'CC',
        idNumber: '10160235845',
        providerCode: '645 15161 189',
        phone: '313 2698 562'
      });
      
      setProfessionalData(prev => ({
        ...prev,
        email: 'rafael.yepes@romedicals.com',
        title: 'Dr',
        specialties: []
      }));
    }
  };

  const loadSpecialties = async () => {
    try {
      console.log('🔍 Iniciando carga de especialidades...');
      setLoadingSpecialties(true);
      const token = localStorage.getItem('authToken');
      console.log('🔑 Token disponible:', token ? 'Sí' : 'No');
      
      const response = await specialtiesAPI.getAll();
      console.log('✅ Especialidades cargadas:', response.data?.length || 0);
      setSpecialties(response.data || []);
    } catch (error) {
      console.error('❌ Error cargando especialidades:', error);
      console.error('📋 Detalles del error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    } finally {
      setLoadingSpecialties(false);
    }
  };


  // Funciones para manejar la firma digital
  const handleCanvasRef = (ref) => {
    setCanvasRef(ref);
    if (ref) {
      const ctx = ref.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef) {
      const canvas = canvasRef;
      // Verificar si el canvas tiene algo dibujado
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some(channel => channel !== 0);
      
      if (hasContent) {
        const dataURL = canvas.toDataURL('image/png');
        setSignatureData(dataURL);
      }
    }
  };

  const clearSignature = () => {
    if (canvasRef) {
      const canvas = canvasRef;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureImage(null);
    setSignatureData(null);
    setIsDrawing(false);
    console.log('🗑️ Firma limpiada - Botón se desactivará');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Por favor selecciona un archivo PNG, JPG o PDF válido.');
        return;
      }
      
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo debe ser menor a 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setSignatureImage(event.target.result);
        setSignatureData(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Funciones para drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Validar tipo de archivo
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Por favor selecciona un archivo PNG, JPG o PDF válido.');
        return;
      }
      
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo debe ser menor a 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setSignatureImage(event.target.result);
        setSignatureData(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Funciones para foto de perfil
  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo (solo imágenes)
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Por favor selecciona un archivo PNG o JPG válido.');
        return;
      }
      
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo debe ser menor a 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePhoto(event.target.result);
        setProfilePhotoFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileDragOver = (e) => {
    e.preventDefault();
    setIsProfileDragOver(true);
  };

  const handleProfileDragLeave = (e) => {
    e.preventDefault();
    setIsProfileDragOver(false);
  };

  const handleProfileDrop = (e) => {
    e.preventDefault();
    setIsProfileDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // Validar tipo de archivo (solo imágenes)
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Por favor selecciona un archivo PNG o JPG válido.');
        return;
      }
      
      // Validar tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo debe ser menor a 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePhoto(event.target.result);
        setProfilePhotoFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoFile(null);
    // Limpiar el input file
    const fileInput = document.getElementById('profile-photo-upload');
    if (fileInput) fileInput.value = '';
  };

  const handleDoctorDataChange = (field, value) => {
    setDoctorData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfessionalDataChange = (field, value) => {
    setProfessionalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpecialtyChange = (specialtyId) => {
    setProfessionalData(prev => {
      const currentSpecialties = prev.specialties || [];
      if (currentSpecialties.includes(specialtyId)) {
        return { ...prev, specialties: currentSpecialties.filter(id => id !== specialtyId) };
      } else {
        return { ...prev, specialties: [...currentSpecialties, specialtyId] };
      }
    });
  };

  const isStep1Valid = () => {
    return professionalData.password && 
           professionalData.confirmPassword &&
           professionalData.password === professionalData.confirmPassword &&
           professionalData.password.length >= 6;
  };

  const isStep2Valid = () => {
    const hasSignature = !!signatureData || !!signatureImage;
    
    console.log('🔍 Validación paso 2:', {
      hasSignature,
      signatureData: !!signatureData,
      signatureImage: !!signatureImage,
      signatureDataLength: signatureData?.length,
      signatureImageLength: signatureImage?.length,
      isValid: hasSignature
    });
    
    return hasSignature;
  };

  const isStep3Valid = () => {
    return profilePhoto !== null; // Requiere que haya una foto de perfil
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      // Si estamos en el paso 2, limpiar la firma al volver
      if (currentStep === 2) {
        setSignatureData(null);
        setSignatureImage(null);
        setIsDrawing(false);
        if (canvasRef) {
          const canvas = canvasRef;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        console.log('🔙 Volviendo al paso 1 - Firma limpiada');
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalize = async () => {
    try {
      setLoading(true);
      
      const baseUrl = (typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function')
        ? window.getApiBaseUrl()
        : (config.API_BASE_URL || '/api');

      // Actualizar contraseña, firma y foto de perfil del médico existente
      const updatePayload = {
        password: professionalData.password,
        signature: signatureData || signatureImage, // Firma digital (dibujada o imagen)
        profilePhoto: profilePhoto // Foto de perfil
      };

      console.log('📤 Actualizando datos del doctor:', {
        userId: doctorData.id,
        hasPassword: !!updatePayload.password,
        signature: updatePayload.signature ? 'Firma incluida ✅' : 'Sin firma ❌',
        profilePhoto: updatePayload.profilePhoto ? 'Foto incluida ✅' : 'Sin foto ❌'
      });

      const response = await usersAPI.updateDoctorPassword(doctorData.id, updatePayload);
      console.log('✅ Onboarding completado exitosamente:', response);
      
      // Mostrar splash de carga
      setShowSplash(true);
      setSplashPhase('blue');
      
      // Simular tiempo de procesamiento
      setTimeout(() => setSplashPhase('slide'), 900);
      setTimeout(() => setSplashPhase('fade'), 900 + 1300);
      
      // Redirigir al login
      setTimeout(() => {
        toast.success('¡Doctor creado exitosamente! Ya puedes iniciar sesión con tus credenciales.');
        navigate('/login');
      }, 900 + 1300 + 700);
      
    } catch (error) {
      console.error('Error en finalización:', error);
      toast.error(error.response?.data?.message || 'Error al finalizar el registro');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="relative flex items-center justify-center mb-8">
        {/* Línea base continua */}
        <div className="absolute top-5 left-[5rem] right-[2rem] w-[72%] h-0.5 bg-gray-300"></div>
        
        {/* Progreso azul */}
        <div 
          className="absolute top-5 left-[5rem] h-0.5 bg-[#2f67ff] transition-all duration-500"
          style={{ 
            width: currentStep === 1 ? '19%' : 
                   currentStep === 2 ? '53%' : '72%'
          }}
        ></div>

        {/* Círculos y labels */}
        <div className="flex items-center justify-between w-full">
          {/* Paso 1 */}
          <div className="flex flex-col items-center relative z-10 w-[12rem]">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 1 ? 'bg-[#2f67ff] text-white' : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <span className={`text-sm mt-3 ${currentStep >= 1 ? 'text-[#2f67ff]' : 'text-gray-600'}`}>
            Crea una contraseña
            </span>
          </div>

          {/* Paso 2 */}
          <div className="flex flex-col items-center relative z-10 w-[12rem]">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 2 ? 'bg-[#2f67ff] text-white' : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <span className={`text-sm mt-3 ${currentStep >= 2 ? 'text-[#2f67ff]' : 'text-gray-600'}`}>
            Ingresa tu firma
            </span>
          </div>

          {/* Paso 3 */}
          <div className="flex flex-col items-center relative z-10 w-[12rem]">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 3 ? 'bg-[#2f67ff] text-white' : 'bg-white border-2 border-gray-300 text-gray-600'
            }`}>
              3
            </div>
            <span className={`text-sm mt-3 ${currentStep >= 3 ? 'text-[#2f67ff]' : 'text-gray-600'}`}>
            Agrega una foto
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="w-full max-w-xl bg-white/95 rounded-xl shadow-lg p-8">
      {/* Sección 1: Valida tus datos */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Valida tus datos</h2>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          Verifica tu información personal y establece una nueva contraseña.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre:</label>
            <p className="text-gray-900 font-medium">{doctorData.firstName} {doctorData.lastName}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de identificación:</label>
            <p className="text-gray-900 font-medium">{doctorData.idType} {doctorData.idNumber}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código del prestador:</label>
            <p className="text-gray-900 font-medium">{doctorData.providerCode}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto:</label>
            <p className="text-gray-900 font-medium">{doctorData.phone}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Especialidades:</label>
            <p className="text-gray-900 font-medium">
              {professionalData.specialties && professionalData.specialties.length > 0 
                ? professionalData.specialties.map(id => {
                    const specialty = specialties.find(s => s.id === id);
                    return specialty ? specialty.name : `Especialidad ${id}`;
                  }).join(' - ')
                : 'Ninguna seleccionada'
              }
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          ¿Algo luce mal? contacta al administrador de tu organización
        </p>
      </div>

      {/* Línea separadora */}
      <div className="border-t border-gray-200 mb-8"></div>

      {/* Sección 2: Ingresa una contraseña */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Ingresa una contraseña</h2>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              type={showPasswords ? "text" : "password"}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Escribe una contraseña"
              value={professionalData.password}
              onChange={(e) => handleProfessionalDataChange('password', e.target.value)}
            />
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
              Escribe una contraseña
            </label>
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPasswords ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          <div className="relative">
            <input
              type={showPasswords ? "text" : "password"}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirma tu contraseña"
              value={professionalData.confirmPassword}
              onChange={(e) => handleProfessionalDataChange('confirmPassword', e.target.value)}
            />
            <label className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
              Confirma tu contraseña
            </label>
          </div>
        </div>
      </div>

      {/* Botón de navegación */}
      <div className="mt-8">
        <button
          onClick={handleNext}
          disabled={!isStep1Valid()}
          className={`w-full flex items-center justify-center gap-2 px-6 py-2 rounded-lg transition-colors ${
            isStep1Valid() 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continuar
          <img src={arrowRight} alt="Continuar" className="h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="w-full max-w-xl bg-white/95 rounded-xl shadow-lg p-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l-.8 2.685a.5.5 0 00.135.523L9.3 15.1a.5.5 0 00.575.115l5.33-2.518a.5.5 0 00.18-.685l-2.065-3.522a6 6 0 00-1.843 7.363z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Firma digital</h2>
          <p className="text-sm text-gray-600">Elige cómo deseas proporcionar tu firma digital.</p>
        </div>
      </div>

      {/* Opciones de firma */}
      <div className="mb-6">
        <div className="flex bg-gray-100 rounded-[3rem] p-1">
          <button
            onClick={() => setSignatureMode('draw')}
            className={`flex-1 flex items-center justify-center gap-2 py-1 px-4 rounded-[3rem] transition-colors ${
              signatureMode === 'draw' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l-.8 2.685a.5.5 0 00.135.523L9.3 15.1a.5.5 0 00.575.115l5.33-2.518a.5.5 0 00.18-.685l-2.065-3.522a6 6 0 00-1.843 7.363z" clipRule="evenodd" />
            </svg>
            Dibujar Firma
          </button>
          <button
            onClick={() => setSignatureMode('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-1 px-4 rounded-[3rem] transition-colors ${
              signatureMode === 'upload' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Subir Imagen
          </button>
        </div>
      </div>

      {/* Área de firma */}
      {signatureMode === 'draw' ? (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Dibuja tu firma usando el mouse o el dedo.</p>
          <div className="relative border-2 border-blue-200 rounded-lg bg-white">
            <canvas
              ref={handleCanvasRef}
              width={600}
              height={200}
              className="w-full h-48 cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                  clientX: touch.clientX,
                  clientY: touch.clientY
                });
                startDrawing(mouseEvent);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                  clientX: touch.clientX,
                  clientY: touch.clientY
                });
                draw(mouseEvent);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopDrawing();
              }}
            />
            <button
              onClick={clearSignature}
              className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm text-gray-600 font-medium">Limpiar</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Sube una imagen de tu firma.</p>
          <div className="relative">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleImageUpload}
                className="hidden"
                id="signature-upload"
              />
              <label
                htmlFor="signature-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg className={`w-16 h-16 mb-4 ${isDragOver ? 'text-blue-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className={`mb-2 font-medium ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`}>
                  {isDragOver ? '¡Suelta el archivo aquí!' : 'Arrastra la firma aquí o haz clic para buscar'}
                </p>
                <p className="text-sm text-gray-500 mb-4">Admite archivos PNG, JPG o PDF (máx. 5MB)</p>
                <button
                  type="button"
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Explorar archivos
                </button>
              </label>
            </div>
            
            {/* Botón Limpiar */}
            <button
              onClick={() => {
                setSignatureImage(null);
                setSignatureData(null);
                // Limpiar el input file
                const fileInput = document.getElementById('signature-upload');
                if (fileInput) fileInput.value = '';
                console.log('🗑️ Imagen de firma limpiada - Botón se desactivará');
              }}
              className="absolute top-3 right-3 flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm text-gray-600 font-medium">Limpiar</span>
            </button>
          </div>
          
          {signatureImage && (
            <div className="mt-4">
              <img src={signatureImage} alt="Firma subida" className="max-h-32 mx-auto border rounded" />
            </div>
          )}
        </div>
      )}

      {/* Información adicional */}
      <p className="text-sm text-gray-500 mb-6">
        Tu firma digital se utilizará para recetas y documentos oficiales.
      </p>

      {/* Botón de navegación */}
      <div className="mt-8 flex gap-4">
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
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-lg transition-colors ${
            isStep2Valid() 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continuar
          <img src={arrowRight} alt="Continuar" className="h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="w-full max-w-xl bg-white/95 rounded-xl shadow-lg p-8">
      {/* Header con icono de cámara */}
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agrega una foto</h2>
          <p className="text-sm text-gray-600">Agrega una foto para que administradores y personal te reconozcan.</p>
        </div>
      </div>

      {/* Área de subida de foto */}
      {!profilePhoto ? (
        <div className="mb-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isProfileDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragOver={handleProfileDragOver}
            onDragLeave={handleProfileDragLeave}
            onDrop={handleProfileDrop}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoUpload}
              className="hidden"
              id="profile-photo-upload"
            />
            <label
              htmlFor="profile-photo-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <svg className={`w-16 h-16 mb-4 ${isProfileDragOver ? 'text-blue-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Carga tu foto de perfil</h3>
              <p className={`mb-4 font-medium ${isProfileDragOver ? 'text-blue-600' : 'text-gray-600'}`}>
                {isProfileDragOver ? '¡Suelta la foto aquí!' : 'Arrastra y suelta o haz clic para seleccionar.'}
              </p>
              <button
                type="button"
                className="px-6 py-2 bg-white border border-blue-300 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Elegir Foto
              </button>
            </label>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="border-2 border-green-400 bg-green-50 rounded-lg p-8 text-center">
            {/* Foto de perfil circular */}
            <div className="flex justify-center mb-4">
              <img 
                src={profilePhoto} 
                alt="Foto de perfil" 
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            </div>
            
            {/* Mensaje de éxito */}
            <h3 className="text-lg font-semibold text-green-600 mb-2">Foto subida con éxito</h3>
            <p className="text-sm text-green-500 mb-4">{profilePhotoFile?.name}</p>
            
            {/* Botón eliminar */}
            <button
              onClick={removeProfilePhoto}
              className="px-4 py-2 bg-white border border-red-300 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 mx-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Eliminar foto
            </button>
          </div>
        </div>
      )}

      {/* Botón de navegación */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-3 px-6 transition"
        >
          <img src={arrowLeft} alt="Volver" className="h-4" />
          Volver
        </button>
        
        <button
          onClick={handleFinalize}
          disabled={!isStep3Valid() || loading}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-2 rounded-lg transition-colors ${
            isStep3Valid() && !loading
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              Continuar
              <img src={arrowRight} alt="Continuar" className="h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-start">
      {/* Barra azul superior */}
      <div className="w-full h-1 bg-blue-600 mb-8"></div>

      {/* Logo */}
      <div className="mb-8">
        <img src={logo} alt="ROMEDICALS+" className="h-8 md:h-10" />
      </div>

      {/* Texto descriptivo */}
      <p className="text-center text-gray-700 mb-8 max-w-md">
        Configuremos tu acceso médico para gestionar pacientes
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
            <div className="text-gray-600 text-xs mt-2">Creando médico...</div>
          </div>

          {/* Panel azul que cubre y se desliza hacia arriba */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-[#4169f6] transform transition-transform duration-[1300ms] ease-[cubic-bezier(.22,.61,.36,1)] ${splashPhase === 'slide' || splashPhase === 'fade' ? 'translate-y-full' : 'translate-y-0'}`}
          >
            <div className="text-center">
              <img src={logo} alt="ROMEDICALS+" className="h-8 md:h-9 splash-logo-white mx-auto" />
              <div className="text-white/90 text-xs mt-2">Creando médico...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorOnboarding;