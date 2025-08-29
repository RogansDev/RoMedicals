import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { usersAPI, specialtiesAPI } from '../config/api';

const Specialists = () => {
  const [specialists, setSpecialists] = useState([]);
  const [specialties, setSpecialties] = useState([
    { id: 1, name: 'Medicina General' },
    { id: 2, name: 'Psicología' },
    { id: 3, name: 'Nutrición' },
    { id: 4, name: 'Estética Facial' },
    { id: 5, name: 'Salud sexual' },
    { id: 6, name: 'Alopecia' },
    { id: 7, name: 'Urología' },
    { id: 8, name: 'Pediatría' },
    { id: 9, name: 'Dermatología' }
  ]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    title: 'Dr',
    username: '',
    identificationType: 'CC',
    identificationNumber: '',
    email: '',
    phone: '',
    specialties: [],
    signature: '',
    password: '',
    confirmPassword: '',
    role: 'medical_user'
  });

  // Cargar especialidades y especialistas desde la API
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Cargar especialidades (si falla, dejar las por defecto)
        try {
          const { data } = await specialtiesAPI.getAll();
          if (Array.isArray(data?.specialties)) {
            setSpecialties(data.specialties);
          }
        } catch (_) {}

        // Cargar especialistas (doctores)
        try {
          const { data } = await usersAPI.getDoctors();
          const doctors = Array.isArray(data?.doctors) ? data.doctors : [];
          const mapped = doctors.map(d => ({
            id: d.id,
            firstName: d.first_name,
            lastName: d.last_name,
            title: 'Dr',
            username: d.email,
            identificationType: 'CC',
            identificationNumber: '',
            email: d.email,
            phone: '',
            specialties: d.specialty_id ? [{ id: d.specialty_id, name: d.specialty_name || '' }] : [],
            isActive: d.is_active,
            role: 'medical_user'
          }));
          setSpecialists(mapped);
        } catch (error) {
          console.error('Error cargando doctores:', error);
          toast.error('No se pudieron cargar los especialistas');
        }
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      if (name === 'specialties') {
        const specialtyId = parseInt(value);
        setFormData(prev => ({
          ...prev,
          specialties: checked 
            ? [...prev.specialties, specialtyId]
            : prev.specialties.filter(id => id !== specialtyId)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          signature: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.specialties || formData.specialties.length === 0) {
      toast.error('Debe seleccionar al menos una especialidad');
      return;
    }

    try {
      if (editingSpecialist) {
        // Actualizar en BD
        const primarySpecialtyId = formData.specialties[0];
        const payload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: 'medical_user',
          specialtyId: primarySpecialtyId || null,
          isActive: typeof editingSpecialist.isActive === 'boolean' ? editingSpecialist.isActive : true
        };
        const { data } = await usersAPI.update(editingSpecialist.id, payload);
        const u = data?.user;
        const updated = {
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          title: formData.title || 'Dr',
          username: u.email,
          identificationType: editingSpecialist.identificationType || 'CC',
          identificationNumber: editingSpecialist.identificationNumber || '',
          email: u.email,
          phone: editingSpecialist.phone || '',
          specialties: u.specialty_id ? [{ id: u.specialty_id, name: u.specialty_name || '' }] : [],
          isActive: u.is_active,
          role: 'medical_user'
        };
        setSpecialists(prev => prev.map(s => (s.id === updated.id ? updated : s)));
        toast.success('Especialista actualizado en la base de datos');
      } else {
        // Crear en BD
        const primarySpecialtyId = formData.specialties[0];
        const payload = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: 'medical_user',
          specialtyId: primarySpecialtyId || null,
          isActive: true
        };
        const { data } = await usersAPI.create(payload);
        const u = data?.user;
        const created = {
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          title: formData.title || 'Dr',
          username: u.email,
          identificationType: formData.identificationType || 'CC',
          identificationNumber: formData.identificationNumber || '',
          email: u.email,
          phone: formData.phone || '',
          specialties: u.specialty_id ? [{ id: u.specialty_id, name: u.specialty_name || '' }] : [],
          isActive: u.is_active,
          role: 'medical_user'
        };
        setSpecialists(prev => [...prev, created]);
        if (u.tempPassword) {
          toast.success(`Especialista creado. Contraseña temporal: ${u.tempPassword}`);
        } else {
          toast.success('Especialista creado en la base de datos');
        }
      }
      
      setShowForm(false);
      setEditingSpecialist(null);
      resetForm();
    } catch (error) {
      console.error('Error saving specialist:', error);
      const msg = error?.response?.data?.message || 'Error al guardar especialista';
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      title: 'Dr',
      username: '',
      identificationType: 'CC',
      identificationNumber: '',
      email: '',
      phone: '',
      specialties: [],
      signature: '',
      password: '',
      confirmPassword: '',
      role: 'medical_user'
    });
  };

  const handleEdit = (specialist) => {
    setEditingSpecialist(specialist);
    setFormData({
      firstName: specialist.firstName || '',
      lastName: specialist.lastName || '',
      title: specialist.title || 'Dr',
      username: specialist.username || '',
      identificationType: specialist.identificationType || 'CC',
      identificationNumber: specialist.identificationNumber || '',
      email: specialist.email || '',
      phone: specialist.phone || '',
      specialties: specialist.specialties?.map(s => s.id) || [],
      signature: specialist.signature || '',
      password: '',
      confirmPassword: '',
      role: specialist.role || 'medical_user'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este especialista?')) {
      try {
        await usersAPI.delete(id);
        setSpecialists(specialists.filter(s => s.id !== id));
        toast.success('Especialista eliminado');
      } catch (error) {
        console.error('Error deleting specialist:', error);
        const msg = error?.response?.data?.message || 'Error al eliminar especialista';
        toast.error(msg);
      }
    }
  };

  const handleResetPassword = async (id) => {
    try {
      const { data } = await usersAPI.resetPassword(id);
      const temp = data?.tempPassword;
      if (temp) {
        toast.success(`Contraseña temporal: ${temp}`);
      } else {
        toast.success('Contraseña restablecida exitosamente');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Error al restablecer contraseña');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Especialistas</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingSpecialist(null);
            resetForm();
          }}
          className="btn-primary"
        >
          <span style={{ fontSize: '14px', marginRight: '8px' }}>➕</span>
          Nuevo Especialista
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            {editingSpecialist ? 'Editar Especialista' : 'Nuevo Especialista'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Información Personal */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700">Información Personal</h3>
                
                <div>
                  <label className="form-label">Título</label>
                  <select
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="Dr">Dr</option>
                    <option value="Dra">Dra</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Apellidos *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Usuario *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Información de Identificación */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700">Identificación</h3>
                
                <div>
                  <label className="form-label">Tipo de Identificación</label>
                  <select
                    name="identificationType"
                    value={formData.identificationType}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="TI">Tarjeta de Identidad</option>
                    <option value="PP">Pasaporte</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Número de Documento *</label>
                  <input
                    type="text"
                    name="identificationNumber"
                    value={formData.identificationNumber}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Correo Electrónico *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Celular *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Especialidades */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Especialidades *</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {specialties.map(specialty => (
                  <label key={specialty.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="specialties"
                      value={specialty.id}
                      checked={formData.specialties.includes(specialty.id)}
                      onChange={handleInputChange}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{specialty.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Firma */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Firma</h3>
              <div className="space-y-3">
                <div>
                  <label className="form-label">Subir Firma (PNG, JPG)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureChange}
                    className="input-field"
                  />
                </div>
                {formData.signature && (
                  <div>
                    <label className="form-label">Vista Previa de la Firma</label>
                    <div className="border border-gray-300 rounded p-4 bg-white">
                      <img 
                        src={formData.signature} 
                        alt="Firma" 
                        className="max-h-32 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contraseña */}
            {!editingSpecialist && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Contraseña *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Confirmar Contraseña *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingSpecialist(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {editingSpecialist ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Especialistas */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Especialistas Registrados</h2>
        
        {specialists.length === 0 ? (
          <div className="text-center py-8">
            <span style={{ fontSize: '48px' }}>👨‍⚕️</span>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay especialistas registrados</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comience agregando el primer especialista.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialista
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {specialists.map((specialist) => (
                  <tr key={specialist.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span style={{ fontSize: '16px' }}>👨‍⚕️</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {specialist.title} {specialist.firstName} {specialist.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {specialist.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {specialist.specialties?.map(s => s.name).join(', ') || 'Sin especialidades'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{specialist.email}</div>
                      <div className="text-sm text-gray-500">{specialist.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        specialist.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {specialist.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(specialist)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleResetPassword(specialist.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Restablecer Contraseña
                        </button>
                        <button
                          onClick={() => handleDelete(specialist.id)}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Specialists; 