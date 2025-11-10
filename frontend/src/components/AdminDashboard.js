import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config/config';
import toast from 'react-hot-toast';
import { adminAPI } from '../config/api';
import Layout from './Layout';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

  // Formulario para crear/editar superadmin
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchSuperAdmins();
  }, []);

  const fetchSuperAdmins = async () => {
    try {
      const response = await adminAPI.getSuperAdmins();
      setSuperAdmins(response.data.superAdmins || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar la lista de superadmins');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateSuperAdmin = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setLoading(true);
      
      const response = await adminAPI.createSuperAdmin({
        email: formData.email,
        password: formData.password
      });

      toast.success('Superadmin creado exitosamente');
      setShowCreateForm(false);
      resetForm();
      fetchSuperAdmins();
      
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al crear superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuperAdmin = async (e) => {
    e.preventDefault();
    
    if (!formData.password || !formData.confirmPassword) {
      toast.error('Por favor complete los campos de contraseña');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);
      
      const response = await adminAPI.updateSuperAdmin(editingAdmin.id, {
        password: formData.password
      });

      toast.success('Superadmin actualizado exitosamente');
      setEditingAdmin(null);
      resetForm();
      fetchSuperAdmins();
      
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al actualizar superadmin');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuperAdmin = async (adminId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este superadmin?')) {
      return;
    }

    try {
      await adminAPI.deleteSuperAdmin(adminId);
      toast.success('Superadmin eliminado exitosamente');
      fetchSuperAdmins();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al eliminar superadmin');
    }
  };

  const handleResetPassword = async (adminId) => {
    if (!window.confirm('¿Estás seguro de que quieres resetear la contraseña de este superadmin?')) {
      return;
    }

    try {
      const response = await adminAPI.resetSuperAdminPassword(adminId);
      toast.success(`Contraseña reseteada. Nueva contraseña: ${response.data.newPassword}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al resetear contraseña');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  const startEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email,
      password: '',
      confirmPassword: ''
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingAdmin(null);
    setShowCreateForm(false);
    resetForm();
  };

  const renderCreateForm = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {editingAdmin ? 'Editar Superadmin de Empresa' : 'Crear Nuevo Superadmin de Empresa'}
      </h3>
      
      <form onSubmit={editingAdmin ? handleEditSuperAdmin : handleCreateSuperAdmin} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!!editingAdmin}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder={editingAdmin ? "Nueva contraseña" : "Mínimo 8 caracteres"}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={cancelEdit}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Guardando...' : (editingAdmin ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Empresas Cliente</h1>
            <p className="text-gray-600">Administra los superadministradores de las empresas que usan ROMEDICALS+</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            {showCreateForm ? 'Cancelar' : '+ Nuevo Superadmin'}
          </button>
        </div>

        {/* Información del sistema */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Panel de Administración ROMEDICALS+
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Este panel es exclusivo para administradores de ROMEDICALS. Aquí puedes crear y gestionar 
                  los superadministradores de las empresas cliente que utilizan nuestra plataforma médica.
                </p>
              </div>
            </div>
          </div>
        </div>

        {showCreateForm && renderCreateForm()}

        {/* Lista de Superadmins */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Empresas Cliente Registradas</h3>
          </div>
          
          {superAdmins.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No hay empresas cliente registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Acceso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {superAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {admin.firstName} {admin.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{admin.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admin.companyName || 'Sin asignar'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.onboardingCompleted 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {admin.onboardingCompleted ? 'Activo' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => startEdit(admin)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleResetPassword(admin.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Resetear
                        </button>
                        <button
                          onClick={() => handleDeleteSuperAdmin(admin.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
