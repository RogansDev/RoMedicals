import React, { useMemo, useState } from 'react';
import secure from '../img/segura.svg';

const Toggle = ({ checked, onChange }) => (
  <label className="inline-flex items-center cursor-pointer select-none">
    <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className={`w-10 h-5 flex items-center rounded-full p-1 transition ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <span className={`bg-white w-4 h-4 rounded-full shadow transform transition ${checked ? 'translate-x-5' : ''}`}></span>
    </span>
  </label>
);

const PermissionRow = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-[14px] text-gray-700">{label}</span>
    <Toggle checked={value} onChange={onChange} />
  </div>
);

const Permissions = () => {
  const [tab, setTab] = useState('medicos');
  const [perms, setPerms] = useState({
    treasury: { ingresos: true, egresos: true, movimientos: true },
    agendas: { editar: false, verOtros: false },
    pacientes: { datos: true, antecedentes: true, contactos: true, convenios: false },
  });

  const setP = (path, val) => {
    setPerms(prev => ({
      ...prev,
      [path[0]]: { ...prev[path[0]], [path[1]]: val }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="text-[16px] font-semibold text-gray-900">Administra los permisos de tu equipo</h3>
        <p className="text-sm text-gray-600 mt-2">Puedes ajustar los permisos de manera sencilla para médicos, pacientes y profesionales de enfermería.</p>
        <p className="text-sm text-gray-600">Define qué acciones puede realizar cada usuario, desde acceder a historiales clínicos, registrar consultas o agregar notas.</p>

        <div className="mt-4 flex gap-2">
          {[
            { id: 'medicos', label: 'Medicos' },
            { id: 'pacientes', label: 'Pacientes' },
            { id: 'enfermeria', label: 'Enfermeria' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-md text-sm border ${tab === t.id ? 'bg-white border-blue-200 text-blue-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grids de módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tesorería */}
        <div className="bg-white border rounded-xl p-5">
          <h4 className="text-[15px] font-semibold text-gray-900 mb-2">Tesorería</h4>
          <PermissionRow label="Conciliar ingresos" value={perms.treasury.ingresos} onChange={(v) => setP(['treasury','ingresos'], v)} />
          <PermissionRow label="Conciliar egresos" value={perms.treasury.egresos} onChange={(v) => setP(['treasury','egresos'], v)} />
          <PermissionRow label="Exportar movimientos diarios y balances" value={perms.treasury.movimientos} onChange={(v) => setP(['treasury','movimientos'], v)} />
        </div>

        {/* Agendas */}
        <div className="bg-white border rounded-xl p-5">
          <h4 className="text-[15px] font-semibold text-gray-900 mb-2">Agendas</h4>
          <PermissionRow label="Editar agenda" value={perms.agendas.editar} onChange={(v) => setP(['agendas','editar'], v)} />
          <PermissionRow label="Ver agenda de otros usuarios" value={perms.agendas.verOtros} onChange={(v) => setP(['agendas','verOtros'], v)} />
        </div>

        {/* Pacientes */}
        <div className="bg-white border rounded-xl p-5">
          <h4 className="text-[15px] font-semibold text-gray-900 mb-2">Pacientes</h4>
          <PermissionRow label="Ver y editar datos de pacientes" value={perms.pacientes.datos} onChange={(v) => setP(['pacientes','datos'], v)} />
          <PermissionRow label="Ver y editar antecedentes de pacientes" value={perms.pacientes.antecedentes} onChange={(v) => setP(['pacientes','antecedentes'], v)} />
          <PermissionRow label="Ver y editar contactos del paciente" value={perms.pacientes.contactos} onChange={(v) => setP(['pacientes','contactos'], v)} />
          <PermissionRow label="Ver y editar convenios del paciente" value={perms.pacientes.convenios} onChange={(v) => setP(['pacientes','convenios'], v)} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
        <img src={secure} alt="segura" className="h-4" />
        Conexión segura protegida
      </div>
    </div>
  );
};

export default Permissions;


