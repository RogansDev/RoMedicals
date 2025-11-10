import React, { useEffect, useMemo, useState } from 'react';
import { usersAPI } from '../config/api';
import toast from 'react-hot-toast';

const mockUsers = [
  { id: 1, name: 'Dr. Mateo Alejandro Ruiz', email: 'ana@salud.com', specialty: 'Pediatría', lastAccess: '25/10/2026', sessions: 180, role: 'medico', active: true },
  { id: 2, name: 'Dra. Sofía Elena Martínez', email: 'luis@centromedico.com', specialty: 'Ginecología', lastAccess: '30/11/2026', sessions: 220, role: 'medico', active: true },
  { id: 3, name: 'Dr. Lucas Fernando Gómez', email: 'carla@hospital.com', specialty: 'Dermatología', lastAccess: '05/12/2026', sessions: 260, role: 'medico', active: false },
  { id: 4, name: 'Nurse. Camila Vargas', email: 'nurse@clinic.com', specialty: 'Enfermería', lastAccess: '01/12/2026', sessions: 120, role: 'enfermeria', active: true },
  { id: 5, name: 'Juan Pérez', email: 'paciente@correo.com', specialty: 'Paciente', lastAccess: '15/11/2026', sessions: 12, role: 'paciente', active: true },
];

const Tag = ({ children }) => (
  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{children}</span>
);

const Administration = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [tab, setTab] = useState('medicos');
  const [users, setUsers] = useState(mockUsers);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await usersAPI.getAll({ limit: 50 });
      const mapped = (data.users || []).map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`.trim(),
        email: u.email,
        specialty: u.specialty_name || '',
        lastAccess: (u.last_login || '').split('T')[0] || '',
        sessions: 0,
        role: u.role === 'medical_user' ? 'medico' : (u.role === 'nursing' ? 'enfermeria' : 'paciente'),
        active: !!u.is_active,
      }));
      if (mapped.length) setUsers(mapped);
    } catch (e) {
      console.warn('No se pudieron cargar usuarios, usando mock:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    return users
      .filter(u => (tab === 'medicos' ? u.role === 'medico' : tab === 'pacientes' ? u.role === 'paciente' : u.role === 'enfermeria'))
      .filter(u => (type ? u.role === type : true))
      .filter(u => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      });
  }, [users, query, type, tab]);

  const toggleActive = async (id) => {
    try {
      const u = users.find(x => x.id === id);
      const next = !u.active;
      setUsers(prev => prev.map(p => p.id === id ? { ...p, active: next } : p));
      await usersAPI.updateStatus(id, next);
    } catch (e) {
      toast.error('No se pudo cambiar el estado');
    }
  };

  const [editing, setEditing] = useState(null); // user objeto o null

  const startEdit = (user) => setEditing(user);
  const closeEdit = () => setEditing(null);
  const saveEdit = async () => {
    try {
      const [firstName, ...rest] = (editing.name || '').trim().split(' ');
      const lastName = rest.join(' ') || '-';
      const roleMap = { medico: 'medical_user', paciente: 'administrative', enfermeria: 'nursing' };
      await usersAPI.update(editing.id, {
        firstName,
        lastName,
        role: roleMap[editing.role] || 'medical_user',
        specialtyId: null,
        isActive: !!editing.active,
      });
      toast.success('Usuario actualizado');
      await loadUsers();
      setEditing(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error actualizando');
    }
  };

  const createPasswordAndActivate = async () => {
    try {
      // Forzamos rol médico y activo
      const [firstName, ...rest] = (editing.name || '').trim().split(' ');
      const lastName = rest.join(' ') || '-';
      await usersAPI.update(editing.id, {
        firstName,
        lastName,
        role: 'medical_user',
        specialtyId: null,
        isActive: true,
      });
      const { data } = await usersAPI.resetPassword(editing.id);
      const temp = data?.tempPassword || '';
      setEditing(prev => ({ ...prev, tempPassword: temp, role: 'medico', active: true }));
      toast.success('Contraseña creada y usuario activado');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Error creando contraseña');
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ingresa el Nombre o Documento de identidad"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm text-gray-700"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Tipo de usuario</option>
            <option value="medico">Médico</option>
            <option value="paciente">Paciente</option>
            <option value="enfermeria">Enfermería</option>
          </select>
          <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">Buscar</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'medicos', label: 'Medicos' },
          { id: 'pacientes', label: 'Pacientes' },
          { id: 'enfermeria', label: 'Enfermería' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md border text-sm ${tab === t.id ? 'bg-white border-blue-200 text-blue-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista de usuarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(u => (
          <div key={u.id} className="bg-white border rounded-xl p-4 flex items-start gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">{u.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{u.name}</h3>
                {u.role === 'medico' && <Tag>Médico</Tag>}
                {u.role === 'paciente' && <Tag>Paciente</Tag>}
                {u.role === 'enfermeria' && <Tag>Enfermería</Tag>}
              </div>
              <div className="mt-1 text-sm text-gray-600 flex items-center gap-4 flex-wrap">
                <span>✉ {u.email}</span>
                {u.specialty && <span>• {u.specialty}</span>}
                <span>• Último acceso: {u.lastAccess}</span>
                <span>• {u.sessions} sesiones</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-1">Estado</div>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only" checked={u.active} onChange={() => toggleActive(u.id)} />
                  <span className={`w-10 h-5 flex items-center bg-gray-300 rounded-full p-1 transition ${u.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`bg-white w-4 h-4 rounded-full shadow transform transition ${u.active ? 'translate-x-5' : ''}`}></span>
                  </span>
                </label>
              </div>
              <button onClick={() => startEdit(u)} className="text-gray-500 hover:text-gray-700" title="Editar">✎</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Edición */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '840px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Editar usuario</h2>
              <button onClick={closeEdit} className="modal-close" aria-label="Cerrar">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="input-field" value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input-field" value={editing.email}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="input-field" value={editing.role}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                    <option value="medico">Médico</option>
                    <option value="paciente">Paciente</option>
                    <option value="enfermeria">Enfermería</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Especialidad</label>
                  <input className="input-field" value={editing.specialty || ''}
                    onChange={(e) => setEditing({ ...editing, specialty: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña (opcional)</label>
                  <div className="flex gap-2">
                    <input className="input-field" value={editing.tempPassword || ''} readOnly />
                    <button type="button" className="btn-secondary" onClick={createPasswordAndActivate}>Crear contraseña</button>
                  </div>
                  <p className="form-help">Se generará una contraseña temporal en el servidor y el usuario quedará como Médico activo.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeEdit} className="btn-secondary">Cancelar</button>
              <button onClick={saveEdit} className="btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Administration; 