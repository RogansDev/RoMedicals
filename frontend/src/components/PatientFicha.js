import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import patientService from '../services/patientService';
import appointmentService from '../services/appointmentService';
import userService from '../services/userService';
import { specialtiesAPI, consentsAPI } from '../config/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const PatientFicha = () => {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('clinical');
  const [attentions, setAttentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPastAppointments, setShowPastAppointments] = useState(true);
  const [showTodayAppointments, setShowTodayAppointments] = useState(true);
  const [showFutureAppointments, setShowFutureAppointments] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [doctorPickerFor, setDoctorPickerFor] = useState(null); // appointment id
  const [savingDoctorFor, setSavingDoctorFor] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [expandedAttentionId, setExpandedAttentionId] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState({}); // id -> details
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);
  const [viewingAttentionId, setViewingAttentionId] = useState(null); // modo detalle
  const [openDetailSections, setOpenDetailSections] = useState({}); // acordeones
  const [specialties, setSpecialties] = useState([]);
  const [evolutionTemplates, setEvolutionTemplates] = useState([]);
  const [loadingEvolutionTemplates, setLoadingEvolutionTemplates] = useState(false);
  const [evolutionContentByAppt, setEvolutionContentByAppt] = useState({}); // appointmentId -> html
  const [selectedEvolutionTemplateId, setSelectedEvolutionTemplateId] = useState(null);
  const [evolutionSpecIdByAppt, setEvolutionSpecIdByAppt] = useState({}); // appointmentId -> specialtyId
  const [showEvolEditor, setShowEvolEditor] = useState(false);
  // Prescripciones: estados equivalentes
  const [prescriptionsTemplates, setPrescriptionsTemplates] = useState([]);
  const [loadingPrescriptionsTemplates, setLoadingPrescriptionsTemplates] = useState(false);
  const [prescriptionsContentByAppt, setPrescriptionsContentByAppt] = useState({});
  const [selectedPrescriptionsTemplateId, setSelectedPrescriptionsTemplateId] = useState(null);
  const [prescriptionsSpecIdByAppt, setPrescriptionsSpecIdByAppt] = useState({});
  const [showPrescEditor, setShowPrescEditor] = useState(false);
  // Consentimientos (global, no por especialidad)
  const [consentsTemplates, setConsentsTemplates] = useState([]);
  const [loadingConsentsTemplates, setLoadingConsentsTemplates] = useState(false);
  const [consentsContentByAppt, setConsentsContentByAppt] = useState({});
  const [selectedConsentTemplateId, setSelectedConsentTemplateId] = useState(null);
  const [showConsentEditor, setShowConsentEditor] = useState(false);
  // Eventos adversos por atención
  const [adverseContentByAppt, setAdverseContentByAppt] = useState({});
  const [showAdverseEditor, setShowAdverseEditor] = useState(false);
  // Órdenes médicas por atención
  const [medicalOrdersByAppt, setMedicalOrdersByAppt] = useState({}); // appointmentId -> [{id,name,quantity,concentration}]
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productQty, setProductQty] = useState(1);
  const [productConc, setProductConc] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');

  // Catálogos locales (ejemplo). Puedes reemplazarlos por tu fuente real.
  const availableProducts = [
    { id: 'prod-hemograma', name: 'Hemograma completo' },
    { id: 'prod-glucosa', name: 'Glucosa en sangre' },
    { id: 'prod-colesterol', name: 'Colesterol total' },
    { id: 'prod-trigliceridos', name: 'Triglicéridos' },
    { id: 'prod-ecografia', name: 'Ecografía general' },
  ];
  const availablePackages = [
    {
      id: 'pack-perfil-lipidico',
      name: 'Perfil Lipídico',
      items: [
        { id: 'prod-colesterol', name: 'Colesterol total' },
        { id: 'prod-trigliceridos', name: 'Triglicéridos' },
      ],
    },
    {
      id: 'pack-chequeo-basico',
      name: 'Chequeo básico',
      items: [
        { id: 'prod-hemograma', name: 'Hemograma completo' },
        { id: 'prod-glucosa', name: 'Glucosa en sangre' },
      ],
    },
  ];

  const addOrderProduct = (appointmentId) => {
    if (!selectedProductId) return;
    const prod = availableProducts.find(p => p.id === selectedProductId);
    if (!prod) return;
    setMedicalOrdersByAppt(prev => {
      const list = prev[appointmentId] || [];
      const newItem = {
        id: `${selectedProductId}-${Date.now()}`,
        name: prod.name,
        quantity: Math.max(1, parseInt(productQty) || 1),
        concentration: productConc || '',
      };
      return { ...prev, [appointmentId]: [...list, newItem] };
    });
    setSelectedProductId('');
    setProductQty(1);
    setProductConc('');
  };

  const addOrderPackage = (appointmentId) => {
    if (!selectedPackageId) return;
    const pack = availablePackages.find(p => p.id === selectedPackageId);
    if (!pack) return;
    setMedicalOrdersByAppt(prev => {
      const list = prev[appointmentId] || [];
      const itemsToAdd = pack.items.map(it => ({
        id: `${it.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        name: it.name,
        quantity: 1,
        concentration: '',
      }));
      return { ...prev, [appointmentId]: [...list, ...itemsToAdd] };
    });
    setSelectedPackageId('');
  };

  const removeOrderItem = (appointmentId, itemId) => {
    setMedicalOrdersByAppt(prev => ({
      ...prev,
      [appointmentId]: (prev[appointmentId] || []).filter(it => it.id !== itemId)
    }));
  };

  const updateOrderItem = (appointmentId, itemId, patch) => {
    setMedicalOrdersByAppt(prev => ({
      ...prev,
      [appointmentId]: (prev[appointmentId] || []).map(it => it.id === itemId ? { ...it, ...patch } : it)
    }));
  };
  const [showHistoryEditor, setShowHistoryEditor] = useState(false);
  const [historyDraft, setHistoryDraft] = useState('');

  const printAttention = (appointmentId) => {
    try {
      const appt = attentions.find(a => a.id === appointmentId) || {};
      const details = appointmentDetails[appointmentId] || {};
      const evolutionHtml = evolutionContentByAppt[appointmentId] || '';

      // Abrir en una pestaña (sin features para evitar cierre automático)
      const doc = window.open('', '_blank');
      if (!doc) return;
      const styles = `
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          h2 { font-size: 16px; margin: 16px 0 8px; }
          h3 { font-size: 14px; margin: 12px 0 6px; }
          .muted { color: #6B7280; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
          .section { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; margin-top: 12px; }
          .hr { height: 1px; background: #E5E7EB; margin: 12px 0; }
          .tiny { font-size: 12px; }
        </style>
      `;
      const html = `
        <html>
          <head>
            <title>Atención #${appointmentId}</title>
            ${styles}
          </head>
          <body>
            <h1>Atención #${appointmentId}</h1>
            <div class="muted">Fecha: ${appt.date || ''} ${appt.time || ''}</div>
            <div class="section">
              <h2>Paciente</h2>
              <div class="grid">
                <div><strong>Nombre:</strong> ${patient?.first_name || ''} ${patient?.last_name || ''}</div>
                <div><strong>Documento:</strong> ${patient?.identification_type || ''} ${patient?.identification_number || ''}</div>
                <div><strong>Edad:</strong> ${calculateAge(patient?.birth_date)}</div>
                <div><strong>Sexo:</strong> ${patient?.gender || ''}</div>
              </div>
            </div>
            <div class="section">
              <h2>Detalles de la atención</h2>
              <div class="grid">
                <div><strong>Profesional:</strong> ${details.doctorFullName || appt.doctor_name || '—'}</div>
                <div><strong>Estado:</strong> ${formatStatusDisplay(details.status || appt.status || '')}</div>
                <div><strong>Tipo:</strong> ${formatTitleCase(appt.type || '')}</div>
                <div><strong>Especialidad:</strong> ${appt.specialty || '—'}</div>
                <div><strong>Recurso:</strong> ${details.resource || '—'}</div>
                <div><strong>Convenio:</strong> ${patient?.agreement || '—'}</div>
              </div>
            </div>
            <div class="section">
              <h2>Antecedentes clínicos</h2>
              <div>${patient?.medical_history ? (/<\w+[^>]*>/.test(patient.medical_history) ? patient.medical_history : (patient.medical_history || '').replace(/\n/g,'<br>')) : '—'}</div>
            </div>
            ${evolutionHtml ? `<div class=\"section\"><h2>Evolución clínica</h2><div>${evolutionHtml}</div></div>` : ''}
            <div class="section">
              <h2>Consentimientos</h2>
              <div class="tiny muted">(Datos de consentimientos de esta atención — si aplica)</div>
              <div>—</div>
            </div>
            <div class="section">
              <h2>Órdenes médicas</h2>
              <div class="tiny muted">(Listado de órdenes asociadas a esta atención — si aplica)</div>
              <div>—</div>
            </div>
            <div class="section">
              <h2>Prescripciones</h2>
              <div class="tiny muted">(Listado de prescripciones asociadas a esta atención — si aplica)</div>
              <div>—</div>
            </div>
            <div class="section">
              <h2>Imágenes y documentos</h2>
              <div class="tiny muted">(Archivos cargados en esta atención — si aplica)</div>
              <div>—</div>
            </div>
            <script>window.onload = function(){ window.print(); };</script>
          </body>
        </html>
      `;
      doc.document.open();
      doc.document.write(html);
      doc.document.close();
    } catch (_) {}
  };

  const loadConsentsTemplates = async () => {
    try {
      setLoadingConsentsTemplates(true);
      const resp = await consentsAPI.getAll();
      const items = resp.data?.templates || resp.templates || [];
      setConsentsTemplates(items);
      const def = items.find(t => t.is_default || t.isDefault) || null;
      if (def && viewingAttentionId) {
        setSelectedConsentTemplateId(def.id);
        setConsentsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: def.content || '' }));
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingConsentsTemplates(false);
    }
  };

  // Función para calcular la edad del paciente
  const calculateAge = (birthDate) => {
    if (!birthDate) return 'No especificada';
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return `${age} años`;
  };

  const formatTitleCase = (text) => {
    if (!text) return '—';
    return text
      .toString()
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const ensureDoctorsLoaded = async () => {
    if (doctors && doctors.length > 0) return;
    try {
      const resp = await userService.getDoctors();
      const list = resp.users || resp.doctors || [];
      setDoctors(list);
    } catch (e) {
      console.error('Error cargando profesionales:', e);
      toast.error('No se pudieron cargar los profesionales');
    }
  };

  const openDoctorPicker = async (appointment, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    await ensureDoctorsLoaded();
    setDoctorPickerFor(appointment.id);
    // intentar seleccionar el doctor actual si lo conocemos (no siempre viene id); no romper si no existe
    const current = doctors.find(d => `${d.first_name} ${d.last_name}`.trim() === (appointment.doctor_name || '').trim());
    setSelectedDoctorId(current ? current.id : null);
  };

  const ensureSpecialtiesLoaded = async () => {
    if (specialties && specialties.length > 0) return;
    try {
      const resp = await specialtiesAPI.getAll();
      const list = resp.data?.specialties || resp.data || [];
      setSpecialties(list);
    } catch (e) {
      // silencioso
    }
  };

  const loadEvolutionTemplatesFor = async (appointment, overrideSpecialtyId = null) => {
    try {
      setLoadingEvolutionTemplates(true);
      await ensureSpecialtiesLoaded();
      let specId = overrideSpecialtyId;
      if (!specId) {
        const specialtyName = appointment?.specialty || attentions.find(a => a.id === appointment?.id)?.specialty || null;
        const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
        specId = spec?.id || null;
      }
      if (!specId) {
        setEvolutionTemplates([]);
        setSelectedEvolutionTemplateId(null);
        return;
      }
      setEvolutionSpecIdByAppt(prev => ({ ...prev, [appointment.id]: specId }));
      const resp = await specialtiesAPI.getTemplates(specId, 'evolutions');
      const items = resp.data?.templates || [];
      setEvolutionTemplates(items);
      const def = items.find(t => t.is_default || t.isDefault) || null;
      if (def) {
        setSelectedEvolutionTemplateId(def.id);
        setEvolutionContentByAppt(prev => ({ ...prev, [appointment.id]: def.content || '' }));
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingEvolutionTemplates(false);
    }
  };

  const loadPrescriptionsTemplatesFor = async (appointment, overrideSpecialtyId = null) => {
    try {
      setLoadingPrescriptionsTemplates(true);
      await ensureSpecialtiesLoaded();
      let specId = overrideSpecialtyId;
      if (!specId) {
        const specialtyName = appointment?.specialty || attentions.find(a => a.id === appointment?.id)?.specialty || null;
        const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
        specId = spec?.id || null;
      }
      if (!specId) {
        setPrescriptionsTemplates([]);
        setSelectedPrescriptionsTemplateId(null);
        return;
      }
      setPrescriptionsSpecIdByAppt(prev => ({ ...prev, [appointment.id]: specId }));
      const resp = await specialtiesAPI.getTemplates(specId, 'prescriptions');
      const items = resp.data?.templates || [];
      setPrescriptionsTemplates(items);
      const def = items.find(t => t.is_default || t.isDefault) || null;
      if (def) {
        setSelectedPrescriptionsTemplateId(def.id);
        setPrescriptionsContentByAppt(prev => ({ ...prev, [appointment.id]: def.content || '' }));
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingPrescriptionsTemplates(false);
    }
  };

  const cancelDoctorPicker = () => {
    setDoctorPickerFor(null);
    setSelectedDoctorId(null);
  };

  const formatStatusDisplay = (s) => {
    const v = (s || '').toString().toUpperCase();
    switch (v) {
      case 'PROGRAMADA': return 'No confirmado';
      case 'CONFIRMADA': return 'Confirmado';
      case 'EN_PROGRESO': return 'En progreso';
      case 'COMPLETADA': return 'Atendido';
      case 'CANCELADA': return 'Cancelado';
      case 'NO_ASISTIO': return 'No asistió';
      default: return formatTitleCase(s || 'No confirmado');
    }
  };

  const handleToggleAttention = async (appt) => {
    const newId = expandedAttentionId === appt.id ? null : appt.id;
    setExpandedAttentionId(newId);
    if (newId && !appointmentDetails[newId]) {
      try {
        setLoadingDetailsId(newId);
        const resp = await appointmentService.getAppointmentById(newId);
        setAppointmentDetails(prev => ({ ...prev, [newId]: resp.appointment || resp }));
      } catch (e) {
        // silencioso; mostramos con datos básicos
      } finally {
        setLoadingDetailsId(null);
      }
    }
  };

  const openAttentionDetail = async (appt) => {
    setViewingAttentionId(appt.id);
    if (!appointmentDetails[appt.id]) {
      try {
        setLoadingDetailsId(appt.id);
        const resp = await appointmentService.getAppointmentById(appt.id);
        setAppointmentDetails(prev => ({ ...prev, [appt.id]: resp.appointment || resp }));
      } catch (e) {
        // ignore
      } finally {
        setLoadingDetailsId(null);
      }
    }
    // cargar plantillas de evolución para la especialidad de esta atención
    await loadEvolutionTemplatesFor(appt);
  };

  const closeAttentionDetail = () => {
    setViewingAttentionId(null);
  };

  const toggleDetailSection = (key) => {
    setOpenDetailSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveDoctorChange = async (appointment) => {
    if (!selectedDoctorId) {
      toast.error('Seleccione un profesional');
      return;
    }
    try {
      setSavingDoctorFor(appointment.id);
      await appointmentService.updateAppointmentDoctor(appointment.id, selectedDoctorId);
      toast.success('Profesional actualizado');
      setDoctorPickerFor(null);
      setSelectedDoctorId(null);
      // recargar atenciones para reflejar el cambio
      // reuse loader inside effect
      // quick reload here
      try {
        const resp = await appointmentService.getAppointments({ patientId, limit: 500, sortBy: 'appointment_date', sortOrder: 'ASC' });
        const list = Array.isArray(resp?.appointments) ? resp.appointments : [];
        const normalized = list.map(a2 => {
          const rawDate = a2.appointment_date || a2.date || a2.appointmentDate || '';
          const dateOnly = String(rawDate).split('T')[0];
          const timeRaw = a2.appointment_time || a2.time || a2.appointmentTime || '';
          const timeOnly = String(timeRaw).slice(0,5);
          const dateTimeStr = a2.appointmentDateTime || (dateOnly ? `${dateOnly}T${timeOnly || '00:00'}` : null);
          return {
            id: a2.id,
            date: dateOnly,
            time: timeOnly,
            dateOnly,
            dateTime: dateTimeStr ? new Date(dateTimeStr) : null,
            type: a2.type || a2.appointment_type || 'CONSULTA',
            status: a2.status,
            specialty: a2.specialty_name || a2.specialty || null,
            doctor_name: a2.doctorFullName || (a2.doctor_first_name && a2.doctor_last_name ? `${a2.doctor_first_name} ${a2.doctor_last_name}` : null),
            location: a2.branch || a2.location || null,
            reason: a2.reason || a2.notes || ''
          };
        });
        setAttentions(normalized);
      } catch (e) {
        // ignore if fails; UI already updated on backend
      }
    } catch (e) {
      console.error('Error actualizando profesional:', e, 'payload:', {
        patientId: 'hidden',
        doctorId: selectedDoctorId,
        appointmentId: appointment.id
      }, 'status:', e?.status, 'details:', e?.details);
      if (e?.details && Array.isArray(e.details)) {
        toast.error(`Error: ${e.details[0]}`);
      } else if (e?.message) {
        toast.error(e.message);
      } else {
        toast.error('No se pudo actualizar el profesional');
      }
    } finally {
      setSavingDoctorFor(null);
    }
  };



  useEffect(() => {
    // Leer el parámetro tab de la URL
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['clinical', 'administrative', 'anamnesis', 'billing'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
    
    // Verificar token antes de cargar datos
    const token = localStorage.getItem('authToken');
    if (!token) {
      toast.error('Sesión expirada. Inicia sesión nuevamente.');
      navigate('/login');
      return;
    }

    // Cargar datos reales del paciente
    const loadPatientData = async () => {
      try {
        setLoading(true);
        const response = await patientService.getPatientById(patientId);
        setPatient(response.patient || response);
      } catch (error) {
        console.error('Error cargando datos del paciente:', error);
        toast.error('Error al cargar los datos del paciente');
      } finally {
        setLoading(false);
      }
    };

    // Cargar citas/atenciones del paciente
    const loadPatientAppointments = async () => {
      try {
        // Debug: validar si hay token antes de pedir citas
        const hasToken = !!localStorage.getItem('authToken');
        console.debug('[PatientFicha] Cargando citas. patientId=', patientId, 'token?', hasToken);
        const resp = await appointmentService.getAppointments({ patientId, limit: 500, sortBy: 'appointment_date', sortOrder: 'ASC' });
        console.debug('[PatientFicha] Respuesta citas cruda:', resp);
        if (resp && resp.error) {
          console.warn('[PatientFicha] Error en respuesta citas:', resp.error, resp.message);
        }
        let list = Array.isArray(resp?.appointments) ? resp.appointments : [];

        // Fallback: si el backend no filtra por patientId, traer todas y filtrar aquí como en Agenda
        if (list.length === 0) {
          console.debug('[PatientFicha] Sin resultados filtrados por patientId. Probando fallback cliente...');
          const allResp = await appointmentService.getAppointments({ limit: 2000, sortBy: 'appointment_date', sortOrder: 'ASC' });
          const allList = Array.isArray(allResp?.appointments) ? allResp.appointments : [];
          list = allList.filter(a => String(a.patient_id) === String(patientId));
          console.debug('[PatientFicha] Fallback obtuvo:', list.length, 'citas del paciente');
        }

        const normalized = list.map(a => {
          const rawDate = a.appointment_date || a.date || a.appointmentDate || '';
          const dateOnly = String(rawDate).split('T')[0];
          const timeRaw = a.appointment_time || a.time || a.appointmentTime || '';
          const timeOnly = String(timeRaw).slice(0,5);
          const dateTimeStr = a.appointmentDateTime || (dateOnly ? `${dateOnly}T${timeOnly || '00:00'}` : null);
          return {
            id: a.id,
            date: dateOnly,
            time: timeOnly,
            dateOnly,
            dateTime: dateTimeStr ? new Date(dateTimeStr) : null,
            type: a.type || a.appointment_type || 'CONSULTA',
            status: a.status,
            specialty: a.specialty_name || a.specialty || null,
            doctor_name: a.doctorFullName || (a.doctor_first_name && a.doctor_last_name ? `${a.doctor_first_name} ${a.doctor_last_name}` : null),
            location: a.branch || a.location || null,
            reason: a.reason || a.notes || ''
          };
        });
        console.debug('[PatientFicha] Citas normalizadas:', normalized);
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        console.debug('[PatientFicha] Conteo grupos -> hoy:', normalized.filter(a=>a.dateOnly===todayStr).length, 'futuras:', normalized.filter(a=>a.dateOnly>todayStr).length, 'pasadas:', normalized.filter(a=>a.dateOnly<todayStr).length);
        if (normalized.length === 0) {
          console.warn('[PatientFicha] No hay citas para mostrar tras normalizar. patientId=', patientId);
        }
        setAttentions(normalized);
      } catch (error) {
        console.error('Error cargando atenciones del paciente:', error);
        if ((error && error.status === 401) || (error && /token/i.test(error.message || ''))) {
          toast.error('Sesión expirada. Inicia sesión nuevamente.');
          navigate('/login');
        } else {
          toast.error('Error al cargar las atenciones del paciente');
        }
      }
    };

    if (patientId) {
      (async () => {
        await loadPatientData();
        await loadPatientAppointments();
      })();
    }
  }, [patientId, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Paciente no encontrado</h2>
          <p className="text-gray-600">No se pudo cargar la información del paciente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Paciente */}
      <div className="bg-blue-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <span style={{ fontSize: '24px' }}>👤</span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
              <div>ID: {patient.id}</div>
              <div>{patient.identification_type} {patient.identification_number}</div>
              <div>Teléfono: {patient.phone}</div>
              <div>Edad: {calculateAge(patient.birth_date)}</div>
              <div>Sexo: {patient.gender}</div>
            </div>
            <div className="mt-2 text-sm opacity-90">
              {patient.agreement || 'Sin convenio'}
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100">
              <span style={{ fontSize: '14px', marginRight: '8px' }}>📅</span>
              Dar cita
            </button>
            <button className="bg-white text-blue-600 px-4 py-2 rounded hover:bg-gray-100">
              <span style={{ fontSize: '14px', marginRight: '8px' }}>💰</span>
              Recibir pago
            </button>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('administrative')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'administrative'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Datos administrativos
          </button>
          <button
            onClick={() => setActiveTab('clinical')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'clinical'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Ficha clínica
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'billing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Facturación y pagos
          </button>
        </nav>
      </div>

      {/* Modal simple para cambiar profesional */}
      {doctorPickerFor && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Cambiar profesional</h2>
              <button onClick={cancelDoctorPicker} className="modal-close" aria-label="Cerrar">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Profesional asignado</label>
                <select
                  className="form-select w-full"
                  value={selectedDoctorId || ''}
                  onChange={(e) => setSelectedDoctorId(parseInt(e.target.value) || null)}
                >
                  <option value="">Seleccione un profesional</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.first_name} {doc.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={cancelDoctorPicker} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => {
                  const appt = attentions.find(a => a.id === doctorPickerFor);
                  if (appt) saveDoctorChange({ id: appt.id });
                }}
                disabled={savingDoctorFor === doctorPickerFor}
                className="btn-primary"
              >
                {savingDoctorFor === doctorPickerFor ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido de las tabs */}
      {activeTab === 'clinical' && !viewingAttentionId && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar izquierdo */}
          <div className="lg:col-span-1 space-y-4">
            

            {/* Módulos médicos */}
            <div className="card">
              <h3 className="font-medium text-gray-900 mb-3">Módulos Médicos</h3>
              <div className="space-y-2">
                <Link
                  to={`/patients/${patientId}/ficha?tab=clinical&module=medical-orders`}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <span style={{ fontSize: '14px' }}>🏥</span>
                  <span>Órdenes médicas</span>
                </Link>
                <Link
                  to={`/patients/${patientId}/ficha?tab=clinical&module=prescriptions`}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <span style={{ fontSize: '14px' }}>💊</span>
                  <span>Prescripciones</span>
                </Link>
                <Link
                  to={`/patients/${patientId}/ficha?tab=clinical&module=images`}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <span style={{ fontSize: '14px' }}>📷</span>
                  <span>Imágenes y Docs.</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="lg:col-span-3 space-y-4">
            {/* Vista rápida por módulos si viene ?module= */}
            {(() => {
              const moduleView = searchParams.get('module');
              if (!moduleView) return null;
              return (
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {moduleView === 'medical-orders' ? 'Órdenes médicas por atención'
                        : moduleView === 'prescriptions' ? 'Prescripciones por atención'
                        : moduleView === 'images' ? 'Imágenes y documentos por atención' : 'Módulo'}
                    </h3>
                    <button className="text-sm text-blue-600 hover:text-blue-800" onClick={() => navigate(`/patients/${patientId}/ficha?tab=clinical`)}>Cerrar</button>
                  </div>
                  <div className="space-y-3">
                    {attentions.length === 0 && (
                      <div className="text-sm text-gray-500">No hay atenciones registradas.</div>
                    )}
                    {attentions.map(appt => (
                      <div key={appt.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">Atención #{appt.id} — {appt.date} {appt.time || ''}</div>
                          <div className="text-xs text-gray-500">{appt.specialty || 'Sin especialidad'}</div>
                        </div>
                        <div className="mt-2 text-sm text-gray-700">
                          {moduleView === 'prescriptions' && (
                            <div className="text-gray-500">Listado de prescripciones (pendiente de integrar consulta por atención)</div>
                          )}
                          {moduleView === 'medical-orders' && (
                            <div className="text-gray-500">Listado de órdenes médicas (pendiente de integrar consulta por atención)</div>
                          )}
                          {moduleView === 'images' && (
                            <div className="text-gray-500">Listado de imágenes/documentos (pendiente de integrar consulta por atención)</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            

            {/* Atenciones - Pasadas / Hoy / Futuras */}
            <div className="space-y-4">
              {/* Utilidades */}
              <div className="text-sm text-gray-600">
                <span className="mr-2">Total atenciones:</span>
                <span className="font-medium">{attentions.length}</span>
              </div>

              {/* Sección: Atenciones de Hoy */}
              <div className="card relative">
                <button
                  type="button"
                  className="w-full flex items-center justify-between"
                  onClick={() => setShowTodayAppointments(v => !v)}
                >
                  <h3 className="text-lg font-medium text-gray-900">Atenciones de hoy</h3>
                  <span className="text-gray-500">{showTodayAppointments ? '▲' : '▼'}</span>
                </button>
                {showTodayAppointments && (
                  <div className="mt-3 divide-y">
                    {attentions
                      .filter(a => a.dateOnly === `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`)
                      .sort((a,b) => (a.time||'').localeCompare(b.time||''))
                      .map(appt => (
                        <div key={appt.id} className="relative py-3">
                          {/* Botón editar profesional */}
                          <button
                            type="button"
                            onClick={(e) => openDoctorPicker(appt, e)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                            title="Cambiar profesional asignado"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 3.487a2.25 2.25 0 113.182 3.182L9.75 17.963 6 18l.037-3.75L16.862 3.487z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13.5V19.5A1.5 1.5 0 0116.5 21h-12A1.5 1.5 0 013 19.5v-12A1.5 1.5 0 014.5 6H10.5" />
                            </svg>
                          </button>
                          <div className="flex items-start space-x-3 cursor-pointer" onClick={() => openAttentionDetail(appt)}>
                            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-blue-700 text-sm font-semibold min-w-[110px] text-center">
                              <div>{appt.date}</div>
                              <div className="text-base">{appt.time || '—'}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                Atención{appt.reason ? ` - ${appt.reason}` : ''}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                                <div><span className="text-gray-500">Profesional:</span> <span className="text-gray-800">{appt.doctor_name || '—'}</span></div>
                                <div><span className="text-gray-500">Estado:</span> <span className="text-gray-800">{formatTitleCase(appt.status)}</span></div>
                                <div><span className="text-gray-500">Tipo:</span> <span className="text-gray-800">{formatTitleCase(appt.type) || 'Consulta'}</span></div>
                              </div>
                              {appt.specialty && (
                                <div className="text-xs text-gray-500 mt-1">Especialidad: {appt.specialty}</div>
                              )}
                              <div className="mt-2">
                                <button type="button" className="btn-secondary text-xs" onClick={(e)=>{ e.stopPropagation(); printAttention(appt.id); }}>
                                  🖨️ Imprimir atención
                                </button>
                              </div>
                            </div>
                          </div>

                          {expandedAttentionId === appt.id && (
                            <div className="mt-3 ml-[126px]">
                              {/* Advertencia RIPS dentro de cada atención */}
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span style={{ fontSize: '16px' }}>⚠️</span>
                                    <p className="text-xs md:text-sm text-yellow-800">
                                      Esta atención no tiene configurados todos los datos pertinentes a la legislación actual, por favor complételos utilizando los botones superiores.
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button className="bg-gray-600 text-white px-3 py-1 rounded text-xs md:text-sm">
                                      <span style={{ fontSize: '12px', marginRight: '4px' }}>⚠️</span>
                                      Detalles RIPS
                                    </button>
                                    <button className="bg-gray-600 text-white px-3 py-1 rounded text-xs md:text-sm">
                                      Riesgos EPS
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-md border border-gray-200 p-3 bg-white">
                                {loadingDetailsId === appt.id ? (
                                  <div className="text-sm text-gray-500">Cargando detalles...</div>
                                ) : (
                                  <div className="space-y-2 text-sm">
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                      <div><span className="text-gray-500">Atención #</span> <span className="font-medium">{appointmentDetails[appt.id]?.id || appt.id}</span></div>
                                      <div><span className="text-gray-500">Estado:</span> <span className="font-medium">{formatStatusDisplay(appointmentDetails[appt.id]?.status || appt.status)}</span></div>
                                      <div><span className="text-gray-500">Recurso:</span> <span className="font-medium">{appointmentDetails[appt.id]?.resource || 'Sin asignar'}</span></div>
                                    </div>
                                    <div><span className="text-gray-500">Sucursal:</span> <span className="text-blue-600 font-medium">IPS ROGANS SAS</span></div>
                                    <div><span className="text-gray-500">Convenio:</span> <span className="text-blue-600 font-medium">{patient.agreement || 'Sin convenio'}</span></div>
                                    <div><span className="text-gray-500">Tipo de paciente:</span> <span className="text-blue-600 font-medium">{patient.patient_type ? formatTitleCase(patient.patient_type) : 'Particular'}</span></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    {attentions.filter(a => a.dateOnly === `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`).length === 0 && (
                      <div className="py-3 text-sm text-gray-500">No hay atenciones para hoy.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Sección: Atenciones Futuras */}
              <div className="card relative">
                <button
                  type="button"
                  className="w-full flex items-center justify-between"
                  onClick={() => setShowFutureAppointments(v => !v)}
                >
                  <h3 className="text-lg font-medium text-gray-900">Atenciones futuras</h3>
                  <span className="text-gray-500">{showFutureAppointments ? '▲' : '▼'}</span>
                </button>
                {showFutureAppointments && (
                  <div className="mt-3 divide-y">
                    {attentions
                      .filter(a => a.dateOnly > `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`)
                      .sort((a,b) => (a.dateOnly+a.time).localeCompare(b.dateOnly+b.time))
                      .map(appt => (
                        <div key={appt.id} className="relative py-3">
                          {/* Botón editar profesional */}
                          <button
                            type="button"
                            onClick={(e) => openDoctorPicker(appt, e)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                            title="Cambiar profesional asignado"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 3.487a2.25 2.25 0 113.182 3.182L9.75 17.963 6 18l.037-3.75L16.862 3.487z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13.5V19.5A1.5 1.5 0 0116.5 21h-12A1.5 1.5 0 013 19.5v-12A1.5 1.5 0 014.5 6H10.5" />
                            </svg>
                          </button>
                          <div className="flex items-start space-x-3 cursor-pointer" onClick={() => openAttentionDetail(appt)}>
                            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-blue-700 text-sm font-semibold min-w-[110px] text-center">
                              <div>{appt.date || '—'}</div>
                              <div className="text-base">{appt.time || ''}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                Atención{appt.reason ? ` - ${appt.reason}` : ''}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                                <div><span className="text-gray-500">Profesional:</span> <span className="text-gray-800">{appt.doctor_name || '—'}</span></div>
                                <div><span className="text-gray-500">Estado:</span> <span className="text-gray-800">{formatTitleCase(appt.status)}</span></div>
                                <div><span className="text-gray-500">Tipo:</span> <span className="text-gray-800">{formatTitleCase(appt.type) || 'Consulta'}</span></div>
                              </div>
                              {appt.specialty && (
                                <div className="text-xs text-gray-500 mt-1">Especialidad: {appt.specialty}</div>
                              )}
                            </div>
                          </div>

                          {expandedAttentionId === appt.id && (
                            <div className="mt-3 ml-[126px]">
                              {/* Advertencia RIPS dentro de cada atención */}
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span style={{ fontSize: '16px' }}>⚠️</span>
                                    <p className="text-xs md:text-sm text-yellow-800">
                                      Esta atención no tiene configurados todos los datos pertinentes a la legislación actual, por favor complételos utilizando los botones superiores.
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button className="bg-gray-600 text-white px-3 py-1 rounded text-xs md:text-sm">
                                      <span style={{ fontSize: '12px', marginRight: '4px' }}>⚠️</span>
                                      Detalles RIPS
                                    </button>
                                    <button className="bg-gray-600 text-white px-3 py-1 rounded text-xs md:text-sm">
                                      Riesgos EPS
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-md border border-gray-200 p-3 bg-white">
                                {loadingDetailsId === appt.id ? (
                                  <div className="text-sm text-gray-500">Cargando detalles...</div>
                                ) : (
                                  <div className="space-y-2 text-sm">
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                      <div><span className="text-gray-500">Atención #</span> <span className="font-medium">{appointmentDetails[appt.id]?.id || appt.id}</span></div>
                                      <div><span className="text-gray-500">Estado:</span> <span className="font-medium">{formatStatusDisplay(appointmentDetails[appt.id]?.status || appt.status)}</span></div>
                                      <div><span className="text-gray-500">Recurso:</span> <span className="font-medium">{appointmentDetails[appt.id]?.resource || 'Sin asignar'}</span></div>
                                    </div>
                                    <div><span className="text-gray-500">Sucursal:</span> <span className="text-blue-600 font-medium">IPS ROGANS SAS</span></div>
                                    <div><span className="text-gray-500">Convenio:</span> <span className="text-blue-600 font-medium">{patient.agreement || 'Sin convenio'}</span></div>
                                    <div><span className="text-gray-500">Tipo de paciente:</span> <span className="text-blue-600 font-medium">{patient.patient_type ? formatTitleCase(patient.patient_type) : 'Particular'}</span></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    {attentions.filter(a => a.dateOnly > `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`).length === 0 && (
                      <div className="py-3 text-sm text-gray-500">No hay atenciones futuras.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Sección: Atenciones Pasadas */}
              <div className="card relative">
                <button
                  type="button"
                  className="w-full flex items-center justify-between"
                  onClick={() => setShowPastAppointments(v => !v)}
                >
                  <h3 className="text-lg font-medium text-gray-900">Atenciones pasadas</h3>
                  <span className="text-gray-500">{showPastAppointments ? '▲' : '▼'}</span>
                </button>
                {showPastAppointments && (
                  <div className="mt-3 divide-y">
                    {attentions
                      .filter(a => a.dateOnly < `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`)
                      .sort((a,b) => (b.dateOnly+b.time).localeCompare(a.dateOnly+a.time))
                      .map(appt => (
                        <div key={appt.id} className="relative py-3">
                          {/* Botón editar profesional */}
                          <button
                            type="button"
                            onClick={(e) => openDoctorPicker(appt, e)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                            title="Cambiar profesional asignado"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 3.487a2.25 2.25 0 113.182 3.182L9.75 17.963 6 18l.037-3.75L16.862 3.487z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13.5V19.5A1.5 1.5 0 0116.5 21h-12A1.5 1.5 0 013 19.5v-12A1.5 1.5 0 014.5 6H10.5" />
                            </svg>
                          </button>
                          <div className="flex items-start space-x-3 cursor-pointer" onClick={() => openAttentionDetail(appt)}>
                            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-blue-700 text-sm font-semibold min-w-[110px] text-center">
                              <div>{appt.date || '—'}</div>
                              <div className="text-base">{appt.time || ''}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                Atención{appt.reason ? ` - ${appt.reason}` : ''}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                                <div><span className="text-gray-500">Profesional:</span> <span className="text-gray-800">{appt.doctor_name || '—'}</span></div>
                                <div><span className="text-gray-500">Estado:</span> <span className="text-gray-800">{formatTitleCase(appt.status)}</span></div>
                                <div><span className="text-gray-500">Tipo:</span> <span className="text-gray-800">{formatTitleCase(appt.type) || 'Consulta'}</span></div>
                              </div>
                              {appt.specialty && (
                                <div className="text-xs text-gray-500 mt-1">Especialidad: {appt.specialty}</div>
                              )}
                            </div>
                          </div>

                          {expandedAttentionId === appt.id && (
                            <div className="mt-3 ml-[126px]">
                              {/* Advertencia RIPS dentro de cada atención */}
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span style={{ fontSize: '16px' }}>⚠️</span>
                                    <p className="text-xs md:text-sm text-yellow-800">
                                      Esta atención no tiene configurados todos los datos pertinentes a la legislación actual, por favor complételos utilizando los botones superiores.
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button className="bg-gray-600 text-white px-3 py-1 rounded text-xs md:text-sm">
                                      <span style={{ fontSize: '12px', marginRight: '4px' }}>⚠️</span>
                                      Detalles RIPS
                                    </button>
                                    <button className="bg-gray-600 text-white px-3 py-1 rounded text-xs md:text-sm">
                                      Riesgos EPS
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-md border border-gray-200 p-3 bg-white">
                                {loadingDetailsId === appt.id ? (
                                  <div className="text-sm text-gray-500">Cargando detalles...</div>
                                ) : (
                                  <div className="space-y-2 text-sm">
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                      <div><span className="text-gray-500">Atención #</span> <span className="font-medium">{appointmentDetails[appt.id]?.id || appt.id}</span></div>
                                      <div><span className="text-gray-500">Estado:</span> <span className="font-medium">{formatStatusDisplay(appointmentDetails[appt.id]?.status || appt.status)}</span></div>
                                      <div><span className="text-gray-500">Recurso:</span> <span className="font-medium">{appointmentDetails[appt.id]?.resource || 'Sin asignar'}</span></div>
                                    </div>
                                    <div><span className="text-gray-500">Sucursal:</span> <span className="text-blue-600 font-medium">IPS ROGANS SAS</span></div>
                                    <div><span className="text-gray-500">Convenio:</span> <span className="text-blue-600 font-medium">{patient.agreement || 'Sin convenio'}</span></div>
                                    <div><span className="text-gray-500">Tipo de paciente:</span> <span className="text-blue-600 font-medium">{patient.patient_type ? formatTitleCase(patient.patient_type) : 'Particular'}</span></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    {attentions.filter(a => a.dateOnly < `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`).length === 0 && (
                      <div className="py-3 text-sm text-gray-500">No hay atenciones pasadas.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Antecedentes clínicos */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Antecedentes Clínicos
              </h3>
              {!showHistoryEditor ? (
                <>
                  {patient.medical_history ? (
                    <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: /<\w+[^>]*>/.test(patient.medical_history) ? patient.medical_history : (patient.medical_history || '').replace(/\n/g,'<br>') }} />
                  ) : (
                    <p className="text-sm text-gray-600">No hay antecedentes clínicos registrados para este paciente.</p>
                  )}
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={()=>{ setHistoryDraft(patient.medical_history || ''); setShowHistoryEditor(true); }}
                    >
                      Editar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="border rounded">
                    <ReactQuill
                      theme="snow"
                      value={historyDraft}
                      onChange={(html)=>setHistoryDraft(html)}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={()=>{ setShowHistoryEditor(false); }} className="btn-secondary">Cancelar</button>
                    <button
                      className="btn-primary"
                      onClick={async ()=>{
                        try {
                          await patientService.updateMedicalHistory(patient.id, historyDraft);
                          setPatient(prev => ({ ...prev, medical_history: historyDraft }));
                          toast.success('Antecedentes actualizados');
                          setShowHistoryEditor(false);
                        } catch (e) {
                          console.error('Error actualizando antecedentes:', e);
                          toast.error('No se pudieron actualizar los antecedentes');
                        }
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex space-x-2">
              <button className="btn-primary">
                <span style={{ fontSize: '14px', marginRight: '8px' }}>📋</span>
                + Orden médica
              </button>
              <button className="btn-primary">
                <span style={{ fontSize: '14px', marginRight: '8px' }}>💊</span>
                + Prescripción
              </button>
              <button className="btn-primary">
                <span style={{ fontSize: '14px', marginRight: '8px' }}>📄</span>
                + Documentos
              </button>
              <button className="btn-primary">
                <span style={{ fontSize: '14px', marginRight: '8px' }}>🏷️</span>
                + CIE
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                <span style={{ fontSize: '14px', marginRight: '8px' }}>✅</span>
                ✓ Finalizar atención
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clinical' && viewingAttentionId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={closeAttentionDetail} className="text-sm text-blue-600 hover:text-blue-800">
              ← Volver a lista de atenciones
            </button>
          </div>

          {/* Advertencia RIPS dentro del detalle de la atención */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <p className="text-sm text-yellow-800">
                  Esta atención no tiene configurados todos los datos pertinentes a la legislación actual, por favor complételos utilizando los botones superiores.
                </p>
              </div>
              <div className="flex space-x-2">
                <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm">
                  <span style={{ fontSize: '12px', marginRight: '4px' }}>⚠️</span>
                  Detalles RIPS
                </button>
                <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm">
                  Riesgos EPS
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-blue-700 text-sm font-semibold min-w-[110px] text-center">
                <div>{attentions.find(a=>a.id===viewingAttentionId)?.date || '—'}</div>
                <div className="text-base">{attentions.find(a=>a.id===viewingAttentionId)?.time || ''}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="text-lg font-semibold text-gray-900">
                    Atención #{viewingAttentionId} - {formatTitleCase(attentions.find(a=>a.id===viewingAttentionId)?.type) || 'Consulta'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={()=>printAttention(viewingAttentionId)}
                      className="btn-secondary text-xs md:text-sm"
                      title="Imprimir atención"
                    >
                      🖨️ Imprimir atención
                    </button>
                    <button
                      type="button"
                      onClick={(e)=>openDoctorPicker({ id: viewingAttentionId }, e)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Cambiar profesional asignado"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 3.487a2.25 2.25 0 113.182 3.182L9.75 17.963 6 18l.037-3.75L16.862 3.487z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 13.5V19.5A1.5 1.5 0 0116.5 21h-12A1.5 1.5 0 013 19.5v-12A1.5 1.5 0 014.5 6H10.5" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-700 flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    <span className="text-gray-500">Profesional:</span> <span className="text-gray-800">{appointmentDetails[viewingAttentionId]?.doctorFullName || attentions.find(a=>a.id===viewingAttentionId)?.doctor_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Estado:</span> <span className="text-gray-800">{formatStatusDisplay(appointmentDetails[viewingAttentionId]?.status || attentions.find(a=>a.id===viewingAttentionId)?.status)}</span>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  <div><span className="text-gray-500">Recurso:</span> <span className="text-gray-800">{appointmentDetails[viewingAttentionId]?.resource || 'Sin asignar'}</span></div>
                  <div><span className="text-gray-500">Sucursal:</span> <span className="text-blue-600 font-medium">IPS ROGANS SAS</span></div>
                  <div><span className="text-gray-500">Convenio:</span> <span className="text-blue-600 font-medium">{patient.agreement || 'Sin convenio'}</span></div>
                  <div><span className="text-gray-500">Tipo de paciente:</span> <span className="text-blue-600 font-medium">{patient.patient_type ? formatTitleCase(patient.patient_type) : 'Particular'}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Acordeones de detalle */}
          {[
            { key: 'clinicalHistory', title: 'Antecedentes Clínicos' },
            { key: 'clinicalEvolution', title: 'Evolución Clínica' },
            { key: 'adverseEvents', title: 'Eventos adversos' },
            { key: 'medicalOrders', title: 'Órdenes Médicas' },
            { key: 'prescriptions', title: 'Prescripciones' },
            { key: 'quotation', title: 'Cotización' },
            { key: 'imagesDocs', title: 'Imágenes y documentos' },
            { key: 'clinicalDocs', title: 'Documentos Clínicos' },
            { key: 'consents', title: 'Consentimientos' },
            { key: 'cie', title: 'Diagnósticos CIE' }
          ].map(sec => (
            <div key={sec.key} className="card">
              <button
                type="button"
                className="w-full flex items-center justify-between"
                onClick={()=>toggleDetailSection(sec.key)}
              >
                <h3 className="text-base font-medium text-gray-900">{sec.title}</h3>
                <span className="text-gray-500">{openDetailSections[sec.key] ? '▲' : '▼'}</span>
              </button>
              {openDetailSections[sec.key] && (
                <div className="mt-3">
                  {sec.key === 'clinicalEvolution' ? (
                    <div className="space-y-3">
                      {!showEvolEditor ? (
                        <>
                          {evolutionContentByAppt[viewingAttentionId] ? (
                            <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: evolutionContentByAppt[viewingAttentionId] }} />
                          ) : (
                            <p className="text-sm text-gray-600">Sin evolución registrada.</p>
                          )}
                          <div className="mt-3">
                            <button
                              type="button"
                              className="btn-secondary text-sm"
                              onClick={async ()=>{
                                setShowEvolEditor(true);
                                // si no hay plantillas cargadas aún, intentar cargar por especialidad detectada
                                const appt = attentions.find(a => a.id === viewingAttentionId);
                                await loadEvolutionTemplatesFor(appt);
                              }}
                            >
                              Editar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <label className="text-sm text-gray-600">Especialidad:</label>
                            <select
                              className="form-select text-sm"
                              value={evolutionSpecIdByAppt[viewingAttentionId] || ''}
                              onChange={(e)=>{
                                const newSpecId = e.target.value ? parseInt(e.target.value) : null;
                                if (newSpecId) {
                                  const appt = attentions.find(a => a.id === viewingAttentionId);
                                  loadEvolutionTemplatesFor(appt, newSpecId);
                                } else {
                                  setEvolutionTemplates([]);
                                  setSelectedEvolutionTemplateId(null);
                                }
                              }}
                            >
                              <option value="">(Seleccionar)</option>
                              {specialties.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            <label className="text-sm text-gray-600">Plantilla:</label>
                            <select
                              className="form-select text-sm"
                              value={selectedEvolutionTemplateId || ''}
                              onChange={(e)=>{
                                const id = e.target.value || null;
                                setSelectedEvolutionTemplateId(id);
                                const tpl = evolutionTemplates.find(t => String(t.id) === String(id));
                                if (tpl) {
                                  setEvolutionContentByAppt(prev => ({ ...prev, [viewingAttentionId]: tpl.content || '' }));
                                }
                              }}
                              disabled={loadingEvolutionTemplates || (evolutionTemplates||[]).length===0}
                            >
                              <option value="">{loadingEvolutionTemplates ? 'Cargando...' : 'Sin plantilla'}</option>
                              {(evolutionTemplates||[]).map(t => (
                                <option key={t.id} value={t.id}>{t.name}{(t.is_default||t.isDefault)?' (predeterminada)':''}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn-secondary text-xs"
                              onClick={()=>{
                                const tpl = evolutionTemplates.find(t => t.id === selectedEvolutionTemplateId);
                                if (tpl) setEvolutionContentByAppt(prev => ({ ...prev, [viewingAttentionId]: tpl.content || '' }));
                              }}
                              disabled={!selectedEvolutionTemplateId}
                            >
                              Insertar plantilla
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:text-red-800"
                              onClick={()=>setEvolutionContentByAppt(prev => ({ ...prev, [viewingAttentionId]: '' }))}
                            >
                              Limpiar
                            </button>
                          </div>
                          <div className="border rounded">
                            <ReactQuill
                              theme="snow"
                              value={evolutionContentByAppt[viewingAttentionId] || ''}
                              onChange={(html)=>setEvolutionContentByAppt(prev => ({ ...prev, [viewingAttentionId]: html }))}
                            />
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={()=>{ setShowEvolEditor(false); }} className="btn-secondary">Cancelar</button>
                            <button className="btn-primary" onClick={()=>{ toast.success('Evolución actualizada'); setShowEvolEditor(false); }}>Guardar</button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : sec.key === 'adverseEvents' ? (
                    <div className="space-y-3">
                      {!showAdverseEditor ? (
                        <>
                          {adverseContentByAppt[viewingAttentionId] ? (
                            <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: adverseContentByAppt[viewingAttentionId] }} />
                          ) : (
                            <p className="text-sm text-gray-600">Sin eventos adversos registrados.</p>
                          )}
                          <div className="mt-3">
                            <button
                              type="button"
                              className="btn-secondary text-sm"
                              onClick={()=>{ setShowAdverseEditor(true); }}
                            >
                              Editar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="border rounded">
                            <ReactQuill
                              theme="snow"
                              value={adverseContentByAppt[viewingAttentionId] || ''}
                              onChange={(html)=>setAdverseContentByAppt(prev => ({ ...prev, [viewingAttentionId]: html }))}
                            />
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={()=>{ setShowAdverseEditor(false); }} className="btn-secondary">Cancelar</button>
                            <button className="btn-primary" onClick={()=>{ toast.success('Eventos adversos actualizados'); setShowAdverseEditor(false); }}>Guardar</button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : sec.key === 'medicalOrders' ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="form-label text-sm">Producto</label>
                          <select className="form-select text-sm" value={selectedProductId} onChange={(e)=>setSelectedProductId(e.target.value)}>
                            <option value="">Seleccione</option>
                            {availableProducts.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="form-label text-sm">Cantidad</label>
                          <input className="input-field text-sm w-24" type="number" min={1} value={productQty} onChange={(e)=>setProductQty(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label text-sm">Concentración</label>
                          <input className="input-field text-sm w-48" type="text" placeholder="Ej: 500 mg" value={productConc} onChange={(e)=>setProductConc(e.target.value)} />
                        </div>
                        <div>
                          <button type="button" className="btn-secondary text-sm" onClick={()=>addOrderProduct(viewingAttentionId)}>Agregar</button>
                        </div>
                      </div>
                      <div className="flex items-end gap-3">
                        <div>
                          <label className="form-label text-sm">Paquete</label>
                          <select className="form-select text-sm" value={selectedPackageId} onChange={(e)=>setSelectedPackageId(e.target.value)}>
                            <option value="">Seleccione</option>
                            {availablePackages.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <button type="button" className="btn-secondary text-sm" onClick={()=>addOrderPackage(viewingAttentionId)}>Agregar paquete</button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-600">
                              <th className="py-2 pr-4">Producto</th>
                              <th className="py-2 pr-4">Cantidad</th>
                              <th className="py-2 pr-4">Concentración</th>
                              <th className="py-2 pr-4">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(medicalOrdersByAppt[viewingAttentionId] || []).map(it => (
                              <tr key={it.id} className="border-t">
                                <td className="py-2 pr-4">{it.name}</td>
                                <td className="py-2 pr-4 w-24">
                                  <input className="input-field text-sm" type="number" min={1} value={it.quantity} onChange={(e)=>updateOrderItem(viewingAttentionId, it.id, { quantity: Math.max(1, parseInt(e.target.value)||1) })} />
                                </td>
                                <td className="py-2 pr-4 w-48">
                                  <input className="input-field text-sm" type="text" value={it.concentration} onChange={(e)=>updateOrderItem(viewingAttentionId, it.id, { concentration: e.target.value })} />
                                </td>
                                <td className="py-2 pr-4">
                                  <button className="text-red-600 hover:text-red-800" onClick={()=>removeOrderItem(viewingAttentionId, it.id)}>Eliminar</button>
                                </td>
                              </tr>
                            ))}
                            {!(medicalOrdersByAppt[viewingAttentionId] || []).length && (
                              <tr><td className="py-3 text-gray-500" colSpan={4}>Sin órdenes agregadas</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : sec.key === 'clinicalHistory' ? (
                    <div className="space-y-3">
                      {!showHistoryEditor ? (
                        <>
                          {patient.medical_history ? (
                            <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: /<\w+[^>]*>/.test(patient.medical_history) ? patient.medical_history : (patient.medical_history || '').replace(/\n/g,'<br>') }} />
                          ) : (
                            <p className="text-sm text-gray-600">No hay antecedentes clínicos registrados para este paciente.</p>
                          )}
                          <div className="mt-3">
                            <button
                              type="button"
                              className="btn-secondary text-sm"
                              onClick={()=>{ setHistoryDraft(patient.medical_history || ''); setShowHistoryEditor(true); }}
                            >
                              Editar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="border rounded">
                            <ReactQuill
                              theme="snow"
                              value={historyDraft}
                              onChange={(html)=>setHistoryDraft(html)}
                            />
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={()=>{ setShowHistoryEditor(false); }} className="btn-secondary">Cancelar</button>
                            <button
                              className="btn-primary"
                              onClick={async ()=>{
                                try {
                                  await patientService.updateMedicalHistory(patient.id, historyDraft);
                                  setPatient(prev => ({ ...prev, medical_history: historyDraft }));
                                  toast.success('Antecedentes actualizados');
                                  setShowHistoryEditor(false);
                                } catch (e) {
                                  console.error('Error actualizando antecedentes:', e);
                                  toast.error('No se pudieron actualizar los antecedentes');
                                }
                              }}
                            >
                              Guardar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : sec.key === 'prescriptions' ? (
                    <div className="space-y-3">
                      {!showPrescEditor ? (
                        <>
                          {prescriptionsContentByAppt[viewingAttentionId] ? (
                            <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: prescriptionsContentByAppt[viewingAttentionId] }} />
                          ) : (
                            <p className="text-sm text-gray-600">Sin prescripción registrada.</p>
                          )}
                          <div className="mt-3">
                            <button
                              type="button"
                              className="btn-secondary text-sm"
                              onClick={async ()=>{
                                setShowPrescEditor(true);
                                const appt = attentions.find(a => a.id === viewingAttentionId);
                                await loadPrescriptionsTemplatesFor(appt);
                              }}
                            >
                              Editar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <label className="text-sm text-gray-600">Especialidad:</label>
                            <select
                              className="form-select text-sm"
                              value={prescriptionsSpecIdByAppt[viewingAttentionId] || ''}
                              onChange={(e)=>{
                                const newSpecId = e.target.value ? parseInt(e.target.value) : null;
                                if (newSpecId) {
                                  const appt = attentions.find(a => a.id === viewingAttentionId);
                                  loadPrescriptionsTemplatesFor(appt, newSpecId);
                                } else {
                                  setPrescriptionsTemplates([]);
                                  setSelectedPrescriptionsTemplateId(null);
                                }
                              }}
                            >
                              <option value="">(Seleccionar)</option>
                              {specialties.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            <label className="text-sm text-gray-600">Plantilla:</label>
                            <select
                              className="form-select text-sm"
                              value={selectedPrescriptionsTemplateId || ''}
                              onChange={(e)=>{
                                const id = e.target.value || null;
                                setSelectedPrescriptionsTemplateId(id);
                                const tpl = prescriptionsTemplates.find(t => String(t.id) === String(id));
                                if (tpl) {
                                  setPrescriptionsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: tpl.content || '' }));
                                }
                              }}
                              disabled={loadingPrescriptionsTemplates || (prescriptionsTemplates||[]).length===0}
                            >
                              <option value="">{loadingPrescriptionsTemplates ? 'Cargando...' : 'Sin plantilla'}</option>
                              {(prescriptionsTemplates||[]).map(t => (
                                <option key={t.id} value={t.id}>{t.name}{(t.is_default||t.isDefault)?' (predeterminada)':''}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn-secondary text-xs"
                              onClick={()=>{
                                const tpl = prescriptionsTemplates.find(t => t.id === selectedPrescriptionsTemplateId);
                                if (tpl) setPrescriptionsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: tpl.content || '' }));
                              }}
                              disabled={!selectedPrescriptionsTemplateId}
                            >
                              Insertar plantilla
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:text-red-800"
                              onClick={()=>setPrescriptionsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: '' }))}
                            >
                              Limpiar
                            </button>
                          </div>
                          <div className="border rounded">
                            <ReactQuill
                              theme="snow"
                              value={prescriptionsContentByAppt[viewingAttentionId] || ''}
                              onChange={(html)=>setPrescriptionsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: html }))}
                            />
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={()=>{ setShowPrescEditor(false); }} className="btn-secondary">Cancelar</button>
                            <button className="btn-primary" onClick={()=>{ toast.success('Prescripción actualizada'); setShowPrescEditor(false); }}>Guardar</button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : sec.key === 'consents' ? (
                    <div className="space-y-3">
                      {!showConsentEditor ? (
                        <>
                          {consentsContentByAppt[viewingAttentionId] ? (
                            <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: consentsContentByAppt[viewingAttentionId] }} />
                          ) : (
                            <p className="text-sm text-gray-600">Sin consentimiento registrado.</p>
                          )}
                          <div className="mt-3">
                            <button
                              type="button"
                              className="btn-secondary text-sm"
                              onClick={async ()=>{
                                setShowConsentEditor(true);
                                await loadConsentsTemplates();
                              }}
                            >
                              Editar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <label className="text-sm text-gray-600">Plantilla:</label>
                            <select
                              className="form-select text-sm"
                              value={selectedConsentTemplateId || ''}
                              onChange={(e)=>{
                                const id = e.target.value || null;
                                setSelectedConsentTemplateId(id);
                                const tpl = consentsTemplates.find(t => String(t.id) === String(id));
                                if (tpl) setConsentsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: tpl.content || '' }));
                              }}
                              disabled={loadingConsentsTemplates || (consentsTemplates||[]).length===0}
                            >
                              <option value="">{loadingConsentsTemplates ? 'Cargando...' : 'Sin plantilla'}</option>
                              {(consentsTemplates||[]).map(t => (
                                <option key={t.id} value={t.id}>{t.name}{(t.is_default||t.isDefault)?' (predeterminada)':''}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn-secondary text-xs"
                              onClick={()=>{
                                const tpl = consentsTemplates.find(t => t.id === selectedConsentTemplateId);
                                if (tpl) setConsentsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: tpl.content || '' }));
                              }}
                              disabled={!selectedConsentTemplateId}
                            >
                              Insertar plantilla
                            </button>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:text-red-800"
                              onClick={()=>setConsentsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: '' }))}
                            >
                              Limpiar
                            </button>
                          </div>
                          <div className="border rounded p-3 bg-white">
                            {(() => {
                              const raw = consentsContentByAppt[viewingAttentionId] || '';
                              const toHtml = (text) => /<\w+[^>]*>/.test(text) ? text : text.replace(/\n/g,'<br>');
                              const substituted = toHtml(raw)
                                .replace(/\{\{NOMBRE_PACIENTE\}\}/g, `<span class=\"px-1 py-0.5 border border-blue-300 bg-blue-50 text-blue-700 rounded\">${patient?.first_name || ''} ${patient?.last_name || ''}</span>`)
                                .replace(/\{\{CEDULA_PACIENTE\}\}/g, `<span class=\"px-1 py-0.5 border border-blue-300 bg-blue-50 text-blue-700 rounded\">${patient?.identification_type || ''} ${patient?.identification_number || ''}</span>`)
                                .replace(/\{\{NOMBRE_DOCTOR\}\}/g, `<span class=\"px-1 py-0.5 border border-blue-300 bg-blue-50 text-blue-700 rounded\">${appointmentDetails[viewingAttentionId]?.doctorFullName || attentions.find(a=>a.id===viewingAttentionId)?.doctor_name || ''}</span>`)
                                .replace(/\{\{FECHA_ACTUAL\}\}/g, `<span class=\"px-1 py-0.5 border border-blue-300 bg-blue-50 text-blue-700 rounded\">${new Date().toLocaleDateString()}</span>`)
                                .replace(/\{\{TEXTO_PERSONALIZADO\}\}/g, `<span contenteditable=\"true\" class=\"px-1 py-0.5 border border-blue-500 bg-blue-50 text-blue-800 rounded outline-none\"></span>`);
                              return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: substituted }} />;
                            })()}
                            <div className="text-xs text-gray-500 mt-2">Solo las zonas con "Texto personalizado" son editables.</div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={()=>{ setShowConsentEditor(false); }} className="btn-secondary">Cancelar</button>
                            <button className="btn-primary" onClick={()=>{ toast.success('Consentimiento actualizado'); setShowConsentEditor(false); }}>Guardar</button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-md text-sm text-gray-500">
                      No hay datos en esta sección.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'administrative' && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Datos Administrativos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Información Personal</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Nombre completo:</span>
                  <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Tipo de documento:</span>
                  <p className="font-medium">{patient.identification_type || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Número de documento:</span>
                  <p className="font-medium">{patient.identification_number || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Edad:</span>
                  <p className="font-medium">{calculateAge(patient.birth_date)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Sexo:</span>
                  <p className="font-medium">{patient.gender || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Grupo sanguíneo:</span>
                  <p className="font-medium">{patient.blood_type || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Ocupación:</span>
                  <p className="font-medium">{patient.occupation || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Estado civil:</span>
                  <p className="font-medium">{patient.marital_status || 'No especificado'}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Información de Contacto</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500">Teléfono móvil:</span>
                  <p className="font-medium">{patient.mobile_phone ? `${patient.mobile_phone_country || '+57'} ${patient.mobile_phone}` : 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Teléfono fijo:</span>
                  <p className="font-medium">{patient.landline_phone || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email:</span>
                  <p className="font-medium">{patient.email || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Dirección:</span>
                  <p className="font-medium">{patient.address || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Ciudad:</span>
                  <p className="font-medium">{patient.city || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Departamento:</span>
                  <p className="font-medium">{patient.department || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Zona residencial:</span>
                  <p className="font-medium">{patient.residential_zone || 'No especificado'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Información adicional */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Información Adicional</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Tipo de paciente:</span>
                    <p className="font-medium">{patient.patient_type || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">EPS:</span>
                    <p className="font-medium">{patient.eps || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Convenio:</span>
                    <p className="font-medium">{patient.agreement || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Nivel educativo:</span>
                    <p className="font-medium">{patient.education_level || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Actividad/Profesión:</span>
                    <p className="font-medium">{patient.activity_profession || 'No especificado'}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">País de residencia:</span>
                    <p className="font-medium">{patient.residence_country || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">País de origen:</span>
                    <p className="font-medium">{patient.origin_country || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Extranjero:</span>
                    <p className="font-medium">{patient.is_foreigner ? 'Sí' : 'No'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Discapacidad:</span>
                    <p className="font-medium">{patient.disability || 'Ninguna'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Referencia:</span>
                    <p className="font-medium">{patient.reference || 'No especificado'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Información de acompañante y responsable */}
          {(patient.companion_name || patient.responsible_name) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Información de Acompañante y Responsable</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patient.companion_name && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Acompañante</h5>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Nombre:</span>
                        <p className="font-medium">{patient.companion_name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Teléfono:</span>
                        <p className="font-medium">{patient.companion_phone || 'No especificado'}</p>
                      </div>
                    </div>
                  </div>
                )}
                {patient.responsible_name && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Responsable</h5>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Nombre:</span>
                        <p className="font-medium">{patient.responsible_name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Teléfono:</span>
                        <p className="font-medium">{patient.responsible_phone || 'No especificado'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Parentesco:</span>
                        <p className="font-medium">{patient.responsible_relationship || 'No especificado'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Observaciones */}
          {patient.observations ? (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Observaciones</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{patient.observations}</p>
              </div>
            </div>
          ) : (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Observaciones</h4>
              <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
                <p>No hay observaciones registradas para este paciente.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Facturación y Pagos</h3>
          <p className="text-sm text-gray-600">
            No hay datos de facturación registrados para este paciente.
          </p>
        </div>
      )}

      
    </div>
  );
};

export default PatientFicha; 