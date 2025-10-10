import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import patientService from '../services/patientService';
import userService from '../services/userService';
import { specialtiesAPI, usersAPI, specialistsAPI, appointmentsAPI } from '../config/api';

const NewAppointmentModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    patientDocument: '',
    patientPhone: '',
    doctorId: '',
    doctorName: '',
    specialty: '',
    specialtyId: '',
    date: '',
    time: '',
    type: '',
    notes: '',
    status: ''
  });

  const [loading, setLoading] = useState(false);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [doctorSchedule, setDoctorSchedule] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  // Cargar doctores y especialidades al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadDoctors();
      loadSpecialties();
      // Establecer fecha por defecto como hoy
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: formattedDate }));
    }
  }, [isOpen]);

  const loadDoctors = async () => {
    try {
      // Preferir endpoint oficial de usuarios (axios) para doctores
      let doctorsList = [];
      try {
        const { data } = await usersAPI.getDoctors();
        doctorsList = Array.isArray(data?.doctors) ? data.doctors : (Array.isArray(data) ? data : []);
      } catch (_) {
        // Fallback al servicio legacy si el endpoint anterior falla
        const response = await userService.getDoctors();
        doctorsList = response.users || response.doctors || [];
      }
      setDoctors(doctorsList);
      
      // Extraer especialidades únicas (id, name)
      const specialtyMap = new Map();
      doctorsList.forEach(d => {
        const id = d.specialty_id || d.specialtyId;
        const name = d.specialty_name || d.specialty || '';
        if (id && name && !specialtyMap.has(id)) specialtyMap.set(id, name);
      });
      if (specialties.length === 0) {
        setSpecialties(Array.from(specialtyMap.entries()).map(([id, name]) => ({ id, name })));
      }
    } catch (error) {
      console.error('Error cargando doctores:', error);
      // Usar datos mock como fallback
      setDoctors([
        { id: 1, name: 'Dr. Ana María López', specialty: 'Medicina General' },
        { id: 2, name: 'Dr. Carlos Rodríguez', specialty: 'Cardiología' },
        { id: 3, name: 'Dr. Laura Martínez', specialty: 'Dermatología' },
        { id: 4, name: 'Dr. Pedro Silva', specialty: 'Pediatría' }
      ]);
      if (specialties.length === 0) {
        setSpecialties([
          { id: 1, name: 'Medicina General' },
          { id: 2, name: 'Cardiología' },
          { id: 3, name: 'Dermatología' },
          { id: 4, name: 'Pediatría' }
        ]);
      }
    }
  }

  const loadSpecialties = async () => {
    try {
      const resp = await specialtiesAPI.getAll();
      const list = (resp.data?.specialties || resp.data || resp.specialties || [])
        .map(s => ({ id: s.id, name: s.name }));
      if (list.length) setSpecialties(list);
    } catch (error) {
      // Silencioso: se usará fallback desde doctores
      console.warn('No se pudieron cargar especialidades desde API, usando fallback');
    }
  };

  const appointmentTypes = [
    { value: 'primera vez', label: 'Primera vez' },
    { value: 'control', label: 'Control' },
    { value: 'consulta', label: 'Consulta' },
    { value: 'emergencia', label: 'Emergencia' }
  ];

  const statusOptions = [
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'en espera', label: 'En espera' },
    { value: 'pendiente', label: 'Pendiente' }
  ];

  const getDayKeyFromDate = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const idx = d.getDay(); // 0 domingo ... 6 sábado
      return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][idx];
    } catch (_) { return null; }
  };

  const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(n => parseInt(n, 10));
    return (h * 60) + (m || 0);
  };
  const toHHMM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };

  const isToday = (dateStr) => {
    const today = new Date();
    const d = new Date(dateStr + 'T00:00:00');
    return today.toISOString().slice(0,10) === d.toISOString().slice(0,10);
  };

  const findNextWorkingDate = (schedule, fromDateStr) => {
    try {
      let d = new Date(fromDateStr + 'T00:00:00');
      for (let i = 0; i < 14; i++) {
        const key = getDayKeyFromDate(d.toISOString().slice(0,10));
        const day = schedule?.[key];
        if (day && day.isWorking) return d.toISOString().slice(0,10);
        d.setDate(d.getDate() + 1);
      }
    } catch (_) {}
    return fromDateStr;
  };

  const loadAvailableTimes = async (doctorId, dateStr, schedule) => {
    try {
      setLoadingTimes(true);
      setAvailableTimes([]);
      if (!doctorId || !dateStr || !schedule) return;
      const key = getDayKeyFromDate(dateStr);
      const day = schedule[key];
      if (!day || !day.isWorking) { setAvailableTimes([]); return; }

      const interval = Math.max(5, Math.min(120, parseInt(day.interval || 15, 10)));
      const simCap = Math.max(1, Math.min(10, parseInt(day.simultaneousPatients || 1, 10)));
      const startMin = toMinutes(day.startTime || '08:00');
      const endMin = toMinutes(day.endTime || '18:00');
      const breakStartMin = day.hasBreak ? toMinutes(day.breakStart || '12:00') : null;
      const breakEndMin = day.hasBreak ? toMinutes(day.breakEnd || '13:00') : null;

      const now = new Date();
      const nowMins = (now.getHours() * 60) + now.getMinutes();

      // Construir slots
      let slots = [];
      for (let t = startMin; t + 1 <= endMin; t += interval) {
        // Excluir descanso
        if (day.hasBreak && breakStartMin != null && breakEndMin != null) {
          if (!(t >= breakEndMin || (t + interval) <= breakStartMin)) {
            continue;
          }
        }
        // Excluir pasado si es hoy
        if (isToday(dateStr) && t <= nowMins) continue;
        slots.push(toHHMM(t));
      }

      // Traer citas existentes del día para el doctor
      const apptsResp = await appointmentsAPI.getAll({ doctorId, dateFrom: dateStr, dateTo: dateStr, limit: 1000 });
      const appts = Array.isArray(apptsResp?.data?.appointments) ? apptsResp.data.appointments : [];

      const slotIsFree = (slotHHMM) => {
        const slotStart = toMinutes(slotHHMM);
        const newDuration = 30; // duración por defecto del formulario
        const slotEnd = slotStart + newDuration;
        let overlapping = 0;
        for (const a of appts) {
          const aStart = toMinutes(a.appointment_time);
          const aDur = parseInt(a.duration || 30, 10);
          const aEnd = aStart + aDur;
          const canceled = (a.status === 'CANCELADA' || a.status === 'NO_ASISTIO');
          if (canceled) continue;
          const overlap = (aStart < slotEnd) && (slotStart < aEnd);
          if (overlap) overlapping += 1;
          if (overlapping >= simCap) return false;
        }
        return true;
      };

      const filtered = slots.filter(slotIsFree);
      setAvailableTimes(filtered);
    } catch (e) {
      console.error('Error calculando horas disponibles:', e);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Establecer fecha por defecto como hoy
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: formattedDate }));
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePatientSearch = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setPatientSearchResults([]);
      return;
    }

    setSearchingPatient(true);
    
    try {
      // Buscar pacientes reales en el backend
      const response = await patientService.getPatients({ search: searchTerm });
      const patients = response.patients || [];
      
      // Convertir al formato esperado por el modal (robusto ante variantes de backend)
      const formattedPatients = patients.map(patient => {
        const id = patient.id ?? patient.patient_id ?? patient.patientId ?? patient.uid ?? patient.uuid ?? '';
        const firstName = patient.first_name ?? patient.firstName ?? '';
        const lastName = patient.last_name ?? patient.lastName ?? '';
        const name = (patient.name ?? patient.full_name ?? `${firstName} ${lastName}`.trim()) || 'Sin nombre';
        const idType = patient.identification_type ?? patient.document_type ?? patient.documentType ?? 'CC';
        const idNumber = patient.identification_number ?? patient.document_number ?? patient.documentNumber ?? '';
        const phone = patient.mobile_phone ?? patient.cellphone ?? patient.phone ?? patient.landline_phone ?? 'Sin teléfono';
        return {
          id,
          name,
          document: `${idType} ${idNumber}`.trim(),
          phone
        };
      });
      
      setPatientSearchResults(formattedPatients);
    } catch (error) {
      console.error('Error buscando pacientes:', error);
      toast.error('No se pudo buscar pacientes. Intenta de nuevo o crea el paciente primero.');
      setPatientSearchResults([]);
    } finally {
      setSearchingPatient(false);
    }
  };

  const selectPatient = (patient) => {
    setFormData(prev => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
      patientDocument: patient.document,
      patientPhone: patient.phone
    }));
    setPatientSearchResults([]);
  };

  const handleDoctorChange = (e) => {
    const doctorId = e.target.value;
    const selectedDoctor = doctors.find(d => String(d.id) === String(doctorId));
    const selSpecId = selectedDoctor ? (selectedDoctor.specialty_id || selectedDoctor.specialtyId || '') : '';
    const selSpecName = selectedDoctor ? (selectedDoctor.specialty || selectedDoctor.specialty_name || '') : '';

    // Asegurar que la especialidad del médico esté presente en el selector
    if (selSpecId && selSpecName && !specialties.find(s => String(s.id) === String(selSpecId))) {
      setSpecialties(prev => ([...prev, { id: selSpecId, name: selSpecName }]));
    }

    setFormData(prev => ({
      ...prev,
      doctorId: doctorId,
      doctorName: selectedDoctor ? (selectedDoctor.name || `${selectedDoctor.first_name || ''} ${selectedDoctor.last_name || ''}`.trim()) : '',
      specialty: selSpecName || '',
      specialtyId: selSpecId || ''
    }));

    // Cargar horario del médico y recomputar horas disponibles
    (async () => {
      try {
        if (!doctorId) { setDoctorSchedule(null); setAvailableTimes([]); return; }
        const { data } = await specialistsAPI.getSchedule(doctorId);
        const schedule = data?.schedule || null;
        setDoctorSchedule(schedule);
        // Ajustar fecha si el día actual no es laborable
        const currentDate = (formData.date && formData.date !== '') ? formData.date : new Date().toISOString().slice(0,10);
        const key = getDayKeyFromDate(currentDate);
        if (!schedule?.[key]?.isWorking) {
          const nextDate = findNextWorkingDate(schedule, currentDate);
          setFormData(prev => ({ ...prev, date: nextDate }));
          await loadAvailableTimes(doctorId, nextDate, schedule);
        } else {
          await loadAvailableTimes(doctorId, currentDate, schedule);
        }
      } catch (err) {
        console.error('Error cargando horario del médico:', err);
        setDoctorSchedule(null);
        setAvailableTimes([]);
      }
    })();
  };

  const handleSpecialtyChange = (e) => {
    const selectedId = e.target.value || '';
    const selectedSpec = specialties.find(s => String(s.id) === String(selectedId));
    // Si el médico seleccionado no pertenece a la especialidad escogida, NO limpiar de inmediato; permitir que el usuario cambie luego
    setFormData(prev => ({
      ...prev,
      specialtyId: selectedId,
      specialty: selectedSpec ? selectedSpec.name : '',
    }));
  };

  // Recalcular horas cuando cambie fecha si ya hay médico y horario
  useEffect(() => {
    if (!isOpen) return;
    if (!formData.doctorId || !formData.date || !doctorSchedule) {
      setAvailableTimes([]);
      return;
    }
    loadAvailableTimes(formData.doctorId, formData.date, doctorSchedule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, formData.doctorId, doctorSchedule, isOpen]);

  const validateForm = () => {
    // Normalizar valores en memoria antes de validar
    const patientIdOk = formData.patientId !== undefined && formData.patientId !== null && String(formData.patientId).trim() !== '';
    const doctorIdOk = formData.doctorId !== undefined && formData.doctorId !== null && String(formData.doctorId).trim() !== '';
    const specialtyIdOk = formData.specialtyId !== undefined && formData.specialtyId !== null && String(formData.specialtyId).trim() !== '';

    if (!patientIdOk) { toast.error('Selecciona un paciente de la lista'); return false; }
    if (!doctorIdOk) { toast.error('Selecciona un doctor'); return false; }
    if (!specialtyIdOk) { toast.error('Selecciona una especialidad'); return false; }

    const required = ['patientName', 'doctorName', 'date', 'time', 'patientPhone', 'type', 'status'];
    const missing = required.filter(field => !formData[field] || String(formData[field]).trim() === '');
    if (missing.length > 0) { toast.error('Por favor completa todos los campos obligatorios'); return false; }

    if (!formData.patientDocument || String(formData.patientDocument).trim() === '') {
      toast.error('Por favor completa el documento del paciente');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Preparar datos para el backend
      const appointmentData = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        appointmentDate: formData.date,
        appointmentTime: formData.time,
        duration: 30, // Duración por defecto en minutos
        type: formData.type.toUpperCase(),
        status: formData.status.toUpperCase(),
        specialtyId: formData.specialtyId || null,
        reason: formData.notes || '',
        notes: formData.notes || ''
      };
      
      // Llamar a la función onSave del componente padre y esperar resultado
      await onSave(appointmentData);

      // Cierre del modal si todo salió bien (el toast de éxito lo maneja el padre)
      handleClose();
    } catch (error) {
      console.error('Error al crear la cita:', error);
      toast.error('Error al crear la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      patientId: '',
      patientName: '',
      patientDocument: '',
      patientPhone: '',
      doctorId: '',
      doctorName: '',
      specialty: '',
      specialtyId: '',
      date: '',
      time: '',
      type: '',
      notes: '',
      status: ''
    });
    setPatientSearchResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed !m-0 inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            <span style={{ fontSize: '18px', marginRight: '8px' }}>📅</span>
            Nueva Cita
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span style={{ fontSize: '20px' }}>✕</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información del Paciente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <span style={{ fontSize: '16px', marginRight: '6px' }}>👤</span>
                Información del Paciente
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Buscar Paciente *</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Nombre o documento del paciente"
                      value={formData.patientName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, patientName: e.target.value }));
                        handlePatientSearch(e.target.value);
                      }}
                    />
                    {searchingPatient && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Puedes buscar un paciente existente o crear uno nuevo completando los campos manualmente
                  </p>
                  
                  {/* Resultados de búsqueda */}
                  {patientSearchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                      {patientSearchResults.map(patient => (
                        <div
                          key={patient.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => selectPatient(patient)}
                        >
                          <div className="font-medium text-gray-900">{patient.name}</div>
                          <div className="text-sm text-gray-600">
                            {patient.document} • {patient.phone}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Documento *</label>
                    <input
                      type="text"
                      name="patientDocument"
                      className="input-field"
                      value={formData.patientDocument}
                      onChange={handleInputChange}
                      placeholder="CC 12345678"
                    />
                  </div>
                  <div>
                    <label className="form-label">Teléfono *</label>
                    <input
                      type="text"
                      name="patientPhone"
                      className="input-field"
                      value={formData.patientPhone}
                      onChange={handleInputChange}
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Información de la Cita */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <span style={{ fontSize: '16px', marginRight: '6px' }}>🏥</span>
                Información de la Cita
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Especialidad *</label>
                  <select
                    name="specialtyId"
                    className="input-field"
                    value={formData.specialtyId}
                    onChange={handleSpecialtyChange}
                  >
                    <option value="">Seleccionar especialidad</option>
                    {specialties.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Doctor *</label>
                  <select
                    name="doctorId"
                    className="input-field"
                    value={formData.doctorId}
                    onChange={handleDoctorChange}
                  >
                    <option value="">Seleccionar doctor</option>
                    {(
                      formData.specialtyId
                        ? doctors.filter(d => String(d.specialty_id || d.specialtyId) === String(formData.specialtyId))
                        : doctors
                    ).map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {(doctor.name || `${doctor.first_name} ${doctor.last_name}`)} - {(doctor.specialty || doctor.specialty_name || '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Fecha *</label>
                    <input
                      type="date"
                      name="date"
                      className="input-field"
                      value={formData.date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {formData.doctorId && doctorSchedule && formData.date && !doctorSchedule?.[getDayKeyFromDate(formData.date)]?.isWorking && (
                      <p className="text-xs text-red-600 mt-1">El médico no atiende este día. Seleccione otra fecha.</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Hora *</label>
                    <select
                      name="time"
                      className="input-field"
                      value={formData.time}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar hora</option>
                      {loadingTimes && (
                        <option value="" disabled>Calculando horarios...</option>
                      )}
                      {!loadingTimes && availableTimes.length === 0 && (
                        <option value="" disabled>No hay horas disponibles</option>
                      )}
                      {!loadingTimes && availableTimes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    {formData.doctorId && formData.date && !loadingTimes && availableTimes.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No hay horas disponibles para la fecha seleccionada.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Tipo de Atención *</label>
                    <select
                      name="type"
                      className="input-field"
                      value={formData.type}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar tipo</option>
                      {appointmentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Estado *</label>
                    <select
                      name="status"
                      className="input-field"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar estado</option>
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="form-label">Notas Adicionales</label>
            <textarea
              name="notes"
              className="input-field"
              rows="3"
              placeholder="Observaciones o notas especiales..."
              value={formData.notes}
              onChange={handleInputChange}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <span style={{ fontSize: '14px', marginRight: '8px' }}>💾</span>
                  Crear Cita
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAppointmentModal; 