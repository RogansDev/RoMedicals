import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import patientService from '../services/patientService';
import api, { consultationTemplatesAPI } from '../config/api';
import toast from 'react-hot-toast';
import OverlaySelect from './OverlaySelect';

const MedicalConsultation = () => {
  const { patientId } = useParams();
  const [activeTab, setActiveTab] = useState('tipo-consulta');
  const [unlockedTabs, setUnlockedTabs] = useState(['tipo-consulta']); // Pestañas desbloqueadas
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
  const [cie10Loading, setCie10Loading] = useState(false);
  const [cie10Error, setCie10Error] = useState('');
  const [secondaryCodes, setSecondaryCodes] = useState([]);
  const [secondarySelect, setSecondarySelect] = useState('');
  
  // Datos de fórmula médica
  const [medications, setMedications] = useState([]);
  const [medicationSearch, setMedicationSearch] = useState('');

  // Cargar datos del paciente
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        setLoading(true);
        const patientData = await patientService.getPatientById(patientId);
        setPatient(patientData.patient);
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
          patientSummary
        },
        { timeout: 60000 }
      );

      // Cargar sugerencias (NO autocompletar campos automáticamente)
      if (data.suggestions) setAiSuggestions(data.suggestions);

      // Cargar RIPS
      if (data.rips) {
        setRipsData(prev => ({ ...prev, ...data.rips }));
        // Manejar diagnósticos secundarios como array
        const sec = [
          data.rips.diagnosticoSecundario1 || '',
          data.rips.diagnosticoSecundario2 || '',
          data.rips.diagnosticoSecundario3 || ''
        ].filter(Boolean);
        const uniq = Array.from(new Set(sec));
        setSecondaryCodes(uniq);
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
          </div>
        );

      default:
        return null;
    }
  };

  // Validaciones para cada pestaña
  const validateTab = (tabId) => {
    switch (tabId) {
      case 'tipo-consulta':
        return !!selectedTemplateId;
      case 'consulta':
        // Validar que todos los campos requeridos de la plantilla estén llenos
        if (!selectedTemplateData?.fields || selectedTemplateData.fields.length === 0) {
          // Si no hay campos, permitir continuar
          return true;
        }
        const requiredFields = selectedTemplateData.fields.filter(f => f.required);
        if (requiredFields.length === 0) {
          // Si no hay campos requeridos, permitir continuar
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

    const tabOrder = ['tipo-consulta', 'consulta', 'diagnostico', 'finalizar'];
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
      rips: ripsData,
      medicamentos: medications
    });
    
    toast.success('Consulta finalizada exitosamente');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tipo-consulta':
        return (
          <div className="flex flex-col items-center justify-center py-12 px-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-8">
              Selecciona una plantilla
            </h2>
            
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            
            <p className="text-gray-600 text-center max-w-md mb-8 leading-relaxed">
              Esta elección personaliza las preguntas de la entrevista médica y organiza los campos que verás a continuación, para que el registro sea más rápido, claro y enfocado en el paciente.
            </p>
            
            <div className="w-full max-w-md mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plantilla de la consulta
              </label>
              <div className="relative">
                <select 
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
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
            
            <button 
              onClick={handleContinue}
              disabled={!validateTab('tipo-consulta')}
              className={`w-full max-w-md py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                validateTab('tipo-consulta')
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Continuar</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        );
      
      case 'consulta':
        return (
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Panel izquierdo - Asistente AI */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">Asistente AI</h2>
                  <p className="text-gray-600 text-sm">
                    Completa automáticamente la entrevista médica mientras hablas con el paciente. Solo activa el micrófono y continúa tu consulta con normalidad.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  {recordingState === 'idle' && (
                  <button
                      onClick={startRecording}
                      className="w-full py-4 px-6 rounded-lg font-medium bg-gray-800 hover:bg-gray-900 text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                      <span>Grabar</span>
                  </button>
                  )}

                  {recordingState === 'recording' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                          <div className="w-8 h-8 bg-red-600 rounded-full"></div>
                </div>
                        <div className="text-2xl font-mono font-bold text-red-600">
                          {formatTime(recordingTime)}
              </div>
            </div>

                      <div className="flex gap-2">
              <button 
                          onClick={pauseRecording}
                          className="flex-1 py-3 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
              >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
                          <span>Pausar</span>
              </button>
                        <button
                          onClick={stopRecording}
                          className="flex-1 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 6h12v12H6z"/>
                </svg>
                          <span>Detener y generar notas</span>
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
                            <div className="text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-3 max-h-32 overflow-auto">
                              {interimTranscript || liveTranscript}
                    </div>
                    </div>
                        )}
                    </div>
                  </div>
                  )}

                  {recordingState === 'paused' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                          <div className="w-8 h-8 bg-gray-500 rounded-full"></div>
                </div>
                        <div className="text-2xl font-mono font-bold text-gray-600">
                          {formatTime(recordingTime)}
              </div>
                </div>

                        <button
                        onClick={resumeRecording}
                        className="w-full py-3 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Continuar</span>
                        </button>
                    </div>
                  )}

                  {recordingState === 'processing' && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="relative w-16 h-16 mb-4">
                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                      <p className="text-gray-600 text-sm">Procesando audio...</p>
                      </div>
                    )}

                  {recordingState === 'suggestions' && Object.keys(aiSuggestions).length > 0 && (
                    <div className="space-y-3">
                      {Object.keys(aiSuggestions).map(fieldId => {
                        const field = selectedTemplateData?.fields?.find(f => f.id === fieldId);
                        // Solo mostrar sugerencias para campos que existen en la plantilla
                        if (!field) {
                          console.warn('⚠️ Sugerencia ignorada en frontend: campo no existe:', fieldId);
                          return null;
                        }
                        
                        return (
                          <div key={fieldId} className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 mb-1">{field.name}</div>
                                <div className="text-sm text-gray-600 whitespace-pre-wrap">{aiSuggestions[fieldId]}</div>
                              </div>
              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🔘 Click en añadir:', { fieldId, fieldName: field.name, value: aiSuggestions[fieldId] });
                                  addSuggestion(fieldId, aiSuggestions[fieldId]);
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex-shrink-0 font-medium cursor-pointer"
                              >
                                + Añadir
              </button>
            </div>
          </div>
        );
                      }).filter(Boolean)}
                      <button
                        onClick={addAllSuggestions}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                      >
                        + Añadir todas las sugerencias de la IA
                      </button>
              </div>
                  )}
            </div>
              </div>

              {/* Panel derecho - Formulario de Consulta */}
                <div className="space-y-6">
                  <div>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">Consulta</h2>
                  <p className="text-gray-600 text-sm">
                    {selectedTemplateData
                      ? `Campos de la plantilla "${selectedTemplateData.name}". Respóndelos tú o deja que el Asistente AI lo haga por ti.`
                      : 'Preguntas básicas del tipo de consulta que elegiste. Respóndelas tú o deja que el Asistente AI lo haga por ti.'}
                  </p>
                  </div>

                <div className="space-y-4">
                  {selectedTemplateData && selectedTemplateData.fields && selectedTemplateData.fields.length > 0 ? (
                    selectedTemplateData.fields.map(field => renderTemplateField(field))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Por favor selecciona una plantilla en el paso anterior
                  </div>
                  )}
                </div>
              </div>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        );
      
      case 'diagnostico':
        return (
          <div className="h-[calc(100vh-300px)] overflow-y-auto">
            <div className="p-8 space-y-12">
              {/* Sección Diagnóstico */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Diagnostico</h2>
                
                {/* Caja de resumen RIPS */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-2">Resumen médico (RIPS) generado por inteligencia artificial.</h3>
                        <p className="text-sm text-gray-600">
                          Diagnostico basado en la historia clínica y los datos del paciente. Es responsabilidad del profesional revisar y modificarlos en caso de ser necesario.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Generar un nuevo RIPS</span>
                      </button>
                      <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Borrar todos los datos</span>
                      </button>
                    </div>
                  </div>
            </div>

                {/* Campos de diagnóstico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  
              {/* Sección Fórmula Médica */}
                  <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Formula médica</h2>
                
                {/* Caja de información */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-2">Medicamentos</h3>
                        <p className="text-sm text-gray-600">
                          Análisis exhaustivo basado en la información del paciente y de la consulta. Es responsabilidad del profesional revisar y modificarlos en caso de ser necesario.
                        </p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 ml-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Generar una nueva formula</span>
                    </button>
                  </div>
                  </div>
                  
                {/* Búsqueda de medicamentos */}
                <div className="mb-6">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    <input
                        type="text"
                        value={medicationSearch}
                        onChange={(e) => setMedicationSearch(e.target.value)}
                        placeholder="Ingresa el Nombre del Medicamento"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                    <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                      Buscar
                    </button>
                </div>
              </div>

                {/* Grid de medicamentos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((med) => (
                    <div key={med} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="relative mb-3">
                        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
              </div>
                        <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Disponible</span>
            </div>
                      </div>
                      <div className="text-xs text-blue-600 mb-1">IBUPROFENO</div>
                      <div className="font-semibold text-gray-800 mb-2">Aspirina</div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block mb-2">400-800 mg</div>
                      <p className="text-xs text-gray-600 mb-3">
                        Para aliviar el malestar general. Toma entre 400-800 mg cada 4-6 horas según sea necesario.
                      </p>
                      <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs rounded-lg flex items-center justify-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Detalles de seguridad</span>
                        </button>
                        <button className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg flex items-center justify-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>+ Incluir en la receta</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
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

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Header con información del paciente */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="mb-4">
              <Link 
                to={`/patients/${patientId}/ficha`}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Volver al detalle de paciente</span>
              </Link>
            </div>
            
            {patient && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {patient.first_name} {patient.last_name}
                    </h3>
            <p className="text-sm text-gray-600">
                      {getPatientAge()} años • {patient.blood_type || 'N/A'} • Última visita: {formatDate(patient.last_visit) || 'N/A'}
            </p>
          </div>
        </div>
                <div className="text-right">
                  {patient.allergies && (
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm text-gray-700">Alergias:</span>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">{patient.allergies}</span>
      </div>
                  )}
                  {patient.conditions && typeof patient.conditions === 'string' && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
                      <span className="text-sm text-gray-700">Condiciones:</span>
                      {patient.conditions.split(',').map((cond, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {cond.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pasos de navegación */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-center gap-8">
              {[
                { id: 'tipo-consulta', label: '1. Tipo de consulta', icon: '👤' },
                { id: 'consulta', label: '2. Consulta', icon: '🎤' },
                { id: 'diagnostico', label: '3. Diagnóstico', icon: '🧠' },
                { id: 'finalizar', label: '4. Finalizar', icon: '📄' }
              ].map((step, index) => {
                const isUnlocked = unlockedTabs.includes(step.id);
                const isActive = activeTab === step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => handleTabChange(step.id)}
                    disabled={!isUnlocked}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'text-blue-600 font-semibold border-b-2 border-blue-600'
                        : isUnlocked
                        ? 'text-gray-600 hover:text-gray-800 cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                    title={!isUnlocked ? 'Completa los pasos anteriores para desbloquear esta sección' : ''}
                  >
                    <span className="text-lg">{step.icon}</span>
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
          <div className="px-6 py-6">
            <div className="bg-white rounded-lg shadow-sm">
              {renderTabContent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MedicalConsultation;
