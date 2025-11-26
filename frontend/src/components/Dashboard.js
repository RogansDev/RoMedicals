import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ArrowRight from '../img/ArrowRight.svg';
import iconHeart from '../img/corazon-con-chulito.svg';
import illus from '../img/img1.png';
import iconDoctors from '../img/medicos-icon.svg';
import iconPatients from '../img/pacientes-icon.svg';
import iconNursing from '../img/enfermeria-icon.svg';
import secure from '../img/segura.svg';
import NewAppointmentModal from './NewAppointmentModal';
import appointmentService from '../services/appointmentService';

const Dashboard = () => {
  const navigate = useNavigate();
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Estados para la agenda
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Cargar próximas citas al montar el componente
  useEffect(() => {
    loadUpcomingAppointments();
  }, []);

  const loadUpcomingAppointments = async () => {
    try {
      setLoadingAppointments(true);
      const today = new Date().toISOString().split('T')[0];
      const response = await appointmentService.getAppointments({
        dateFrom: today,
        limit: 10,
        sortBy: 'appointment_date',
        sortOrder: 'ASC'
      });
      
      const appointments = response.appointments || [];
      // Mapear las citas al formato esperado
      const mappedAppointments = appointments.map(appointment => {
        // Debug: ver qué está llegando del backend
        console.log('📅 Cita recibida del backend:', {
          id: appointment.id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          appointmentDateTime: appointment.appointmentDateTime,
          date: appointment.date,
          time: appointment.time
        });
        
        return {
          id: appointment.id,
          // Intentar múltiples fuentes para la fecha
          date: appointment.appointment_date || appointment.date || appointment.appointmentDateTime?.split('T')[0] || null,
          // Intentar múltiples fuentes para la hora
          time: appointment.appointment_time || appointment.time || appointment.appointmentDateTime?.split('T')[1]?.substring(0, 5) || null,
          patient: {
            id: appointment.patient_id,
            name: appointment.patientFullName || `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim() || 'Sin nombre',
            document: appointment.patient_document || 'Sin documento'
          },
          doctor: appointment.doctorFullName || `${appointment.doctor_first_name || ''} ${appointment.doctor_last_name || ''}`.trim() || 'Sin doctor',
          specialty: appointment.specialty_name || 'Medicina General',
          status: appointment.status,
          type: appointment.type
        };
      });
      
      setUpcomingAppointments(mappedAppointments);
    } catch (error) {
      console.error('Error cargando próximas citas:', error);
      // No mostrar error, simplemente dejar la lista vacía
      setUpcomingAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleAddDoctor = () => {
    navigate('/user-management?tab=medicos');
  };

  const handleAddPatient = () => {
    navigate('/user-management?tab=pacientes');
  };

  const handleAddNursing = () => {
    navigate('/user-management?tab=enfermeria');
  };

  const handleNewAppointment = () => {
    setIsNewAppointmentModalOpen(true);
  };

  const handleSaveAppointment = async (newAppointment) => {
    try {
      // Validaciones defensivas antes de enviar
      if (!newAppointment || !newAppointment.patientId) {
        toast.error('Debes seleccionar un paciente válido');
        return;
      }
      if (!newAppointment.doctorId) {
        toast.error('Debes seleccionar un doctor válido');
        return;
      }
      const apptDate = newAppointment.appointmentDate || newAppointment.date;
      const apptTime = newAppointment.appointmentTime || newAppointment.time;
      if (!apptDate) { toast.error('Debes seleccionar una fecha válida'); return; }
      if (!apptTime) { toast.error('Debes seleccionar una hora válida'); return; }

      const payload = {
        patientId: newAppointment.patientId,
        doctorId: newAppointment.doctorId,
        specialtyId: newAppointment.specialtyId || undefined,
        appointmentDate: apptDate,
        appointmentTime: apptTime,
        duration: 30, // Duración por defecto en minutos
        type: String(newAppointment.type || '').toUpperCase(),
        modality: newAppointment.modality || 'PRESENCIAL', // Incluir modality
        status: String(newAppointment.status || '').toUpperCase(),
        reason: newAppointment.notes || '',
        notes: newAppointment.notes || ''
      };
      
      console.log('📋 Dashboard - Payload para crear cita:', payload);

      // Crear la cita en el backend
      await appointmentService.createAppointment(payload);

      // Recargar las citas
      await loadUpcomingAppointments();
      
      toast.success('Cita creada exitosamente');
      setIsNewAppointmentModalOpen(false);
    } catch (error) {
      console.error('Error creando cita:', error);
      toast.error(error.message || 'Error al crear la cita');
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Fecha no disponible';
      // Si ya es una fecha válida, usarla directamente
      if (dateString instanceof Date) {
        return dateString.toLocaleDateString('es-CO', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // Si es un string, intentar parsearlo
      const dateStr = String(dateString).trim();
      if (!dateStr || dateStr === 'null' || dateStr === 'undefined') {
        return 'Fecha no disponible';
      }
      // Intentar diferentes formatos
      let date;
      if (dateStr.includes('T')) {
        // Formato ISO con tiempo
        date = new Date(dateStr);
      } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Formato YYYY-MM-DD
        date = new Date(dateStr + 'T00:00:00');
      } else {
        // Intentar parsear directamente
        date = new Date(dateStr);
      }
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return 'Fecha no disponible';
      }
      
      return date.toLocaleDateString('es-CO', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Error formateando fecha:', dateString, error);
      return 'Fecha no disponible';
    }
  };

  const getStatusColor = (status) => {
    const statusUpper = String(status || '').toUpperCase();
    if (statusUpper.includes('CONFIRM')) return 'bg-green-100 text-green-800';
    if (statusUpper.includes('ESPER') || statusUpper.includes('PEND')) return 'bg-yellow-100 text-yellow-800';
    if (statusUpper.includes('ATEND') || statusUpper.includes('COMPLE')) return 'bg-blue-100 text-blue-800';
    if (statusUpper.includes('CANCEL')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
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

      {/* Sección de Agenda */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span style={{ fontSize: '20px' }}>📅</span>
              Agenda de Citas
            </h2>
            <p className="text-sm text-gray-600 mt-1">Gestiona y asigna citas médicas a tus pacientes</p>
          </div>
          <button
            onClick={handleNewAppointment}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
          >
            <span style={{ fontSize: '16px' }}>➕</span>
            Asignar Nueva Cita
          </button>
        </div>

        {/* Próximas citas */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximas Citas Programadas</h3>
          
          {loadingAppointments ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 border border-gray-200 rounded-lg">
              <span style={{ fontSize: '48px' }}>📅</span>
              <h4 className="mt-2 text-sm font-medium text-gray-900">No hay citas programadas</h4>
              <p className="mt-1 text-sm text-gray-500">
                Asigna una nueva cita para comenzar a gestionar la agenda médica.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="text-center min-w-[80px]">
                        <div className="text-lg font-bold text-gray-900">
                          {appointment.time ? appointment.time.substring(0, 5) : '--:--'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(appointment.date)}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {appointment.patient.name}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {appointment.patient.document}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Médico:</span> {appointment.doctor}
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Especialidad:</span> {appointment.specialty}
                        </div>
                      </div>

                      <div className="text-center min-w-[120px]">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {appointment.type}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón para ver agenda completa */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => navigate('/agenda')}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Ver agenda completa
            <img src={ArrowRight} alt="ir" className="h-4" />
          </button>
        </div>
      </div>

      {/* Pie de página de seguridad */}
      <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
        <img src={secure} alt="segura" className="h-4" />
        Conexión segura protegida
      </div>

      {/* Modal de Nueva Cita */}
      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => setIsNewAppointmentModalOpen(false)}
        onSave={handleSaveAppointment}
      />
    </div>
  );
};

export default Dashboard;