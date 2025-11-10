import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config/config';
import toast from 'react-hot-toast';
import Layout from './Layout';

const CredentialsSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    romedicalsEmail: 'romedicals@admin.com',
    romedicalsPassword: 'Romedicals2024!',
    confirmPassword: 'Romedicals2024!'
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSetupCredentials = async (e) => {
    e.preventDefault();
    
    if (!formData.romedicalsEmail || !formData.romedicalsPassword || !formData.confirmPassword) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    if (formData.romedicalsPassword !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (formData.romedicalsPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setLoading(true);
      
      const baseUrl = (typeof window !== 'undefined' && typeof window.getApiBaseUrl === 'function')
        ? window.getApiBaseUrl()
        : (config.API_BASE_URL || '/api');

      // Crear el administrador de ROMEDICALS
      const response = await fetch(`${baseUrl}/admin/setup-romedicals-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          email: formData.romedicalsEmail,
          password: formData.romedicalsPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al configurar credenciales');
      }

      const data = await response.json();
      
      toast.success('Credenciales de ROMEDICALS configuradas exitosamente');
      
      // Actualizar el usuario actual
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      currentUser.role = 'romedicals_admin';
      currentUser.email = formData.romedicalsEmail;
      currentUser.firstName = 'ROMEDICALS';
      currentUser.lastName = 'Administrator';
      localStorage.setItem('user', JSON.stringify(currentUser));
      
      // Redirigir al dashboard de ROMEDICALS
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al configurar credenciales');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSetup = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    currentUser.role = 'romedicals_admin';
    currentUser.email = 'romedicals@admin.com';
    currentUser.firstName = 'ROMEDICALS';
    currentUser.lastName = 'Administrator';
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    toast.success('Configuración rápida aplicada');
    navigate('/dashboard');
  };

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Configuración de Credenciales ROMEDICALS
            </h1>
            <p className="text-gray-600">
              Establece las credenciales específicas para el administrador principal de ROMEDICALS
            </p>
          </div>

          {/* Información del problema */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Problema Detectado
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Las credenciales actuales están configuradas para un superadmin de empresa cliente, 
                    no para el administrador principal de ROMEDICALS. Necesitas configurar credenciales específicas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSetupCredentials} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email del Administrador ROMEDICALS
              </label>
              <input
                type="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.romedicalsEmail}
                onChange={(e) => handleInputChange('romedicalsEmail', e.target.value)}
                placeholder="romedicals@admin.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.romedicalsPassword}
                onChange={(e) => handleInputChange('romedicalsPassword', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Repite la contraseña"
                required
              />
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleQuickSetup}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
              >
                Configuración Rápida
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Configurando...' : 'Configurar Credenciales'}
              </button>
            </div>
          </form>

          {/* Credenciales sugeridas */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Credenciales Sugeridas
            </h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Email:</strong> romedicals@admin.com</p>
              <p><strong>Password:</strong> Romedicals2024!</p>
              <p className="text-xs text-blue-600 mt-2">
                Estas credenciales son únicas para ROMEDICALS y no interferirán con empresas cliente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CredentialsSetup;
