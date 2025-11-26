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
    type: 'CONSULTA',
    modality: 'presencial',
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

  // Función auxiliar para obtener la fecha de hoy en formato YYYY-MM-DD (fecha local)
  const getTodayLocal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Cargar doctores y especialidades al abrir el modal
  useEffect(() => {
    if (isOpen) {
      // Cargar especialidades primero para tener la lista completa
      loadSpecialties().then(() => {
        // Luego cargar doctores que pueden tener o no especialidad
        loadDoctors();
      });
      // Establecer fecha por defecto como hoy (usando fecha local)
      const formattedDate = getTodayLocal();
      setFormData(prev => ({ ...prev, date: formattedDate }));
    }
  }, [isOpen]);

  const loadDoctors = async () => {
    try {
      // Preferir endpoint oficial de usuarios (axios) para doctores
      let doctorsList = [];
      try {
        const doctorsResponse = await usersAPI.getDoctors();
        console.log('Respuesta completa de getDoctors:', doctorsResponse);
        console.log('doctorsResponse.data:', doctorsResponse?.data);
        console.log('doctorsResponse.data?.doctors:', doctorsResponse?.data?.doctors);
        
        // Manejar diferentes formatos de respuesta (igual que UserManagement)
        if (doctorsResponse?.data?.doctors) {
          doctorsList = doctorsResponse.data.doctors;
        } else if (Array.isArray(doctorsResponse?.data)) {
          doctorsList = doctorsResponse.data;
        } else if (doctorsResponse?.data) {
          doctorsList = Array.isArray(doctorsResponse.data) ? doctorsResponse.data : [];
        } else if (Array.isArray(doctorsResponse)) {
          doctorsList = doctorsResponse;
        }
        
        console.log('Doctores extraídos (antes de procesar):', doctorsList);
      } catch (error) {
        console.error('Error en getDoctors:', error);
        // Fallback al servicio legacy si el endpoint anterior falla
        const response = await userService.getDoctors();
        doctorsList = response.users || response.doctors || [];
      }
      
      // Normalizar y enriquecer datos de doctores
      doctorsList = doctorsList.map(d => {
        // Extraer nombre completo
        const firstName = d.first_name || d.firstName || '';
        const lastName = d.last_name || d.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const name = d.name || d.fullName || fullName || 'Sin nombre';
        
        // Extraer specialty_id (puede venir como número, string, o null)
        const specialtyId = d.specialty_id || d.specialtyId || null;
        const specialtyName = d.specialty_name || d.specialty || '';
        
        return {
          ...d,
          id: d.id,
          first_name: firstName,
          last_name: lastName,
          firstName: firstName,
          lastName: lastName,
          name: name,
          fullName: fullName,
          specialty_id: specialtyId ? String(specialtyId) : null,
          specialtyId: specialtyId ? String(specialtyId) : null,
          specialty_name: specialtyName,
          specialty: specialtyName
        };
      });
      
      setDoctors(doctorsList);
      
      // Extraer especialidades únicas (id, name) desde doctores
      const specialtyMap = new Map(); // Map<id, name>
      const specialtyNameMap = new Map(); // Map<name, id> - para especialidades sin ID
      let tempIdCounter = 10000; // Contador para IDs temporales
      
      doctorsList.forEach(d => {
        const id = d.specialty_id || d.specialtyId;
        const name = (d.specialty_name || d.specialty || '').trim();
        
        if (name) {
          // Si tiene ID, usar el ID
          if (id) {
            const idStr = String(id);
            if (!specialtyMap.has(idStr)) {
              specialtyMap.set(idStr, name);
            }
          } else {
            // Si no tiene ID pero tiene nombre, crear un ID temporal basado en el nombre
            // Primero verificar si ya existe una especialidad con ese nombre
            if (!specialtyNameMap.has(name)) {
              // Buscar si ya existe en las especialidades cargadas de la API
              const existingSpec = specialties.find(s => s.name === name);
              if (existingSpec) {
                // Usar el ID existente
                specialtyMap.set(String(existingSpec.id), name);
                specialtyNameMap.set(name, String(existingSpec.id));
              } else {
                // Crear ID temporal único basado en el nombre
                const tempId = `temp_${tempIdCounter++}`;
                specialtyMap.set(tempId, name);
                specialtyNameMap.set(name, tempId);
              }
            }
          }
        }
      });
      
      console.log('Especialidades extraídas de doctores:', Array.from(specialtyMap.entries()));
      
      // Agregar especialidades de doctores a las existentes (si no están ya)
      setSpecialties(prev => {
        const combined = new Map();
        
        // Primero agregar las existentes (de la API)
        prev.forEach(spec => {
          combined.set(String(spec.id), spec.name);
        });
        
        // Luego agregar las de los doctores (pueden tener nombres más actualizados o nuevas)
        specialtyMap.forEach((name, id) => {
          // Verificar si ya existe una especialidad con el mismo nombre pero diferente ID
          const existingByName = Array.from(combined.entries()).find(([_, n]) => n === name);
          if (existingByName) {
            // Ya existe, no agregar duplicado
            return;
          }
          // Verificar si ya existe con el mismo ID
          if (!combined.has(String(id))) {
            combined.set(String(id), name);
          }
        });
        
        const result = Array.from(combined.entries()).map(([id, name]) => ({ id, name }));
        console.log('Especialidades combinadas (API + doctores):', result);
        return result;
      });
      
      // Debug: Log para verificar datos
      console.log('Doctores cargados (raw):', doctorsList);
      console.log('Doctores procesados:', doctorsList.map(d => ({
        id: d.id,
        name: d.name,
        first_name: d.first_name,
        last_name: d.last_name,
        specialty_id: d.specialty_id,
        specialtyId: d.specialtyId,
        specialty_name: d.specialty_name,
        specialty: d.specialty,
        // Mostrar todos los campos disponibles para debug
        allFields: Object.keys(d)
      })));
      console.log('Especialidades disponibles desde doctores:', Array.from(specialtyMap.entries()));
    } catch (error) {
      console.error('Error cargando doctores:', error);
      // Usar datos mock como fallback
      setDoctors([
        { id: 1, name: 'Dr. Ana María López', specialty: 'Medicina General', specialty_id: '1', specialtyId: '1' },
        { id: 2, name: 'Dr. Carlos Rodríguez', specialty: 'Cardiología', specialty_id: '2', specialtyId: '2' },
        { id: 3, name: 'Dr. Laura Martínez', specialty: 'Dermatología', specialty_id: '3', specialtyId: '3' },
        { id: 4, name: 'Dr. Pedro Silva', specialty: 'Pediatría', specialty_id: '4', specialtyId: '4' }
      ]);
      if (specialties.length === 0) {
        setSpecialties([
          { id: '1', name: 'Medicina General' },
          { id: '2', name: 'Cardiología' },
          { id: '3', name: 'Dermatología' },
          { id: '4', name: 'Pediatría' }
        ]);
      }
    }
  }

  const loadSpecialties = async () => {
    try {
      const resp = await specialtiesAPI.getAll();
      const apiSpecialties = (resp.data?.specialties || resp.data || resp.specialties || [])
        .map(s => ({ id: String(s.id), name: s.name }));
      
      if (apiSpecialties.length > 0) {
        // Establecer especialidades desde la API (fuente principal)
        setSpecialties(apiSpecialties);
        console.log('Especialidades cargadas desde API:', apiSpecialties);
      } else {
        console.warn('No se encontraron especialidades en la API');
      }
    } catch (error) {
      console.error('Error cargando especialidades desde API:', error);
      // Silencioso: se usará fallback desde doctores
      console.warn('No se pudieron cargar especialidades desde API, usando fallback');
    }
  };

  const modalityOptions = [
    { value: 'telemedicina', label: 'Telemedicina' },
    { value: 'presencial', label: 'Presencial' }
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
      // Establecer fecha por defecto como hoy (usando fecha local)
      const formattedDate = getTodayLocal();
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
          firstName,
          lastName,
          document: `${idType} ${idNumber}`.trim(),
          idNumber,
          phone
        };
      });
      
      // Filtrar resultados para mostrar solo los que realmente coinciden con el término de búsqueda
      const searchTermLower = searchTerm.toLowerCase().trim();
      const filteredPatients = formattedPatients.filter(patient => {
        // Verificar si el término está al inicio del nombre o apellido
        const firstNameMatch = patient.firstName?.toLowerCase().startsWith(searchTermLower) || false;
        const lastNameMatch = patient.lastName?.toLowerCase().startsWith(searchTermLower) || false;
        const fullNameMatch = patient.name?.toLowerCase().startsWith(searchTermLower) || false;
        
        // Verificar si el término está en el número de documento
        const documentMatch = patient.idNumber?.toLowerCase().includes(searchTermLower) || false;
        
        // Verificar si alguna palabra del nombre completo comienza con el término (para casos como "María José" cuando se busca "ma")
        const nameWords = patient.name?.toLowerCase().split(/\s+/) || [];
        const wordMatch = nameWords.some(word => word.startsWith(searchTermLower));
        
        // Solo incluir si coincide al inicio del nombre/apellido, en el documento, o si alguna palabra del nombre comienza con el término
        return firstNameMatch || lastNameMatch || fullNameMatch || documentMatch || wordMatch;
      });
      
      setPatientSearchResults(filteredPatients);
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
    
    if (!selectedDoctor) {
      // Si no hay doctor seleccionado, limpiar solo el doctor
      setFormData(prev => ({
        ...prev,
        doctorId: '',
        doctorName: ''
      }));
      return;
    }
    
    const selSpecId = selectedDoctor.specialty_id || selectedDoctor.specialtyId || '';
    const selSpecName = (selectedDoctor.specialty || selectedDoctor.specialty_name || '').trim();
    
    // Buscar la especialidad en la lista (por ID o por nombre)
    let foundSpecialty = null;
    if (selSpecId) {
      foundSpecialty = specialties.find(s => String(s.id) === String(selSpecId));
    }
    
    // Si no se encontró por ID, buscar por nombre
    if (!foundSpecialty && selSpecName) {
      foundSpecialty = specialties.find(s => 
        s.name.toLowerCase() === selSpecName.toLowerCase()
      );
    }
    
    // Si no existe la especialidad en la lista, agregarla
    if (!foundSpecialty && selSpecName) {
      // Crear un ID temporal si no hay ID
      const newSpecId = selSpecId || `temp_${Date.now()}`;
      const newSpecialty = { id: newSpecId, name: selSpecName };
      setSpecialties(prev => {
        // Verificar que no exista ya por nombre
        const existsByName = prev.find(s => 
          s.name.toLowerCase() === selSpecName.toLowerCase()
        );
        if (existsByName) {
          foundSpecialty = existsByName;
          return prev;
        }
        return [...prev, newSpecialty];
      });
      foundSpecialty = { id: newSpecId, name: selSpecName };
    }
    
    // Función helper para obtener el nombre del doctor
    const getDoctorName = (doc) => {
      if (!doc) return '';
      if (doc.name) return doc.name;
      if (doc.fullName) return doc.fullName;
      const firstName = doc.first_name || doc.firstName || '';
      const lastName = doc.last_name || doc.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || 'Sin nombre';
    };

    // Actualizar el formulario
    // IMPORTANTE: Solo actualizar la especialidad si el doctor tiene una
    // Si el doctor no tiene especialidad, mantener la especialidad ya seleccionada
    setFormData(prev => {
      const updates = {
        doctorId: doctorId,
        doctorName: getDoctorName(selectedDoctor)
      };
      
      // Solo actualizar especialidad si el doctor tiene una
      if (foundSpecialty) {
        updates.specialty = foundSpecialty.name;
        updates.specialtyId = foundSpecialty.id;
      } else if (selSpecName) {
        // Si tiene nombre pero no se encontró, usar el nombre directamente
        updates.specialty = selSpecName;
        updates.specialtyId = selSpecId || `temp_${Date.now()}`;
      }
      // Si no tiene especialidad, NO actualizar specialty ni specialtyId (mantener los valores actuales)
      
      return { ...prev, ...updates };
    });

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
    const selectedId = String(e.target.value || '');
    const selectedSpec = specialties.find(s => String(s.id) === selectedId);
    
    // Verificar si el doctor actual pertenece a la especialidad seleccionada
    const currentDoctor = doctors.find(d => String(d.id) === String(formData.doctorId));
    const doctorSpecialtyId = currentDoctor ? String(currentDoctor.specialty_id || currentDoctor.specialtyId || '') : '';
    const shouldClearDoctor = selectedId && doctorSpecialtyId && doctorSpecialtyId !== selectedId;
    
    setFormData(prev => ({
      ...prev,
      specialtyId: selectedId,
      specialty: selectedSpec ? selectedSpec.name : '',
      // Limpiar doctor si no pertenece a la especialidad seleccionada
      ...(shouldClearDoctor ? {
        doctorId: '',
        doctorName: ''
      } : {})
    }));
    
    // Si se limpió el doctor, también limpiar horario y horas disponibles
    if (shouldClearDoctor) {
      setDoctorSchedule(null);
      setAvailableTimes([]);
    }
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
      // Asegurar que modality esté en mayúsculas y sea válido
      const modalityValue = (formData.modality || 'presencial').toLowerCase();
      const normalizedModality = modalityValue === 'telemedicina' ? 'TELEMEDICINA' : 'PRESENCIAL';
      
      console.log('📋 Datos de la cita antes de enviar:', {
        modality: formData.modality,
        normalizedModality,
        type: formData.type,
        allFormData: formData
      });
      
      const appointmentData = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        appointmentDate: formData.date,
        appointmentTime: formData.time,
        duration: 30, // Duración por defecto en minutos
        type: (formData.type || 'CONSULTA').toUpperCase(),
        modality: normalizedModality,
        status: formData.status.toUpperCase(),
        specialtyId: formData.specialtyId || null,
        reason: formData.notes || '',
        notes: formData.notes || ''
      };
      
      console.log('📤 Enviando datos de la cita:', appointmentData);
      
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
      type: 'CONSULTA',
      modality: 'presencial',
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
                    
                    {/* Resultados de búsqueda - Dropdown superpuesto */}
                    {patientSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Puedes buscar un paciente existente o crear uno nuevo completando los campos manualmente
                  </p>
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
                    disabled={formData.specialtyId && (() => {
                      const selectedSpecialtyId = String(formData.specialtyId || '');
                      const selectedSpecialty = specialties.find(s => String(s.id) === selectedSpecialtyId);
                      const selectedSpecialtyName = selectedSpecialty ? selectedSpecialty.name : '';
                      
                      const matchingDoctors = doctors.filter(d => {
                        const docSpecialtyId = String(d.specialty_id || d.specialtyId || '');
                        const docSpecialtyName = String(d.specialty_name || d.specialty || '').trim();
                        
                        // Comparar por ID si ambos tienen ID
                        if (docSpecialtyId && selectedSpecialtyId && docSpecialtyId !== '') {
                          return docSpecialtyId === selectedSpecialtyId;
                        }
                        
                        // Si no hay ID, comparar por nombre
                        if (docSpecialtyName && selectedSpecialtyName) {
                          return docSpecialtyName.toLowerCase() === selectedSpecialtyName.toLowerCase();
                        }
                        
                        return false;
                      });
                      
                      return matchingDoctors.length === 0;
                    })()}
                  >
                    <option value="">
                      {formData.specialtyId 
                        ? (() => {
                            const selectedSpecialtyId = String(formData.specialtyId || '');
                            const selectedSpecialty = specialties.find(s => String(s.id) === selectedSpecialtyId);
                            const selectedSpecialtyName = selectedSpecialty ? selectedSpecialty.name : '';
                            
                            const matchingDoctors = doctors.filter(d => {
                              const docSpecialtyId = String(d.specialty_id || d.specialtyId || '');
                              const docSpecialtyName = String(d.specialty_name || d.specialty || '').trim();
                              
                              // Comparar por ID si ambos tienen ID
                              if (docSpecialtyId && selectedSpecialtyId && docSpecialtyId !== '') {
                                return docSpecialtyId === selectedSpecialtyId;
                              }
                              
                              // Si no hay ID, comparar por nombre
                              if (docSpecialtyName && selectedSpecialtyName) {
                                return docSpecialtyName.toLowerCase() === selectedSpecialtyName.toLowerCase();
                              }
                              
                              return false;
                            });
                            
                            return matchingDoctors.length === 0
                              ? 'No hay doctores disponibles para esta especialidad'
                              : 'Seleccionar doctor';
                          })()
                        : 'Seleccionar doctor'}
                    </option>
                    {(
                      formData.specialtyId
                        ? doctors.filter(d => {
                            const docSpecialtyId = String(d.specialty_id || d.specialtyId || '');
                            const docSpecialtyName = String(d.specialty_name || d.specialty || '').trim();
                            const selectedSpecialtyId = String(formData.specialtyId || '');
                            const selectedSpecialty = specialties.find(s => String(s.id) === selectedSpecialtyId);
                            const selectedSpecialtyName = selectedSpecialty ? selectedSpecialty.name : '';
                            
                            // Comparar por ID si ambos tienen ID
                            if (docSpecialtyId && selectedSpecialtyId && docSpecialtyId !== '') {
                              return docSpecialtyId === selectedSpecialtyId;
                            }
                            
                            // Si no hay ID, comparar por nombre
                            if (docSpecialtyName && selectedSpecialtyName) {
                              return docSpecialtyName.toLowerCase() === selectedSpecialtyName.toLowerCase();
                            }
                            
                            return false;
                          })
                        : doctors
                    ).map(doctor => {
                      // Función helper para obtener el nombre del doctor
                      const getDoctorName = (doc) => {
                        if (doc.name) return doc.name;
                        if (doc.fullName) return doc.fullName;
                        const firstName = doc.first_name || doc.firstName || '';
                        const lastName = doc.last_name || doc.lastName || '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        return fullName || 'Sin nombre';
                      };
                      
                      // Función helper para obtener la especialidad
                      const getSpecialty = (doc) => {
                        return doc.specialty_name || doc.specialty || '';
                      };
                      
                      const doctorName = getDoctorName(doctor);
                      const specialty = getSpecialty(doctor);
                      
                      return (
                        <option key={doctor.id} value={doctor.id}>
                          {doctorName} {specialty ? `- ${specialty}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {formData.specialtyId && (() => {
                    const selectedSpecialtyId = String(formData.specialtyId || '');
                    const selectedSpecialty = specialties.find(s => String(s.id) === selectedSpecialtyId);
                    const selectedSpecialtyName = selectedSpecialty ? selectedSpecialty.name : '';
                    
                    const matchingDoctors = doctors.filter(d => {
                      const docSpecialtyId = String(d.specialty_id || d.specialtyId || '');
                      const docSpecialtyName = String(d.specialty_name || d.specialty || '').trim();
                      
                      // Comparar por ID si ambos tienen ID
                      if (docSpecialtyId && selectedSpecialtyId && docSpecialtyId !== '') {
                        return docSpecialtyId === selectedSpecialtyId;
                      }
                      
                      // Si no hay ID, comparar por nombre
                      if (docSpecialtyName && selectedSpecialtyName) {
                        return docSpecialtyName.toLowerCase() === selectedSpecialtyName.toLowerCase();
                      }
                      
                      return false;
                    });
                    
                    return matchingDoctors.length === 0 ? (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ No hay doctores disponibles para la especialidad seleccionada. Por favor, selecciona otra especialidad.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Se muestran solo los doctores de la especialidad seleccionada
                      </p>
                    );
                  })()}
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
                      min={getTodayLocal()}
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
                    <label className="form-label">Modalidad *</label>
                    <select
                      name="modality"
                      className="input-field"
                      value={formData.modality || ''}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar modalidad</option>
                      {modalityOptions.map(modality => (
                        <option key={modality.value} value={modality.value}>
                          {modality.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tipo de consulta *</label>
                    <select
                      name="type"
                      className="input-field"
                      value={formData.type || 'CONSULTA'}
                      onChange={handleInputChange}
                    >
                      <option value="CONSULTA">Consulta</option>
                      <option value="CONTROL">Control</option>
                      <option value="URGENCIA">Urgencia</option>
                      <option value="PROCEDIMIENTO">Procedimiento</option>
                      <option value="OTRO">Otro</option>
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