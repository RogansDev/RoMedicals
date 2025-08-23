import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import NewAppointmentModal from './NewAppointmentModal';
import appointmentService from '../services/appointmentService';

const Agenda = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para los filtros de fecha
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  
  // Estado para el modal de nueva cita
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);

  // Datos de ejemplo para la agenda
  const mockAppointments = [
    {
      id: 1,
      date: '2025-08-06',
      time: '08:00',
      patient: {
        id: 1,
        name: 'Juan Carlos Pérez',
        document: 'CC 12345678',
        phone: '+57 300 123 4567'
      },
      doctor: 'Dr. Ana María López',
      specialty: 'Medicina General',
      status: 'Confirmado',
      type: 'Consulta',
      attentionId: 'AT-001'
    },
    {
      id: 2,
      date: '2025-08-06',
      time: '09:00',
      patient: {
        id: 2,
        name: 'María González',
        document: 'CC 87654321',
        phone: '+57 301 987 6543'
      },
      doctor: 'Dr. Carlos Rodríguez',
      specialty: 'Cardiología',
      status: 'En espera',
      type: 'Control',
      attentionId: 'AT-002'
    },
    {
      id: 3,
      date: '2025-08-06',
      time: '10:00',
      patient: {
        id: 3,
        name: 'Pedro Silva',
        document: 'CC 11223344',
        phone: '+57 302 555 1234'
      },
      doctor: 'Dr. Laura Martínez',
      specialty: 'Dermatología',
      status: 'Atendido',
      type: 'Primera vez',
      attentionId: 'AT-003'
    },
    {
      id: 4,
      date: '2025-08-06',
      time: '14:00',
      patient: {
        id: 4,
        name: 'Ana Rodríguez',
        document: 'CC 55667788',
        phone: '+57 303 444 5555'
      },
      doctor: 'Dr. Ana María López',
      specialty: 'Medicina General',
      status: 'Confirmado',
      type: 'Control',
      attentionId: 'AT-004'
    },
    {
      id: 5,
      date: '2025-08-06',
      time: '11:00',
      patient: {
        id: 5,
        name: 'Carlos Mendoza',
        document: 'CC 99887766',
        phone: '+57 304 333 2222'
      },
      doctor: 'Dr. Carlos Rodríguez',
      specialty: 'Cardiología',
      status: 'En espera',
      type: 'Primera vez',
      attentionId: 'AT-005'
    }
  ];

  // Generar años disponibles (desde 2020 hasta 2030)
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);
  
  // Meses disponibles
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  // Generar días disponibles según el mes y año seleccionados
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const days = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) }, 
    (_, i) => i + 1
  );

  useEffect(() => {
    // Cargar citas reales desde el backend
    loadAppointments();
  }, []);

  // Función para cargar citas desde el backend
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getAppointments();
      const backendAppointments = response.appointments || [];
      
      // Mapear las citas del backend al formato esperado por el frontend
      const mappedAppointments = backendAppointments.map(appointment => ({
        id: appointment.id,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        patient: {
          id: appointment.patient_id,
          name: appointment.patientFullName || `${appointment.patient_first_name} ${appointment.patient_last_name}`,
          document: appointment.patient_document || 'Sin documento',
          phone: '+57 300 000 0000' // Valor por defecto si no hay teléfono
        },
        doctor: appointment.doctorFullName || `${appointment.doctor_first_name} ${appointment.doctor_last_name}`,
        specialty: appointment.specialty_name || 'Medicina General',
        status: appointment.status,
        type: appointment.type,
        attentionId: `AT-${appointment.id}`
      }));
      
      setAppointments(mappedAppointments);
    } catch (error) {
      console.error('Error cargando citas:', error);
      toast.error('Error al cargar las citas');
      // En caso de error, usar datos mock como fallback
      setAppointments(mockAppointments);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar citas según todos los filtros seleccionados
  useEffect(() => {
    const selectedDateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    
    const filtered = appointments.filter(appointment => {
      // Filtro por fecha - convertir la fecha del backend al formato esperado
      let appointmentDate;
      if (typeof appointment.date === 'string') {
        // Si la fecha viene como string ISO del backend
        appointmentDate = appointment.date.split('T')[0];
      } else {
        // Si la fecha viene como objeto Date o string simple
        appointmentDate = appointment.date;
      }
      
      const dateMatch = appointmentDate === selectedDateString;
      
      // Filtro por especialidad
      const specialtyMatch = selectedSpecialty === 'all' || 
        appointment.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());
      
      // Filtro por estado
      const statusMatch = selectedStatus === 'all' || 
        appointment.status.toLowerCase() === selectedStatus.toLowerCase();
      
      // Filtro por tipo
      const typeMatch = selectedType === 'all' || 
        appointment.type.toLowerCase().includes(selectedType.toLowerCase());
      
      return dateMatch && specialtyMatch && statusMatch && typeMatch;
    });
    
    setFilteredAppointments(filtered);
    setSelectedDate(new Date(selectedYear, selectedMonth - 1, selectedDay));
  }, [appointments, selectedYear, selectedMonth, selectedDay, selectedSpecialty, selectedStatus, selectedType]);

  const formatDate = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-green-100 text-green-800';
      case 'En espera':
        return 'bg-yellow-100 text-yellow-800';
      case 'Atendido':
        return 'bg-blue-100 text-blue-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Primera vez':
        return 'bg-purple-100 text-purple-800';
      case 'Control':
        return 'bg-orange-100 text-orange-800';
      case 'Consulta':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth() + 1);
    setSelectedDay(today.getDate());
  };

  const handleClearFilters = () => {
    setSelectedSpecialty('all');
    setSelectedStatus('all');
    setSelectedType('all');
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth() + 1);
    setSelectedDay(today.getDate());
    toast.success('Filtros limpiados');
  };

  const handleNewAppointment = () => {
    setIsNewAppointmentModalOpen(true);
  };

  const handleSaveAppointment = async (newAppointment) => {
    try {
      // Crear la cita en el backend
      const response = await appointmentService.createAppointment({
        patientId: newAppointment.patientId,
        doctorId: newAppointment.doctorId,
        appointmentDate: newAppointment.date,
        appointmentTime: newAppointment.time,
        duration: 30, // Duración por defecto en minutos
        type: newAppointment.type.toUpperCase(),
        status: newAppointment.status.toUpperCase(),
        reason: newAppointment.notes || '',
        notes: newAppointment.notes || ''
      });

      // Recargar las citas desde el backend para asegurar consistencia
      await loadAppointments();
      
      toast.success('Cita creada exitosamente');
    } catch (error) {
      console.error('Error creando cita:', error);
      toast.error(error.message || 'Error al crear la cita');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de la Agenda */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda Médica</h1>
          <p className="text-sm text-gray-600">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex space-x-2">
          <button 
            className="btn-primary"
            onClick={handleNewAppointment}
          >
            <span style={{ fontSize: '14px', marginRight: '8px' }}>📅</span>
            Nueva Cita
          </button>
          <button className="btn-secondary">
            <span style={{ fontSize: '14px', marginRight: '8px' }}>🖨️</span>
            Imprimir
          </button>
        </div>
      </div>

      {/* Filtros de Fecha */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filtros de Fecha</h3>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleTodayClick}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <span style={{ fontSize: '14px', marginRight: '4px' }}>📅</span>
              Ir a hoy
            </button>
            <div className="flex space-x-2">
              <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded border border-gray-300 hover:border-gray-400">
                <span style={{ fontSize: '14px', marginRight: '4px' }}>📊</span>
                Vista semanal
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded border border-gray-300 hover:border-gray-400">
                <span style={{ fontSize: '14px', marginRight: '4px' }}>📋</span>
                Vista mensual
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Año</label>
            <div className="relative">
              <select 
                className="input-field pr-10 appearance-none"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="form-label">Mes</label>
            <div className="relative">
              <select 
                className="input-field pr-10 appearance-none"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="form-label">Día</label>
            <div className="relative">
              <select 
                className="input-field pr-10 appearance-none"
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value))}
              >
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <button 
              className="btn-primary w-full"
              onClick={() => {
                toast.success(`Citas filtradas para ${formatDate(selectedDate)}`);
              }}
            >
              <span style={{ fontSize: '14px', marginRight: '8px' }}>🔍</span>
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Filtros adicionales */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filtros Adicionales</h3>
          <button 
            onClick={handleClearFilters}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            <span style={{ fontSize: '14px', marginRight: '4px' }}>🗑️</span>
            Limpiar filtros
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Especialidad</label>
            <div className="relative">
              <select 
                className="input-field pr-10 appearance-none"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                <option value="all">Todas las especialidades</option>
                <option value="general">Medicina General</option>
                <option value="cardiology">Cardiología</option>
                <option value="dermatology">Dermatología</option>
                <option value="pediatrics">Pediatría</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="form-label">Estado</label>
            <div className="relative">
              <select 
                className="input-field pr-10 appearance-none"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="confirmado">Confirmado</option>
                <option value="en espera">En espera</option>
                <option value="atendido">Atendido</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <label className="form-label">Tipo de atención</label>
            <div className="relative">
              <select 
                className="input-field pr-10 appearance-none"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">Todos los tipos</option>
                <option value="primera vez">Primera vez</option>
                <option value="control">Control</option>
                <option value="consulta">Consulta</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{filteredAppointments.length}</div>
          <div className="text-sm text-gray-600">Citas del día</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {filteredAppointments.filter(a => a.status === 'Confirmado').length}
          </div>
          <div className="text-sm text-gray-600">Confirmadas</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {filteredAppointments.filter(a => a.status === 'En espera').length}
          </div>
          <div className="text-sm text-gray-600">En espera</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {filteredAppointments.filter(a => a.status === 'Atendido').length}
          </div>
          <div className="text-sm text-gray-600">Atendidas</div>
        </div>
      </div>

      {/* Lista de citas */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Citas del día ({filteredAppointments.length})
          </h2>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-8">
            <span style={{ fontSize: '48px' }}>📅</span>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay citas programadas</h3>
            <p className="mt-1 text-sm text-gray-500">
              No hay citas programadas para el {formatDate(selectedDate)}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {appointment.time}
                      </div>
                      <div className="text-xs text-gray-500">Hora</div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">
                          {appointment.patient.name}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {appointment.patient.document}
                        </span>
                        <span style={{ fontSize: '12px' }}>📍</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        📞 {appointment.patient.phone}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="font-medium text-gray-900">
                        {appointment.doctor}
                      </div>
                      <div className="text-sm text-gray-600">
                        {appointment.specialty}
                      </div>
                    </div>

                    <div className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {appointment.type}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(appointment.type)}`}>
                      {appointment.type}
                    </span>
                    
                    <div className="flex space-x-1">
                      <Link
                        to={`/patients/${appointment.patient.id}/ficha`}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        <span style={{ fontSize: '12px', marginRight: '4px' }}>👤</span>
                        Ficha
                      </Link>
                      
                      {appointment.status === 'En espera' && (
                        <button className="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700">
                          <span style={{ fontSize: '12px', marginRight: '4px' }}>✅</span>
                          Atender
                        </button>
                      )}
                      
                      {appointment.status === 'Atendido' && (
                        <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700">
                          <span style={{ fontSize: '12px', marginRight: '4px' }}>📋</span>
                          Ver atención
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

export default Agenda; 