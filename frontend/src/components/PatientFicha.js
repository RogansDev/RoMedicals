import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import patientService from '../services/patientService';
import appointmentService from '../services/appointmentService';
import userService from '../services/userService';

const PatientFicha = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patient, setPatient] = useState(null);
  const [attentions, setAttentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);
  const [expandedAttentionId, setExpandedAttentionId] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [doctorPickerFor, setDoctorPickerFor] = useState(null);
  const [savingDoctorFor, setSavingDoctorFor] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [activeTab, setActiveTab] = useState('consultas');

  // Cargar datos del paciente
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        setLoading(true);
        const patientData = await patientService.getPatientById(patientId);
        setPatient(patientData.patient);
        
        // Cargar atenciones del paciente
        const appointmentsData = await appointmentService.getAppointmentsByPatient(patientId);
        setAttentions(appointmentsData.appointments || []);
      } catch (error) {
        console.error('Error cargando datos del paciente:', error);
        toast.error('Error al cargar los datos del paciente');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  // Leer el parámetro tab de la URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['consultas', 'documentos', 'grabaciones'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatStatusDisplay = (status) => {
    const statusMap = {
      'confirmed': 'Confirmada',
      'scheduled': 'Agendada', 
      'completed': 'Completada',
      'cancelled': 'Cancelada',
      'failed': 'Fallada'
    };
    return statusMap[status] || formatTitleCase(status);
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'confirmed': 'bg-green-100 text-green-700',
      'scheduled': 'bg-blue-100 text-blue-700',
      'completed': 'bg-gray-100 text-gray-700',
      'cancelled': 'bg-red-100 text-red-700',
      'failed': 'bg-red-100 text-red-700'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-700';
  };

  const openAttentionDetail = (appointment) => {
    setExpandedAttentionId(expandedAttentionId === appointment.id ? null : appointment.id);
  };

  const handleNewConsultation = () => {
    navigate(`/consultation/${patientId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando paciente...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Paciente no encontrado</h2>
        <button onClick={() => navigate('/patients')} className="btn-primary">
          Volver a la lista
        </button>
      </div>
    );
  }

  const upcomingAppointments = attentions.filter(a => {
    const appointmentDate = new Date(a.appointment_date || a.date);
    const today = new Date();
    return appointmentDate > today;
  });

  const pastAppointments = attentions.filter(a => {
    const appointmentDate = new Date(a.appointment_date || a.date);
    const today = new Date();
    return appointmentDate <= today;
  });

              return (
    <div className="space-y-6">
      {/* Link de regreso */}
      <div>
                <button
          onClick={() => navigate('/patients')}
          className="text-blue-600 hover:text-blue-800 text-sm"
                >
          ← Volver a la lista de Pacientes
                </button>
                          </div>

      {/* Header del Paciente */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
            {`${(patient.first_name || 'P')[0]}${(patient.last_name || 'U')[0]}`}
                                  </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-gray-900 truncate">
              {patient.first_name} {patient.last_name}
                                  </div>
            <div className="text-xs text-gray-500">
              {calculateAge(patient.birth_date)} años • {patient.blood_type || '—'} • Última visita: {patient.last_visit || '—'}
                                </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-gray-600">Alergias:</span>
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white">
                {(patient.allergies && patient.allergies[0]) || 'Ninguna'}
              </span>
              <span className="text-gray-600 ml-2">Condiciones:</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">
                {(patient.conditions && patient.conditions[0]) || 'Ninguna'}
              </span>
                              </div>
                                    </div>
          <div className="flex items-center gap-2">
                <button
              onClick={handleNewConsultation}
              className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
                >
              Nueva consulta
                </button>
            <button className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50">
              Modificar
                          </button>
            <button className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50">
              Imprimir
                                    </button>
                                  </div>
              </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-2">
                <button
            onClick={() => setActiveTab('consultas')}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              activeTab === 'consultas' 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Historial de Consultas
                </button>
                          <button
            onClick={() => setActiveTab('documentos')}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              activeTab === 'documentos' 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Documentos
                          </button>
                    <button
            onClick={() => setActiveTab('grabaciones')}
            className={`px-3 py-1.5 rounded-md text-sm border ${
              activeTab === 'grabaciones' 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Grabaciones
                    </button>
                  </div>
            </div>

      {/* Contenido de las tabs */}
      {activeTab === 'consultas' && (
        <div className="space-y-6">
          {/* Próximas citas */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Próximas citas</h3>
            <div className="space-y-3">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map(appt => (
                  <div key={appt.id} className="flex items-start gap-4 border rounded-lg px-4 py-3">
              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-blue-700 text-sm font-semibold min-w-[110px] text-center">
                      <div>📅 {appt.appointment_date || appt.date}</div>
                      <div className="text-base">🕐 {appt.appointment_time || appt.time || '—'}</div>
              </div>
              <div className="flex-1">
                      <div className="text-sm"><span className="text-gray-500">Especialista:</span> {appt.doctor_name || '—'}</div>
                      <div className="text-sm"><span className="text-gray-500">Especialidad:</span> 
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs ml-1">
                          {appt.specialty || '—'}
                              </span>
                    </div>
                      <div className="text-sm"><span className="text-gray-500">Tipo de cita:</span> {formatTitleCase(appt.type) || 'Control'}</div>
                      <div className="text-sm"><span className="text-gray-500">Estado:</span> 
                        <span className={`px-2 py-0.5 rounded-full text-xs ml-1 ${getStatusColor(appt.status)}`}>
                          {formatStatusDisplay(appt.status)}
                        </span>
                </div>
              </div>
                <div>
                  <button
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                        onClick={() => navigate('/agenda')}
                      >
                        Empezar consulta
                  </button>
                </div>
              </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No hay próximas citas.</div>
              )}
            </div>
          </div>

          {/* Citas pasadas */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Citas pasadas</h3>
                    <div className="space-y-3">
              {pastAppointments.length > 0 ? (
                pastAppointments.map(appt => (
                  <div key={appt.id} className="flex items-start gap-4 border rounded-lg px-4 py-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-gray-700 text-sm font-semibold min-w-[110px] text-center">
                      <div>📅 {appt.appointment_date || appt.date}</div>
                      <div className="text-base">🕐 {appt.appointment_time || appt.time || '—'}</div>
                          </div>
                    <div className="flex-1">
                      <div className="text-sm"><span className="text-gray-500">Especialista:</span> {appt.doctor_name || '—'}</div>
                      <div className="text-sm"><span className="text-gray-500">Especialidad:</span> 
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs ml-1">
                          {appt.specialty || '—'}
                        </span>
                            </div>
                      <div className="text-sm"><span className="text-gray-500">Tipo de cita:</span> {formatTitleCase(appt.type) || 'Control'}</div>
                      <div className="text-sm"><span className="text-gray-500">Estado:</span> 
                        <span className={`px-2 py-0.5 rounded-full text-xs ml-1 ${getStatusColor(appt.status)}`}>
                          {formatStatusDisplay(appt.status)}
                        </span>
                          </div>
                          </div>
                        <div>
                            <button
                        className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
                        onClick={() => openAttentionDetail(appt)}
                            >
                        Ver consulta
                            </button>
                          </div>
                          </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No hay citas pasadas.</div>
              )}
                          </div>
                            </div>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Documentos</h3>
          <div className="text-sm text-gray-500">Sección de documentos en desarrollo.</div>
              </div>
            )}

      {activeTab === 'grabaciones' && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Grabaciones</h3>
          <div className="text-sm text-gray-500">Sección de grabaciones en desarrollo.</div>
                  </div>
      )}
    </div>
  );
};

export default PatientFicha; 