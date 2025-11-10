import React from 'react';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const navigate = useNavigate();

  const handleNewConsultation = () => {
    navigate('/new-consultation');
  };

  // Datos de ejemplo basados en la imagen
  const salaEsperaData = [
    { 
      id: 1, 
      nombre: 'Diego Alejandro Torres', 
      idNumber: '1016038989', 
      doctor: 'Marlon Antonio Gonzales Yepez',
      consulta: 'Mesoterapia - Seguimiento (Starter 3 Months)',
      sesiones: '6/10',
      llegada: '10:00 AM',
      cita: '10:30 AM',
      estado: 'temprano' // naranja
    },
    { 
      id: 2, 
      nombre: 'Ana Patricia Gomez', 
      idNumber: '1045678901', 
      doctor: 'Dr. Roberto Silva Mendoza',
      consulta: 'Revisión Dermatológica (Standard Plan)',
      sesiones: '4/8',
      llegada: '8:58 AM',
      cita: '9:00 AM',
      estado: 'a-tiempo' // verde
    },
    { 
      id: 3, 
      nombre: 'Laura Valentina Herrera', 
      idNumber: '1067890123', 
      doctor: 'Dr. Patricia Diaz Lopez',
      consulta: 'Asesoría Nutricional (Wellness 4 Months)',
      sesiones: '3/6',
      llegada: '3:45 PM',
      cita: '3:30 PM',
      estado: 'retrasado' // rojo
    }
  ];

  const citasHoy = [
    { 
      hora: '10:30 AM', 
      nombre: 'Camila Andrea Pérez', 
      edad: '32 años • A-', 
      ultimaVisita: '05/03/2023',
      avatar: '👩'
    },
    { 
      hora: '11:00 AM', 
      nombre: 'Carlos López Martinez', 
      edad: '28 años • O+', 
      ultimaVisita: '15/01/2023',
      avatar: '👨'
    },
    { 
      hora: '14:30 PM', 
      nombre: 'Ana Rodríguez Yepes', 
      edad: '50 años • AB-', 
      ultimaVisita: '20/04/2023',
      avatar: '👩'
    }
  ];

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'a-tiempo': return 'bg-green-500';
      case 'temprano': return 'bg-orange-500';
      case 'retrasado': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getEstadoNombre = (estado) => {
    switch(estado) {
      case 'a-tiempo': return 'A tiempo';
      case 'temprano': return 'Temprano/Tarde';
      case 'retrasado': return 'Retrasado';
      default: return '';
    }
  };

  const currentDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const currentTime = new Date().toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <div className="space-y-6">
      {/* Barra superior con CTA */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Dashboard Médico</h1>
          <p className="text-sm text-gray-600">Dr. Rafael Yepes Martinez - {currentDate}</p>
        </div>
        <button 
          onClick={handleNewConsultation}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm shadow flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Nueva consulta
        </button>
      </div>

      {/* Layout vertical: Sala de espera arriba, Citas de hoy abajo */}
      <div className="space-y-6">
        {/* Sala de espera - Header y estadísticas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Sala de espera</h3>
            </div>
            
            {/* Leyenda de estados */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium text-gray-700">A tiempo</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full shadow-sm">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-xs font-medium text-gray-700">Temprano/Tarde</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full shadow-sm">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs font-medium text-gray-700">Retrasado</span>
              </div>
            </div>
          </div>
          
          {/* Estadísticas */}
          <div className="mb-4 text-sm text-gray-600">
            <div className="inline-block mr-6">
              Pacientes esperando: <span className="font-bold text-gray-900">6</span>
            </div>
            <div className="inline-block">
              Hora actual: <span className="font-bold text-gray-900">{currentTime}</span>
            </div>
          </div>

          {/* Lista de tarjetas individuales */}
          <div className="space-y-3">
            {salaEsperaData.map((paciente) => (
              <div 
                key={paciente.id} 
                className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer p-4"
              >
                <div className="flex gap-4">
                  {/* Franja de color interna */}
                  <div className={`w-1.5 flex-shrink-0 rounded-full ${getEstadoColor(paciente.estado)}`}></div>
                  
                  <div className="grid grid-cols-5 gap-4 flex-1">
                  {/* Horarios */}
                  <div>
                    <p className="text-xs text-gray-500 flex items-center mb-1">
                      <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Horarios
                    </p>
                    <p className="text-sm text-gray-700">Llegada: {paciente.llegada}</p>
                    <p className="text-xs text-gray-600">Cita: {paciente.cita}</p>
                  </div>
                  
                  {/* Paciente */}
                  <div>
                    <p className="text-xs text-gray-500 flex items-center mb-1">
                      <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      Paciente
                    </p>
                    <p className="text-sm text-gray-700">{paciente.nombre}</p>
                    <p className="text-xs text-gray-600">CC. {paciente.idNumber}</p>
                  </div>
                  
                  {/* Doctor */}
                  <div>
                    <p className="text-xs text-gray-500 flex items-center mb-1">
                      <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.169 2.727 1.169a1 1 0 11-.788 1.838l-4-1.714a1 1 0 00-.356.257l-1.898.81a1 1 0 11-.788-1.838l7-3a1 1 0 00.394-1.08z" />
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM16 14.802a1 1 0 00.781-.877l1-11a1 1 0 00-1.96-.434l-1 11a1 1 0 00.78 1.311z" />
                      </svg>
                      Doctor
                    </p>
                    <p className="text-sm text-gray-700">{paciente.doctor}</p>
                  </div>
                  
                  {/* Consulta */}
                  <div>
                    <p className="text-xs text-gray-500 flex items-center mb-1">
                      <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0113 3.414L16.586 7A2 2 0 0118 8.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      Consulta
                    </p>
                    <p className="text-sm text-gray-700">{paciente.consulta}</p>
                    <p className="text-xs text-gray-600">{paciente.plan}</p>
                  </div>
                  
                  {/* Sesiones */}
                  <div className="flex justify-end items-start">
                    <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded">
                      {paciente.sesiones}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Citas de hoy */}
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Citas de hoy</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Agenda del día actual</p>

          <div className="space-y-3">
            {citasHoy.map((cita, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-4 border rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="w-20 text-sm font-semibold text-gray-700">{cita.hora}</div>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                  {cita.avatar}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{cita.nombre}</div>
                  <div className="text-xs text-gray-500">{cita.edad} • Última visita: {cita.ultimaVisita}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mensaje de seguridad */}
      <div className="flex items-center justify-end gap-2 text-xs text-gray-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Conexión segura protegida
      </div>
    </div>
  );
};

export default DoctorDashboard;