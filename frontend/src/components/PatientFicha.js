import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import patientService from '../services/patientService';
import appointmentService from '../services/appointmentService';
import userService from '../services/userService';
import { specialtiesAPI, consentsAPI, aiAPI, appointmentsAPI, authAPI, cieDocsAPI } from '../config/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImagesDocsSection from './ImagesDocsSection';
import RipsDetailsModal from './RipsDetailsModal';
import OverlaySelect from './OverlaySelect';

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
  // Fichas personalizadas por especialidad
  const [customFormsCache, setCustomFormsCache] = useState({}); // specialtyId -> [{id,name,fields,isDefault,isActive}]
  const [selectedCustomFormIdByAppt, setSelectedCustomFormIdByAppt] = useState({}); // appointmentId -> formId
  const [customFormValuesByAppt, setCustomFormValuesByAppt] = useState({}); // appointmentId -> { fieldName: value }
  const [loadingCustomForms, setLoadingCustomForms] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const customFormSaveTimersRef = useRef({}); // appointmentId -> timerId
  // RIPS Detalles por atención
  const [ripsDetailsByAppt, setRipsDetailsByAppt] = useState({}); // appointmentId -> form
  const [showRipsModal, setShowRipsModal] = useState(false);
  const [ripsForAttentionId, setRipsForAttentionId] = useState(null);
  // Documentos CIE generados por atención
  const [cieDocsByAppt, setCieDocsByAppt] = useState({}); // appointmentId -> [{ version, code, name, createdBy, createdAt }]
  // Resumen
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Asistente de IA
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMessagesByAppt, setAiMessagesByAppt] = useState({}); // appointmentId -> [{role, content}]
  const [aiInputByAppt, setAiInputByAppt] = useState({}); // appointmentId -> string
  const [aiLoadingByAppt, setAiLoadingByAppt] = useState({}); // appointmentId -> boolean
  const aiScrollRef = useRef(null);
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [aiPreviewByAppt, setAiPreviewByAppt] = useState({}); // appointmentId -> { historyHtml, evolutionHtml, prescriptionHtml, fields }
  const [aiPreviewIncludeByAppt, setAiPreviewIncludeByAppt] = useState({}); // appointmentId -> { history: bool, evolution: bool, prescription: bool, fields: bool }
  const [aiPreviewEditsByAppt, setAiPreviewEditsByAppt] = useState({}); // appointmentId -> { historyHtml, evolutionHtml, prescriptionHtml }
  // Notas del médico
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [notesByAppt, setNotesByAppt] = useState({}); // appointmentId -> [{ id, content, createdAt, updatedAt }]
  const [notesInputByAppt, setNotesInputByAppt] = useState({}); // appointmentId -> string
  const [notesEditingByAppt, setNotesEditingByAppt] = useState({}); // appointmentId -> { id, content } | null
  // Grabación de audio para enviar a webhook externo
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const lastAudioBlobRef = useRef(null);
  const lastAudioFilenameRef = useRef('');
  const [recordElapsedMs, setRecordElapsedMs] = useState(0);
  const recordTimerRef = useRef(null);
  const recordAccumMsRef = useRef(0);
  const recordStartRef = useRef(0);
  // Monitor de micrófono para prueba visual
  const [micTestActive, setMicTestActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const micStreamRef = useRef(null);
  const micCtxRef = useRef(null);
  const micSrcRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micRAFRef = useRef(null);
  const [micTestRemainingMs, setMicTestRemainingMs] = useState(0);
  const micTestEndRef = useRef(0);
  // Envío automático al detener
  const pendingAutoSendRef = useRef(false);
  // Estado reactivo para indicar si hay un audio listo para enviar
  const [hasLastAudio, setHasLastAudio] = useState(false);
  // File input para adjuntar audio
  const attachAudioInputRef = useRef(null);
  // Fuente del último audio: 'attached' | 'recorded'
  const lastAudioSourceRef = useRef('');
  // Si es true, descartar el audio grabado cuando se dispare onstop
  const ignoreRecordedOnStopRef = useRef(false);

  const formatDuration = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Normaliza etiquetas/nombres para comparación tolerante: minúsculas, sin acentos, sin espacios extra
  const normalizeLabel = (s) => {
    try {
      return String(s || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .toLowerCase()
        .trim();
    } catch (_) {
      return String(s || '').toLowerCase().trim();
    }
  };

  // Aplica respuesta del webhook (JSON) a la ficha personalizada y guarda nota de Recomendaciones
  const handleWebhookStructuredResponse = async (data) => {
    try {
      if (!data || typeof data !== 'object') return;
      const apptId = viewingAttentionId;
      if (!apptId) return;

      // Ubicar form seleccionado y campos
      const selectedId = selectedCustomFormIdByAppt[apptId];
      if (!selectedId) {
        console.warn('[webhook] No hay ficha seleccionada para autollenado');
      }

      // Resolver especialidad y formulario desde caché
      let specId = null;
      try {
        const appt = attentions.find(a => a.id === apptId);
        specId = appointmentDetails[apptId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
        if (!specId) {
          const specialtyName = appointmentDetails[apptId]?.specialty_name || appt?.specialty || '';
          const spec = specialties.find(s => normalizeLabel(s.name) === normalizeLabel(specialtyName));
          specId = spec?.id || null;
        }
      } catch (_) {}

      let forms = (specId && customFormsCache[String(specId)]) || [];
      let form = (forms || []).find(f => String(f.id) === String(selectedId));
      if (!form) {
        // Buscar en otras especialidades cacheadas
        for (const key of Object.keys(customFormsCache)) {
          const arr = customFormsCache[key] || [];
          const match = arr.find(f => String(f.id) === String(selectedId));
          if (match) { form = match; break; }
        }
      }
      if (!form) return;

      // Construir mapa de etiqueta/nombre normalizado -> field.name
      const labelToFieldName = {};
      (form.fields || []).forEach(field => {
        const label = field?.label || field?.name || '';
        const norm = normalizeLabel(label);
        if (norm) labelToFieldName[norm] = field.name;
      });

      // Preparar nuevos valores fusionados con los actuales
      const currentValues = { ...(customFormValuesByAppt[apptId] || {}) };
      let touched = false;

      for (const [k, v] of Object.entries(data)) {
        const normKey = normalizeLabel(k);
        if (!normKey) continue;
        if (normKey === 'recomendaciones') {
          const rec = typeof v === 'string' ? v : (v != null ? JSON.stringify(v) : '');
          if (rec) addOrUpdateNote(apptId, rec);
          continue;
        }
        const fieldName = labelToFieldName[normKey];
        if (!fieldName) continue;
        const valueStr = typeof v === 'string' ? v : (v != null ? JSON.stringify(v) : '');
        if (currentValues[fieldName] !== valueStr) {
          currentValues[fieldName] = valueStr;
          touched = true;
        }
      }

      if (touched && selectedId) {
        // Guardar en estado y persistir al backend
        setCustomFormValuesByAppt(prev => ({ ...prev, [apptId]: currentValues }));
        try {
          await ensureSpecialtiesLoaded();
          // Asegurar specId si falta
          if (!specId) {
            const appt = attentions.find(a => a.id === apptId);
            const specialtyName = appointmentDetails[apptId]?.specialty_name || appt?.specialty || '';
            const spec = specialties.find(s => normalizeLabel(s.name) === normalizeLabel(specialtyName));
            specId = spec?.id || null;
          }
          if (specId) {
            const payload = { specialtyId: specId, formId: selectedId, values: currentValues };
            await appointmentsAPI.saveCustomForm(apptId, payload);
          }
          toast.success('Ficha autocompletada con la respuesta del webhook');
        } catch (e) {
          console.warn('Error guardando autollenado de ficha:', e);
        }
      }
    } catch (e) {
      console.warn('No se pudo procesar respuesta del webhook para autollenado', e);
    }
  };

  const openRipsDetails = (attentionId) => {
    setRipsForAttentionId(attentionId);
    setShowRipsModal(true);
  };

  // Cargar usuario actual para mostrar en "Creado por"
  useEffect(() => {
    (async () => {
      try {
        const resp = await authAPI.getProfile();
        const u = resp?.data || resp || {};
        const name = [u.first_name || u.firstName, u.last_name || u.lastName].filter(Boolean).join(' ').trim();
        setCurrentUser({ id: u.id, name: name || (u.email || 'Usuario') });
      } catch (_) {
        // ignorar
      }
    })();
  }, []);

  // Cargar Documentos CIE cuando cambia la atención enfocada
  useEffect(() => {
    (async () => {
      try {
        if (!viewingAttentionId) return;
        const resp = await cieDocsAPI.listByAppointment(viewingAttentionId);
        const list = resp?.data?.items || resp?.items || [];
        setCieDocsByAppt(prev => ({ ...prev, [viewingAttentionId]: list.map(it => ({
          version: it.version || 'CIE-10',
          code: it.code,
          name: it.name,
          createdBy: it.createdBy || '',
          createdAt: new Date(it.createdAt).toLocaleString()
        })) }));
      } catch (_) {}
    })();
  }, [viewingAttentionId]);

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

  // Cargar fichas personalizadas guardadas al abrir detalle de una atención
  useEffect(() => {
    const loadSavedCustomForm = async () => {
      if (!viewingAttentionId) return;
      try {
        const resp = await appointmentsAPI.getCustomForms(viewingAttentionId);
        const items = resp.data?.forms || resp.forms || [];
        if (items && items.length) {
          // Elegir el último actualizado o el primero si no hay timestamps
          const sorted = [...items].sort((a, b) => {
            const ta = new Date(a.updated_at || a.created_at || 0).getTime();
            const tb = new Date(b.updated_at || b.created_at || 0).getTime();
            return tb - ta;
          });
          const chosen = sorted[0];
          const parsedValues = typeof chosen.values === 'string' ? (function(){ try { return JSON.parse(chosen.values); } catch(_) { return {}; } })() : (chosen.values || {});
          const restoredId = chosen.form_id != null ? parseInt(chosen.form_id) : '';
          setSelectedCustomFormIdByAppt(prev => ({ ...prev, [viewingAttentionId]: restoredId }));
          setCustomFormValuesByAppt(prev => ({ ...prev, [viewingAttentionId]: parsedValues }));

          // Asegurar que las plantillas de la especialidad estén en caché para poder renderizar y mostrar el nombre seleccionado
          try {
            await ensureSpecialtiesLoaded();
            const appt = attentions.find(a=>a.id===viewingAttentionId);
            let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
            if (!specId) {
              const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
              const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
              specId = spec?.id || null;
            }
            let formsForSpec = [];
            if (specId && !customFormsCache[String(specId)]) {
              const respTpl = await specialtiesAPI.getTemplates(specId, 'customForms');
              formsForSpec = (respTpl.data?.templates || []).map(t => {
                const fieldsRaw = (t.content !== undefined ? t.content : (t.fields !== undefined ? t.fields : []));
                let fields = [];
                if (typeof fieldsRaw === 'string') {
                  try { fields = JSON.parse(fieldsRaw); } catch (_) { fields = []; }
                } else if (Array.isArray(fieldsRaw)) {
                  fields = fieldsRaw;
                } else {
                  fields = [];
                }
                return { id: t.id, name: t.name, fields, isDefault: !!t.is_default, isActive: !!t.is_active };
              });
              setCustomFormsCache(prev => ({ ...prev, [String(specId)]: formsForSpec }));
            } else if (specId) {
              formsForSpec = customFormsCache[String(specId)] || [];
            }
            // Si la plantilla restaurada no está en la especialidad detectada, intentar localizarla en otra especialidad
            const existsInSpec = (formsForSpec || []).some(f => String(f.id) === String(restoredId));
            // Usar lista local de especialidades (sin depender del render state)
            let allSpecs = Array.isArray(specialties) && specialties.length ? specialties : [];
            if (!allSpecs.length) {
              try {
                const sResp = await specialtiesAPI.getAll();
                allSpecs = sResp.data?.specialties || sResp.data || [];
              } catch (_) { allSpecs = []; }
            }
            if (!existsInSpec && Array.isArray(allSpecs) && allSpecs.length) {
              for (const s of allSpecs) {
                try {
                  const cacheKey = String(s.id);
                  let forms = customFormsCache[cacheKey];
                  if (!forms) {
                    const r = await specialtiesAPI.getTemplates(s.id, 'customForms');
                    forms = (r.data?.templates || []).map(t => {
                      const fieldsRaw = (t.content !== undefined ? t.content : (t.fields !== undefined ? t.fields : []));
                      let fields = [];
                      if (typeof fieldsRaw === 'string') {
                        try { fields = JSON.parse(fieldsRaw); } catch (_) { fields = []; }
                      } else if (Array.isArray(fieldsRaw)) {
                        fields = fieldsRaw;
                      } else {
                        fields = [];
                      }
                      return { id: t.id, name: t.name, fields, isDefault: !!t.is_default, isActive: !!t.is_active };
                    });
                    setCustomFormsCache(prev => ({ ...prev, [cacheKey]: forms }));
                  }
                  const match = (forms || []).find(f => String(f.id) === String(restoredId));
                  if (match) break;
                } catch (_) {}
              }
            }
          } catch (_) {}
        }
      } catch (_) {
        // Silencioso: si falla la carga no bloqueamos la UI
      }
    };
    loadSavedCustomForm();
  }, [viewingAttentionId]);

  // Si hay un formId seleccionado pero no está en caché, buscarlo en todas las especialidades y cachearlo para renderizar campos
  useEffect(() => {
    (async () => {
      try {
        if (!viewingAttentionId) return;
        const selectedId = selectedCustomFormIdByAppt[viewingAttentionId];
        if (!selectedId) return;
        const existsSomewhere = Object.values(customFormsCache).some(arr => (arr || []).some(f => String(f.id) === String(selectedId)));
        if (existsSomewhere) return;
        let allSpecs = Array.isArray(specialties) && specialties.length ? specialties : [];
        if (!allSpecs.length) {
          try {
            const sResp = await specialtiesAPI.getAll();
            allSpecs = sResp.data?.specialties || sResp.data || [];
          } catch (_) { allSpecs = []; }
        }
        for (const s of allSpecs) {
          try {
            const cacheKey = String(s.id);
            const r = await specialtiesAPI.getTemplates(s.id, 'customForms');
            const forms = (r.data?.templates || []).map(t => {
              const fieldsRaw = (t.content !== undefined ? t.content : (t.fields !== undefined ? t.fields : []));
              let fields = [];
              if (typeof fieldsRaw === 'string') {
                try { fields = JSON.parse(fieldsRaw); } catch (_) { fields = []; }
              } else if (Array.isArray(fieldsRaw)) {
                fields = fieldsRaw;
              } else {
                fields = [];
              }
              return { id: t.id, name: t.name, fields, isDefault: !!t.is_default, isActive: !!t.is_active };
            });
            setCustomFormsCache(prev => ({ ...prev, [cacheKey]: forms }));
            const match = forms.find(f => String(f.id) === String(selectedId));
            if (match) break;
          } catch (_) {}
        }
      } catch (_) {}
    })();
  }, [selectedCustomFormIdByAppt, viewingAttentionId]);

  // Construye el contexto clínico para el asistente
  const buildAiContext = (appointmentId) => {
    try {
      const appt = attentions.find(a => a.id === appointmentId) || {};
      const details = appointmentDetails[appointmentId] || {};
      const evolutionHtml = evolutionContentByAppt[appointmentId] || '';
      const prescriptionsHtml = prescriptionsContentByAppt[appointmentId] || '';
      const adverseHtml = adverseContentByAppt[appointmentId] || '';
      const consentsHtml = consentsContentByAppt[appointmentId] || '';
      const orders = medicalOrdersByAppt[appointmentId] || [];
      const formId = selectedCustomFormIdByAppt[appointmentId];
      const formValues = (customFormValuesByAppt[appointmentId] || {});

      const context = {
        patient: {
          id: patient?.id,
          firstName: patient?.first_name,
          lastName: patient?.last_name,
          identificationType: patient?.identification_type,
          identificationNumber: patient?.identification_number,
          birthDate: patient?.birth_date,
          age: (typeof calculateAge === 'function' ? calculateAge(patient?.birth_date) : undefined),
          gender: patient?.gender,
          agreement: patient?.agreement,
          patientType: patient?.patient_type,
          medicalHistoryHtml: patient?.medical_history || ''
        },
        appointment: {
          id: appointmentId,
          date: appt.date,
          time: appt.time,
          status: details.status || appt.status,
          type: appt.type,
          specialtyId: details.specialty_id || appt.specialty_id || appt.specialtyId,
          specialtyName: details.specialty_name || appt.specialty,
          doctorFullName: details.doctorFullName || appt.doctor_name,
          resource: details.resource
        },
        htmlSections: {
          evolutionHtml,
          prescriptionsHtml,
          adverseHtml,
          consentsHtml
        },
        medicalOrders: orders,
        customForm: {
          formId,
          values: formValues
        }
      };
      return context;
    } catch (_) {
      return {};
    }
  };

  const appendAiMessage = (appointmentId, role, content) => {
    setAiMessagesByAppt(prev => ({
      ...prev,
      [appointmentId]: [ ...(prev[appointmentId] || []), { role, content } ]
    }));
  };

  useEffect(() => {
    try {
      if (aiScrollRef.current) {
        aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
      }
    } catch (_) {}
  }, [aiMessagesByAppt, aiLoadingByAppt, viewingAttentionId]);

  // Persistencia simple de notas en localStorage por atención
  useEffect(() => {
    try {
      // Nueva clave por paciente para evitar colisiones y pérdidas al recargar
      const keyV2 = `romedicals_notes_v2:patient:${patient?.id || 'unknown'}`;
      const rawV2 = localStorage.getItem(keyV2);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        if (parsed && typeof parsed === 'object') {
          setNotesByAppt(parsed);
          return;
        }
      }
      // Compatibilidad con versión anterior (global)
      const rawV1 = localStorage.getItem('romedicals_notes_v1');
      if (rawV1) {
        const parsed = JSON.parse(rawV1);
        if (parsed && typeof parsed === 'object') {
          setNotesByAppt(parsed);
        }
      }
    } catch (_) {}
  }, [patient?.id]);

  useEffect(() => {
    try {
      const keyV2 = `romedicals_notes_v2:patient:${patient?.id || 'unknown'}`;
      localStorage.setItem(keyV2, JSON.stringify(notesByAppt || {}));
      // Escribir también la v1 para compatibilidad con sesiones abiertas en otras pestañas
      localStorage.setItem('romedicals_notes_v1', JSON.stringify(notesByAppt || {}));
    } catch (_) {}
  }, [notesByAppt, patient?.id]);

  const addOrUpdateNote = (appointmentId, content) => {
    setNotesByAppt(prev => {
      const list = [...(prev[appointmentId] || [])];
      const editing = notesEditingByAppt[appointmentId];
      const now = new Date().toISOString();
      if (editing && editing.id) {
        const idx = list.findIndex(n => n.id === editing.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], content, updatedAt: now };
        }
      } else {
        const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        list.unshift({ id, content, createdAt: now, updatedAt: now });
      }
      const next = { ...prev, [appointmentId]: list };
      // Guardado inmediato para mayor robustez ante recargas rápidas
      try {
        const keyV2 = `romedicals_notes_v2:patient:${patient?.id || 'unknown'}`;
        localStorage.setItem(keyV2, JSON.stringify(next));
        localStorage.setItem('romedicals_notes_v1', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    setNotesInputByAppt(prev => ({ ...prev, [appointmentId]: '' }));
    setNotesEditingByAppt(prev => ({ ...prev, [appointmentId]: null }));
  };

  const startEditNote = (appointmentId, note) => {
    setNotesEditingByAppt(prev => ({ ...prev, [appointmentId]: { id: note.id, content: note.content } }));
    setNotesInputByAppt(prev => ({ ...prev, [appointmentId]: note.content }));
  };

  const cancelEditNote = (appointmentId) => {
    setNotesEditingByAppt(prev => ({ ...prev, [appointmentId]: null }));
    setNotesInputByAppt(prev => ({ ...prev, [appointmentId]: '' }));
  };

  const startAudioRecording = async () => {
    if (isRecordingAudio || uploadingAudio) return;
    try {
      // Iniciar nueva grabación invalida el último audio listo
      lastAudioBlobRef.current = null;
      lastAudioFilenameRef.current = '';
      setHasLastAudio(false);
      lastAudioSourceRef.current = '';
      ignoreRecordedOnStopRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          // Detener tracks del stream
          try { (mediaStreamRef.current?.getTracks() || []).forEach(t => t.stop()); } catch (_) {}
          // Si se solicitó enviar mientras grababa/pausado, enviar ahora
          if (pendingAutoSendRef.current) {
            pendingAutoSendRef.current = false;
            try {
              // Si se adjuntó un archivo durante la grabación, priorizar el adjunto
              const toSend = lastAudioSourceRef.current === 'attached' && lastAudioBlobRef.current ? lastAudioBlobRef.current : blob;
              await uploadAudioBlob(toSend);
            } catch (e) {
              console.error('Autoenvío falló:', e);
            } finally {
              // Limpiar para evitar dobles envíos y reflejar estado
              lastAudioBlobRef.current = null;
              lastAudioFilenameRef.current = '';
              lastAudioSourceRef.current = '';
              setHasLastAudio(false);
            }
          } else {
            // Si se adjuntó un archivo mientras grababa, ignorar el grabado
            if (ignoreRecordedOnStopRef.current || lastAudioSourceRef.current === 'attached') {
              // Mantener adjunto como último
              // No modificar lastAudioBlobRef ni filename
              // Asegurar bandera lista para enviar
              setHasLastAudio(!!lastAudioBlobRef.current);
              toast.success('Archivo adjunto listo para enviar');
            } else {
              // Dejar grabación como última si no hay adjunto
              lastAudioBlobRef.current = blob;
              lastAudioFilenameRef.current = `audio-${Date.now()}.webm`;
              lastAudioSourceRef.current = 'recorded';
              setHasLastAudio(true);
              toast.success('Grabación lista para enviar');
            }
          }
        } catch (err) {
          console.error('Error procesando audio:', err);
          toast.error('No se pudo procesar el audio');
        } finally {
          mediaRecorderRef.current = null;
          mediaStreamRef.current = null;
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecordingAudio(true);
      setIsPausedAudio(false);
      // Timer
      recordAccumMsRef.current = 0;
      recordStartRef.current = Date.now();
      setRecordElapsedMs(0);
      try { if (recordTimerRef.current) clearInterval(recordTimerRef.current); } catch (_) {}
      recordTimerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = recordAccumMsRef.current + (now - recordStartRef.current);
        setRecordElapsedMs(elapsed);
      }, 500);
      toast.success('Grabación iniciada');
    } catch (err) {
      console.error('No se pudo iniciar la grabación:', err);
      toast.error('Permiso de micrófono denegado o no disponible');
    }
  };

  const stopAudioRecording = () => {
    if (!isRecordingAudio || !mediaRecorderRef.current) return;
    try {
      mediaRecorderRef.current.stop();
    } catch (_) {}
    setIsRecordingAudio(false);
    setIsPausedAudio(false);
    try { if (recordTimerRef.current) clearInterval(recordTimerRef.current); } catch (_) {}
    recordTimerRef.current = null;
    recordAccumMsRef.current = 0;
    recordStartRef.current = 0;
    setRecordElapsedMs(0);
    toast('Grabación detenida');
  };

  const pauseOrResumeRecording = () => {
    if (!isRecordingAudio || !mediaRecorderRef.current) return;
    try {
      if (!isPausedAudio) {
        mediaRecorderRef.current.pause();
        setIsPausedAudio(true);
        toast('Grabación en pausa');
        try {
          if (recordTimerRef.current) clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
          recordAccumMsRef.current = recordAccumMsRef.current + (Date.now() - recordStartRef.current);
        } catch (_) {}
      } else {
        mediaRecorderRef.current.resume();
        setIsPausedAudio(false);
        toast('Grabación reanudada');
        recordStartRef.current = Date.now();
        try { if (recordTimerRef.current) clearInterval(recordTimerRef.current); } catch (_) {}
        recordTimerRef.current = setInterval(() => {
          const now = Date.now();
          const elapsed = recordAccumMsRef.current + (now - recordStartRef.current);
          setRecordElapsedMs(elapsed);
        }, 500);
      }
    } catch (err) {
      console.error('No se pudo pausar/reanudar:', err);
    }
  };

  const testSound = async () => {
    // Mostrar que el mic recibe señal (sin reproducir audio)
    if (micTestActive) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      micCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      micSrcRef.current = src;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;
      micAnalyserRef.current = analyser;
      src.connect(analyser);
      setMicTestActive(true);
      micTestEndRef.current = Date.now() + 5000;
      setMicTestRemainingMs(5000);
      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        // Medición sensible: combinar pico y RMS
        let sum = 0;
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
          const av = Math.abs(v);
          if (av > peak) peak = av;
        }
        const rms = Math.sqrt(sum / data.length);
        const weighted = Math.max(peak, rms * 0.5);
        setMicLevel(Math.min(1, weighted * 6));
        const remain = Math.max(0, micTestEndRef.current - Date.now());
        setMicTestRemainingMs(remain);
        micRAFRef.current = requestAnimationFrame(loop);
      };
      loop();
      // Detener después de 5 segundos
      setTimeout(() => {
        try { if (micRAFRef.current) cancelAnimationFrame(micRAFRef.current); } catch (_) {}
        micRAFRef.current = null;
        try { (micStreamRef.current?.getTracks() || []).forEach(t => t.stop()); } catch (_) {}
        try { micCtxRef.current?.close(); } catch (_) {}
        micStreamRef.current = null;
        micCtxRef.current = null;
        micSrcRef.current = null;
        micAnalyserRef.current = null;
        setMicTestActive(false);
        setMicLevel(0);
        setMicTestRemainingMs(0);
      }, 5000);
    } catch (e) {
      console.error('No se pudo iniciar prueba de micrófono:', e);
      toast.error('No se pudo acceder al micrófono');
    }
  };

  const handleAttachClick = () => {
    try {
      if (isRecordingAudio) {
        toast.error('Detén la grabación para adjuntar un archivo');
        return;
      }
      attachAudioInputRef.current?.click();
    } catch (_) {}
  };

  const handleAudioFileSelected = (e) => {
    try {
      const file = e?.target?.files?.[0];
      if (!file) return;
      const type = String(file.type || '').toLowerCase();
      const name = String(file.name || '');
      const ext = name.split('.').pop()?.toLowerCase() || '';
      const isAudioLike = type.startsWith('audio/');
      const isWebm = type === 'video/webm' || ext === 'webm';
      if (!isAudioLike && !isWebm) {
        toast.error('Selecciona un archivo de audio (.webm permitido)');
        try { e.target.value = ''; } catch (_) {}
        return;
      }
      lastAudioBlobRef.current = file;
      lastAudioFilenameRef.current = file.name || `audio-file-${Date.now()}`;
      lastAudioSourceRef.current = 'attached';
      // Si está grabando, marcar para ignorar el blob grabado cuando termine
      if (isRecordingAudio) {
        ignoreRecordedOnStopRef.current = true;
      }
      setHasLastAudio(true);
      toast.success('Audio adjuntado, listo para enviar');
    } catch (err) {
      console.error('Error adjuntando audio:', err);
      toast.error('No se pudo adjuntar el audio');
    } finally {
      try { if (e?.target) e.target.value = ''; } catch (_) {}
    }
  };

  const sendLastAudio = async () => {
    // Si está grabando o en pausa: detener y enviar cuando termine onstop
    if (isRecordingAudio && mediaRecorderRef.current) {
      if (uploadingAudio) return;
      pendingAutoSendRef.current = true;
      try { mediaRecorderRef.current.stop(); } catch (_) {}
      setIsRecordingAudio(false);
      setIsPausedAudio(false);
      try { if (recordTimerRef.current) clearInterval(recordTimerRef.current); } catch (_) {}
      recordTimerRef.current = null;
      return;
    }
    const blob = lastAudioBlobRef.current;
    if (!blob) {
      toast.error('No hay audio para enviar');
      return;
    }
    await uploadAudioBlob(blob);
    // Limpiar para evitar doble envío del mismo blob
    lastAudioBlobRef.current = null;
    lastAudioFilenameRef.current = '';
    lastAudioSourceRef.current = '';
    setHasLastAudio(false);
  };

  useEffect(() => {
    return () => {
      try { if (recordTimerRef.current) clearInterval(recordTimerRef.current); } catch (_) {}
      recordTimerRef.current = null;
      try { if (micRAFRef.current) cancelAnimationFrame(micRAFRef.current); } catch (_) {}
      micRAFRef.current = null;
      try { (micStreamRef.current?.getTracks() || []).forEach(t => t.stop()); } catch (_) {}
      try { micCtxRef.current?.close(); } catch (_) {}
    };
  }, []);

  const getAudioArcButtons = () => {
    const items = [];
    items.push({ key: 'test', onClick: testSound, label: '♪', title: 'Prueba de sonido' });
    items.push({ key: 'attach', onClick: handleAttachClick, label: '📎', title: 'Adjuntar audio' });
    if (!isRecordingAudio) {
      items.push({ key: 'start', onClick: startAudioRecording, label: '⏺', title: 'Iniciar grabación' });
    } else {
      items.push({ key: 'pause', onClick: pauseOrResumeRecording, label: isPausedAudio ? '⏵' : '⏸', title: isPausedAudio ? 'Reanudar' : 'Pausar' });
      items.push({ key: 'stop', onClick: stopAudioRecording, label: '■', title: 'Detener' });
    }
    // Permitir enviar si hay blob listo o si está grabando/pausado (hará stop+enviar)
    const canSendNow = hasLastAudio || isRecordingAudio;
    items.push({ key: 'send', onClick: sendLastAudio, label: '➤', title: 'Enviar audio', disabled: !canSendNow || uploadingAudio });
    return items;
  };

  const uploadAudioBlob = async (blob) => {
    try {
      setUploadingAudio(true);
      const url = 'https://webhook.latenode.com/17495/prod/1c2ca0b9-9338-4ac6-b3c7-d8b6e96ef65e';
      const filename = `audio-${Date.now()}.webm`;

      // Intento 1: multipart/form-data (campos comunes: file y audio)
      const form = new FormData();
      form.append('file', blob, filename);
      form.append('audio', blob, filename);
      form.append('patientId', String(patient?.id || ''));
      form.append('appointmentId', String(viewingAttentionId || ''));
      form.append('userAgent', navigator.userAgent || '');
      // Adjuntar JSON con los campos de la ficha personalizada
      let debugMeta = null;
      try {
        const customFormValues = (customFormValuesByAppt && viewingAttentionId) ? (customFormValuesByAppt[viewingAttentionId] || {}) : {};
        const customFormId = (selectedCustomFormIdByAppt && viewingAttentionId) ? (selectedCustomFormIdByAppt[viewingAttentionId] || '') : '';
        // localiza nombre y schema (fields) de la ficha
        let customFormName = '';
        let customFormSchema = [];
        let customFormFieldNames = [];
        try {
          const appt = attentions.find(a=>a.id===viewingAttentionId);
          let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
          if (!specId) {
            const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
            const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
            specId = spec?.id || null;
          }
          const forms = customFormsCache[String(specId)] || [];
          const formObj = forms.find(f => String(f.id) === String(customFormId));
          if (formObj) {
            customFormName = formObj.name || '';
            customFormSchema = Array.isArray(formObj.fields) ? formObj.fields : [];
            customFormFieldNames = (formObj.fields || []).map(f => (f.label || f.name || '')).filter(Boolean);
          }
        } catch (_) {}
        const customFormPayload = {
          customFormId: customFormId || '',
          customFormName,
          schema: customFormSchema,
          values: customFormValues || {}
        };
        // Campos planos
        form.append('customFormValuesJson', JSON.stringify(customFormPayload.values));
        form.append('customFormId', String(customFormPayload.customFormId));
        form.append('customFormFieldNamesJson', JSON.stringify(customFormFieldNames));
        // Campo combinado para facilitar debug en receptor
        debugMeta = {
          patientId: patient?.id || '',
          appointmentId: viewingAttentionId || '',
          customFormId: customFormPayload.customFormId,
          customFormName: customFormPayload.customFormName,
          customFormSchema: customFormPayload.schema,
          customFormFieldNames,
          customFormValues: customFormPayload.values,
          userAgent: navigator.userAgent || ''
        };
        form.append('meta', JSON.stringify(debugMeta));
      } catch (_) {
        // ignorar si no existen estados de ficha personalizada
      }

      // Log de verificación: qué se está enviando en el FormData
      try {
        const debugEntries = {};
        for (const [key, val] of form.entries()) {
          if (val instanceof Blob) {
            debugEntries[key] = { isFile: true, type: val.type, size: val.size };
          } else {
            const strVal = String(val);
            debugEntries[key] = strVal.length > 500 ? (strVal.slice(0, 500) + '…') : strVal;
          }
        }
        console.log('[uploadAudioBlob] Enviando FormData →', debugEntries);
      } catch (e) {
        console.warn('[uploadAudioBlob] No se pudo inspeccionar FormData', e);
      }
      let resp = await fetch(url, { method: 'POST', body: form });
      try {
        const ct = (resp.headers && resp.headers.get && resp.headers.get('content-type')) || '';
        if (ct.includes('application/json')) {
          const json = await resp.clone().json().catch(()=>null);
          console.log('[uploadAudioBlob] Respuesta multipart (JSON):', json);
          if (json && typeof json === 'object') {
            handleWebhookStructuredResponse(json);
          }
        } else {
          const txt = await resp.clone().text().catch(()=>'(sin texto)');
          const trimmed = (txt || '').slice(0, 2000);
          console.log('[uploadAudioBlob] Respuesta multipart (texto):', trimmed);
          // Intentar parsear JSON si parece objeto
          try {
            const maybe = JSON.parse(txt);
            if (maybe && typeof maybe === 'object') handleWebhookStructuredResponse(maybe);
          } catch (_) {}
        }
      } catch (e) {
        console.warn('[uploadAudioBlob] No se pudo leer respuesta multipart', e);
      }

      // Intento 2 (fallback): enviar raw binary con content-type audio/webm
      if (!resp.ok) {
        // Incluir metadatos mínimamente como query string
        let metaUrl = url;
        try {
          const meta = debugMeta || {
            patientId: patient?.id || '',
            appointmentId: viewingAttentionId || '',
            customFormId: (selectedCustomFormIdByAppt && viewingAttentionId) ? (selectedCustomFormIdByAppt[viewingAttentionId] || '') : '',
            customFormName: (function(){
              try {
                const appt = attentions.find(a=>a.id===viewingAttentionId);
                let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
                if (!specId) {
                  const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
                  const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
                  specId = spec?.id || null;
                }
                const forms = customFormsCache[String(specId)] || [];
                const formObj = forms.find(f => String(f.id) === String((selectedCustomFormIdByAppt && viewingAttentionId) ? (selectedCustomFormIdByAppt[viewingAttentionId] || '') : ''));
                return formObj?.name || '';
              } catch(_) { return ''; }
            })(),
            customFormSchema: (function(){
              try {
                const appt = attentions.find(a=>a.id===viewingAttentionId);
                let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
                if (!specId) {
                  const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
                  const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
                  specId = spec?.id || null;
                }
                const forms = customFormsCache[String(specId)] || [];
                const formObj = forms.find(f => String(f.id) === String((selectedCustomFormIdByAppt && viewingAttentionId) ? (selectedCustomFormIdByAppt[viewingAttentionId] || '') : ''));
                return Array.isArray(formObj?.fields) ? formObj.fields : [];
              } catch(_) { return []; }
            })(),
            customFormFieldNames: (function(){
              try {
                const appt = attentions.find(a=>a.id===viewingAttentionId);
                let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
                if (!specId) {
                  const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
                  const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
                  specId = spec?.id || null;
                }
                const forms = customFormsCache[String(specId)] || [];
                const formObj = forms.find(f => String(f.id) === String((selectedCustomFormIdByAppt && viewingAttentionId) ? (selectedCustomFormIdByAppt[viewingAttentionId] || '') : ''));
                return Array.isArray(formObj?.fields) ? (formObj.fields || []).map(f => (f.label || f.name || '')).filter(Boolean) : [];
              } catch(_) { return []; }
            })(),
            customFormValues: (customFormValuesByAppt && viewingAttentionId) ? (customFormValuesByAppt[viewingAttentionId] || {}) : {},
            userAgent: navigator.userAgent || ''
          };
          const qs = encodeURIComponent(JSON.stringify(meta));
          metaUrl = `${url}?meta=${qs}`;
          console.log('[uploadAudioBlob] Fallback URL con meta →', metaUrl);
        } catch (_) {}
        resp = await fetch(metaUrl, {
          method: 'POST',
          headers: { 'Content-Type': (blob && blob.type) ? blob.type : 'application/octet-stream' },
          body: blob
        });
        try {
          const ct2 = (resp.headers && resp.headers.get && resp.headers.get('content-type')) || '';
          if (ct2.includes('application/json')) {
            const json2 = await resp.clone().json().catch(()=>null);
            console.log('[uploadAudioBlob] Respuesta fallback (JSON):', json2);
            if (json2 && typeof json2 === 'object') {
              handleWebhookStructuredResponse(json2);
            }
          } else {
            const txt2 = await resp.clone().text().catch(()=>'(sin texto)');
            const trimmed2 = (txt2 || '').slice(0, 2000);
            console.log('[uploadAudioBlob] Respuesta fallback (texto):', trimmed2);
            // Intentar parsear JSON si parece objeto
            try {
              const maybe2 = JSON.parse(txt2);
              if (maybe2 && typeof maybe2 === 'object') handleWebhookStructuredResponse(maybe2);
            } catch (_) {}
          }
        } catch (e) {
          console.warn('[uploadAudioBlob] No se pudo leer respuesta fallback', e);
        }
      }

      if (!resp.ok) {
        let txt = '';
        try { txt = await resp.text(); } catch(_) {}
        throw new Error(txt || 'El servidor rechazó el archivo');
      }
      try {
        console.log('[uploadAudioBlob] Envío exitoso. Status:', resp.status);
      } catch (_) {}
      toast.success('Audio enviado');
    } catch (err) {
      console.error('Error enviando audio:', err);
      toast.error('No se pudo enviar el audio (revisa CORS y conectividad)');
    } finally {
      setUploadingAudio(false);
    }
  };

  // Construir resumen clínico consolidado del paciente
  const buildPatientSummary = () => {
    try {
      const lines = [];
      lines.push(`# Paciente`);
      lines.push(`Nombre: ${patient?.first_name || ''} ${patient?.last_name || ''}`.trim());
      lines.push(`Documento: ${patient?.identification_type || ''} ${patient?.identification_number || ''}`.trim());
      lines.push(`Edad: ${typeof calculateAge === 'function' ? calculateAge(patient?.birth_date) : ''}`);
      lines.push(`Tipo: ${patient?.patient_type || ''}`);
      lines.push('');
      lines.push(`# Resumen de atenciones`);
      (attentions || []).forEach((a) => {
        const date = a.date || a.appointment_date || a.appointmentDate || '';
        lines.push(`- ${date} • ${a.type || 'Atención'} • ${a.specialty || ''} • ${a.doctor_name || ''}`);
        if (a.reason) lines.push(`  Motivo: ${a.reason}`);
      });
      lines.push('');
      lines.push(`# Documentos clínicos y secciones actuales`);
      const currentId = viewingAttentionId;
      const evol = evolutionContentByAppt[currentId] || '';
      const presc = prescriptionsContentByAppt[currentId] || '';
      const adverse = adverseContentByAppt[currentId] || '';
      const cons = consentsContentByAppt[currentId] || '';
      if (evol) lines.push(`## Evolución actual\n${evol.replace(/<[^>]+>/g, ' ')}`);
      if (presc) lines.push(`## Prescripción actual\n${presc.replace(/<[^>]+>/g, ' ')}`);
      if (adverse) lines.push(`## Eventos adversos actuales\n${adverse.replace(/<[^>]+>/g, ' ')}`);
      if (cons) lines.push(`## Consentimientos actuales\n${cons.replace(/<[^>]+>/g, ' ')}`);

      return lines.join('\n');
    } catch (_) { return ''; }
  };

  const openSummary = async () => {
    try {
      setSummaryLoading(true);
      setShowSummaryModal(true);
      const plain = buildPatientSummary();
      let content = plain;
      try {
        const prompt = `Genera un resumen clínico claro y conciso del siguiente historial y datos del paciente. Destaca diagnósticos, tratamientos, evolución, riesgos y próximos pasos. Devuelve en formato Markdown con secciones:
        - Datos del paciente
        - Línea de tiempo de atenciones
        - Diagnósticos y hallazgos clave
        - Tratamientos/prescripciones relevantes
        - Riesgos y alertas
        - Recomendaciones y próximos pasos

        CONTENIDO:
        ${plain}`;
        const resp = await aiAPI.assist({ prompt });
        const aiText = resp?.data?.text || resp?.data?.content || resp?.text || '';
        if (aiText) content = aiText;
      } catch (_) {
        // Si falla la IA, mostramos el consolidado plano
      }
      setSummaryContent(content);
    } catch (_) {
      setSummaryContent('No se pudo generar el resumen.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const sendAiPrompt = async (appointmentId, intent, userPrompt) => {
    if (!appointmentId) return;
    const prompt = (userPrompt || '').trim();
    if (!prompt && intent === 'chat') return;

    try {
      setAiLoadingByAppt(prev => ({ ...prev, [appointmentId]: true }));
      if (prompt) appendAiMessage(appointmentId, 'user', prompt);

      const context = buildAiContext(appointmentId);
      const payload = {
        intent, // 'chat' | 'evolution' | 'prescription' | 'custom_form_fill'
        prompt: prompt || undefined,
        patientId: patient?.id,
        appointmentId,
        context
      };

      const resp = await aiAPI.assist(payload);
      const data = resp?.data || {};
      const message = data.message || data.reply || data.text || '';
      if (message) appendAiMessage(appointmentId, 'assistant', message);

      // Aplicación automática según intent
      if (intent === 'evolution' && (data.suggestedEvolutionHtml || data.html || message)) {
        const html = data.suggestedEvolutionHtml || data.html || message;
        setEvolutionContentByAppt(prev => ({ ...prev, [appointmentId]: html }));
        toast.success('Evolución sugerida aplicada');
      }
      if (intent === 'prescription' && (data.suggestedPrescriptionHtml || data.html || message)) {
        const html = data.suggestedPrescriptionHtml || data.html || message;
        setPrescriptionsContentByAppt(prev => ({ ...prev, [appointmentId]: html }));
        toast.success('Prescripción sugerida aplicada');
      }
      if (intent === 'clinical_history' && (data.suggestedHistoryHtml || data.html || message)) {
        const html = data.suggestedHistoryHtml || data.html || message;
        setHistoryDraft(html);
        setShowHistoryEditor(true);
        toast.success('Antecedentes sugeridos aplicados');
      }
      if (intent === 'custom_form_fill' && (data.fields || data.values)) {
        const values = data.fields || data.values || {};
        setCustomFormValuesByAppt(prev => ({
          ...prev,
          [appointmentId]: { ...(prev[appointmentId] || {}), ...values }
        }));
        toast.success('Ficha rellenada con IA');
      }
      if (intent === 'full_fill') {
        // Guardar en estado de preview sin aplicar
        const preview = {
          historyHtml: data.suggestedHistoryHtml || '',
          evolutionHtml: data.suggestedEvolutionHtml || '',
          prescriptionHtml: data.suggestedPrescriptionHtml || '',
          fields: data.fields || data.values || {}
        };
        setAiPreviewByAppt(prev => ({ ...prev, [appointmentId]: preview }));
        setShowAiPreview(true);
      }
    } catch (e) {
      try {
        const respData = e?.response?.data;
        const msg = respData?.error || respData?.message || e?.message || 'Error en el asistente';
        if (respData?.details) console.error('AI details:', respData.details);
        console.error('Error asistente IA:', e);
        toast.error(msg);
      } catch (_) {
        console.error('Error asistente IA:', e);
        toast.error('Error en el asistente');
      }
    } finally {
      setAiLoadingByAppt(prev => ({ ...prev, [appointmentId]: false }));
      setAiInputByAppt(prev => ({ ...prev, [appointmentId]: '' }));
    }
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
    if (tabFromUrl && ['clinical', 'administrative', 'anamnesis'].includes(tabFromUrl)) {
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
                                    <button onClick={() => openRipsDetails(appt.id)} className="bg-gray-600 text-white px-3 py-1 rounded text-xs md:text-sm">
                                      <span style={{ fontSize: '12px', marginRight: '4px' }}>⚠️</span>
                                      Detalles RIPS
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
                <button onClick={() => openRipsDetails(viewingAttentionId)} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">
                  <span style={{ fontSize: '12px', marginRight: '4px' }}>⚠️</span>
                  Detalles RIPS
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
                      className="btn-secondary text-xs md:text-sm"
                      onClick={()=>setShowAiPanel(v=>!v)}
                    >
                      {showAiPanel ? 'Ocultar IA' : 'Asistente IA'}
                    </button>
                    <button
                      type="button"
                      onClick={openSummary}
                      className="btn-secondary text-xs md:text-sm"
                      title="Ver resumen clínico"
                    >
                      Resumen
                    </button>
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
                  <div><span className="text-gray-500">Especialidad:</span> <span className="text-blue-600 font-medium">{appointmentDetails[viewingAttentionId]?.specialty_name || attentions.find(a=>a.id===viewingAttentionId)?.specialty || '—'}</span></div>
                  <div><span className="text-gray-500">Sucursal:</span> <span className="text-blue-600 font-medium">IPS ROGANS SAS</span></div>
                  <div><span className="text-gray-500">Convenio:</span> <span className="text-blue-600 font-medium">{patient.agreement || 'Sin convenio'}</span></div>
                  <div><span className="text-gray-500">Tipo de paciente:</span> <span className="text-blue-600 font-medium">{patient.patient_type ? formatTitleCase(patient.patient_type) : 'Particular'}</span></div>
                </div>

              </div>
            </div>
          </div>
          {showAiPanel && (
            <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[90vw] shadow-xl border rounded-lg bg-white">
              <div className="px-3 py-2 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">Asistente de IA</span>
                </div>
                <button type="button" className="text-gray-500 hover:text-gray-700" onClick={()=>setShowAiPanel(false)} aria-label="Cerrar">×</button>
              </div>
              <div className="p-3">
                <style>{`
                  @keyframes fadeInUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                  @keyframes dotPulse { 0% { transform: translateY(0); opacity: .4; } 50% { transform: translateY(-3px); opacity: 1; } 100% { transform: translateY(0); opacity: .4; } }
                `}</style>
                <div className="h-64 overflow-y-auto border rounded p-2 bg-white" ref={aiScrollRef}>
                  {(aiMessagesByAppt[viewingAttentionId] || []).length === 0 && (
                    <div className="text-sm text-gray-500">Inicia una consulta. El asistente considerará datos del paciente y de la atención actual.</div>
                  )}
                  {(aiMessagesByAppt[viewingAttentionId] || []).map((m, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="text-xs text-gray-500">{m.role === 'user' ? 'Médico' : 'Asistente'}</div>
                      <div className={m.role === 'user' ? 'bg-blue-50 border border-blue-200 rounded p-2 text-sm' : 'bg-gray-50 border border-gray-200 rounded p-2 text-sm'}
                        style={{ animation: 'fadeInUp 220ms ease-out' }}
                        dangerouslySetInnerHTML={{ __html: /<\w+[^>]*>/.test(m.content) ? m.content : (m.content || '').replace(/\n/g,'<br>') }}
                      />
                    </div>
                  ))}
                  {aiLoadingByAppt[viewingAttentionId] && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-500">Asistente</div>
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-sm inline-flex items-center space-x-1" style={{ animation: 'fadeInUp 200ms ease-out' }}>
                        <span className="w-2 h-2 bg-gray-400 rounded-full" style={{ animation: 'dotPulse 1s infinite', animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full" style={{ animation: 'dotPulse 1s infinite', animationDelay: '200ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full" style={{ animation: 'dotPulse 1s infinite', animationDelay: '400ms' }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <textarea
                    className="input-field flex-1"
                    rows="2"
                    placeholder="Escribe tu consulta clínica..."
                    value={aiInputByAppt[viewingAttentionId] || ''}
                    onChange={(e)=>setAiInputByAppt(prev=>({ ...prev, [viewingAttentionId]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={()=>sendAiPrompt(viewingAttentionId,'chat', aiInputByAppt[viewingAttentionId] || '')}
                    disabled={!!aiLoadingByAppt[viewingAttentionId]}
                  >
                    {aiLoadingByAppt[viewingAttentionId] ? 'Enviando...' : 'Enviar'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={()=>sendAiPrompt(viewingAttentionId,'full_fill', aiInputByAppt[viewingAttentionId] || 'Generar borrador de atención completo')}
                    disabled={!!aiLoadingByAppt[viewingAttentionId]}
                  >
                    {aiLoadingByAppt[viewingAttentionId] ? 'Generando...' : 'Prellenado IA'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {showNotesPanel && (
            <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[90vw] shadow-xl border rounded-lg bg-white">
              <div className="px-3 py-2 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">Notas del médico</span>
                </div>
                <button type="button" className="text-gray-500 hover:text-gray-700" onClick={()=>setShowNotesPanel(false)} aria-label="Cerrar">×</button>
              </div>
              <div className="p-3">
                <style>{`
                  @keyframes fadeInUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
                <div className="h-64 overflow-y-auto border rounded p-2 bg-white">
                  {((notesByAppt[viewingAttentionId] || [])).length === 0 && (
                    <div className="text-sm text-gray-500">No hay notas. Escribe una nota y guárdala.</div>
                  )}
                  {(notesByAppt[viewingAttentionId] || []).map((n) => (
                    <div key={n.id} className="mb-2" style={{ animation: 'fadeInUp 220ms ease-out' }}>
                      <div className="text-xs text-gray-500 mb-1">
                        Creada: {new Date(n.createdAt).toLocaleString()} {n.updatedAt && n.updatedAt !== n.createdAt ? ` • Editada: ${new Date(n.updatedAt).toLocaleString()}` : ''}
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-sm whitespace-pre-wrap">{n.content}</div>
                      <div className="mt-1">
                        <button className="text-xs text-blue-600 hover:underline" onClick={()=>startEditNote(viewingAttentionId, n)}>Editar</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <textarea
                    className="input-field flex-1"
                    rows="3"
                    placeholder="Escribe una nota..."
                    value={notesInputByAppt[viewingAttentionId] || ''}
                    onChange={(e)=>setNotesInputByAppt(prev=>({ ...prev, [viewingAttentionId]: e.target.value }))}
                  />
                  <div className="flex flex-col gap-1">
                    {notesEditingByAppt[viewingAttentionId]?.id ? (
                      <>
                        <button type="button" className="btn-primary" onClick={()=>addOrUpdateNote(viewingAttentionId, notesInputByAppt[viewingAttentionId] || '')}>Guardar</button>
                        <button type="button" className="btn-secondary" onClick={()=>cancelEditNote(viewingAttentionId)}>Cancelar</button>
                      </>
                    ) : (
                      <button type="button" className="btn-primary" onClick={()=>addOrUpdateNote(viewingAttentionId, notesInputByAppt[viewingAttentionId] || '')} disabled={!((notesInputByAppt[viewingAttentionId]||'').trim())}>Agregar</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {showAiPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white w-[min(920px,95vw)] max-h-[85vh] rounded-lg shadow-xl border flex flex-col">
                <div className="px-4 py-2 border-b flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Vista previa IA</h3>
                  <button className="text-gray-500 hover:text-gray-700" onClick={()=>setShowAiPreview(false)}>×</button>
                </div>
                <div className="p-4 overflow-y-auto space-y-4">
                  {(() => {
                    const pv = aiPreviewByAppt[viewingAttentionId] || {};
                    const hasAny = pv.historyHtml || pv.evolutionHtml || pv.prescriptionHtml || (pv.fields && Object.keys(pv.fields).length);
                    if (!hasAny) return <div className="text-sm text-gray-500">No hay sugerencias para mostrar.</div>;
                    const include = aiPreviewIncludeByAppt[viewingAttentionId] || { history: true, evolution: true, prescription: true, fields: true };
                    const edits = aiPreviewEditsByAppt[viewingAttentionId] || { historyHtml: pv.historyHtml, evolutionHtml: pv.evolutionHtml, prescriptionHtml: pv.prescriptionHtml };
                    const setEdit = (key, val) => {
                      setAiPreviewEditsByAppt(prev => ({ ...prev, [viewingAttentionId]: { ...(prev[viewingAttentionId]||{}), [key]: val } }));
                    };
                    return (
                      <>
                        {pv.historyHtml && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-medium text-gray-600">Antecedentes clínicos (propuesta)</div>
                              <label className="text-xs flex items-center gap-1">
                                <input type="checkbox" className="rounded" checked={include.history !== false} onChange={(e)=>setAiPreviewIncludeByAppt(prev=>({ ...prev, [viewingAttentionId]: { ...(prev[viewingAttentionId]||{}), history: e.target.checked } }))} /> Incluir
                              </label>
                            </div>
                            <div className="border rounded bg-white">
                              <ReactQuill theme="snow" value={edits.historyHtml ?? pv.historyHtml} onChange={(html)=>setEdit('historyHtml', html)} />
                            </div>
                          </div>
                        )}
                        {pv.evolutionHtml && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-medium text-gray-600">Evolución (propuesta)</div>
                              <label className="text-xs flex items-center gap-1">
                                <input type="checkbox" className="rounded" checked={include.evolution !== false} onChange={(e)=>setAiPreviewIncludeByAppt(prev=>({ ...prev, [viewingAttentionId]: { ...(prev[viewingAttentionId]||{}), evolution: e.target.checked } }))} /> Incluir
                              </label>
                            </div>
                            <div className="border rounded bg-white">
                              <ReactQuill theme="snow" value={edits.evolutionHtml ?? pv.evolutionHtml} onChange={(html)=>setEdit('evolutionHtml', html)} />
                            </div>
                          </div>
                        )}
                        {pv.prescriptionHtml && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-medium text-gray-600">Prescripción (propuesta)</div>
                              <label className="text-xs flex items-center gap-1">
                                <input type="checkbox" className="rounded" checked={include.prescription !== false} onChange={(e)=>setAiPreviewIncludeByAppt(prev=>({ ...prev, [viewingAttentionId]: { ...(prev[viewingAttentionId]||{}), prescription: e.target.checked } }))} /> Incluir
                              </label>
                            </div>
                            <div className="border rounded bg-white">
                              <ReactQuill theme="snow" value={edits.prescriptionHtml ?? pv.prescriptionHtml} onChange={(html)=>setEdit('prescriptionHtml', html)} />
                            </div>
                          </div>
                        )}
                        {pv.fields && Object.keys(pv.fields || {}).length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xs font-medium text-gray-600">Fichas personalizadas (relleno propuesto)</div>
                              <label className="text-xs flex items-center gap-1">
                                <input type="checkbox" className="rounded" checked={include.fields !== false} onChange={(e)=>setAiPreviewIncludeByAppt(prev=>({ ...prev, [viewingAttentionId]: { ...(prev[viewingAttentionId]||{}), fields: e.target.checked } }))} /> Incluir
                              </label>
                            </div>
                            <div className="border rounded p-2 bg-gray-50">
                              {Object.entries(pv.fields).map(([k,v]) => (
                                <div key={String(k)} className="text-xs text-gray-700"><span className="font-medium">{k}:</span> {Array.isArray(v) ? v.join(', ') : String(v)}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
                  <button className="btn-secondary" onClick={()=>setShowAiPreview(false)}>Cancelar</button>
                  <button className="btn-primary" onClick={()=>{
                    try {
                      const pv = aiPreviewByAppt[viewingAttentionId] || {};
                      const include = aiPreviewIncludeByAppt[viewingAttentionId] || { history: true, evolution: true, prescription: true, fields: true };
                      const edits = aiPreviewEditsByAppt[viewingAttentionId] || {};
                      if (include.history !== false && pv.historyHtml) {
                        setHistoryDraft(edits.historyHtml ?? pv.historyHtml);
                        setShowHistoryEditor(true);
                      }
                      if (include.evolution !== false && pv.evolutionHtml) {
                        setShowEvolEditor(true);
                        setEvolutionContentByAppt(prev => ({ ...prev, [viewingAttentionId]: (edits.evolutionHtml ?? pv.evolutionHtml) }));
                      }
                      if (include.prescription !== false && pv.prescriptionHtml) {
                        setShowPrescEditor(true);
                        setPrescriptionsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: (edits.prescriptionHtml ?? pv.prescriptionHtml) }));
                      }
                      if (include.fields !== false && pv.fields && Object.keys(pv.fields||{}).length) {
                        setCustomFormValuesByAppt(prev => ({ ...prev, [viewingAttentionId]: { ...(prev[viewingAttentionId]||{}), ...pv.fields } }));
                      }
                      setShowAiPreview(false);
                      toast.success('Borrador aplicado');
                    } catch (e) {
                      console.error('Error aplicando borrador IA', e);
                      toast.error('No se pudo aplicar el borrador');
                    }
                  }}>Aplicar</button>
                </div>
              </div>
            </div>
          )}
          {!showAiPanel && (
            <>
              <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1">
                <div className="relative w-12 h-12 mb-2">
                  {showAudioMenu && (
                    <div className="absolute inset-0">
                      {/* Input oculto para adjuntar audio */}
                      <input
                        ref={attachAudioInputRef}
                        type="file"
                        accept="audio/*,video/webm,.webm"
                        className="hidden"
                        onChange={handleAudioFileSelected}
                      />
                      <style>{`
                        .stack-btn { width: 44px; height: 44px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,.15); display: flex; align-items: center; justify-content: center; font-size: 16px; }
                        .stack-item { position:absolute; left:50%; top:50%; transform-origin: 50% 50%; transform: translate(-50%, calc(-50% + var(--ty,0))) scale(1); opacity: 0; }
                        @keyframes stackIn { from { opacity: 0; transform: translate(-50%, calc(-50% + var(--ty,0))) scale(.85);} to { opacity:1; transform: translate(-50%, calc(-50% + var(--ty,0))) scale(1);} }
                      `}</style>
                      {getAudioArcButtons().map((b, idx, arr) => {
                        const spacing = 52; // separación vertical fija
                        const ty = -(idx + 1) * spacing; // hacia arriba en línea recta

                        let classes = 'stack-item stack-btn ';
                        if (b.key === 'start') classes += 'bg-black text-white';
                        else if (b.key === 'attach') classes += 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50';
                        else if (b.key === 'send') {
                          const canSendNowBtn = hasLastAudio || isRecordingAudio;
                          classes += `bg-green-600 hover:bg-green-700 text-white ${canSendNowBtn ? '' : 'opacity-50 cursor-not-allowed'}`;
                        }
                        else if (b.key === 'pause') classes += 'bg-yellow-500 hover:bg-yellow-600 text-white';
                        else if (b.key === 'stop') classes += 'bg-red-600 hover:bg-red-700 text-white';
                        else classes += 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50';
                        if (b.disabled) classes += ' opacity-60';

                        return (
                          <button
                            key={b.key}
                            type="button"
                            className={classes}
                            style={{ '--ty': `${ty}px`, animation: `stackIn 160ms ease-out ${idx*50}ms forwards` }}
                            onClick={(e)=>{
                              if (b.key === 'send') {
                                const canSendNowBtn = hasLastAudio || isRecordingAudio;
                                if (!canSendNowBtn || uploadingAudio) { e.preventDefault(); return; }
                                sendLastAudio();
                                return;
                              }
                              if (b.key === 'attach') {
                                handleAttachClick();
                                return;
                              }
                              b.onClick();
                            }}
                            disabled={!!b.disabled || (b.key === 'send' && (!(hasLastAudio || isRecordingAudio) || uploadingAudio))}
                            title={b.title}
                            aria-label={b.title}
                          >
                            {b.key === 'start' ? (
                              <span className="relative flex items-center justify-center">
                                <span className="bg-red-500 rounded-full animate-ping absolute opacity-75" style={{ width: '14px', height: '14px' }}></span>
                                <span className="bg-red-600 rounded-full relative" style={{ width: '12px', height: '12px' }}></span>
                              </span>
                            ) : b.key === 'test' ? (
                              <span className="relative flex items-end justify-center" style={{ width: '28px', height: '18px' }}>
                                {[0,1,2,3,4].map(i => {
                                  const scale = [0.5, 0.75, 1, 0.75, 0.5][i];
                                  const h = Math.max(2, Math.floor(micLevel * 18 * scale));
                                  return (
                                    <span key={i} className={`mx-[1px] ${micTestActive ? 'bg-black' : 'bg-gray-400'} rounded`} style={{ width: '3px', height: `${h}px`, transition: 'height 90ms linear' }}></span>
                                  );
                                })}
                                {micTestActive && (() => {
                                  const pct = Math.max(0, Math.min(1, (5000 - micTestRemainingMs) / 5000));
                                  return (
                                    <span className="absolute -top-5 left-1/2 -translate-x-1/2">
                                      <span className="block text-[10px] leading-none text-white px-2 py-0.5 rounded-full shadow" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,.85), rgba(0,0,0,.6))', border: '1px solid rgba(255,255,255,.15)' }}>
                                        {Math.ceil(micTestRemainingMs/1000)}s
                                      </span>
                                    </span>
                                  );
                                })()}
                              </span>
                            ) : (
                              b.label
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute inset-0 w-12 h-12 rounded-full shadow bg-gray-700 hover:bg-gray-800 text-white flex items-center justify-center"
                    onClick={()=>setShowAudioMenu(v=>!v)}
                    title="Opciones de audio"
                    aria-label="Opciones de audio"
                  >
                    {isRecordingAudio ? (
                      <span className="relative flex items-center justify-center">
                        <span className="bg-red-500 rounded-full animate-ping absolute opacity-75" style={{ width: '16px', height: '16px' }}></span>
                        <span className="bg-red-600 rounded-full relative" style={{ width: '14px', height: '14px' }}></span>
                        <span className="absolute -left-16 top-1/2 -translate-y-1/2 text-xs bg-black/70 text-white px-2 py-0.5 rounded">
                          {formatDuration(recordElapsedMs)}
                        </span>
                      </span>
                    ) : (
                      <span className="bg-gray-300 rounded-full" style={{ width: '10px', height: '10px' }}></span>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  className="w-12 h-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
                  onClick={()=>setShowAiPanel(true)}
                  title="Abrir asistente de IA"
                  aria-label="Abrir asistente de IA"
                >
                  <span className="text-xs font-semibold">IA</span>
                </button>
                <button
                  type="button"
                  className="w-12 h-12 rounded-full shadow-lg bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center"
                  onClick={()=>setShowNotesPanel(true)}
                  title="Abrir notas"
                  aria-label="Abrir notas"
                >
                  <span className="text-lg" aria-hidden>📝</span>
                </button>
              </div>
            </>
          )}

          {/* Caja de Fichas Personalizadas por Especialidad - fuera de la primera tarjeta */}
          <div className="card">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-medium text-gray-900">Fichas personalizadas</h3>
              {loadingCustomForms && (
                <span className="text-xs text-gray-500">Cargando...</span>
              )}
            </div>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="form-label">Seleccionar ficha</label>
                  <select
                    className="input-field"
                    value={selectedCustomFormIdByAppt[viewingAttentionId] || ''}
                    onChange={async (e)=>{
                      const formId = e.target.value ? parseInt(e.target.value) : '';
                      setSelectedCustomFormIdByAppt(prev => ({ ...prev, [viewingAttentionId]: formId }));
                      try {
                        if (!viewingAttentionId || !formId) return;
                        const appt = attentions.find(a=>a.id===viewingAttentionId);
                        await ensureSpecialtiesLoaded();
                        let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
                        if (!specId) {
                          const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
                          const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
                          specId = spec?.id || null;
                        }
                        if (!specId) return;
                        const values = customFormValuesByAppt[viewingAttentionId] || {};
                        const payload = { specialtyId: specId, formId, values };
                        await appointmentsAPI.saveCustomForm(viewingAttentionId, payload);
                        // Refrescar valores guardados por si existen previos en backend
                        try {
                          const latest = await appointmentsAPI.getCustomForms(viewingAttentionId);
                          const items = latest.data?.forms || latest.forms || [];
                          const found = items.find(it => String(it.form_id) === String(formId));
                          if (found) {
                            const parsed = typeof found.values === 'string' ? (function(){ try { return JSON.parse(found.values); } catch(_) { return {}; } })() : (found.values || {});
                            setCustomFormValuesByAppt(prev => ({ ...prev, [viewingAttentionId]: parsed }));
                          }
                        } catch (_) {}
                        toast.success('Ficha seleccionada guardada');
                      } catch (eSel) {
                        console.error('Error guardando ficha seleccionada:', eSel);
                        toast.error('No se pudo guardar la ficha seleccionada');
                      }
                    }}
                    onFocus={async ()=>{
                      const appt = attentions.find(a=>a.id===viewingAttentionId);
                      await ensureSpecialtiesLoaded();
                      let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
                      if (!specId) {
                        const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
                        const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
                        specId = spec?.id || null;
                      }
                      if (!specId) return;
                      const cacheKey = String(specId);
                      if (!customFormsCache[cacheKey]) {
                        try {
                          setLoadingCustomForms(true);
                          const resp = await specialtiesAPI.getTemplates(specId, 'customForms');
                          const forms = (resp.data?.templates || []).map(t => {
                            const fieldsRaw = (t.content !== undefined ? t.content : (t.fields !== undefined ? t.fields : []));
                            let fields = [];
                            if (typeof fieldsRaw === 'string') {
                              try { fields = JSON.parse(fieldsRaw); } catch (_) { fields = []; }
                            } else if (Array.isArray(fieldsRaw)) {
                              fields = fieldsRaw;
                            } else {
                              fields = [];
                            }
                            return { id: t.id, name: t.name, fields, isDefault: !!t.is_default, isActive: !!t.is_active };
                          });
                          setCustomFormsCache(prev => ({ ...prev, [cacheKey]: forms }));
                          if (forms.length && !selectedCustomFormIdByAppt[viewingAttentionId]) {
                            const def = forms.find(f=>f.isDefault) || forms[0];
                            setSelectedCustomFormIdByAppt(prev => ({ ...prev, [viewingAttentionId]: def.id }));
                          }
                        } catch (e) {
                          console.error('Error cargando fichas personalizadas:', e);
                          toast.error('No se pudieron cargar las fichas personalizadas');
                        } finally {
                          setLoadingCustomForms(false);
                        }
                      }
                    }}
                  >
                    <option value="">Seleccionar ficha</option>
                    {(() => {
                      const appt = attentions.find(a=>a.id===viewingAttentionId);
                      let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
                      if (!specId) {
                        const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
                        const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
                        specId = spec?.id || null;
                      }
                      const forms = customFormsCache[String(specId)] || [];
                      const selectedId = selectedCustomFormIdByAppt[viewingAttentionId];
                      let exists = forms.some(f => String(f.id) === String(selectedId));
                      // Si no existe en la especialidad actual, intentar mostrar el nombre buscándolo en otras especialidades cargadas
                      let savedLabel = 'Ficha guardada';
                      if (!exists && selectedId) {
                        for (const key of Object.keys(customFormsCache)) {
                          const arr = customFormsCache[key] || [];
                          const m = arr.find(f => String(f.id) === String(selectedId));
                          if (m) { savedLabel = m.name || savedLabel; exists = true; break; }
                        }
                      }
                      const opts = [];
                      if (!exists && selectedId) {
                        opts.push(<option key={`saved-${selectedId}`} value={selectedId}>{savedLabel}</option>);
                      }
                      return [
                        ...opts,
                        ...forms.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))
                      ];
                    })()}
                  </select>
                </div>
                <div className="md:col-span-2 flex items-end justify-end">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={async ()=>{
                      try {
                        const appt = attentions.find(a=>a.id===viewingAttentionId);
                        await ensureSpecialtiesLoaded();
                        let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
                        if (!specId) {
                          const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
                          const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
                          specId = spec?.id || null;
                        }
                        const formId = selectedCustomFormIdByAppt[viewingAttentionId];
                        if (!formId) {
                          toast.error('Selecciona una ficha para guardar');
                          return;
                        }
                        const values = customFormValuesByAppt[viewingAttentionId] || {};
                        const payload = { specialtyId: specId, formId, values };
                        const saved = await appointmentsAPI.saveCustomForm(viewingAttentionId, payload);
                        // Refrescar estado local con la última versión guardada
                        try {
                          const latest = await appointmentsAPI.getCustomForms(viewingAttentionId);
                          const items = latest.data?.forms || latest.forms || [];
                          const found = items.find(it => String(it.form_id) === String(formId));
                          if (found) {
                            const parsed = typeof found.values === 'string' ? (function(){ try { return JSON.parse(found.values); } catch(_) { return {}; } })() : (found.values || {});
                            setCustomFormValuesByAppt(prev => ({ ...prev, [viewingAttentionId]: parsed }));
                          }
                        } catch (_) {}
                        toast.success('Ficha personalizada guardada');
                      } catch (e) {
                        console.error('Error guardando ficha personalizada:', e);
                        toast.error(e?.message || 'Error al guardar la ficha');
                      }
                    }}
                  >
                    Guardar ficha
                  </button>
                </div>
              </div>

              {/* Render dinámico de campos */}
              {(() => {
                const appt = attentions.find(a=>a.id===viewingAttentionId);
                let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
                if (!specId) {
                  const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
                  const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
                  specId = spec?.id || null;
                }
                let forms = customFormsCache[String(specId)] || [];
                const selectedId = selectedCustomFormIdByAppt[viewingAttentionId];
                let form = forms.find(f => f.id === selectedId);
                if (!form && selectedId) {
                  // Buscar en otras especialidades ya cacheadas
                  for (const key of Object.keys(customFormsCache)) {
                    const arr = customFormsCache[key] || [];
                    const match = arr.find(f => String(f.id) === String(selectedId));
                    if (match) { form = match; break; }
                  }
                }
                if (!form) return null;
                const values = customFormValuesByAppt[viewingAttentionId] || {};
                const updateValue = (name, value) => {
                  setCustomFormValuesByAppt(prev => ({
                    ...prev,
                    [viewingAttentionId]: {
                      ...(prev[viewingAttentionId] || {}),
                      [name]: value
                    }
                  }));
                  // Auto-guardar con debounce
                  try {
                    if (customFormSaveTimersRef.current[viewingAttentionId]) {
                      clearTimeout(customFormSaveTimersRef.current[viewingAttentionId]);
                    }
                    customFormSaveTimersRef.current[viewingAttentionId] = setTimeout(async () => {
                      try {
                        const appt = attentions.find(a=>a.id===viewingAttentionId);
                        await ensureSpecialtiesLoaded();
                        let specId = appointmentDetails[viewingAttentionId]?.specialty_id || appt?.specialty_id || appt?.specialtyId || null;
                        if (!specId) {
                          const specialtyName = appointmentDetails[viewingAttentionId]?.specialty_name || appt?.specialty || '';
                          const spec = specialties.find(s => String(s.name || '').toLowerCase().trim() === String(specialtyName || '').toLowerCase().trim());
                          specId = spec?.id || null;
                        }
                        const formId = selectedCustomFormIdByAppt[viewingAttentionId];
                        if (!viewingAttentionId || !specId || !formId) return;
                        const valuesLatest = (prev => ({ ...prev, [name]: value }))(customFormValuesByAppt[viewingAttentionId] || {});
                        const payload = { specialtyId: specId, formId, values: valuesLatest };
                        await appointmentsAPI.saveCustomForm(viewingAttentionId, payload);
                      } catch (e) {
                        console.warn('Auto-guardar ficha falló:', e);
                      }
                    }, 600);
                  } catch (_) {}
                };

                return (
                  <div className="space-y-3">
                    {form.fields.length === 0 && (
                      <div className="text-sm text-gray-500">Esta ficha no tiene campos configurados.</div>
                    )}
                    {form.fields.map(field => (
                      <div key={field.name} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="form-label">{field.label || field.name}{field.required ? ' *' : ''}</label>
                          {field.type === 'textarea' ? (
                            <textarea
                              className="input-field"
                              rows="3"
                              value={values[field.name] || ''}
                              onChange={(e)=>updateValue(field.name, e.target.value)}
                              required={!!field.required}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              className="input-field"
                              value={values[field.name] || ''}
                              onChange={(e)=>updateValue(field.name, e.target.value)}
                              required={!!field.required}
                            >
                              <option value="">Seleccionar</option>
                              {(field.options || []).map(opt => (
                                <option key={String(opt)} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === 'select-multiple' ? (
                            <select
                              multiple
                              className="input-field"
                              value={values[field.name] || []}
                              onChange={(e)=>{
                                const opts = Array.from(e.target.selectedOptions).map(o=>o.value);
                                updateValue(field.name, opts);
                              }}
                            >
                              {(field.options || []).map(opt => (
                                <option key={String(opt)} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : field.type === 'radio' ? (
                            <div className="space-y-2">
                              {(field.options || []).map(opt => (
                                <label key={String(opt)} className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    name={`cf_${viewingAttentionId}_${field.name}`}
                                    value={opt}
                                    checked={(values[field.name] || '') === opt}
                                    onChange={(e)=>updateValue(field.name, opt)}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm">{opt}</span>
                                </label>
                              ))}
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <input
                              type="checkbox"
                              className="input-field"
                              checked={!!values[field.name]}
                              onChange={(e)=>updateValue(field.name, e.target.checked)}
                            />
                          ) : (
                            <input
                              type={field.type || 'text'}
                              className="input-field"
                              value={values[field.name] || ''}
                              onChange={(e)=>updateValue(field.name, e.target.value)}
                              required={!!field.required}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
                            <label className="text-sm text-gray-600">Plantilla:</label>
                            <div className="min-w-[260px]">
                              <OverlaySelect
                                name="evolutionTemplate"
                                value={selectedEvolutionTemplateId || ''}
                                options={[
                                  { value: '', label: loadingEvolutionTemplates ? 'Cargando...' : 'Sin plantilla' },
                                  ...((evolutionTemplates||[]).map(t => ({ value: t.id, label: `${t.name}${(t.is_default||t.isDefault)?' (predeterminada)':''}` })))
                                ]}
                                onChange={(id)=>{
                                  const val = id || null;
                                  setSelectedEvolutionTemplateId(val);
                                  const tpl = (evolutionTemplates||[]).find(t => String(t.id) === String(val));
                                  if (tpl) {
                                    setEvolutionContentByAppt(prev => ({ ...prev, [viewingAttentionId]: tpl.content || '' }));
                                  }
                                }}
                                className="input-field"
                              />
                            </div>
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
                              className="btn-secondary text-xs"
                              onClick={()=>sendAiPrompt(viewingAttentionId,'evolution','')}
                              disabled={!!aiLoadingByAppt[viewingAttentionId]}
                            >
                              Sugerir con IA
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
                          <select className="input-field text-sm" value={selectedProductId} onChange={(e)=>setSelectedProductId(e.target.value)}>
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
                          <select className="input-field text-sm" value={selectedPackageId} onChange={(e)=>setSelectedPackageId(e.target.value)}>
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
                            <label className="text-sm text-gray-600">Plantilla:</label>
                            <div className="min-w-[260px]">
                              <OverlaySelect
                                name="prescriptionTemplate"
                                value={selectedPrescriptionsTemplateId || ''}
                                options={[
                                  { value: '', label: loadingPrescriptionsTemplates ? 'Cargando...' : 'Sin plantilla' },
                                  ...((prescriptionsTemplates||[]).map(t => ({ value: t.id, label: `${t.name}${(t.is_default||t.isDefault)?' (predeterminada)':''}` })))
                                ]}
                                onChange={(id)=>{
                                  const val = id || null;
                                  setSelectedPrescriptionsTemplateId(val);
                                  const tpl = (prescriptionsTemplates||[]).find(t => String(t.id) === String(val));
                                  if (tpl) {
                                    setPrescriptionsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: tpl.content || '' }));
                                  }
                                }}
                                className="input-field"
                              />
                            </div>
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
                              className="btn-secondary text-xs"
                              onClick={()=>sendAiPrompt(viewingAttentionId,'prescription','')}
                              disabled={!!aiLoadingByAppt[viewingAttentionId]}
                            >
                              Sugerir con IA
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
                            <div className="min-w-[260px]">
                              <OverlaySelect
                                name="consentTemplate"
                                value={selectedConsentTemplateId || ''}
                                options={[
                                  { value: '', label: loadingConsentsTemplates ? 'Cargando...' : 'Sin plantilla' },
                                  ...((consentsTemplates||[]).map(t => ({ value: t.id, label: `${t.name}${(t.is_default||t.isDefault)?' (predeterminada)':''}` })))
                                ]}
                                onChange={(id)=>{
                                  const val = id || null;
                                  setSelectedConsentTemplateId(val);
                                  const tpl = (consentsTemplates||[]).find(t => String(t.id) === String(val));
                                  if (tpl) setConsentsContentByAppt(prev => ({ ...prev, [viewingAttentionId]: tpl.content || '' }));
                                }}
                                className="input-field"
                              />
                            </div>
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
                  ) : sec.key === 'clinicalDocs' ? (
                    <ImagesDocsSection
                      patientId={patientId}
                      appointmentId={viewingAttentionId}
                      onlyDocuments={true}
                    />
                  ) : sec.key === 'imagesDocs' ? (
                    <ImagesDocsSection
                      patientId={patientId}
                      appointmentId={viewingAttentionId}
                    />
                  ) : sec.key === 'cie' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">Diagnósticos CIE asociados a esta atención</div>
                        <button type="button" className="btn-secondary text-sm" onClick={()=>openRipsDetails(viewingAttentionId)}>+ Añadir desde RIPS</button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-600">
                              <th className="py-2 pr-4">Versión</th>
                              <th className="py-2 pr-4">Código</th>
                              <th className="py-2 pr-4">Nombre</th>
                              <th className="py-2 pr-4">Creado por</th>
                              <th className="py-2 pr-4">Fecha creación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(cieDocsByAppt[viewingAttentionId] || []).map((d, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded bg-gray-100 border text-gray-800">{d.version || 'CIE-10'}</span></td>
                                <td className="py-2 pr-4">{d.code}</td>
                                <td className="py-2 pr-4">{d.name}</td>
                                <td className="py-2 pr-4">{d.createdBy}</td>
                                <td className="py-2 pr-4">{d.createdAt}</td>
                              </tr>
                            ))}
                            {!(cieDocsByAppt[viewingAttentionId] || []).length && (
                              <tr><td className="py-3 text-gray-500" colSpan={5}>Sin diagnósticos registrados</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
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

      {false && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Facturación y Pagos</h3>
          <p className="text-sm text-gray-600">
            No hay datos de facturación registrados para este paciente.
          </p>
        </div>
      )}

      {showRipsModal && (
        <RipsDetailsModal
          isOpen={showRipsModal}
          onClose={() => setShowRipsModal(false)}
          onSave={(data) => {
            if (ripsForAttentionId) {
              setRipsDetailsByAppt(prev => ({ ...prev, [ripsForAttentionId]: data }));
              // Persistir Documentos CIE en backend y refrescar lista
              (async () => {
                try {
                  const appt = attentions.find(a=>a.id===ripsForAttentionId);
                  const patientIdNum = parseInt(patientId);
                  const codes = [
                    data.diagnosticoPrincipal,
                    data.diagnosticoSecundario1,
                    data.diagnosticoSecundario2,
                    data.diagnosticoSecundario3
                  ].filter(Boolean);
                  if (patientIdNum && codes.length) {
                    const labelsMap = data._labelsMap || {};
                    const items = codes.map(code => ({
                      version: 'CIE-10',
                      code,
                      name: (labelsMap[code] && labelsMap[code].includes(' - ')) ? labelsMap[code].split(' - ').slice(1).join(' - ') : (labelsMap[code] || code)
                    }));
                    await cieDocsAPI.create({ patientId: patientIdNum, appointmentId: appt?.id, items });
                    // recargar desde API para mostrar con nombre de creador/fecha BD
                    const resp = await cieDocsAPI.listByAppointment(appt?.id);
                    const list = resp?.data?.items || resp?.items || [];
                    setCieDocsByAppt(prev => ({ ...prev, [appt.id]: list.map(it => ({
                      version: it.version || 'CIE-10',
                      code: it.code,
                      name: it.name,
                      createdBy: it.createdBy || (currentUser?.name || 'Usuario'),
                      createdAt: new Date(it.createdAt).toLocaleString()
                    })) }));
                  }
                } catch (e) {
                  console.error('Error guardando/listando CIE docs:', e);
                  toast.error('No se pudieron guardar los diagnósticos CIE');
                }
              })();
            }
          }}
          initialValues={ripsDetailsByAppt[ripsForAttentionId] || {}}
        />
      )}

      {showSummaryModal && (
        <div className="modal-overlay">
          <div className="modal shadow-xl" style={{ maxWidth: '960px', borderRadius: '12px', padding: '20px' }}>
            <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">ℹ️</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Resumen clínico del paciente</h3>
                  <div className="text-xs text-gray-500">Vista general de historia, atenciones y hallazgos</div>
                </div>
              </div>
              <div>
                <button type="button" className="text-gray-400 hover:text-gray-600" onClick={()=>setShowSummaryModal(false)} aria-label="Cerrar">✕</button>
              </div>
            </div>
            <div className="mt-2 bg-white rounded-xl p-6 border border-gray-200" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="prose max-w-none text-gray-800">
                {summaryContent ? (
                  <div dangerouslySetInnerHTML={{ __html: (function(){
                    try {
                      const md = summaryContent
                        .replace(/^###\s(.+)$/gm, '<h3 class=\'text-base font-semibold text-gray-900 mt-4\'>$1<\/h3>')
                        .replace(/^##\s(.+)$/gm, '<h2 class=\'text-lg font-semibold text-gray-900 mt-5\'>$1<\/h2>')
                        .replace(/^#\s(.+)$/gm, '<h1 class=\'text-xl font-semibold text-gray-900 mt-6\'>$1<\/h1>')
                        .replace(/\*\*(.+?)\*\*/g, '<strong class=\'text-gray-900\'>$1<\/strong>')
                        .replace(/\n-\s(.+)/g, '<div class=\'pl-3 relative\'><span class=\'absolute -ml-3 text-blue-500\'>•<\/span> $1<\/div>')
                        .replace(/\n/g, '<br/>' );
                      return md;
                    } catch (_) { return summaryContent; }
                  })() }} />
                ) : (
                  <div className="text-sm text-gray-500">Sin contenido para mostrar.</div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" className="btn-primary" onClick={()=>setShowSummaryModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default PatientFicha; 
/** Renders RIPS modal at root level */