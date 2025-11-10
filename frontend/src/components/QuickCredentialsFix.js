import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const QuickCredentialsFix = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleQuickFix = () => {
    try {
      setLoading(true);
      
      // Obtener usuario actual
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Convertir a ROMEDICALS admin
      const romedicalsUser = {
        ...currentUser,
        role: 'romedicals_admin',
        email: 'romedicals@admin.com',
        firstName: 'ROMEDICALS',
        lastName: 'Administrator',
        companyName: 'ROMEDICALS+',
        companyType: 'Sistema Principal'
      };
      
      // Guardar usuario actualizado
      localStorage.setItem('user', JSON.stringify(romedicalsUser));
      
      toast.success('¡Credenciales de ROMEDICALS configuradas exitosamente!');
      
      // Redirigir al dashboard correcto
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al configurar credenciales');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSetup = () => {
    const email = prompt('Ingresa el email para ROMEDICALS Admin:', 'romedicals@admin.com');
    const password = prompt('Ingresa la contraseña:', 'Romedicals2024!');
    
    if (email && password) {
      try {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        
        const romedicalsUser = {
          ...currentUser,
          role: 'romedicals_admin',
          email: email,
          firstName: 'ROMEDICALS',
          lastName: 'Administrator',
          companyName: 'ROMEDICALS+',
          companyType: 'Sistema Principal'
        };
        
        localStorage.setItem('user', JSON.stringify(romedicalsUser));
        
        toast.success('¡Credenciales personalizadas configuradas!');
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
        
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al configurar credenciales');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Configuración ROMEDICALS
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Configura tus credenciales de administrador principal
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Problema Detectado
              </h3>
              <p className="text-sm text-blue-700">
                Tu usuario actual está configurado como superadmin de empresa cliente. 
                Necesitas configurar credenciales específicas para ROMEDICALS.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleQuickFix}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition disabled:opacity-50 font-medium"
              >
                {loading ? 'Configurando...' : '🚀 Configuración Rápida'}
              </button>
              
              <button
                onClick={handleCustomSetup}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition font-medium"
              >
                ⚙️ Configuración Personalizada
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Configuración rápida usa: romedicals@admin.com / Romedicals2024!
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickCredentialsFix;
