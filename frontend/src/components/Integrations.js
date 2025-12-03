import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../config/api';
import Layout from './Layout';

const Integrations = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCredentials, setShowCredentials] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expiresAt: ''
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api-keys');
      setApiKeys(response.data.apiKeys || []);
    } catch (error) {
      console.error('Error cargando API keys:', error);
      toast.error('Error al cargar las API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const payload = {
        name: formData.name || null,
        description: formData.description || null,
        expiresAt: formData.expiresAt || null
      };

      const response = await api.post('/api-keys', payload);
      
      if (response.data.apiKey) {
        // Mostrar credenciales
        setShowCredentials(response.data.apiKey);
        toast.success('API key creada exitosamente');
        setShowCreateForm(false);
        setFormData({ name: '', description: '', expiresAt: '' });
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error creando API key:', error);
      const message = error.response?.data?.message || 'Error al crear la API key';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApiKey = async (id) => {
    try {
      const response = await api.patch(`/api-keys/${id}/toggle`);
      toast.success(response.data.message);
      fetchApiKeys();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      toast.error('Error al cambiar el estado de la API key');
    }
  };

  const handleRegenerateSecret = async (id) => {
    if (!window.confirm('¿Estás seguro de regenerar el API secret? Esto invalidará el secret anterior.')) {
      return;
    }

    try {
      const response = await api.post(`/api-keys/${id}/regenerate`);
      setShowCredentials({
        id,
        api_secret: response.data.api_secret
      });
      toast.success('API secret regenerado exitosamente');
      fetchApiKeys();
    } catch (error) {
      console.error('Error regenerando secret:', error);
      toast.error('Error al regenerar el API secret');
    }
  };

  const handleDeleteApiKey = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta API key? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await api.delete(`/api-keys/${id}`);
      toast.success('API key eliminada exitosamente');
      fetchApiKeys();
    } catch (error) {
      console.error('Error eliminando API key:', error);
      toast.error('Error al eliminar la API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copiado al portapapeles');
    }).catch(() => {
      toast.error('Error al copiar');
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integraciones API</h1>
            <p className="text-gray-600">Gestiona las API keys para integrar sistemas externos</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            {showCreateForm ? 'Cancelar' : '+ Nueva API Key'}
          </button>
        </div>

        {/* Información sobre API Keys */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                ¿Qué son las API Keys?
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Las API keys permiten que sistemas externos se conecten a tu plataforma ROMEDICALS 
                  para importar pacientes, citas, especialidades y especialistas de forma automatizada. 
                  Cada API key es única para tu empresa y debe mantenerse segura.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario de creación */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Crear Nueva API Key</h2>
            <form onSubmit={handleCreateApiKey}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Sistema de gestión externo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe para qué se usará esta API key"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de expiración (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ name: '', description: '', expiresAt: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : 'Crear API Key'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Modal de credenciales */}
        {showCredentials && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">⚠️ Guarda estas credenciales</h2>
              <p className="text-gray-600 mb-4">
                Estas credenciales solo se mostrarán una vez. Asegúrate de guardarlas en un lugar seguro.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={showCredentials.api_key || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(showCredentials.api_key)}
                      className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Secret
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={showCredentials.api_secret || ''}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(showCredentials.api_secret)}
                      className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCredentials(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de API Keys */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading && apiKeys.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Cargando API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">No tienes API keys creadas</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                Crear tu primera API key
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último uso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expira
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {key.name || 'Sin nombre'}
                      </div>
                      {key.description && (
                        <div className="text-sm text-gray-500">{key.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {key.api_key}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        key.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {key.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(key.last_used_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.expires_at ? formatDate(key.expires_at) : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleApiKey(key.id)}
                          className={`${
                            key.is_active 
                              ? 'text-yellow-600 hover:text-yellow-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {key.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleRegenerateSecret(key.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Regenerar Secret
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(key.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Documentación de uso */}
        <div className="mt-6 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📚 Cómo usar las API Keys</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Para usar una API key, incluye estos headers en tus solicitudes HTTP:
            </p>
            <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto">
{`X-API-Key: tu_api_key_aqui
X-API-Secret: tu_api_secret_aqui`}
            </pre>
            <p>
              Ejemplo con cURL:
            </p>
            <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto">
{`curl -X POST https://api.romedicals.com/api/patients/import \\
  -H "X-API-Key: rm_abc123..." \\
  -H "X-API-Secret: tu_secret_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{"patients": [...]}'`}
            </pre>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Integrations;

