import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import appointmentService from '../services/appointmentService';
import api from '../config/api';
import { CalendarIcon, ClockIcon, PatientIcon, DoctorIcon, ConsultIcon, VideoCallIcon, UsersIcon } from './icons/AppIcons';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const doctorId = user.id || user.userId;
  
  const [salaEsperaData, setSalaEsperaData] = useState([]);
  const [citasHoy, setCitasHoy] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Obtener el nombre completo del médico
  const getDoctorName = () => {
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Médico';
  };
  
  const doctorName = getDoctorName();

  const handleNewConsultation = () => {
    navigate('/new-consultation');
  };

  // Función para cargar sesiones activas de VideoSDK
  const loadActiveVideoSessions = async () => {
    try {
      const response = await api.get('/videosdk/rooms/active');
      
      if (response.data && response.data.success) {
        console.log('🎥 ===== SESIONES ACTIVAS DE VIDEOSDK =====');
        console.log('📊 Total de sesiones activas:', response.data.total);
        console.log('🕐 Timestamp:', response.data.timestamp);
        console.log('📋 Detalles de las salas:');
        
        if (response.data.rooms && response.data.rooms.length > 0) {
          response.data.rooms.forEach((room, index) => {
            console.log(`\n--- Sala ${index + 1} ---`);
            console.log('ID:', room.roomId || room.id || 'N/A');
            console.log('Estado:', room.status || 'N/A');
            console.log('Creada:', room.createdAt || 'N/A');
            console.log('Total de participantes:', room.participantCount || (room.participants ? room.participants.length : 0));
            
            if (room.participants && Array.isArray(room.participants) && room.participants.length > 0) {
              console.log('👥 Participantes:');
              room.participants.forEach((participant, pIndex) => {
                console.log(`  ${pIndex + 1}. ${participant.name || 'Desconocido'}${participant.phone ? ` - Tel: ${participant.phone}` : ''}`);
              });
            } else {
              console.log('👥 Participantes: No hay información disponible');
            }
            
            console.log('Datos completos:', room);
          });
        } else {
          console.log('ℹ️ No hay sesiones activas en este momento');
        }
        
        console.log('==========================================\n');
      } else {
        console.warn('⚠️ Respuesta inesperada del servidor:', response.data);
      }
    } catch (error) {
      console.error('❌ Error obteniendo sesiones activas de VideoSDK:', error);
      if (error.response) {
        console.error('Detalles del error:', error.response.data);
      }
    }
  };

  // Cargar citas del día actual
  useEffect(() => {
    loadAppointments();
  }, [doctorId]);

  // Cargar sesiones activas de VideoSDK
  useEffect(() => {
    loadActiveVideoSessions();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      loadActiveVideoSessions();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      // Usar fecha local en lugar de UTC para evitar problemas de zona horaria
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;
      
      // Obtener citas del día actual
      const response = await appointmentService.getAppointments({
        dateFrom: today,
        dateTo: today,
        doctorId: doctorId,
        sortBy: 'appointment_time',
        sortOrder: 'ASC'
      });

      const appointments = response.appointments || response.data?.appointments || [];
      
      console.log('Citas recibidas:', appointments);
      console.log('Fecha de hoy:', today);
      console.log('Doctor ID:', doctorId);
      
      // Función auxiliar para normalizar fecha (extraer solo YYYY-MM-DD)
      const normalizeDate = (dateStr) => {
        if (!dateStr) return '';
        // Si es una fecha ISO completa, extraer solo la parte de fecha
        if (dateStr.includes('T')) {
          return dateStr.split('T')[0];
        }
        // Si ya es solo la fecha, devolverla
        return dateStr.substring(0, 10);
      };
      
      // Filtrar solo las citas del doctor logueado y del día actual
      const doctorAppointments = appointments.filter(apt => {
        const aptDoctorId = apt.doctor_id || apt.doctorId;
        const aptDate = normalizeDate(apt.appointment_date || apt.date);
        const matchesDoctor = String(aptDoctorId) === String(doctorId);
        const matchesDate = aptDate === today;
        
        console.log('Cita:', {
          id: apt.id,
          doctorId: aptDoctorId,
          matchesDoctor,
          aptDate,
          matchesDate
        });
        
        return matchesDoctor && matchesDate;
      });
      
      console.log('Citas filtradas para el doctor:', doctorAppointments);

      // Función auxiliar para normalizar hora (quitar segundos si existen)
      const normalizeTime = (timeStr) => {
        if (!timeStr) return '';
        // Si tiene formato HH:MM:SS, tomar solo HH:MM
        return timeStr.substring(0, 5);
      };

      // Función auxiliar para crear objeto Date desde fecha y hora
      const createDateTime = (dateStr, timeStr) => {
        const normalizedDate = normalizeDate(dateStr);
        const normalizedTime = normalizeTime(timeStr);
        // Crear fecha en formato ISO: YYYY-MM-DDTHH:MM
        const dateTimeStr = `${normalizedDate}T${normalizedTime}`;
        return new Date(dateTimeStr);
      };

      // Mapear citas para sala de espera
      // Mostrar TODAS las citas del día (ya que todas las citas del día pueden estar en sala de espera)
      const salaEspera = doctorAppointments
        .filter(apt => {
          const aptTime = apt.appointment_time || apt.time || '';
          if (!aptTime) return false;
          
          // Mostrar todas las citas que tienen hora válida
          // No filtrar por tiempo, mostrar todas las citas del día
          return true;
        })
        .map(apt => {
          const aptTime = apt.appointment_time || apt.time || '';
          const aptDateStr = normalizeDate(apt.appointment_date || apt.date);
          const aptDateObj = createDateTime(aptDateStr, aptTime);
          const now = new Date();
          
          // Calcular estado basado en la hora actual vs hora de la cita
          const diffMinutes = (now - aptDateObj) / (1000 * 60);
          let estado = 'a-tiempo';
          if (diffMinutes < -15) {
            estado = 'temprano'; // Más de 15 minutos antes
          } else if (diffMinutes > 15) {
            estado = 'retrasado'; // Más de 15 minutos después
          }

          // Formatear hora
          const formatTime = (timeStr) => {
            if (!timeStr) return '--:--';
            const normalized = normalizeTime(timeStr);
            const [hours, minutes] = normalized.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
          };

          // Función para formatear la modalidad
          const formatModality = (modality) => {
            if (!modality) return 'Presencial';
            const modalityMap = {
              'TELEMEDICINA': 'Telemedicina',
              'telemedicina': 'Telemedicina',
              'PRESENCIAL': 'Presencial',
              'presencial': 'Presencial'
            };
            return modalityMap[modality] || modality;
          };

          return {
            id: apt.id,
            patientId: apt.patient_id || apt.patientId, // ID del paciente para navegación
            nombre: apt.patientFullName || `${apt.patient_first_name || ''} ${apt.patient_last_name || ''}`.trim() || 'Sin nombre',
            idNumber: apt.patient_document || 'Sin documento',
            doctor: apt.doctorFullName || `${apt.doctor_first_name || ''} ${apt.doctor_last_name || ''}`.trim() || 'Sin doctor',
            consulta: apt.specialty_name || 'Consulta',
            modalidad: formatModality(apt.modality || apt.type), // Modalidad de la cita
            sesiones: '', // No disponible en el modelo actual
            llegada: formatTime(aptTime), // Usar hora de la cita como llegada aproximada
            cita: formatTime(aptTime),
            estado: estado,
            horaOriginal: normalizeTime(aptTime) // Guardar hora original para ordenar
          };
        })
        .sort((a, b) => {
          // Ordenar por hora original (formato 24 horas) en orden descendente
          // Las citas más futuras aparecen primero (arriba)
          const timeA = a.horaOriginal || '';
          const timeB = b.horaOriginal || '';
          return timeB.localeCompare(timeA); // Invertido para orden descendente
        })
        .map(({ horaOriginal, ...rest }) => rest); // Remover horaOriginal del objeto final
      
      console.log('Citas en sala de espera:', salaEspera);

      // Mapear citas para "Citas de hoy"
      const citas = doctorAppointments.map(apt => {
        const aptTime = apt.appointment_time || apt.time || '';
        const formatTime = (timeStr) => {
          if (!timeStr) return '--:--';
          const [hours, minutes] = timeStr.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          return `${hour12}:${minutes} ${ampm}`;
        };

        // Obtener género del paciente para el avatar
        const patientGender = apt.patient_gender || '';
        const avatar = patientGender.toLowerCase() === 'femenino' || patientGender.toLowerCase() === 'f' ? '👩' : '👨';

        // Calcular edad del paciente
        const calculateAge = (birthDate) => {
          if (!birthDate) return null;
          const today = new Date();
          const birth = new Date(birthDate);
          let age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          return age;
        };
        const patientAge = apt.patient_age || calculateAge(apt.patient_birth_date);

        return {
          hora: formatTime(aptTime),
          nombre: apt.patientFullName || `${apt.patient_first_name || ''} ${apt.patient_last_name || ''}`.trim() || 'Sin nombre',
          edad: patientAge ? `${patientAge} años` : 'Edad no disponible',
          ultimaVisita: apt.patient_last_visit || 'N/A',
          avatar: avatar,
          appointmentId: apt.id,
          patientId: apt.patient_id
        };
      });

      setSalaEsperaData(salaEspera);
      setCitasHoy(citas);
    } catch (error) {
      console.error('Error cargando citas:', error);
      setSalaEsperaData([]);
      setCitasHoy([]);
    } finally {
      setLoading(false);
    }
  };


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
      {/* Layout vertical: Sala de espera arriba, Citas de hoy abajo */}
      <div className="space-y-6">
        {/* Sala de espera - Header y estadísticas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon width={24} height={24} stroke="#9A9A9A" />
              <h3 className="text-lg font-bold text-gray-600">Sala de espera</h3>
            </div>

            {/* Estadísticas */}
          <div className="text-sm text-gray-600 flex items-center gap-6">
            <div className="inline-block">
              Hora actual: <span className="font-bold text-gray-900">{currentTime}</span>
            </div>
            <div className="inline-block">
              Pacientes esperando: <span className="font-bold text-gray-900">{salaEsperaData.length}</span>
            </div>
          </div>
            
            {/* Leyenda de estados */}
            <div className="flex items-center gap-6 px-4 py-2 bg-white rounded-full shadow-md">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium text-gray-700">A tiempo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-xs font-medium text-gray-700">Temprano/Tarde</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs font-medium text-gray-700">Retrasado</span>
              </div>
            </div>
          </div>
          

          {/* Lista de tarjetas individuales */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : salaEsperaData.length === 0 ? (
            <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
              <span style={{ fontSize: '48px' }}>⏰</span>
              <h4 className="mt-2 text-sm font-medium text-gray-900">No hay pacientes en sala de espera</h4>
              <p className="mt-1 text-sm text-gray-500">
                Las citas próximas aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
          <div className="space-y-3">
            {salaEsperaData.map((paciente) => (
              <div 
                key={paciente.id} 
                className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer p-4"
                onClick={() => {
                  if (paciente.patientId) {
                    navigate(`/consultation/${paciente.patientId}`);
                  }
                }}
              >
                <div className="flex gap-4">
                  {/* Franja de color interna */}
                  <div className={`w-1.5 flex-shrink-0 rounded-full ${getEstadoColor(paciente.estado)}`}></div>
                  
                  <div className="grid grid-cols-5 gap-4 flex-1">
                  {/* Horarios */}
                  <div>
                    <p className="text-xs text-gray-500 flex items-center mb-1">
                      <ClockIcon width={14} height={14} stroke="#9CA3AF" className="mr-1" />
                      Horarios
                    </p>
                    <p className="text-sm text-gray-700">Llegada: {paciente.llegada}</p>
                    <p className="text-xs text-gray-600">Cita: {paciente.cita}</p>
                  </div>
                  
                  {/* Paciente */}
                  <div>
                    <p className="text-xs text-gray-500 flex items-center mb-1">
                      <PatientIcon width={14} height={14} stroke="#9CA3AF" className="mr-1" />
                      Paciente
                    </p>
                    <p className="text-sm text-gray-700">{paciente.nombre}</p>
                    <p className="text-xs text-gray-600">CC. {paciente.idNumber}</p>
                  </div>
                  
                  {/* Doctor */}
                  <div>
                    <p className="text-xs text-gray-500 flex items-center mb-1">
                      <DoctorIcon width={14} height={14} stroke="#9CA3AF" className="mr-1" />
                      Doctor
                    </p>
                    <p className="text-sm text-gray-700">{paciente.doctor}</p>
                  </div>
                  
                  {/* Consulta */}
                  <div>
                    <p className="text-xs text-gray-500 flex items-center mb-1">
                      <ConsultIcon width={14} height={14} stroke="#9CA3AF" className="mr-1" />
                      Consulta
                    </p>
                    <p className="text-sm text-gray-700">{paciente.consulta}</p>
                    <p className="text-xs text-gray-600">Modalidad: {paciente.modalidad}</p>
                  </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Citas de hoy */}
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <UsersIcon width={20} height={20} stroke="#9A9A9A" />
            <h3 className="text-lg font-semibold text-gray-900">Citas de hoy</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Agenda del día actual</p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : citasHoy.length === 0 ? (
            <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
              <span style={{ fontSize: '48px' }}>📅</span>
              <h4 className="mt-2 text-sm font-medium text-gray-900">No hay citas programadas para hoy</h4>
              <p className="mt-1 text-sm text-gray-500">
                Las citas del día aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
          <div className="space-y-3">
            {citasHoy.map((cita, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-4 border rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-20 text-sm font-semibold text-gray-700">{cita.hora}</div>
                <div className="w-px h-10 bg-gray-200"></div>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                  {cita.avatar}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{cita.nombre}</div>
                  <div className="text-xs text-gray-500">{cita.edad} • Última visita: {cita.ultimaVisita}</div>
                </div>
                <button 
                  onClick={() => navigate(`/consultation/${cita.patientId}`)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <VideoCallIcon width={18} height={18} stroke="white" />
                  Empezar consulta
                </button>
              </div>
            ))}
          </div>
          )}
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