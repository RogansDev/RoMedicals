import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config/config';
import toast from 'react-hot-toast';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: 'admin@romedicals.com',
    password: 'admin123'
  });
  const [loading, setLoading] = useState(false);

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
      
      const baseUrl = (typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function')
        ? window.getApiBaseUrl()
        : (config.API_BASE_URL || '/api');
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en el login');
      }

      const data = await response.json();
      
      // Guardar token en localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast.success(`Bienvenido, ${data.user.firstName}!`);
      
      // Notificar al componente padre que el login fue exitoso
      if (onLoginSuccess) {
        onLoginSuccess(data);
      }
      
      // Redirigir a la agenda después del login exitoso
      navigate('/agenda');
      
    } catch (error) {
      console.error('Error en login:', error);
      toast.error(error.message || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Fondo degradado animado */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 animated-blue-gradient"></div>
        <div className="absolute -top-24 -left-24 w-[40rem] h-[40rem] rounded-full opacity-30 animate-float-slow" style={{
          background: 'radial-gradient(circle at center, rgba(147,197,253,0.6), rgba(30,64,175,0.2))'
        }}></div>
        <div className="absolute -bottom-24 -right-24 w-[40rem] h-[40rem] rounded-full opacity-30 animate-float-slower" style={{
          background: 'radial-gradient(circle at center, rgba(59,130,246,0.6), rgba(30,64,175,0.2))'
        }}></div>
        <style>{`
          @keyframes float-slow { 0% { transform: translateY(0px) } 50% { transform: translateY(15px) } 100% { transform: translateY(0px) } }
          @keyframes float-slower { 0% { transform: translateY(0px) } 50% { transform: translateY(-15px) } 100% { transform: translateY(0px) } }
          @keyframes pulse-slow { 0%,100% { opacity: 1 } 50% { opacity: .95 } }
          .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
          .animate-float-slower { animation: float-slower 10s ease-in-out infinite; }
          .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
          @keyframes gradient-move { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
          .animated-blue-gradient { background: linear-gradient(-45deg, #1e3a8a, #2563eb, #60a5fa, #1d4ed8); background-size: 400% 400%; animation: gradient-move 14s ease infinite; }
        `}</style>
      </div>

      {/* Card de login */}
      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur rounded-xl shadow-lg p-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <span style={{ fontSize: '24px' }}>🏥</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema de Gestión de Pacientes
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Credenciales de prueba: admin@romedicals.com / admin123
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 