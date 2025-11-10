import React from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowRight from '../img/ArrowRight.svg';
import iconHeart from '../img/corazon-con-chulito.svg';
import illus from '../img/img1.png';
import iconDoctors from '../img/medicos-icon.svg';
import iconPatients from '../img/pacientes-icon.svg';
import iconNursing from '../img/enfermeria-icon.svg';
import secure from '../img/segura.svg';

const Dashboard = () => {
  const navigate = useNavigate();
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleAddDoctor = () => {
    navigate('/user-management?tab=medicos');
  };

  const handleAddPatient = () => {
    navigate('/user-management?tab=pacientes');
  };

  const handleAddNursing = () => {
    navigate('/user-management?tab=enfermeria');
  };

  return (
    <div className="space-y-6">

      {/* Tarjeta de bienvenida */}
      <div className="bg-white border rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <img src={iconHeart} alt="bienvenido" className="w-5 h-5" />
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Bienvenido al corazón de tu clínica digital</h2>
          </div>
          <p className="text-sm text-gray-700 mb-1"><strong>Felicitaciones,</strong> has configurado de manera correcta tu panel de administración Romedicals.</p>
          <p className="text-sm text-gray-700">Para empezar a usar el sistema, el primer paso es crear tu primer médico, registrar a tu primer paciente y sumar a tu primer profesional de enfermería.</p>
          <p className="text-sm text-gray-700 mt-3 font-medium">La historia de tu clínica empieza aquí.</p>
        </div>
        <div className="w-full md:w-auto">
          <img src={illus} alt="ilustración" className="max-w-[300px] w-full" />
        </div>
      </div>

      {/* Secciones de acceso rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Médicos */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <img src={iconDoctors} alt="médicos" className="w-5 h-5" />
            <h3 className="text-gray-900 font-semibold">Médicos</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Dale la bienvenida al primer médico de tu equipo.</p>
          <button onClick={handleAddDoctor} className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2">
            Agregar médico
            <img src={ArrowRight} alt="ir" className="h-4" />
          </button>
        </div>

        {/* Pacientes */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <img src={iconPatients} alt="pacientes" className="w-5 h-5" />
            <h3 className="text-gray-900 font-semibold">Pacientes</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Registra al primer paciente de tu clínica.</p>
          <button onClick={handleAddPatient} className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2">
            Registrar paciente
            <img src={ArrowRight} alt="ir" className="h-4" />
          </button>
        </div>

        {/* Enfermería */}
        <div className="bg-white border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <img src={iconNursing} alt="enfermería" className="w-5 h-5" />
            <h3 className="text-gray-900 font-semibold">Enfermería</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Agrega al primer profesional de enfermería a tu organización.</p>
          <button onClick={handleAddNursing} className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2">
            Agregar enfermería
            <img src={ArrowRight} alt="ir" className="h-4" />
          </button>
        </div>
      </div>

      {/* Pie de página de seguridad */}
      <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
        <img src={secure} alt="segura" className="h-4" />
        Conexión segura protegida
      </div>
    </div>
  );
};

export default Dashboard;