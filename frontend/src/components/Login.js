import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config/config';
import toast from 'react-hot-toast';
import { authAPI } from '../config/api';
import bgImage from '../img/bg-login.jpg';
import logo from '../img/logo1.svg';
import arrowRight from '../img/ArrowRight.svg';
import secureIcon from '../img/segura.svg';
import powered from '../img/powered.svg';

const Login = ({ onLoginSuccess, expectedRole = null, postLoginRedirect = '/agenda' }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: 'admin@romedicals.com',
    password: 'admin123'
  });
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [splashPhase, setSplashPhase] = useState('blue'); // 'blue' | 'slide' | 'fade'

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    try {
      setLoading(true);
      console.log('Intentando login con:', formData.email);
      
      const response = await authAPI.login(formData);
      console.log('Respuesta del login:', response);
      const data = response.data;
      
      // Si esta pantalla de login exige un rol, validarlo
      if (expectedRole && data?.user?.role && data.user.role !== expectedRole) {
        // No coinciden los roles: abortar inicio de sesión
        const roleName = expectedRole === 'super_user' ? 'Superadmin' : 'Médico';
        toast.error(`Este acceso es solo para ${roleName}.`);
        return;
      }

      // Guardar token y usuario
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success(`Bienvenido, ${data.user.firstName}!`);

      // Debug: Mostrar información del usuario
      console.log('Usuario logueado:', data.user);
      console.log('Rol del usuario:', data.user?.role);

      // Notificar al componente padre que el login fue exitoso
      if (onLoginSuccess) {
        onLoginSuccess(data);
      }

      // Verificar si es el primer acceso (necesita onboarding)
      const needsOnboarding = data.user?.needsOnboarding || data.user?.onboardingCompleted === false;
      
      // Animación de splash: azul -> deslizamiento hacia arriba -> navegar
      setShowSplash(true);
      setSplashPhase('blue');
      // Pantalla azul un poco más tiempo
      setTimeout(() => setSplashPhase('slide'), 900);
      // Cuando termina el deslizamiento, desvanecer
      setTimeout(() => setSplashPhase('fade'), 900 + 1300);
      // Navegar justo cuando empieza el fade para transición perfecta
      setTimeout(() => {
        if (needsOnboarding) {
          // Redirigir al onboarding según el rol
          if (data.user?.role === 'medical_user') {
            console.log('Redirigiendo a onboarding de médico');
            navigate('/doctor-onboarding');
          } else {
            console.log('Redirigiendo a onboarding de superadmin');
            navigate('/onboarding');
          }
        } else {
          // Navegación normal según el rol
          console.log('Redirigiendo según rol:', data.user?.role);
          if (data.user?.role === 'romedicals_admin') {
            console.log('Redirigiendo a /dashboard (ROMEDICALS)');
            navigate('/dashboard');
          } else if (data.user?.role === 'super_user') {
            console.log('Redirigiendo a /company-dashboard (Empresa Cliente)');
            navigate('/company-dashboard');
          } else if (data.user?.role === 'medical_user') {
            console.log('Redirigiendo a /doctor/dashboard (Médico)');
            navigate('/doctor/dashboard');
          } else {
            console.log('Redirigiendo a agenda por defecto');
            navigate(postLoginRedirect || '/agenda');
          }
        }
      }, 900 + 1300);
      // Quitar overlay después de navegar
      setTimeout(() => {
        setShowSplash(false);
      }, 900 + 1300 + 300);
      
    } catch (error) {
      console.error('Error en login:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      toast.error(error.response?.data?.message || error.message || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full relative flex flex-col items-center justify-start py-8 px-4"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Cabecera con logo */}
      <div className="mb-8 w-full flex justify-center">
        <div className="w-full max-w-md bg-white/95 rounded-xl shadow-md px-8 py-4 flex flex-col items-center">
          <img src={logo} alt="ROMEDICALS+" className="h-8 md:h-10" />
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            Plataforma médica digital en tu bolsillo
          </p>
        </div>
      </div>

      {/* Tarjeta de login */}
      <div className="w-full max-w-md bg-white/95 rounded-xl shadow-lg p-8">
        <h2 className="text-center text-2xl font-bold text-gray-900 tracking-tight">
          INICIAR SESIÓN
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Accede a tu cuenta médica de forma segura
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingresa tu correo electronico"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              <label htmlFor="email" className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
                Correo Electrónico
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingresa tu contraseña"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
              <label htmlFor="password" className="absolute -top-2 left-3 bg-white px-1 text-xs font-normal text-gray-600">
                Contraseña
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id="remember" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="remember" className="text-sm text-gray-600">Mantener mi sesión abierta</label>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.email || !formData.password}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 transition disabled:bg-gray-300 disabled:text-white disabled:cursor-not-allowed disabled:hover:bg-gray-300"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Iniciando sesión
              </>
            ) : (
              <>
                Iniciar sesión
                <img src={arrowRight} alt="Ir" className="h-4" />
              </>
            )}
          </button>

          <div className="pt-6 border-t border-gray-100 flex items-center justify-center gap-2">
            <img src={secureIcon} alt="Conexión segura" className="h-5" />
            <span className="text-xs text-gray-600">Conexión segura protegida</span>
          </div>
        </form>
      </div>

      {/* Pie de página */}
      <div className="mt-8">
        <img src={powered} alt="powered by rogans" className="h-4 opacity-80" />
      </div>
      {/* Splash de carga animado post-login */}
      {showSplash && (
        <div className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center transition-opacity duration-700 ${splashPhase === 'fade' ? 'opacity-0' : 'opacity-100'}`}>
          {/* Logo en el fondo blanco (aparece al deslizar) */}
          <div className={`text-center transition-opacity duration-700 ${splashPhase === 'blue' ? 'opacity-0' : 'opacity-100'}`}>
            <img src={logo} alt="ROMEDICALS+" className="h-8 md:h-9 splash-logo-dark mx-auto" />
            <div className="text-gray-600 text-xs mt-2">Cargando...</div>
          </div>

          {/* Panel azul que cubre y se desliza hacia arriba */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-[#4169f6] transform transition-transform duration-[1300ms] ease-[cubic-bezier(.22,.61,.36,1)] ${splashPhase === 'slide' || splashPhase === 'fade' ? 'translate-y-full' : 'translate-y-0'}`}
          >
            <div className="text-center">
              <img src={logo} alt="ROMEDICALS+" className="h-8 md:h-9 splash-logo-white mx-auto" />
              <div className="text-white/90 text-xs mt-2">Cargando...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login; 