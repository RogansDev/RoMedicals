import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import patientService from '../services/patientService';
import appointmentService from '../services/appointmentService';
import api, { consultationTemplatesAPI } from '../config/api';
import toast from 'react-hot-toast';
import OverlaySelect from './OverlaySelect';
import { MeetingProvider, useMeeting, useParticipant, useTranscription } from '@videosdk.live/react-sdk';
import {
  MicIconActive,
  MicIconInactive,
  CameraIconActive,
  CameraIconInactive,
  ShareScreenIcon,
  ChatIcon,
  ClipIcon,
  SendArrowIcon,
  UserIcon,
  CloseXIcon
} from './icons/VideoCallIcons';
import { MicrophoneIcon, BrainIcon, DocumentIcon, AllergyIcon, ConditionsIcon, ArrowRightIcon, RipsStarIcon, RefreshIcon, CloseXIcon as CloseXIconRips } from './icons/AppIcons';

const MedicalConsultation = () => {
  const { patientId } = useParams();
  const [activeTab, setActiveTab] = useState('consulta');
  const [unlockedTabs, setUnlockedTabs] = useState(['consulta']); // Pestañas desbloqueadas
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({});
  
  // Estados de grabación
  const [recordingState, setRecordingState] = useState('idle'); // idle, recording, paused, processing, suggestions
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [testTranscript, setTestTranscript] = useState(''); // Para pruebas manuales
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef({ final: '', interim: '' });
  
  // Datos de diagnóstico
  const [ripsData, setRipsData] = useState({
    diagnosticoPrincipal: '',
    tipoDiagnostico: '',
    finalidadProcedimiento: '',
    finalidadConsulta: '',
    causaExterna: '',
    diagnosticoComplicacion: '',
    diagnosticoSecundario1: '',
    diagnosticoSecundario2: '',
    diagnosticoSecundario3: '',
    modalidadAtencion: '',
    ambitoAtencion: '',
    tipoServicio: '',
    grupoServicios: '',
    viaIngreso: ''
  });

  // Estados para CIE-10
  const [cie10Options, setCie10Options] = useState([]);
  const cie10OptionsRef = useRef([]); // Ref para acceso sincrónico en callbacks
  const [cie10Loading, setCie10Loading] = useState(false);
  const [cie10Error, setCie10Error] = useState('');
  const [secondaryCodes, setSecondaryCodes] = useState([]);
  const [secondarySelect, setSecondarySelect] = useState('');
  
  // Mantener ref actualizada cuando cambie cie10Options
  useEffect(() => {
    cie10OptionsRef.current = cie10Options;
  }, [cie10Options]);
  
  // Debug: Ver cambios en ripsData
  useEffect(() => {
    console.log('🔄 ripsData actualizado:', ripsData);
  }, [ripsData]);
  

  // Estado para la cita actual y modalidad
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [isTelemedicine, setIsTelemedicine] = useState(false);
  
  // Estados para VideoSDK
  const [meetingId, setMeetingId] = useState(null);
  const [token, setToken] = useState(null);
  const [isMeetingJoined, setIsMeetingJoined] = useState(false);
  const [isMeetingEnded, setIsMeetingEnded] = useState(false); // Estado para saber si la reunión fue finalizada
  const meetingInitializedRef = useRef(false); // Ref para evitar múltiples inicializaciones
  const hasJoinedMeetingRef = useRef(false); // Ref global para evitar múltiples join()
  
  // Estados para transcripción de VideoSDK
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [fullTranscript, setFullTranscript] = useState(''); // Transcripción completa acumulada
  const fullTranscriptRef = useRef(''); // Ref para mantener el valor actualizado
  
  // Estados para el chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatMessagesEndRef = useRef(null);
  
  // VideoSDK API Key - Debe configurarse en variables de entorno
  const VIDEO_SDK_API_KEY = process.env.REACT_APP_VIDEOSDK_API_KEY || 'YOUR_API_KEY_HERE';
  
  // Token de VideoSDK (temporal - en producción debe generarse desde el backend)
  const VIDEO_SDK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiIyNGE1ZGFkZS00NzI0LTQzZDUtYmQ0YS1lMGFiYzY1YmE5ZTciLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTcyNDk2NDY2OSwiZXhwIjoxNzI1NTY5NDY5fQ.yT6z5tMkqYgRDlSjCMT1WIcHbXDtwpv6jJfhL7VeNZI';
  
  // Función para verificar si el token está expirado
  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      const now = Math.floor(Date.now() / 1000);
      return now >= exp;
    } catch (error) {
      console.error('Error verificando token:', error);
      return true; // Si no se puede verificar, asumir que está expirado
    }
  };
  
  // Debug: Ver cambios en isTelemedicine (después de declarar el estado)
  // y notificar al Layout sobre el estado de telemedicina
  useEffect(() => {
    console.log('🔄 isTelemedicine cambió a:', isTelemedicine);
    console.log('🔄 currentAppointment:', currentAppointment);
    
    // Notificar al Layout sobre el estado de telemedicina
    window.dispatchEvent(new CustomEvent('telemedicine-status', {
      detail: { isActive: isTelemedicine && !!meetingId }
    }));
    
    // Limpiar al desmontar
    return () => {
      window.dispatchEvent(new CustomEvent('telemedicine-status', {
        detail: { isActive: false }
      }));
    };
  }, [isTelemedicine, currentAppointment, meetingId]);

  // Cargar datos del paciente y cita actual
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        setLoading(true);
        const patientData = await patientService.getPatientById(patientId);
        setPatient(patientData.patient);
        
        // Obtener la cita del día actual para este paciente
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        try {
          // Primero intentar buscar citas del día actual
          let appointmentsResponse = await appointmentService.getAppointments({
            patientId: patientId,
            dateFrom: todayStr,
            dateTo: todayStr
          });
          
          let appointments = appointmentsResponse.appointments || appointmentsResponse.data?.appointments || [];
          console.log('📅 Citas encontradas para el día:', appointments.length);
          console.log('📅 Detalles de citas del día:', appointments.map(apt => ({
            id: apt.id,
            date: apt.appointment_date || apt.appointmentDate,
            time: apt.appointment_time || apt.appointmentTime,
            modality: apt.modality,
            type: apt.type
          })));
          
          // Si no hay citas del día, buscar todas las citas del paciente (últimos 7 días)
          if (appointments.length === 0) {
            console.log('⚠️ No hay citas para el día actual, buscando en los últimos 7 días...');
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
            
            appointmentsResponse = await appointmentService.getAppointments({
              patientId: patientId,
              dateFrom: weekAgoStr,
              dateTo: todayStr
            });
            
            appointments = appointmentsResponse.appointments || appointmentsResponse.data?.appointments || [];
            console.log('📅 Citas encontradas en últimos 7 días:', appointments.length);
            console.log('📅 Detalles de citas de últimos 7 días:', appointments.map(apt => ({
              id: apt.id,
              date: apt.appointment_date || apt.appointmentDate,
              time: apt.appointment_time || apt.appointmentTime,
              modality: apt.modality,
              type: apt.type
            })));
          }
          
          // Obtener la cita más reciente
          if (appointments.length > 0) {
            // Ordenar por fecha y hora, más reciente primero
            const sortedAppointments = appointments.sort((a, b) => {
              const dateA = a.appointment_date || a.appointmentDate || '';
              const dateB = b.appointment_date || b.appointmentDate || '';
              const timeA = a.appointment_time || a.appointmentTime || '';
              const timeB = b.appointment_time || b.appointmentTime || '';
              
              const dateTimeA = `${dateA}T${timeA}`;
              const dateTimeB = `${dateB}T${timeB}`;
              
              return dateTimeB.localeCompare(dateTimeA); // Más reciente primero
            });
            
            console.log('📅 Citas ordenadas (más reciente primero):', sortedAppointments.map(apt => ({
              id: apt.id,
              date: apt.appointment_date || apt.appointmentDate,
              time: apt.appointment_time || apt.appointmentTime,
              modality: apt.modality,
              type: apt.type
            })));
            
            const latestAppointment = sortedAppointments[0];
            console.log('✅ Cita seleccionada (la más reciente):', {
              id: latestAppointment.id,
              date: latestAppointment.appointment_date || latestAppointment.appointmentDate,
              time: latestAppointment.appointment_time || latestAppointment.appointmentTime,
              modality: latestAppointment.modality,
              type: latestAppointment.type
            });
            setCurrentAppointment(latestAppointment);
            
            // Verificar si es telemedicina
            // Puede estar en el campo modality (principal), type, o en notes
            const rawModality = latestAppointment.modality || '';
            const rawType = latestAppointment.type || '';
            const rawNotes = latestAppointment.notes || '';
            
            const type = String(rawType).toLowerCase().trim();
            const modality = String(rawModality).toLowerCase().trim();
            const notes = String(rawNotes).toLowerCase().trim();
            
            console.log('🔍 Valores raw de la cita:', {
              rawModality,
              rawType,
              rawNotes,
              modalityLower: modality,
              typeLower: type
            });
            
            // Detectar telemedicina: el campo modality es el principal
            const isTelemed = modality === 'telemedicina' ||
                             type.includes('telemedicina') || 
                             notes.includes('telemedicina');
            
            console.log('🔍 Resultado de detección:', {
              'modality === "telemedicina"': modality === 'telemedicina',
              'type.includes("telemedicina")': type.includes('telemedicina'),
              'notes.includes("telemedicina")': notes.includes('telemedicina'),
              isTelemed
            });
            
            setIsTelemedicine(isTelemed);
            console.log('📋 Cita actual detectada:', {
              id: latestAppointment.id,
              type: latestAppointment.type,
              modality: latestAppointment.modality,
              modalityLower: modality,
              notes: latestAppointment.notes,
              isTelemedicina: isTelemed
            });
            console.log('📹 Estado isTelemedicine actualizado a:', isTelemed);
          } else {
            console.log('⚠️ No se encontraron citas para este paciente');
            setIsTelemedicine(false);
            setCurrentAppointment(null);
          }
        } catch (appointmentError) {
          console.warn('No se pudo cargar la cita actual:', appointmentError);
          setIsTelemedicine(false);
          setCurrentAppointment(null);
          // No es crítico, continuar sin cita
        }
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

  // Cargar plantillas de consulta
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await consultationTemplatesAPI.getAll();
        setTemplates(response.data || []);
      } catch (error) {
        console.error('Error cargando plantillas:', error);
      }
    };

    loadTemplates();
  }, []);

  // Cargar datos de plantilla seleccionada
  useEffect(() => {
    const loadTemplateData = async () => {
      if (!selectedTemplateId) {
        setSelectedTemplateData(null);
        setTemplateFormData({});
        return;
      }

      try {
        const response = await consultationTemplatesAPI.getById(selectedTemplateId);
        const template = response.data;
        setSelectedTemplateData(template);
        
        // Inicializar formulario con los campos de la plantilla
        const initialData = {};
        if (template.fields && Array.isArray(template.fields)) {
          template.fields.forEach(field => {
            initialData[field.id] = '';
          });
        }
        setTemplateFormData(initialData);
        setAiSuggestions({});
      } catch (error) {
        console.error('Error cargando plantilla:', error);
        toast.error('Error al cargar la plantilla seleccionada');
      }
    };

    loadTemplateData();
  }, [selectedTemplateId]);

  // Debug: Ver cambios en templateFormData
  useEffect(() => {
    console.log('📋 templateFormData actualizado:', templateFormData);
  }, [templateFormData]);

  // Cargar CIE-10 cuando se active la pestaña de diagnóstico
  useEffect(() => {
    const parseCie10Csv = (text) => {
      const lines = String(text || '').split(/\r?\n/);
      const opts = [];
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw) continue;
        // CSV separado por ;. Estructura: CODE;DESCRIPCION;[vacío]
        const parts = raw.split(';');
        const code = String(parts[0] || '').trim();
        const desc = String(parts[1] || '').trim();
        if (!code || !desc) continue;
        opts.push({ value: code, label: `${code} - ${desc}` });
      }
      return opts;
    };

    const tryFetch = async (urls) => {
      for (const url of urls) {
        try {
          const resp = await fetch(url, { cache: 'no-store' });
          if (resp.ok) {
            const txt = await resp.text();
            return txt;
          }
        } catch (_) {
          // intentar siguiente URL
        }
      }
      throw new Error('No se pudo cargar el archivo CIE-10');
    };

    const loadCie10 = async () => {
      if (activeTab !== 'diagnostico') return;
      if (cie10Options && cie10Options.length > 0) return;
      setCie10Loading(true);
      setCie10Error('');
      try {
        // Intentos: public root y posibles rutas alternativas
        const candidateUrls = [
          '/cie10.csv',
          '/assets/cie10.csv',
          '/public/cie10.csv',
          '/frontend/utils/cie10.csv',
          '/utils/cie10.csv'
        ];
        const text = await tryFetch(candidateUrls);
        const opts = parseCie10Csv(text);
        if (opts.length === 0) throw new Error('Archivo CIE-10 vacío o inválido');
        setCie10Options([{ value: '', label: 'Seleccione una opción' }, ...opts]);
      } catch (e) {
        setCie10Error(e?.message || 'Error cargando CIE-10');
      } finally {
        setCie10Loading(false);
      }
    };

    loadCie10();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Opciones para los selectores RIPS (desde RipsDetailsModal)
  const tipoDiagnosticoOptions = [
    { value: '', label: 'Seleccione una opción' },
    { value: 'impresion_diagnostica', label: 'Impresión diagnóstica' },
    { value: 'confirmado_nuevo', label: 'Confirmado nuevo' },
    { value: 'confirmado_repetido', label: 'Confirmado repetido' }
  ];

  const finalidadConsultaOptions = [
    { value: '', label: 'Seleccione una opción' },
    { value: 'valoracion_integral_promocion_mantenimiento', label: 'Valoración integral para la promoción y mantenimiento' },
    { value: 'deteccion_temprana_enfermedad_general', label: 'Detección temprana de enfermedad general' },
    { value: 'deteccion_temprana_enfermedad_laboral', label: 'Detección temprana de enfermedad laboral' },
    { value: 'diagnostico', label: 'Diagnóstico' },
    { value: 'tratamiento', label: 'Tratamiento' },
    { value: 'rehabilitacion', label: 'Rehabilitación' },
    { value: 'paliacion', label: 'Paliación' },
    { value: 'planificacion_familiar_anticoncepcion', label: 'Planificación familiar y anticoncepción' },
    { value: 'promocion_apoyo_lactancia_materna', label: 'Promoción y apoyo a la lactancia materna' },
    { value: 'atencion_basica_orientacion_familiar', label: 'Atención básica de orientación familiar' },
    { value: 'atencion_cuidado_preconcepcional', label: 'Atención para el cuidado preconcepcional' },
    { value: 'atencion_cuidado_prenatal', label: 'Atención para el cuidado prenatal' },
    { value: 'interrupcion_voluntaria_embarazo', label: 'Interrupción voluntaria del embarazo' },
    { value: 'atencion_parto_puerperio', label: 'Atención del parto y puerperio' },
    { value: 'atencion_seguimiento_recien_nacido', label: 'Atención para el seguimiento del recién nacido' },
    { value: 'modificacion_estetica_corporal', label: 'Modificación de la estética corporal (fines estéticos)' },
    { value: 'otra', label: 'Otra' }
  ];

  const finalidadProcedimientoOptions = [
    { value: '', label: 'Seleccione una opción' },
    { value: 'diagnostico', label: 'Diagnóstico' },
    { value: 'tratamiento', label: 'Tratamiento' },
    { value: 'proteccion_especifica', label: 'Protección específica' },
    { value: 'deteccion_temprana_enfermedad_general', label: 'Detección temprana de enfermedad general' },
    { value: 'deteccion_temprana_enfermedad_laboral', label: 'Detección temprana de enfermedad laboral' },
    { value: 'valoracion_integral_promocion_mantenimiento', label: 'Valoración integral para la promoción y mantenimiento' },
    { value: 'rehabilitacion', label: 'Rehabilitación' },
    { value: 'paliacion', label: 'Paliación' },
    { value: 'planificacion_familiar_anticoncepcion', label: 'Planificación familiar y anticoncepción' },
    { value: 'promocion_apoyo_lactancia_materna', label: 'Promoción y apoyo a la lactancia materna' },
    { value: 'atencion_basica_orientacion_familiar', label: 'Atención básica de orientación familiar' },
    { value: 'atencion_cuidado_preconcepcional', label: 'Atención para el cuidado preconcepcional' },
    { value: 'atencion_cuidado_prenatal', label: 'Atención para el cuidado prenatal' },
    { value: 'interrupcion_voluntaria_embarazo', label: 'Interrupción voluntaria del embarazo' },
    { value: 'atencion_parto_puerperio', label: 'Atención del parto y puerperio' },
    { value: 'atencion_seguimiento_recien_nacido', label: 'Atención para el seguimiento del recién nacido' },
    { value: 'preparacion_maternidad_paternidad', label: 'Preparación para la maternidad y la paternidad' },
    { value: 'promocion_actividad_fisica', label: 'Promoción de actividad física' },
    { value: 'promocion_cesacion_tabaquismo', label: 'Promoción de la cesación del tabaquismo' },
    { value: 'prevencion_consumo_sustancias_psicoactivas', label: 'Prevención del consumo de sustancias psicoactivas' },
    { value: 'promocion_alimentacion_saludable', label: 'Promoción de la alimentación saludable' },
    { value: 'promocion_derechos_sexuales_reproductivos', label: 'Promoción para el ejercicio de los derechos sexuales y derechos reproductivos' },
    { value: 'promocion_habilidades_para_la_vida', label: 'Promoción para el desarrollo de habilidades para la vida' },
    { value: 'promocion_estrategias_afrontamiento', label: 'Promoción para la construcción de estrategias de afrontamiento frente a sucesos vitales' },
    { value: 'promocion_sana_convivencia_tejido_social', label: 'Promoción de la sana convivencia y el tejido social' },
    { value: 'promocion_ambiente_seguro_cuidado', label: 'Promoción de un ambiente seguro y de cuidado y protección del ambiente' },
    { value: 'promocion_empoderamiento_derecho_salud', label: 'Promoción del empoderamiento para el ejercicio del derecho a la salud' },
    { value: 'promocion_practicas_crianza_cuidado_salud', label: 'Promoción para la adopción de prácticas de crianza y cuidado para la salud' },
    { value: 'promocion_capacidad_agencia_cuidado_salud', label: 'Promoción de la capacidad de la agencia y cuidado de la salud' },
    { value: 'desarrollo_habilidades_cognitivas', label: 'Desarrollo de habilidades cognitivas' },
    { value: 'intervencion_colectiva', label: 'Intervención colectiva' },
    { value: 'modificacion_estetica_corporal', label: 'Modificación de la estética corporal (fines estéticos)' },
    { value: 'otra', label: 'Otra' }
  ];

  const modalidadAtencionOptions = [
    { value: '', label: 'Seleccione una opción' },
    { value: 'telemedicina', label: 'Telemedicina' },
    { value: 'presencial', label: 'Presencial' }
  ];

  const ambitoAtencionOptions = [
    { value: '', label: 'Seleccione una opción' },
    { value: 'consulta_general', label: 'Consulta general' },
    { value: 'internacion', label: 'Internacion' }
  ];

  const tipoServicioOptions = [
    { value: '', label: 'Seleccione una opción' },
    { value: 'medicina_general', label: 'Medicina general' },
    { value: 'medicina_interna', label: 'Medicina interna' }
  ];

  const causaExternaGroups = [
    {
      label: 'Accidentes',
      options: [
        { value: 'accidente_trabajo', label: 'Accidente de trabajo' },
        { value: 'accidente_en_el_hogar', label: 'Accidente en el hogar' },
        { value: 'accidente_transito_origen_comun', label: 'Accidente de tránsito de origen común' },
        { value: 'accidente_transito_origen_laboral', label: 'Accidente de tránsito de origen laboral' },
        { value: 'accidente_entorno_educativo', label: 'Accidente en el entorno educativo' },
        { value: 'otro_accidente', label: 'Otro tipo de accidente' }
      ]
    },
    {
      label: 'Violencia / Sospecha / IVE',
      options: [
        { value: 'lesion_por_agresion', label: 'Lesión por agresión' },
        { value: 'lesion_auto_infligida', label: 'Lesión auto infligida' },
        { value: 'sospecha_violencia_fisica', label: 'Sospecha de violencia física' },
        { value: 'sospecha_violencia_psicologica', label: 'Sospecha de violencia psicológica' },
        { value: 'sospecha_violencia_sexual', label: 'Sospecha de violencia sexual' },
        { value: 'sospecha_negligencia_abandono', label: 'Sospecha de negligencia y abandono' },
        { value: 'ive_peligro_salud_vida', label: 'IVE relacionado con peligro a la Salud o vida de la mujer' },
        { value: 'ive_malformacion_incompatible_vida', label: 'IVE por malformación congénita incompatible con la vida' },
        { value: 'ive_violencia_sexual_incesto_inseminacion_no_consentida', label: 'IVE por violencia sexual, incesto o por inseminación artificial o transferencia de ovulo fecundado no consentida' }
      ]
    },
    {
      label: 'Salud pública y otros',
      options: [
        { value: 'evento_adverso_salud', label: 'Evento adverso en salud' },
        { value: 'enfermedad_general', label: 'Enfermedad general' },
        { value: 'enfermedad_laboral', label: 'Enfermedad laboral' },
        { value: 'promocion_mantenimiento_salud_intervenciones_individuales', label: 'Promoción y mantenimiento de la salud – intervenciones individuales' },
        { value: 'intervencion_colectiva', label: 'Intervención colectiva' },
        { value: 'atencion_poblacion_materno_perinatal', label: 'Atención de población materno perinatal' },
        { value: 'riesgo_ambiental', label: 'Riesgo ambiental' }
      ]
    },
    {
      label: 'Evento catastrófico / conflicto',
      options: [
        { value: 'evento_catastrofico_origen_natural', label: 'Evento catastrófico de origen natural' },
        { value: 'otros_eventos_catastroficos', label: 'Otros eventos Catastróficos' },
        { value: 'accidente_mina_antipersonal_map', label: 'Accidente de mina antipersonal – MAP' },
        { value: 'accidente_artefacto_explosivo_improvisado_aei', label: 'Accidente de Artefacto Explosivo Improvisado – AEI' },
        { value: 'accidente_municion_sin_explotar_muse', label: 'Accidente de Munición Sin Explotar- MUSE' },
        { value: 'otra_victima_conflicto_armado_colombiano', label: 'Otra víctima de conflicto armado colombiano' }
      ]
    }
  ];

  // Lista plana sin categorías, conservando los mismos nombres
  const causaExternaFlatOptions = causaExternaGroups.reduce((acc, group) => {
    return acc.concat(group.options);
  }, []);

  // Funciones para grabación
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      // Configurar análisis de audio para nivel
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Iniciar monitoreo de nivel de audio
      const monitorAudioLevel = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(average / 255, 1));
        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
      };
      monitorAudioLevel();
      
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
        chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await sendAudioToAI(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.start();
      setMediaRecorder(mediaRecorder);
      setRecordingState('recording');
      setRecordingTime(0);
      
      // Iniciar temporizador
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Iniciar Web Speech API si está disponible para transcripción en vivo
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        // Limpiar transcripción anterior
        transcriptRef.current = { final: '', interim: '' };
        setLiveTranscript('');
        setInterimTranscript('');
        
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.onresult = (event) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript + ' ';
            } else {
              interim += transcript + ' ';
            }
          }
          if (final) {
            transcriptRef.current.final = (transcriptRef.current.final + ' ' + final).trim();
            setLiveTranscript(transcriptRef.current.final);
          }
          transcriptRef.current.interim = interim.trim();
          setInterimTranscript(interim.trim());
        };
        recognition.onerror = (event) => {
          console.error('Error en reconocimiento de voz:', event.error);
        };
        recognition.onend = () => {
          // Cuando termina, asegurar que la transcripción final esté capturada
          if (transcriptRef.current.interim) {
            transcriptRef.current.final = (transcriptRef.current.final + ' ' + transcriptRef.current.interim).trim();
            transcriptRef.current.interim = '';
            setLiveTranscript(transcriptRef.current.final);
            setInterimTranscript('');
          }
        };
        recognitionRef.current = recognition;
        recognition.start();
      }
      
    } catch (error) {
      console.error('Error iniciando grabación:', error);
      toast.error('Error al iniciar la grabación');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && recordingState === 'recording') {
      mediaRecorder.pause();
      setRecordingState('paused');
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && recordingState === 'paused') {
      mediaRecorder.resume();
      setRecordingState('recording');
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Reanudar monitoreo de audio
      if (analyserRef.current) {
        const monitorAudioLevel = () => {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(average / 255, 1));
          animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
        };
        monitorAudioLevel();
      }
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder && (recordingState === 'recording' || recordingState === 'paused')) {
      setRecordingState('processing');
      setIsProcessing(true);
      
      // Detener reconocimiento de voz primero y esperar a que termine
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          // Dar tiempo para que se procese el último resultado
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          console.error('Error deteniendo reconocimiento:', e);
        }
      }
      
      // Asegurar que la transcripción interina se agregue a la final
      if (transcriptRef.current.interim) {
        transcriptRef.current.final = (transcriptRef.current.final + ' ' + transcriptRef.current.interim).trim();
        transcriptRef.current.interim = '';
        setLiveTranscript(transcriptRef.current.final);
        setInterimTranscript('');
      }
      
      // Detener grabación de audio
      mediaRecorder.stop();
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
    }
  };

  // Función para procesar transcripción de prueba manualmente
  const processTestTranscript = async () => {
    if (!testTranscript.trim()) {
      toast.error('Ingresa una transcripción de prueba');
      return;
    }
    
    setRecordingState('processing');
    setIsProcessing(true);
    
    // Simular el envío usando la transcripción de prueba
    transcriptRef.current.final = testTranscript.trim();
    transcriptRef.current.interim = '';
    
    await sendAudioToAI(null);
  };

  // Función para procesar la transcripción de VideoSDK y enviarla a la IA
  const processVideoSDKTranscript = async (transcript) => {
    if (!transcript || !transcript.trim()) {
      toast.error('No hay transcripción para procesar');
      return;
    }
    
    setRecordingState('processing');
    
    try {
      await sendTranscriptToAI(transcript.trim());
    } catch (error) {
      console.error('Error procesando transcripción de VideoSDK:', error);
      toast.error('Error al procesar la transcripción');
      setRecordingState('idle');
    }
  };

  // Función común para enviar transcripción a la IA
  const sendTranscriptToAI = async (transcript) => {
    console.log('📝 Enviando transcripción a la IA:', transcript.substring(0, 100) + '...');

    if (!transcript) {
      toast.error('No se captó transcripción. Vuelve a intentar.');
      setRecordingState('idle');
      setIsProcessing(false);
      return;
    }

    // Preparar resumen del paciente para la IA
    const patientSummary = patient ? {
      id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      birthDate: patient.birthDate,
      age: getPatientAge(),
      allergies: patient.allergies || null,
      conditions: typeof patient.conditions === 'string' ? patient.conditions : null,
      bloodType: patient.blood_type || null,
    } : null;

    const { data } = await api.post(
      '/ai/consultation/process-transcript',
      {
        transcript,
        templateId: selectedTemplateId,
        language: 'es',
        templateDef: selectedTemplateData,
        patientSummary,
      },
      { timeout: 120000 }
    );

    console.log('📋 Respuesta de la IA:', data);

    if (data.suggestions && typeof data.suggestions === 'object') {
      setAiSuggestions(data.suggestions);
      setRecordingState('suggestions');
      toast.success('Sugerencias de la IA generadas');
    } else {
      toast.error('No se recibieron sugerencias de la IA');
      setRecordingState('idle');
    }
  };

  const sendAudioToAI = async (audioBlob) => {
    try {
      // Usar el ref que tiene la transcripción acumulada
      const transcript = (transcriptRef.current.final && transcriptRef.current.final.trim())
        ? transcriptRef.current.final.trim()
        : (transcriptRef.current.interim && transcriptRef.current.interim.trim())
          ? transcriptRef.current.interim.trim()
          : '';

      console.log('📝 Transcripción capturada:', transcript);
      console.log('📊 Estado del ref:', transcriptRef.current);

      if (!transcript) {
        toast.error('No se captó transcripción. Vuelve a intentar o permite el micrófono.');
        setRecordingState('idle');
        setIsProcessing(false);
        return;
      }

      // Cargar códigos CIE-10 si no están cargados
      let cie10List = [];
      if (cie10Options.length === 0 || (cie10Options.length === 1 && cie10Options[0].value === '')) {
        try {
          const candidateUrls = [
            '/cie10.csv',
            '/assets/cie10.csv',
            '/public/cie10.csv',
            '/frontend/utils/cie10.csv',
            '/utils/cie10.csv'
          ];
          
          for (const url of candidateUrls) {
            try {
              const resp = await fetch(url, { cache: 'no-store' });
              if (resp.ok) {
                const text = await resp.text();
                const lines = String(text || '').split(/\r?\n/);
                for (const line of lines) {
                  if (!line) continue;
                  const parts = line.split(';');
                  const code = String(parts[0] || '').trim();
                  const desc = String(parts[1] || '').trim();
                  if (code && desc) {
                    cie10List.push({ code, description: desc });
                  }
                }
                break;
              }
            } catch (_) {
              continue;
            }
          }
        } catch (e) {
          console.warn('No se pudo cargar CIE-10 para enviar a la IA:', e);
        }
      } else {
        // Usar los códigos ya cargados
        cie10List = cie10Options
          .filter(opt => opt.value && opt.value !== '')
          .map(opt => {
            // Extraer código y descripción del label "CODE - DESCRIPTION"
            const match = opt.label.match(/^([A-Z0-9.]+)\s*-\s*(.+)$/);
            if (match) {
              return { code: match[1], description: match[2] };
            }
            return { code: opt.value, description: opt.label };
          });
      }

      // Limitar códigos CIE-10 para no exceder el payload (máximo 500)
      const limitedCie10List = cie10List.slice(0, 500);
      console.log(`📋 Enviando ${limitedCie10List.length} códigos CIE-10 a la IA (de ${cie10List.length} disponibles)`);

      // Preparar resumen del paciente para la IA
      const patientSummary = patient ? {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        birthDate: patient.birthDate,
        age: getPatientAge(),
        allergies: patient.allergies || null,
        conditions: typeof patient.conditions === 'string' ? patient.conditions : null,
        bloodType: patient.blood_type || null,
      } : null;

      const { data } = await api.post(
        '/ai/consultation/process-transcript',
        {
          transcript,
          templateId: selectedTemplateId,
          language: 'es',
          templateDef: selectedTemplateData,
          patientSummary,
          cie10Codes: limitedCie10List // Enviar listado limitado de códigos CIE-10
        },
        { timeout: 120000 } // Aumentar timeout a 2 minutos
      );

      // Cargar sugerencias (NO autocompletar campos automáticamente)
      if (data.suggestions) setAiSuggestions(data.suggestions);

      // Cargar RIPS y mapear valores correctamente
      console.log('🔍 Verificando datos RIPS en respuesta:', {
        hasRips: !!data.rips,
        ripsData: data.rips,
        fullResponse: data
      });
      
      if (data.rips) {
        // Usar ref para obtener las opciones CIE-10 actualizadas (evita closure stale)
        const currentCie10Options = cie10OptionsRef.current;
        
        console.log('📋 Datos RIPS recibidos de la IA:', JSON.stringify(data.rips, null, 2));
        console.log('📊 Estado actual de ripsData antes de mapear:', ripsData);
        console.log('📋 CIE-10 options disponibles (desde ref):', currentCie10Options.length);
        
        // Verificar que los códigos CIE-10 estén cargados
        if (currentCie10Options.length === 0 || (currentCie10Options.length === 1 && currentCie10Options[0].value === '')) {
          console.warn('⚠️ CIE-10 no están cargados aún. Cargando...');
          // Intentar cargar CIE-10 si no están cargados
          try {
            const candidateUrls = [
              '/cie10.csv',
              '/assets/cie10.csv',
              '/public/cie10.csv',
              '/frontend/utils/cie10.csv',
              '/utils/cie10.csv'
            ];
            
            for (const url of candidateUrls) {
              try {
                const resp = await fetch(url, { cache: 'no-store' });
                if (resp.ok) {
                  const text = await resp.text();
                  const lines = String(text || '').split(/\r?\n/);
                  const opts = [];
                  for (const line of lines) {
                    if (!line) continue;
                    const parts = line.split(';');
                    const code = String(parts[0] || '').trim();
                    const desc = String(parts[1] || '').trim();
                    if (code && desc) {
                      opts.push({ value: code, label: `${code} - ${desc}` });
                    }
                  }
                  if (opts.length > 0) {
                    const loadedOptions = [{ value: '', label: 'Seleccione una opción' }, ...opts];
                    setCie10Options(loadedOptions);
                    cie10OptionsRef.current = loadedOptions; // Actualizar ref inmediatamente
                    console.log(`✅ CIE-10 cargados: ${opts.length} códigos`);
                    break;
                  }
                }
              } catch (_) {
                continue;
              }
            }
          } catch (e) {
            console.error('Error cargando CIE-10:', e);
          }
        }
        
        // Función para mapear valores de texto a valores de selector
        const mapRipsValue = (value, options) => {
          if (!value || value === '' || value === '-') return '';
          
          // Si el valor ya es un valor válido del selector, usarlo directamente
          const exactMatch = options.find(opt => opt.value === value);
          if (exactMatch) return value;
          
          // Buscar coincidencia case-insensitive
          const caseInsensitiveMatch = options.find(opt => 
            opt.value.toLowerCase() === value.toLowerCase() ||
            opt.label.toLowerCase() === value.toLowerCase()
          );
          if (caseInsensitiveMatch) return caseInsensitiveMatch.value;
          
          // Buscar coincidencia parcial en el label
          const partialMatch = options.find(opt => 
            opt.label.toLowerCase().includes(value.toLowerCase()) ||
            value.toLowerCase().includes(opt.label.toLowerCase())
          );
          if (partialMatch) return partialMatch.value;
          
          console.warn('⚠️ Valor RIPS no encontrado en opciones:', value);
          return '';
        };
        
        // Función para mapear códigos CIE-10
        const mapCie10Code = (code) => {
          if (!code || code === '' || code === '-') return '';
          
          // Normalizar el código recibido (eliminar espacios, convertir a mayúsculas)
          const normalizedInput = code.trim().toUpperCase().replace(/\s+/g, '');
          
          // Función auxiliar para normalizar códigos CIE-10
          // Los códigos CIE-10 tienen formato: Letra + 2 dígitos + . + 1-2 dígitos (ej: L63.9, L21.9)
          const normalizeCie10Code = (cieCode) => {
            // Eliminar espacios y convertir a mayúsculas
            let normalized = cieCode.trim().toUpperCase().replace(/\s+/g, '');
            
            // Si tiene formato LXXX (sin punto), intentar agregar el punto
            // Ejemplo: L639 -> L63.9, L219 -> L21.9
            const match = normalized.match(/^([A-Z])(\d{2})(\d{1,2})$/);
            if (match) {
              const [, letter, twoDigits, lastDigits] = match;
              normalized = `${letter}${twoDigits}.${lastDigits}`;
            }
            
            return normalized;
          };
          
          const normalizedCode = normalizeCie10Code(normalizedInput);
          
          // Usar las opciones CIE-10 actualizadas desde ref
          const optionsToSearch = cie10OptionsRef.current;
          
          // 1. Buscar coincidencia exacta
          const exactMatch = optionsToSearch.find(opt => {
            const optValue = opt.value.trim().toUpperCase();
            return optValue === normalizedCode || optValue === normalizedInput;
          });
          if (exactMatch) {
            console.log(`✅ Código encontrado (exacto): ${code} -> ${exactMatch.value}`);
            return exactMatch.value;
          }
          
          // 2. Buscar coincidencia normalizada (con/sin punto)
          const normalizedMatch = optionsToSearch.find(opt => {
            const optCode = normalizeCie10Code(opt.value);
            return optCode === normalizedCode || 
                   optCode.replace(/\./g, '') === normalizedCode.replace(/\./g, '') ||
                   optCode.replace(/\./g, '') === normalizedInput.replace(/\./g, '');
          });
          if (normalizedMatch) {
            console.log(`✅ Código encontrado (normalizado): ${code} -> ${normalizedMatch.value}`);
            return normalizedMatch.value;
          }
          
          // 3. Buscar coincidencia parcial (buscar el código base)
          const baseCode = normalizedCode.split('.')[0]; // Ej: L63.9 -> L63
          const partialMatch = optionsToSearch.find(opt => {
            const optCode = normalizeCie10Code(opt.value);
            const optBase = optCode.split('.')[0];
            return optBase === baseCode || optCode.includes(normalizedCode) || normalizedCode.includes(optCode);
          });
          if (partialMatch) {
            console.log(`✅ Código encontrado (parcial): ${code} -> ${partialMatch.value}`);
            return partialMatch.value;
          }
          
          // 4. Buscar por descripción si el código viene con descripción (ej: "L639 - ALOPECIA AREATA")
          const codeWithDesc = normalizedInput.match(/^([A-Z]\d+\.?\d*)/);
          if (codeWithDesc) {
            const extractedCode = normalizeCie10Code(codeWithDesc[1]);
            const descMatch = optionsToSearch.find(opt => {
              const optCode = normalizeCie10Code(opt.value);
              return optCode === extractedCode || 
                     optCode.replace(/\./g, '') === extractedCode.replace(/\./g, '');
            });
            if (descMatch) {
              console.log(`✅ Código encontrado (extraído de descripción): ${code} -> ${descMatch.value}`);
              return descMatch.value;
            }
          }
          
          console.warn('⚠️ Código CIE-10 no encontrado:', code, '(normalizado:', normalizedCode + ')');
          return '';
        };
        
        // Mapear cada campo RIPS
        const mappedRips = {
          diagnosticoPrincipal: mapCie10Code(data.rips.diagnosticoPrincipal),
          tipoDiagnostico: mapRipsValue(data.rips.tipoDiagnostico, tipoDiagnosticoOptions),
          finalidadProcedimiento: mapRipsValue(data.rips.finalidadProcedimiento, finalidadProcedimientoOptions),
          finalidadConsulta: mapRipsValue(data.rips.finalidadConsulta, finalidadConsultaOptions),
          causaExterna: mapRipsValue(data.rips.causaExterna, [{ value: '', label: '' }, ...causaExternaFlatOptions]),
          diagnosticoComplicacion: mapCie10Code(data.rips.diagnosticoComplicacion),
          modalidadAtencion: mapRipsValue(data.rips.modalidadAtencion, modalidadAtencionOptions),
          ambitoAtencion: mapRipsValue(data.rips.ambitoAtencion, ambitoAtencionOptions),
          tipoServicio: mapRipsValue(data.rips.tipoServicio, tipoServicioOptions),
          diagnosticoSecundario1: mapCie10Code(data.rips.diagnosticoSecundario1),
          diagnosticoSecundario2: mapCie10Code(data.rips.diagnosticoSecundario2),
          diagnosticoSecundario3: mapCie10Code(data.rips.diagnosticoSecundario3)
        };
        
        console.log('✅ Datos RIPS mapeados:', JSON.stringify(mappedRips, null, 2));
        console.log('📊 Valores mapeados individuales:', {
          diagnosticoPrincipal: mappedRips.diagnosticoPrincipal,
          tipoDiagnostico: mappedRips.tipoDiagnostico,
          finalidadConsulta: mappedRips.finalidadConsulta,
          causaExterna: mappedRips.causaExterna
        });
        
        // Aplicar los datos mapeados al estado
        setRipsData(prev => {
          const updated = { ...prev, ...mappedRips };
          console.log('🔄 Actualizando ripsData:', {
            anterior: prev,
            nuevo: updated,
            cambios: mappedRips
          });
          return updated;
        });
        
        // Manejar diagnósticos secundarios como array
        const sec = [
          mappedRips.diagnosticoSecundario1 || '',
          mappedRips.diagnosticoSecundario2 || '',
          mappedRips.diagnosticoSecundario3 || ''
        ].filter(Boolean);
        const uniq = Array.from(new Set(sec));
        console.log('📋 Diagnósticos secundarios procesados:', { sec, uniq });
        setSecondaryCodes(uniq);
        
        // Verificar que los datos se aplicaron correctamente después de un pequeño delay
        setTimeout(() => {
          console.log('✅ Verificación final - ripsData después de actualizar:', ripsData);
        }, 100);
        
        toast.success('Datos RIPS cargados automáticamente');
      } else {
        console.warn('⚠️ No se recibieron datos RIPS en la respuesta:', data);
      }

      setRecordingState('suggestions');
      setIsProcessing(false);
        toast.success('Audio procesado exitosamente');
      
    } catch (error) {
      console.error('Error enviando audio a IA:', error);
      
      // Extraer mensaje de error más descriptivo
      let errorMessage = 'Error al procesar el audio';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        // Si hay detalles adicionales, mostrarlos
        if (error.response.data.detail) {
          console.error('Detalle del error:', error.response.data.detail);
        }
        if (error.response.data.error) {
          console.error('Error técnico:', error.response.data.error);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { duration: 5000 });
      setRecordingState('idle');
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const addSuggestion = (fieldId, value) => {
    console.log('➕ Añadiendo sugerencia:', { fieldId, value });
    
    // Verificar si el campo existe en la plantilla
    const field = selectedTemplateData?.fields?.find(f => f.id === fieldId);
    if (!field) {
      console.warn('⚠️ Campo no encontrado en plantilla:', fieldId);
      toast.error(`Error: Campo "${fieldId}" no existe en la plantilla`);
      return;
    }
    
    let finalValue = value;
    let showWarning = false;
    
    // Si es un campo de tipo select, validar que el valor esté en las opciones
    if (field.type === 'select' || field.type === 'selection') {
      const options = field.options || [];
      const valueTrimmed = value.trim();
      
      // Buscar coincidencia exacta (case-sensitive)
      let exactMatch = options.find(opt => opt === valueTrimmed);
      
      // Si no hay coincidencia exacta, buscar coincidencia case-insensitive
      if (!exactMatch) {
        exactMatch = options.find(opt => opt.toLowerCase() === valueTrimmed.toLowerCase());
      }
      
      // Si aún no hay coincidencia, buscar coincidencia parcial
      if (!exactMatch) {
        exactMatch = options.find(opt => 
          opt.toLowerCase().includes(valueTrimmed.toLowerCase()) || 
          valueTrimmed.toLowerCase().includes(opt.toLowerCase())
        );
      }
      
      if (exactMatch) {
        finalValue = exactMatch; // Usar el valor exacto de la opción
        console.log('✅ Coincidencia encontrada:', { sugerido: value, seleccionado: exactMatch });
      } else {
        // No se encontró coincidencia
        showWarning = true;
        const optionsList = options.length > 0 
          ? options.join(', ') 
          : 'No hay opciones disponibles';
        
        toast.error(
          `El valor "${value}" no está en las opciones disponibles para "${field.name}". Opciones: ${optionsList}`,
          { duration: 6000 }
        );
        console.warn('⚠️ Valor no encontrado en opciones:', { 
          valorSugerido: value, 
          opcionesDisponibles: options 
        });
        return; // No añadir el valor si no coincide
      }
    }
    
    // Actualizar el formulario
    setTemplateFormData(prev => {
      const updated = {
      ...prev,
        [fieldId]: finalValue
      };
      console.log('📝 Formulario actualizado:', updated);
      console.log('📋 Valor específico del campo:', updated[fieldId]);
      return updated;
    });
    
    // Eliminar la sugerencia de la lista y verificar si quedan más
    setAiSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[fieldId];
      
      // Si ya no quedan más sugerencias, volver al estado idle para mostrar el botón de grabar
      const remainingSuggestions = Object.keys(newSuggestions);
      if (remainingSuggestions.length === 0) {
        setTimeout(() => {
          setRecordingState(prevState => {
            // Solo cambiar a idle si estamos en estado suggestions
            return prevState === 'suggestions' ? 'idle' : prevState;
          });
        }, 100);
      }
      
      return newSuggestions;
    });
    
    // Scroll al campo añadido después de un pequeño delay
    setTimeout(() => {
      const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Resaltar el campo brevemente
        fieldElement.classList.add('ring-2', 'ring-blue-500');
        setTimeout(() => {
          fieldElement.classList.remove('ring-2', 'ring-blue-500');
        }, 2000);
      }
    }, 100);
    
    if (!showWarning) {
      toast.success(`Campo "${field.name}" añadido correctamente`);
    }
  };

  const addAllSuggestions = () => {
    const newFormData = { ...templateFormData };
    let addedCount = 0;
    let skippedCount = 0;
    const skippedFields = [];
    
    Object.keys(aiSuggestions).forEach(fieldId => {
      const field = selectedTemplateData?.fields?.find(f => f.id === fieldId);
      if (!field) {
        skippedCount++;
        return;
      }
      
      let value = aiSuggestions[fieldId];
      
      // Si es un campo de tipo select, validar que el valor esté en las opciones
      if (field.type === 'select' || field.type === 'selection') {
        const options = field.options || [];
        const valueTrimmed = value.trim();
        
        // Buscar coincidencia exacta (case-sensitive)
        let exactMatch = options.find(opt => opt === valueTrimmed);
        
        // Si no hay coincidencia exacta, buscar coincidencia case-insensitive
        if (!exactMatch) {
          exactMatch = options.find(opt => opt.toLowerCase() === valueTrimmed.toLowerCase());
        }
        
        // Si aún no hay coincidencia, buscar coincidencia parcial
        if (!exactMatch) {
          exactMatch = options.find(opt => 
            opt.toLowerCase().includes(valueTrimmed.toLowerCase()) || 
            valueTrimmed.toLowerCase().includes(opt.toLowerCase())
          );
        }
        
        if (exactMatch) {
          value = exactMatch; // Usar el valor exacto de la opción
          newFormData[fieldId] = value;
          addedCount++;
        } else {
          skippedCount++;
          skippedFields.push(field.name);
        }
      } else {
        // Para campos que no son select, añadir directamente
        newFormData[fieldId] = value;
        addedCount++;
      }
    });
    
    setTemplateFormData(newFormData);
    setAiSuggestions({});
    setRecordingState('idle');
    
    if (skippedCount > 0) {
      toast.error(
        `${addedCount} campo(s) añadido(s). ${skippedCount} campo(s) omitido(s) (valores no válidos para campos select): ${skippedFields.join(', ')}`,
        { duration: 6000 }
      );
    } else {
      toast.success(`${addedCount} campo(s) añadido(s) correctamente`);
    }
  };

  const handleTemplateFieldChange = (fieldId, value) => {
    setTemplateFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Componente para mostrar sugerencia de IA debajo de un campo
  const renderAISuggestion = (fieldId) => {
    const suggestion = aiSuggestions[fieldId];
    if (!suggestion) return null;

    return (
      <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start justify-between gap-3">
        <p className="text-sm text-gray-700 flex-1">{suggestion}</p>
        <button
          onClick={() => addSuggestion(fieldId, suggestion)}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
        >
          + Añadir
        </button>
      </div>
    );
  };

  const renderTemplateField = (field) => {
    const value = templateFormData[field.id] || '';

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} data-field-id={field.id} className="space-y-2 transition-all duration-300">
            <label className="block text-sm font-medium text-gray-700">
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleTemplateFieldChange(field.id, e.target.value)}
              placeholder="Ingresa tu información o deja que lo haga la IA"
              required={field.required}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
            {renderAISuggestion(field.id)}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} data-field-id={field.id} className="space-y-2 transition-all duration-300">
            <label className="block text-sm font-medium text-gray-700">
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleTemplateFieldChange(field.id, e.target.value)}
              placeholder="Ingresa tu información o deja que lo haga la IA"
              required={field.required}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-300"
            />
            {renderAISuggestion(field.id)}
          </div>
        );

      case 'select':
      case 'selection':
        return (
          <div key={field.id} data-field-id={field.id} className="space-y-2 transition-all duration-300">
            <label className="block text-sm font-medium text-gray-700">
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleTemplateFieldChange(field.id, e.target.value)}
              required={field.required}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            >
              <option value="">Selecciona una opción</option>
              {field.options && field.options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {renderAISuggestion(field.id)}
          </div>
        );

      default:
        return null;
    }
  };

  // Validaciones para cada pestaña
  const validateTab = (tabId) => {
    switch (tabId) {
      case 'consulta':
        // Si no hay plantilla seleccionada, no se puede continuar
        if (!selectedTemplateId) {
          return false;
        }
        // Si hay plantilla pero no hay campos, permitir continuar
        if (!selectedTemplateData?.fields || selectedTemplateData.fields.length === 0) {
          return true;
        }
        // Validar que todos los campos requeridos de la plantilla estén llenos
        const requiredFields = selectedTemplateData.fields.filter(f => f.required);
        if (requiredFields.length === 0) {
          return true;
        }
        return requiredFields.every(field => {
          const value = templateFormData[field.id];
          return value !== undefined && value !== null && value !== '';
        });
      case 'diagnostico':
        // Validar campos mínimos de RIPS
        return !!(
          ripsData.diagnosticoPrincipal &&
          ripsData.tipoDiagnostico &&
          ripsData.finalidadConsulta &&
          ripsData.finalidadProcedimiento &&
          ripsData.causaExterna &&
          ripsData.modalidadAtencion &&
          ripsData.ambitoAtencion &&
          ripsData.tipoServicio
        );
      case 'finalizar':
        return true; // La última pestaña siempre es válida si llegamos aquí
      default:
        return false;
    }
  };

  // Función para continuar a la siguiente pestaña
  const handleContinue = () => {
    if (!validateTab(activeTab)) {
      toast.error('Por favor completa todos los campos requeridos antes de continuar');
      return;
    }

    const tabOrder = ['consulta', 'diagnostico', 'finalizar'];
    const currentIndex = tabOrder.indexOf(activeTab);
    
    if (currentIndex < tabOrder.length - 1) {
      const nextTab = tabOrder[currentIndex + 1];
      setActiveTab(nextTab);
      // Desbloquear la siguiente pestaña
      if (!unlockedTabs.includes(nextTab)) {
        setUnlockedTabs(prev => [...prev, nextTab]);
      }
    }
  };

  // Función para cambiar de pestaña (solo si está desbloqueada)
  const handleTabChange = (tabId) => {
    if (unlockedTabs.includes(tabId)) {
      setActiveTab(tabId);
    } else {
      toast.error('Debes completar los pasos anteriores antes de acceder a esta sección');
    }
  };

  const finalizarConsulta = () => {
    console.log('Datos de la consulta:', {
      paciente: patient,
      plantilla: selectedTemplateId,
      plantillaData: selectedTemplateData,
      datosPlantilla: templateFormData,
      rips: ripsData
    });
    
    toast.success('Consulta finalizada exitosamente');
  };

  // Funciones para VideoSDK
  const generateToken = async () => {
    try {
      // Generar token desde el backend (más seguro)
      console.log('🔑 Solicitando token de VideoSDK desde:', api.defaults.baseURL + '/videosdk/token');
      const response = await api.post('/videosdk/token');
      
      if (response.data && response.data.token) {
        setToken(response.data.token);
        console.log('✅ Token de VideoSDK generado desde el backend');
        return response.data.token;
      } else {
        throw new Error('No se recibió un token válido del servidor');
      }
    } catch (error) {
      console.error('Error generando token desde backend:', error);
      
      // Fallback: intentar con token predefinido si existe (solo para desarrollo)
      if (VIDEO_SDK_TOKEN && VIDEO_SDK_TOKEN !== 'YOUR_TOKEN_HERE') {
        if (!isTokenExpired(VIDEO_SDK_TOKEN)) {
          console.warn('⚠️ Usando token predefinido como fallback');
          setToken(VIDEO_SDK_TOKEN);
          return VIDEO_SDK_TOKEN;
        } else {
          console.warn('⚠️ El token predefinido ha expirado');
        }
      }
      
      toast.error('Error al inicializar la videollamada. Por favor, intenta de nuevo.');
      return null;
    }
  };

  const createMeeting = async () => {
    try {
      const authToken = token || await generateToken();
      if (!authToken) {
        toast.error('No se pudo obtener el token de autenticación');
        return;
      }

      console.log('🔑 Token obtenido:', authToken.substring(0, 50) + '...');
      
      // Crear sala desde el backend (más seguro)
      try {
        const response = await api.post('/videosdk/rooms', { token: authToken });
        
        if (response.data && response.data.roomId) {
          setMeetingId(response.data.roomId);
          // Actualizar el token si el backend devuelve uno nuevo
          if (response.data.token) {
            setToken(response.data.token);
          }
          console.log('✅ Sala creada desde backend:', response.data.roomId);
          toast.success('Sala de videollamada creada exitosamente');
          return response.data.roomId;
        } else {
          throw new Error('No se recibió roomId en la respuesta del servidor');
        }
      } catch (apiError) {
        // Fallback: intentar crear sala directamente desde el frontend
        console.warn('⚠️ Error creando sala desde backend, intentando directamente:', apiError);
        
        const response = await fetch('https://api.videosdk.live/v2/rooms', {
          method: 'POST',
          headers: {
            'authorization': authToken, // VideoSDK espera 'authorization' en minúscula, sin 'Bearer'
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // Body vacío según el ejemplo funcional
        });

        console.log('📡 Respuesta del servidor:', response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
          console.error('❌ Error del servidor:', errorData);
          
          if (response.status === 401) {
            toast.error('Token de autenticación inválido o expirado. Por favor, actualiza el token.');
          } else {
            toast.error(`Error al crear la sala: ${errorData.message || response.statusText}`);
          }
          return null;
        }

        const data = await response.json();
        console.log('✅ Sala creada:', data);
        
        if (data.roomId) {
          setMeetingId(data.roomId);
          toast.success('Sala de videollamada creada exitosamente');
          return data.roomId;
        } else {
          throw new Error('No se recibió roomId en la respuesta');
        }
      }
    } catch (error) {
      console.error('Error creando meeting:', error);
      toast.error('Error al crear la sala de videollamada: ' + error.message);
      return null;
    }
  };

  // Inicializar meeting cuando es telemedicina (solo una vez)
  useEffect(() => {
    if (isTelemedicine && !meetingId && !meetingInitializedRef.current) {
      meetingInitializedRef.current = true; // Marcar como inicializado
      
      console.log('🚀 Inicializando telemedicina...');
      console.log('   - isTelemedicine:', isTelemedicine);
      console.log('   - meetingId:', meetingId);
      console.log('   - token actual:', token ? 'existe' : 'null');
      
      // Primero obtener el token, luego crear el meeting
      const initializeMeeting = async () => {
        console.log('📞 Llamando a generateToken...');
        const authToken = token || await generateToken();
        console.log('🔑 Token obtenido:', authToken ? authToken.substring(0, 30) + '...' : 'NULL');
        
        if (authToken && !meetingId) {
          console.log('📹 Creando meeting...');
          await createMeeting();
        } else {
          console.error('❌ No se pudo obtener token o meetingId ya existe');
        }
      };
      
      initializeMeeting();
    }
  }, [isTelemedicine]);

  // Componente interno para el video del participante
  const ParticipantVideo = ({ participantId }) => {
    const { webcamStream, webcamOn, displayName, micOn, isLocal, micStream } = useParticipant(participantId);
    const webcamRef = useRef(null);
    const audioRef = useRef(null);

    // Manejar el stream de video
    useEffect(() => {
      console.log(`📹 ParticipantVideo [${participantId}]:`, {
        webcamOn,
        hasStream: !!webcamStream,
        hasTrack: webcamStream?.track ? true : false,
        displayName,
        isLocal
      });
      
      if (webcamStream && webcamRef.current) {
        const mediaStream = new MediaStream();
        if (webcamStream.track) {
          mediaStream.addTrack(webcamStream.track);
          webcamRef.current.srcObject = mediaStream;
          
          // Intentar reproducir el video
          webcamRef.current.play().catch(err => {
            console.warn('Error al reproducir video:', err);
          });
        }
      }
    }, [webcamStream, webcamOn, participantId, displayName, isLocal]);

    // Manejar el stream de audio (solo para participantes remotos)
    useEffect(() => {
      if (isLocal || !audioRef.current) return;
      
      const setupAudio = () => {
        if (micStream && micStream.track) {
          console.log(`🔊 Configurando audio para [${participantId}]:`, {
            micOn,
            trackEnabled: micStream.track.enabled,
            trackReadyState: micStream.track.readyState
          });
          
          const audioMediaStream = new MediaStream();
          audioMediaStream.addTrack(micStream.track);
          
          // Solo actualizar si es diferente
          if (audioRef.current.srcObject !== audioMediaStream) {
            audioRef.current.srcObject = audioMediaStream;
          }
          
          // Asegurar que no esté silenciado
          audioRef.current.muted = false;
          audioRef.current.volume = 1.0;
          
          // Intentar reproducir el audio con retry
          const playAudio = () => {
            if (audioRef.current) {
              audioRef.current.play()
                .then(() => {
                  console.log(`✅ Audio reproduciéndose para [${participantId}]`);
                })
                .catch(err => {
                  console.warn(`⚠️ Error al reproducir audio [${participantId}]:`, err);
                  // Reintentar después de un pequeño delay
                  setTimeout(playAudio, 500);
                });
            }
          };
          
          playAudio();
        }
      };
      
      // Ejecutar setup inmediatamente y también cuando micOn cambie
      setupAudio();
      
      // También escuchar cuando el track se habilite
      if (micStream?.track) {
        const handleTrackEnabled = () => {
          console.log(`🎤 Track habilitado para [${participantId}]`);
          setupAudio();
        };
        micStream.track.addEventListener('unmute', handleTrackEnabled);
        return () => {
          micStream.track.removeEventListener('unmute', handleTrackEnabled);
        };
      }
    }, [micStream, micOn, isLocal, participantId]);

    if (!webcamOn) {
      return (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm">{displayName || 'Participante'}</p>
            {!micOn && <p className="text-xs mt-2">🔇 Micrófono silenciado</p>}
          </div>
          {/* Audio element para participantes remotos sin video */}
          {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={webcamRef}
          autoPlay
          playsInline
          muted={isLocal} // Silenciar el video local para evitar eco
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {/* Audio element separado para participantes remotos */}
        {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      </div>
    );
  };

  // Componente interno para los controles de la reunión
  const MeetingControls = () => {
    const { join, leave, end, toggleMic, toggleWebcam, micOn, webcamOn } = useMeeting();
    
    // Usar useTranscription para las funciones de transcripción (según documentación VideoSDK)
    const { startTranscription, stopTranscription } = useTranscription({
      onTranscriptionStateChanged: (data) => {
        console.log('📝 Estado de transcripción cambiado:', data);
        const { status } = data;
        // Solo actualizar el estado, el procesamiento se hace en el botón
        if (status === 'TRANSCRIPTION_STARTED' || status === 'TRANSCRIPTION_STARTING') {
          setIsTranscribing(true);
          if (status === 'TRANSCRIPTION_STARTED') {
            toast.success('Transcripción iniciada');
          }
        } else if (status === 'TRANSCRIPTION_STOPPED' || status === 'TRANSCRIPTION_STOPPING') {
          if (status === 'TRANSCRIPTION_STOPPED') {
            console.log('🛑 Transcripción detenida (evento recibido)');
            setIsTranscribing(false);
            toast('Transcripción detenida', { icon: 'ℹ️' });
          }
        }
      },
      onTranscriptionText: (data) => {
        console.log('📝 Texto de transcripción recibido (RAW):', JSON.stringify(data));
        console.log('📝 Tipo de data:', typeof data);
        console.log('📝 Keys de data:', data ? Object.keys(data) : 'data es null/undefined');
        
        // Intentar diferentes formas de acceder a los datos
        let text = null;
        let participantName = null;
        let type = null;
        
        if (data) {
          // Intentar diferentes estructuras posibles
          text = data.text || data.message || data.transcript || data.transcription;
          participantName = data.participantName || data.participant || data.speaker || data.name;
          type = data.type || data.kind || data.status;
        }
        
        console.log('📝 Valores extraídos:', { text, participantName, type });
        
        // Acumular TODOS los textos (parciales y finales) en el ref
        if (text && text.trim()) {
          const formattedText = `[${participantName || 'Participante'}]: ${text}\n`;
          setFullTranscript(prev => {
            const newValue = prev + formattedText;
            fullTranscriptRef.current = newValue; // Actualizar ref también
            console.log('📝 Transcripción acumulada. Total:', newValue.length, 'caracteres');
            console.log('📝 Último fragmento:', formattedText.substring(0, 100));
            return newValue;
          });
        } else {
          console.log('⚠️ Texto vacío o no encontrado en data');
        }
      }
    });
    
    // Estados locales para rastrear los valores reales de VideoSDK
    const [micState, setMicState] = useState(true); // Por defecto activo según config
    const [webcamState, setWebcamState] = useState(true); // Por defecto activo según config

    // Log para verificar que el hook useTranscription está funcionando
    useEffect(() => {
      console.log('📝 Hook useTranscription montado. isTranscribing:', isTranscribing);
      console.log('📝 fullTranscript actual:', fullTranscriptRef.current?.substring(0, 100) || 'vacío');
    }, [isTranscribing]);

    // Escuchar evento de finalizar llamada desde el Layout (termina para todos)
    useEffect(() => {
      const handleEndCallFromLayout = () => {
        console.log('📞 Finalizando llamada para TODOS desde el Layout...');
        // Detener transcripción si está activa
        if (isTranscribing) {
          stopTranscription();
        }
        // Usar end() para terminar la reunión para todos los participantes
        end();
        setIsMeetingJoined(false);
        setIsMeetingEnded(true); // Marcar como finalizada para evitar reconexión
        hasJoinedMeetingRef.current = true; // Mantener en true para evitar reconexión automática
        setMeetingId(null); // Limpiar el meetingId
        setToken(null); // Limpiar el token
        toast.success('Videollamada finalizada para todos los participantes');
        
        // Notificar al Layout que la telemedicina ya no está activa
        window.dispatchEvent(new CustomEvent('telemedicine-status', {
          detail: { isActive: false }
        }));
      };
      
      window.addEventListener('end-telemedicine-call', handleEndCallFromLayout);
      return () => window.removeEventListener('end-telemedicine-call', handleEndCallFromLayout);
    }, [end, isTranscribing, stopTranscription]);

    // Unirse automáticamente cuando el componente se monta
    // Usamos la ref global para evitar múltiples llamadas a join()
    // NO unirse si la reunión fue finalizada
    useEffect(() => {
      if (!isMeetingJoined && !hasJoinedMeetingRef.current && !isMeetingEnded) {
        hasJoinedMeetingRef.current = true;
        // Pequeño delay para asegurar que el SDK esté completamente inicializado
        const timer = setTimeout(() => {
          console.log('🎥 Uniéndose automáticamente a la videollamada...');
          join();
          setIsMeetingJoined(true);
        }, 500);
        
        return () => clearTimeout(timer);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Solo ejecutar una vez al montar

    // Actualizar estados locales cuando VideoSDK cambie los valores
    useEffect(() => {
      if (micOn !== undefined) {
        console.log('🎤 Estado del micrófono actualizado:', micOn ? 'ACTIVO' : 'INACTIVO');
        setMicState(micOn);
      }
    }, [micOn]);

    useEffect(() => {
      if (webcamOn !== undefined) {
        console.log('📹 Estado de la cámara actualizado:', webcamOn ? 'ACTIVA' : 'INACTIVA');
        setWebcamState(webcamOn);
      }
    }, [webcamOn]);

    const handleJoin = () => {
      join();
      setIsMeetingJoined(true);
      toast.success('Te has unido a la videollamada');
    };

    const handleLeave = () => {
      // Usar end() para terminar la reunión para todos
      end();
      setIsMeetingJoined(false);
      setIsMeetingEnded(true);
      hasJoinedMeetingRef.current = true;
      setMeetingId(null);
      setToken(null);
      toast.success('Videollamada finalizada');
      
      // Notificar al Layout
      window.dispatchEvent(new CustomEvent('telemedicine-status', {
        detail: { isActive: false }
      }));
    };

    // Handlers para prevenir que el evento se pase a VideoSDK (evita error de estructura circular)
    const handleToggleMic = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        // Capturar el estado actual antes de hacer el toggle
        const currentState = micState;
        const newState = !currentState;
        console.log('🔄 Cambiando micrófono de', currentState ? 'ACTIVO' : 'INACTIVO', 'a', newState ? 'ACTIVO' : 'INACTIVO');
        
        // Actualizar estado local inmediatamente para feedback visual instantáneo
        setMicState(newState);
        
        // Llamar a la función de VideoSDK
        toggleMic();
        
        // Feedback visual con toast
        if (newState) {
          toast.success('Micrófono activado', { duration: 1500 });
        } else {
          toast.error('Micrófono silenciado', { duration: 1500 });
        }
      } catch (error) {
        console.error('Error al cambiar estado del micrófono:', error);
        // Revertir el estado si hay error
        setMicState(!micState);
        toast.error('Error al cambiar el estado del micrófono');
      }
    };

    const handleToggleWebcam = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        // Capturar el estado actual antes de hacer el toggle
        const currentState = webcamState;
        const newState = !currentState;
        console.log('🔄 Cambiando cámara de', currentState ? 'ACTIVA' : 'INACTIVA', 'a', newState ? 'ACTIVA' : 'INACTIVA');
        
        // Actualizar estado local inmediatamente para feedback visual instantáneo
        setWebcamState(newState);
        
        // Llamar a la función de VideoSDK
        toggleWebcam();
        
        // Feedback visual con toast
        if (newState) {
          toast.success('Cámara activada', { duration: 1500 });
        } else {
          toast.error('Cámara desactivada', { duration: 1500 });
        }
      } catch (error) {
        console.error('Error al cambiar estado de la cámara:', error);
        // Revertir el estado si hay error
        setWebcamState(!webcamState);
        toast.error('Error al cambiar el estado de la cámara');
      }
    };

    if (!isMeetingJoined) {
      return (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-3 flex items-center justify-center z-10">
          <button
            onClick={handleJoin}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  </svg>
            <span>Unirse a la llamada</span>
          </button>
                </div>
      );
    }

    return (
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-3 flex items-center justify-center gap-3 z-10">
        {/* Botón de Micrófono */}
        <button 
          onClick={handleToggleMic}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-200 ${
            micState 
              ? 'bg-[#292929]/60 hover:bg-[#292929]/80' // Activo: fondo gris con 60% opacidad
              : 'bg-red-600 hover:bg-red-700'     // Inactivo: fondo rojo
          }`}
          title={micState ? 'Silenciar micrófono' : 'Activar micrófono'}
          aria-label={micState ? 'Micrófono activo' : 'Micrófono inactivo'}
        >
          {micState ? (
            <MicIconActive width={20} height={20} stroke="white" strokeWidth={2} />
          ) : (
            <MicIconInactive width={20} height={20} stroke="white" strokeWidth={1.5} />
          )}
        </button>
        
        {/* Botón de Cámara */}
        <button
          onClick={handleToggleWebcam}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-200 ${
            webcamState 
              ? 'bg-[#292929]/60 hover:bg-[#292929]/80' // Activo: fondo gris con 60% opacidad
              : 'bg-red-600 hover:bg-red-700'     // Inactivo: fondo rojo
          }`}
          title={webcamState ? 'Apagar cámara' : 'Encender cámara'}
          aria-label={webcamState ? 'Cámara activa' : 'Cámara inactiva'}
        >
          {webcamState ? (
            <CameraIconActive width={20} height={20} stroke="white" strokeWidth={1.5} />
          ) : (
            <CameraIconInactive width={20} height={20} stroke="white" strokeWidth={1.5} />
          )}
        </button>
        <button
          className="w-10 h-10 rounded-full bg-[#292929]/60 hover:bg-[#292929]/80 flex items-center justify-center text-white transition-all duration-200"
          title="Compartir pantalla"
        >
          <ShareScreenIcon width={20} height={20} stroke="white" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-10 h-10 rounded-full bg-[#292929]/60 hover:bg-[#292929]/80 flex items-center justify-center text-white transition-all duration-200"
          title="Chat"
        >
          <ChatIcon width={20} height={20} stroke="white" strokeWidth={1.5} />
        </button>
        
        {/* Botón de Transcripción AI (VideoSDK) */}
        <button
          onClick={() => {
            if (isTranscribing) {
              // Detener transcripción
              console.log('🛑 Deteniendo transcripción de VideoSDK...');
              setIsTranscribing(false);
              
              if (typeof stopTranscription === 'function') {
                stopTranscription();
              }
              
              // Procesar transcripción inmediatamente después de detener
              // Usar un delay para asegurar que todos los callbacks de transcripción se hayan ejecutado
              setTimeout(() => {
                const transcriptToProcess = fullTranscriptRef.current || fullTranscript;
                console.log('📝 Longitud de transcripción capturada:', transcriptToProcess.length);
                console.log('📝 Transcripción completa:', transcriptToProcess.substring(0, 200) + '...');
                
                if (transcriptToProcess.trim()) {
                  // Mostrar la transcripción completa
                  setTranscriptionText(transcriptToProcess);
                  console.log('📤 Enviando transcripción a la IA:', transcriptToProcess.substring(0, 100) + '...');
                  processVideoSDKTranscript(transcriptToProcess);
                } else {
                  console.log('⚠️ No hay transcripción para procesar (vacía)');
                  toast('No se capturó transcripción', { icon: '⚠️' });
                }
              }, 1500); // Delay para asegurar que todos los eventos de transcripción se hayan procesado
            } else {
              // Iniciar transcripción
              console.log('▶️ Iniciando transcripción de VideoSDK...');
              console.log('startTranscription disponible:', typeof startTranscription);
              
              if (typeof startTranscription === 'function') {
                setTranscriptionText('');
                setFullTranscript('');
                fullTranscriptRef.current = ''; // Limpiar ref también
                try {
                  console.log('📝 Iniciando transcripción con config:', { language: 'es', provider: 'deepgram' });
                  // Intentar diferentes formatos según la documentación de VideoSDK
                  const result = startTranscription({
                    language: 'es',
                    provider: 'deepgram'
                  });
                  console.log('📝 Resultado de startTranscription:', result);
                  setIsTranscribing(true);
                  toast.success('Transcripción iniciada. Habla para comenzar...');
                } catch (err) {
                  console.error('❌ Error al iniciar transcripción:', err);
                  console.error('❌ Stack trace:', err.stack);
                  toast.error('Error al iniciar la transcripción. Verifica tu plan de VideoSDK.');
                }
              } else {
                console.error('❌ startTranscription no está disponible en el SDK');
                console.error('❌ Tipo de startTranscription:', typeof startTranscription);
                toast.error('La transcripción no está disponible. Verifica tu plan de VideoSDK.');
              }
            }
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-200 ${
            isTranscribing 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : 'bg-[#292929]/60 hover:bg-[#292929]/80'
          }`}
          title={isTranscribing ? 'Detener transcripción AI' : 'Iniciar transcripción AI'}
        >
          {isTranscribing ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          )}
        </button>
        
        <button
          onClick={handleLeave}
          className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white"
          title="Finalizar llamada"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        </button>
        <button
          className="w-10 h-10 rounded-full bg-[#292929]/60 hover:bg-[#292929]/80 flex items-center justify-center text-white transition-all duration-200"
          title="Más opciones"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        );
  };

  // Componente interno para la vista de la reunión
  const MeetingView = () => {
    const { participants, localParticipant, meetingId: currentMeetingId } = useMeeting();
    
    // Filtrar solo participantes remotos (excluir el local y duplicados)
    const localId = localParticipant?.id;
    const localName = localParticipant?.displayName;
    
    // Obtener IDs únicos ya mostrados para evitar duplicados
    const seenIds = new Set();
    const seenNames = new Set();
    
    const remoteParticipants = Array.from(participants.values()).filter(p => {
      // Excluir si es el participante local por ID
      if (localId && p.id === localId) return false;
      // Excluir si tiene la propiedad isLocal = true
      if (p.isLocal === true) return false;
      // Excluir si tiene el mismo displayName que el local (posible duplicado)
      if (localName && p.displayName === localName) return false;
      // Excluir duplicados por ID
      if (seenIds.has(p.id)) return false;
      // Excluir duplicados por nombre (mismo usuario conectado múltiples veces)
      if (seenNames.has(p.displayName)) return false;
      
      seenIds.add(p.id);
      seenNames.add(p.displayName);
      return true;
    });
    
    // Debug: ver estado de participantes
    useEffect(() => {
      console.log('👥 MeetingView - Estado de participantes:');
      console.log('   - meetingId:', currentMeetingId);
      console.log('   - localParticipant ID:', localId);
      console.log('   - Total en participants Map:', participants.size);
      console.log('   - participantes remotos filtrados:', remoteParticipants.length);
      
      // Mostrar todos los participantes para debug
      Array.from(participants.values()).forEach((p, i) => {
        console.log(`   - Participante ${i}:`, { 
          id: p.id, 
          displayName: p.displayName, 
          isLocal: p.isLocal,
          isLocalById: p.id === localId
        });
      });
    }, [localParticipant, participants, remoteParticipants, currentMeetingId, localId]);

    return (
      <div className="flex-1 relative bg-[#5D5D5D] min-h-[400px]">
        {/* Video principal - Participantes remotos */}
        {remoteParticipants.length > 0 ? (
          <div className="absolute inset-0">
            {/* Si hay un solo participante remoto, mostrarlo en pantalla completa */}
            {remoteParticipants.length === 1 ? (
              <ParticipantVideo participantId={remoteParticipants[0].id} />
            ) : (
              /* Si hay múltiples participantes, mostrarlos en grid */
              <div className={`grid gap-2 w-full h-full p-2 ${
                remoteParticipants.length === 2 ? 'grid-cols-2' :
                remoteParticipants.length <= 4 ? 'grid-cols-2 grid-rows-2' :
                'grid-cols-3 grid-rows-2'
              }`}>
                {remoteParticipants.slice(0, 6).map(participant => (
                  <div key={participant.id} className="bg-gray-800 rounded-lg overflow-hidden">
                    <ParticipantVideo participantId={participant.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Mensaje de espera cuando no hay participantes remotos */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg font-medium">Esperando al paciente...</p>
              <p className="text-sm mt-2 opacity-75">Comparte el enlace de la videollamada</p>
            </div>
          </div>
        )}
        
        {/* Video pequeño del doctor (esquina superior derecha) - Siempre visible */}
        {localParticipant && (
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg z-10">
            <ParticipantVideo participantId={localParticipant.id} />
          </div>
        )}
      </div>
    );
  };

  // Componente para el panel de video (siempre visible en telemedicina)
  const renderVideoPanel = () => {
    // Mostrar estado de videollamada finalizada
    if (isMeetingEnded) {
      return (
        <div className="w-full flex flex-col bg-gray-900 rounded-lg overflow-hidden min-h-[400px]">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Videollamada finalizada</h3>
              <p className="text-gray-400 text-sm mb-6">La sesión de telemedicina ha terminado</p>
              <button
                onClick={() => {
                  setIsMeetingEnded(false);
                  meetingInitializedRef.current = false;
                  hasJoinedMeetingRef.current = false;
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Iniciar nueva llamada
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    if (!meetingId || !token) {
      return (
        <div className="w-full flex flex-col bg-gray-900 rounded-lg overflow-hidden min-h-[400px]">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-sm">Inicializando videollamada...</p>
            </div>
          </div>
        </div>
      );
    }

    // Obtener nombre del usuario actual (mostrar como Doctor)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const baseName = user.name || user.firstName || 'Usuario';
    // Verificar si es doctor por rol o por contexto (estamos en consulta médica = es doctor)
    const userRole = (user.role || '').toLowerCase();
    const isDoctor = userRole === 'doctor' || userRole === 'medico' || userRole === 'physician';
    const userName = isDoctor ? `Dr. ${baseName}` : `Dr. ${baseName}`; // En consulta siempre es doctor
    console.log('👤 Usuario para videollamada:', { baseName, userRole, isDoctor, userName });

    // Debug: verificar token antes de renderizar MeetingProvider
    console.log('🎥 Renderizando MeetingProvider con:');
    console.log('   - meetingId:', meetingId);
    console.log('   - token (primeros 50 chars):', token ? token.substring(0, 50) + '...' : 'NULL');
    console.log('   - userName:', userName);
    
    if (!token) {
      console.error('❌ ERROR: Token es null o undefined al renderizar MeetingProvider');
      return (
        <div className="w-full flex flex-col bg-gray-900 rounded-lg overflow-hidden p-4">
          <div className="text-center text-red-400">
            <p>Error: No se pudo obtener el token de autenticación</p>
            <button 
              onClick={createMeeting}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <MeetingProvider
        config={{
          meetingId: meetingId,
          micEnabled: true,
          webcamEnabled: true,
          name: userName,
        }}
        token={token}
      >
        <div className="w-full flex flex-col bg-gray-900 rounded-lg overflow-hidden relative">
          <MeetingView />
          <MeetingControls />
        </div>
      </MeetingProvider>
    );
  };

  // Componente para el asistente AI (disponible en consulta y telemedicina)
  const renderAIAssistant = () => {
    if (activeTab !== 'consulta') {
      return null;
    }

    return (
      <div className="w-full bg-white rounded-b-lg shadow-sm border border-gray-200 border-t-0 p-4">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Asistente AI</h3>
            <p className="text-sm text-gray-600">
                    Completa automáticamente la entrevista médica mientras hablas con el paciente. Solo activa el micrófono y continúa tu consulta con normalidad.
                  </p>
                </div>

          <div className="bg-gray-50 rounded-lg p-4">
                  {recordingState === 'idle' && (
                  <div className="space-y-4">
                    <button
                        onClick={startRecording}
                  className="w-full py-3 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                  <span>Activar asistente</span>
                    </button>
                    
                    {/* Campo para transcripción de prueba */}
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs text-gray-500 mb-2">O pega una transcripción de prueba:</p>
                      <textarea
                        value={testTranscript}
                        onChange={(e) => setTestTranscript(e.target.value)}
                        placeholder="Pega aquí la transcripción de la consulta..."
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                      <button
                        onClick={processTestTranscript}
                        disabled={!testTranscript.trim() || !selectedTemplateId}
                        className={`w-full mt-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                          testTranscript.trim() && selectedTemplateId
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Procesar transcripción
                      </button>
                    </div>
                  </div>
                  )}

                  {recordingState === 'recording' && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-red-600 rounded-full"></div>
                </div>
                  <div className="text-xl font-mono font-bold text-red-600">
                          {formatTime(recordingTime)}
              </div>
            </div>

                      <div className="flex gap-2">
              <button 
                          onClick={pauseRecording}
                    className="flex-1 py-2 px-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2 text-sm"
              >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
                          <span>Pausar</span>
              </button>
                        <button
                          onClick={stopRecording}
                    className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 text-sm"
                        >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 6h12v12H6z"/>
                </svg>
                    <span>Detener</span>
                        </button>
            </div>

                      <div className="space-y-2">
                        <div className="text-xs text-gray-600">Nivel de audio</div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-100"
                            style={{ width: `${audioLevel * 100}%` }}
                          ></div>
                    </div>
                        {(interimTranscript || liveTranscript) && (
                          <div className="text-left">
                            <div className="text-xs text-gray-500 mb-1">Transcripción en vivo</div>
                      <div className="text-xs text-gray-800 bg-white border border-gray-200 rounded-lg p-2 max-h-24 overflow-auto">
                              {interimTranscript || liveTranscript}
                    </div>
                    </div>
                        )}
                    </div>
                  </div>
                  )}

                  {recordingState === 'paused' && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
                </div>
                  <div className="text-xl font-mono font-bold text-gray-600">
                          {formatTime(recordingTime)}
              </div>
                </div>

                        <button
                        onClick={resumeRecording}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2 text-sm"
                      >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Continuar</span>
                        </button>
                    </div>
                  )}

                  {recordingState === 'processing' && (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-12 h-12 mb-3">
                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                <p className="text-gray-600 text-xs">Procesando audio...</p>
                      </div>
                    )}

                  {recordingState === 'suggestions' && Object.keys(aiSuggestions).length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Object.keys(aiSuggestions).map(fieldId => {
                        const field = selectedTemplateData?.fields?.find(f => f.id === fieldId);
                        if (!field) {
                          console.warn('⚠️ Sugerencia ignorada en frontend: campo no existe:', fieldId);
                          return null;
                        }
                        
                        return (
                          <div key={fieldId} className="bg-white border border-blue-200 rounded-lg p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 mb-1 text-sm">{field.name}</div>
                                <div className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-2">{aiSuggestions[fieldId]}</div>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  addSuggestion(fieldId, aiSuggestions[fieldId]);
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex-shrink-0 font-medium"
                              >
                                + Añadir
                              </button>
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                      <button
                        onClick={addAllSuggestions}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                      >
                        + Añadir todas las sugerencias de la IA
                      </button>
              </div>
                  )}
          </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'consulta':
        return (
          <div className="p-8">
            <div className="space-y-6">
              {/* Selector de plantilla - Siempre visible */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Selecciona una plantilla
                </h2>
                
                <p className="text-gray-600 mb-6">
                  Esta elección personaliza las preguntas de la entrevista médica y organiza los campos que verás a continuación, para que el registro sea más rápido, claro y enfocado en el paciente.
                </p>
                
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plantilla de la consulta
                  </label>
                  <div className="relative">
                    <select 
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white text-gray-900"
                    >
                      <option value="">Selecciona una plantilla</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Si la plantilla no se ajusta al motivo de consulta contacta a tu administrador
                  </p>
                </div>
              </div>

              {/* Campos de la plantilla - Solo se muestran si hay plantilla seleccionada */}
              {selectedTemplateId && selectedTemplateData && (
                <div className="pt-6 border-t border-gray-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Consulta</h3>
                    <p className="text-gray-600 text-sm">
                      Campos de la plantilla "{selectedTemplateData.name}". Respóndelos tú o deja que el Asistente AI lo haga por ti.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {selectedTemplateData.fields && selectedTemplateData.fields.length > 0 ? (
                      selectedTemplateData.fields.map(field => renderTemplateField(field))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        Esta plantilla no tiene campos configurados
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mensaje cuando no hay plantilla seleccionada */}
              {!selectedTemplateId && (
                <div className="pt-6 border-t border-gray-200">
                  <div className="text-center text-gray-500 py-8">
                    <p>Selecciona una plantilla para ver los campos de la consulta</p>
                  </div>
                </div>
              )}
            </div>

            {/* Botón Continuar */}
            <div className="mt-8 text-center">
              <button 
                onClick={handleContinue}
                disabled={!validateTab('consulta')}
                className={`py-3 px-8 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors ${
                  validateTab('consulta')
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>Continuar</span>
                <ArrowRightIcon width={16} height={16} fill={validateTab('consulta') ? 'white' : '#9CA3AF'} />
              </button>
            </div>
          </div>
        );
      
      case 'diagnostico':
        return (
          <div className="p-8 space-y-12">
            {/* Sección Diagnóstico */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Diagnostico</h2>
              
              {/* Caja de resumen RIPS */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <RipsStarIcon width={20} height={20} stroke="#155DFC" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 mb-2">Resumen médico (RIPS) generado por inteligencia artificial.</h3>
                      <p className="text-sm text-gray-600">
                        Diagnostico basado en la historia clínica y los datos del paciente. Es responsabilidad del profesional revisar y modificarlos en caso de ser necesario.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto lg:ml-4">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap">
                      <RefreshIcon width={16} height={16} stroke="#FFFFFF" />
                      <span>Generar un nuevo RIPS</span>
                    </button>
                    <button className="px-4 py-2 bg-white hover:bg-gray-50 text-red-600 border border-red-600 rounded-lg text-sm flex items-center justify-center gap-2 whitespace-nowrap">
                      <CloseXIconRips width={14} height={14} fill="#9F0712" />
                      <span>Borrar todos los datos</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Campos de diagnóstico - Una sola columna */}
              <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Causa externa</label>
                    <OverlaySelect
                      name="causaExterna"
                      value={ripsData.causaExterna}
                      options={[{ value: '', label: 'Seleccione una opción' }, ...causaExternaFlatOptions]}
                      onChange={(val) => setRipsData(prev => ({ ...prev, causaExterna: val }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de diagnóstico</label>
                    <OverlaySelect
                      name="tipoDiagnostico"
                      value={ripsData.tipoDiagnostico}
                      options={tipoDiagnosticoOptions}
                      onChange={(val) => setRipsData(prev => ({ ...prev, tipoDiagnostico: val }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Finalidad consulta</label>
                    <OverlaySelect
                      name="finalidadConsulta"
                      value={ripsData.finalidadConsulta}
                      options={finalidadConsultaOptions}
                      onChange={(val) => setRipsData(prev => ({ ...prev, finalidadConsulta: val }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Finalidad procedimiento</label>
                    <OverlaySelect
                      name="finalidadProcedimiento"
                      value={ripsData.finalidadProcedimiento}
                      options={finalidadProcedimientoOptions}
                      onChange={(val) => setRipsData(prev => ({ ...prev, finalidadProcedimiento: val }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico principal</label>
                    <OverlaySelect
                      name="diagnosticoPrincipal"
                      value={ripsData.diagnosticoPrincipal}
                      options={cie10Options.length ? cie10Options : [{ value: '', label: cie10Error ? `Error: ${cie10Error}` : 'Cargando CIE-10...' }]}
                      onChange={(val) => {
                        setRipsData(prev => ({ ...prev, diagnosticoPrincipal: val }));
                        if (val) {
                          setSecondaryCodes(prev => prev.filter(c => c !== val));
                        }
                      }}
                      loading={cie10Loading}
                      disabled={!!cie10Error}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Diagnósticos secundarios</label>
                    {(() => {
                      const maxSecondary = 3;
                      const exclude = new Set([ripsData.diagnosticoPrincipal, ...secondaryCodes].filter(Boolean));
                      const filtered = (cie10Options || []).filter(o => !o.value || !exclude.has(o.value));
                      return (
                        <div>
                          <OverlaySelect
                            name="diagnosticoSecundarioAdd"
                            value={secondarySelect}
                            options={filtered.length ? filtered : [{ value: '', label: cie10Error ? `Error: ${cie10Error}` : 'Seleccione una opción' }]}
                            onChange={(val) => {
                              if (!val) return;
                              setSecondaryCodes(prev => {
                                if (prev.includes(val)) return prev;
                                if (prev.length >= maxSecondary) return prev;
                                return [...prev, val];
                              });
                              setSecondarySelect('');
                              // Actualizar ripsData con los diagnósticos secundarios
                              const newSec = [...secondaryCodes, val].filter(Boolean);
                              setRipsData(prev => ({
                                ...prev,
                                diagnosticoSecundario1: newSec[0] || '',
                                diagnosticoSecundario2: newSec[1] || '',
                                diagnosticoSecundario3: newSec[2] || ''
                              }));
                            }}
                            loading={cie10Loading}
                            disabled={!!cie10Error || secondaryCodes.length >= maxSecondary}
                          />
                          {secondaryCodes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {secondaryCodes.map(code => {
                                const opt = (cie10Options || []).find(o => String(o.value) === String(code));
                                const label = opt ? opt.label : code;
                                return (
                                  <span key={code} className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                                    <span className="mr-1">{label}</span>
                                    <button 
                                      type="button" 
                                      className="ml-1 text-blue-700 hover:text-blue-900" 
                                      aria-label="Eliminar" 
                                      onClick={() => {
                                        const newSec = secondaryCodes.filter(c => c !== code);
                                        setSecondaryCodes(newSec);
                                        setRipsData(prev => ({
                                          ...prev,
                                          diagnosticoSecundario1: newSec[0] || '',
                                          diagnosticoSecundario2: newSec[1] || '',
                                          diagnosticoSecundario3: newSec[2] || ''
                                        }));
                                      }}
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modalidad de atención</label>
                    <OverlaySelect
                      name="modalidadAtencion"
                      value={ripsData.modalidadAtencion}
                      options={modalidadAtencionOptions}
                      onChange={(val) => setRipsData(prev => ({ ...prev, modalidadAtencion: val }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ámbito de atención</label>
                    <OverlaySelect
                      name="ambitoAtencion"
                      value={ripsData.ambitoAtencion}
                      options={ambitoAtencionOptions}
                      onChange={(val) => setRipsData(prev => ({ ...prev, ambitoAtencion: val }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de servicio</label>
                    <OverlaySelect
                      name="tipoServicio"
                      value={ripsData.tipoServicio}
                      options={tipoServicioOptions}
                      onChange={(val) => setRipsData(prev => ({ ...prev, tipoServicio: val }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico de complicación</label>
                    <OverlaySelect
                      name="diagnosticoComplicacion"
                      value={ripsData.diagnosticoComplicacion}
                      options={cie10Options.length ? cie10Options : [{ value: '', label: cie10Error ? `Error: ${cie10Error}` : 'Cargando CIE-10...' }]}
                      onChange={(val) => setRipsData(prev => ({ ...prev, diagnosticoComplicacion: val }))}
                      loading={cie10Loading}
                      disabled={!!cie10Error}
                    />
                  </div>
                </div>
              </div>

              {/* Sección Análisis */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Análisis</h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <p className="text-gray-600">Sección de análisis (a implementar)</p>
                </div>
              </div>

            {/* Botón Continuar */}
            <div className="mt-8 text-center">
              <button 
                onClick={handleContinue}
                disabled={!validateTab('diagnostico')}
                className={`py-3 px-8 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors ${
                  validateTab('diagnostico')
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>Continuar</span>
                <ArrowRightIcon width={16} height={16} fill={validateTab('diagnostico') ? 'white' : '#9CA3AF'} />
              </button>
            </div>
          </div>
        );
      
      case 'finalizar':
        return (
          <div className="p-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Finalizar Consulta</h2>
              <p className="text-gray-600 mb-8">Revisa toda la información antes de finalizar</p>
              <button 
                onClick={finalizarConsulta}
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded-lg font-medium text-lg"
              >
                Finalizar Consulta
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getPatientAge = () => {
    if (!patient?.birthDate) return '';
    const birthDate = new Date(patient.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Scroll automático al final del chat cuando hay nuevos mensajes
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Funciones para el chat
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || user.firstName || 'Doctor';

    const message = {
      id: Date.now(),
      text: newMessage,
      sender: 'user',
      senderName: userName,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');

    // Simular respuesta del paciente después de un breve delay
    setTimeout(() => {
      const patientMessage = {
        id: Date.now() + 1,
        text: "I'm doing well, thank you! How can I help you today?",
        sender: 'patient',
        senderName: patient?.first_name || 'Paciente',
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
      setChatMessages(prev => [...prev, patientMessage]);
    }, 1000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="bg-gray-50">
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Caja de información del paciente */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {patient?.photo_url ? (
                    <img src={patient.photo_url} alt="Paciente" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {patient?.first_name} {patient?.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {getPatientAge()} años • {patient?.blood_type || 'N/A'} • Última visita: {formatDate(patient?.last_visit) || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-1 flex-col">
                {/* Alergias */}
                <div className="flex items-center gap-2">
                  <AllergyIcon width={14} height={13} stroke="#FF0000" />
                  <span className="text-sm text-gray-600">Alergias:</span>
                  <div className="flex gap-1">
                    {patient?.allergies && patient.allergies.length > 0 ? (
                      patient.allergies.map((allergy, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          {allergy}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">Ninguna</span>
                    )}
                  </div>
                </div>
                {/* Condiciones */}
                <div className="flex items-center gap-2">
                  <ConditionsIcon width={15} height={16} stroke="#737373" />
                  <span className="text-sm text-gray-600">Condiciones:</span>
                  <div className="flex gap-1">
                    {patient?.conditions && patient.conditions.length > 0 ? (
                      patient.conditions.map((condition, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-700 text-white text-xs rounded-full">
                          {condition}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">Ninguna</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pasos de navegación */}
          <div className="bg-white rounded-t-lg border border-gray-200 px-6">
            <div className="flex items-center justify-center gap-8 mb-[-1px]">
              {[
                { id: 'consulta', label: '1. Consulta', Icon: MicrophoneIcon },
                { id: 'diagnostico', label: '2. Diagnóstico', Icon: BrainIcon },
                { id: 'finalizar', label: '3. Finalizar', Icon: DocumentIcon }
              ].map((step, index) => {
                const isUnlocked = unlockedTabs.includes(step.id);
                const isActive = activeTab === step.id;
                const IconComponent = step.Icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => handleTabChange(step.id)}
                    disabled={!isUnlocked}
                    className={`flex items-center gap-2 px-4 py-3 transition-colors ${
                      isActive
                        ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                        : isUnlocked
                        ? 'text-gray-600 hover:text-gray-800 cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                    title={!isUnlocked ? 'Completa los pasos anteriores para desbloquear esta sección' : ''}
                  >
                    <IconComponent 
                      width={16} 
                      height={16} 
                      stroke={isActive ? '#2563EB' : isUnlocked ? '#6A7282' : '#9CA3AF'} 
                    />
                    <span className="text-sm">{step.label}</span>
                    {!isUnlocked && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenido principal */}
          <div>
            {isTelemedicine ? (
              // Layout de telemedicina: video a la izquierda, contenido a la derecha
              <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 border-t-0">
                <div className="flex">
                  {/* Panel izquierdo - Video (50%) - Sticky */}
                  <div className="p-4 self-start sticky top-20 border-r border-gray-200" style={{ width: '50%' }}>
                    {/* Video SDK */}
                    <div className="rounded-lg overflow-hidden bg-gray-900">
                      {renderVideoPanel()}
                    </div>
                    
                    {/* Panel de transcripción VideoSDK - Solo visible cuando se está transcribiendo, procesando o hay sugerencias */}
                    {(isTranscribing || recordingState === 'processing' || recordingState === 'suggestions') && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4">
                        {isTranscribing && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-gray-700">Transcribiendo en vivo</span>
                              </div>
                              <span className="text-xs text-gray-500">VideoSDK AI</span>
                            </div>
                            
                            {transcriptionText && (
                              <div className="mt-3">
                                <div className="text-xs text-gray-500 mb-1 font-medium">Transcripción en tiempo real</div>
                                <div className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 max-h-40 overflow-auto whitespace-pre-wrap">
                                  {transcriptionText}
                                </div>
                              </div>
                            )}
                            
                            <p className="text-xs text-gray-500">
                              La transcripción se enviará automáticamente a la IA cuando detengas la grabación.
                            </p>
                          </div>
                        )}

                        {recordingState === 'processing' && (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Procesando transcripción y generando sugerencias...</p>
                          </div>
                        )}

                        {recordingState === 'suggestions' && Object.keys(aiSuggestions).length > 0 && (
                          <div className="space-y-3">
                            <div className="text-sm font-medium text-green-700 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              Sugerencias generadas
                            </div>
                            <p className="text-xs text-gray-500">Las sugerencias se muestran junto a cada campo en el formulario.</p>
                            <button
                              onClick={() => {
                                setRecordingState('idle');
                                setTranscriptionText('');
                                setFullTranscript('');
                                fullTranscriptRef.current = ''; // Limpiar ref también
                              }}
                              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                            >
                              Nueva transcripción
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Panel derecho - Contenido de la pestaña activa (50%) */}
                  <div className="flex-1 p-6" style={{ width: '50%' }}>
                    {renderTabContent()}
                  </div>
                </div>
              </div>
            ) : (
              // Layout normal para consultas presenciales
              <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 border-t-0">
                <div className="flex">
                  {/* Panel izquierdo - Contenido de la pestaña activa (65%) */}
                  <div className="flex-1 p-6 border-r border-gray-200" style={{ width: '65%' }}>
                    {renderTabContent()}
                  </div>
                  
                  {/* Panel derecho - Asistente AI (35%) - Sticky */}
                  {activeTab === 'consulta' && (
                    <div className="p-4 self-start sticky top-20" style={{ width: '35%' }}>
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Asistente AI</h3>
                        <p className="text-sm text-gray-600">
                          Completa automáticamente la entrevista médica mientras hablas con el paciente. Solo activa el micrófono y continúa tu consulta con normalidad.
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        {recordingState === 'idle' && (
                          <div className="space-y-4">
                            <button
                              onClick={startRecording}
                              className="w-full py-3 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              <span>Activar asistente</span>
                            </button>
                            
                            {/* Campo para transcripción de prueba */}
                            <div className="border-t border-gray-200 pt-4">
                              <p className="text-xs text-gray-500 mb-2">O pega una transcripción de prueba:</p>
                              <textarea
                                value={testTranscript}
                                onChange={(e) => setTestTranscript(e.target.value)}
                                placeholder="Pega aquí la transcripción de la consulta..."
                                rows={4}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              />
                              <button
                                onClick={processTestTranscript}
                                disabled={!testTranscript.trim() || !selectedTemplateId}
                                className={`w-full mt-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                                  testTranscript.trim() && selectedTemplateId
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Procesar transcripción
                              </button>
                            </div>
                          </div>
                        )}

                        {recordingState === 'recording' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                                <div className="w-6 h-6 bg-red-600 rounded-full"></div>
                              </div>
                              <div className="text-xl font-mono font-bold text-red-600">
                                {formatTime(recordingTime)}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button 
                                onClick={pauseRecording}
                                className="flex-1 py-2 px-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                                </svg>
                                <span>Pausar</span>
                              </button>
                              <button
                                onClick={stopRecording}
                                className="flex-1 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 6h12v12H6z"/>
                                </svg>
                                <span>Detener</span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div className="text-xs text-gray-600">Nivel de audio</div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 transition-all duration-100"
                                  style={{ width: `${audioLevel * 100}%` }}
                                ></div>
                              </div>
                              {(interimTranscript || liveTranscript) && (
                                <div className="text-left">
                                  <div className="text-xs text-gray-500 mb-1">Transcripción en vivo</div>
                                  <div className="text-xs text-gray-800 bg-white border border-gray-200 rounded-lg p-2 max-h-24 overflow-auto">
                                    {interimTranscript || liveTranscript}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {recordingState === 'paused' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center gap-3">
                              <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                                <div className="w-6 h-6 bg-gray-500 rounded-full"></div>
                              </div>
                              <div className="text-xl font-mono font-bold text-gray-600">
                                {formatTime(recordingTime)}
                              </div>
                            </div>

                            <button
                              onClick={resumeRecording}
                              className="w-full py-2 px-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2 text-sm"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                              <span>Reanudar</span>
                            </button>
                          </div>
                        )}

                        {recordingState === 'processing' && (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Procesando audio...</p>
                          </div>
                        )}

                        {recordingState === 'suggestions' && Object.keys(aiSuggestions).length > 0 && (
                          <div className="space-y-3">
                            <div className="text-sm font-medium text-green-700 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              Sugerencias generadas
                            </div>
                            <button
                              onClick={() => setRecordingState('idle')}
                              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                            >
                              Nueva grabación
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Chat flotante - Fijo en esquina inferior derecha */}
      {isChatOpen && (
        <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header del chat */}
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200 rounded-t-lg">
            <h3 className="text-lg font-semibold text-gray-800">Chat</h3>
            <button
              onClick={() => setIsChatOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              title="Cerrar chat"
            >
              <CloseXIcon width={16} height={16} stroke="#5C5C5C" strokeWidth={2} />
            </button>
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No hay mensajes aún</p>
                <p className="text-xs mt-2">Comienza una conversación</p>
              </div>
            ) : (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'patient' && (
                    <div className="flex-shrink-0 mr-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon width={16} height={16} stroke="#5C5C5C" strokeWidth={2} />
                      </div>
                    </div>
                  )}
                  <div className={`max-w-[75%] ${message.sender === 'user' ? 'order-2' : ''}`}>
                    {message.sender === 'patient' && (
                      <div className="text-xs text-gray-600 mb-1 font-medium">
                        {message.senderName}
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.sender === 'user'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-white border border-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                      {message.timestamp}
                    </div>
                  </div>
                  {message.sender === 'user' && (
                    <div className="flex-shrink-0 ml-2 order-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon width={16} height={16} stroke="#5C5C5C" strokeWidth={2} />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Input de mensaje */}
          <div className="border-t p-3 rounded-b-lg">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe aquí"
                className="flex-1 px-3 py-2 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                title="Adjuntar archivo"
              >
                <ClipIcon width={20} height={20} stroke="#5C5C5C" strokeWidth={2} />
              </button>
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="flex-shrink-0 w-8 h-8 bg-gray-700 hover:bg-gray-800 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Enviar mensaje"
              >
                <SendArrowIcon width={16} height={16} stroke="white" strokeWidth={2} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalConsultation;
