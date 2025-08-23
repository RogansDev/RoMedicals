import React, { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import PrescriptionsTemplateEditor from './PrescriptionsTemplateEditor';
import toast from 'react-hot-toast';
import TemplateEditor from './TemplateEditor';
import EvolutionsTemplateEditor from './EvolutionsTemplateEditor';
import CustomFormEditor from './CustomFormEditor';
import { specialtiesAPI } from '../config/api';

const Specialties = () => {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [templatesCache, setTemplatesCache] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showCustomFormEditor, setShowCustomFormEditor] = useState(false);
  const [currentTemplateType, setCurrentTemplateType] = useState('');
  const [currentSpecialty, setCurrentSpecialty] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    templates: {
      prescriptions: '',
      evolutions: '',
      medicalOrders: '',
      firstTimeForm: '',
      followUpForm: ''
    }
  });

  // Estado para plantillas de prescripción (gestión múltiple inline)
  const [prescTemplates, setPrescTemplates] = useState([]); // array de {id,name,content,isDefault,isActive}
  const [selectedPrescTemplateId, setSelectedPrescTemplateId] = useState(null);
  const [loadingPresc, setLoadingPresc] = useState(false);
  const [showPrescEditor, setShowPrescEditor] = useState(false);
  const [editingPrescTemplateId, setEditingPrescTemplateId] = useState(null);
  const [showEvolEditor, setShowEvolEditor] = useState(false);
  const [editingEvolTemplateId, setEditingEvolTemplateId] = useState(null);

  const selectedPrescTemplate = prescTemplates.find(t => t.id === selectedPrescTemplateId) || null;

  const loadPrescriptionsTemplates = async (spec) => {
    if (!spec?.id) return;
    try {
      setLoadingPresc(true);
      const resp = await specialtiesAPI.getTemplates(spec.id, 'prescriptions');
      const rows = resp.data.templates || [];
      const mapped = rows.map(t => ({
        id: t.id,
        name: t.name,
        content: t.content || '',
        isDefault: !!t.is_default,
        isActive: !!t.is_active,
        createdAt: t.created_at,
      }));
      setPrescTemplates(mapped);
      const def = (mapped.find(t => t.isDefault) || mapped[0] || null);
      setSelectedPrescTemplateId(def?.id || null);
      // reflejar plantilla por defecto en formData para el resumen y otros lugares
      if (def) {
        setFormData(prev => ({ ...prev, templates: { ...prev.templates, prescriptions: def.content } }));
      }
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar las plantillas de prescripción');
    } finally {
      setLoadingPresc(false);
    }
  };

  useEffect(() => {
    if (showForm && editingSpecialty && activeTab === 'prescriptions') {
      loadPrescriptionsTemplates(editingSpecialty);
    }
  }, [showForm, editingSpecialty, activeTab]);

  // Carga de plantillas de evoluciones
  const loadEvolutionsTemplates = async (spec) => {
    if (!spec?.id) return;
    try {
      const resp = await specialtiesAPI.getTemplates(spec.id, 'evolutions');
      const rows = resp.data.templates || [];
      setTemplatesCache(prev => ({ ...prev, [`${spec.id}:evolutions`]: rows }));
      const def = rows.find(t => t.is_default) || rows[0] || null;
      if (def) {
        setFormData(prev => ({ ...prev, templates: { ...prev.templates, evolutions: def.content || '' } }));
      }
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar las plantillas de evoluciones');
    }
  };

  useEffect(() => {
    if (showForm && editingSpecialty && activeTab === 'evolutions') {
      loadEvolutionsTemplates(editingSpecialty);
    }
  }, [showForm, editingSpecialty, activeTab]);

  // Carga de fichas personalizadas (custom forms)
  const loadCustomFormsTemplates = async (spec) => {
    if (!spec?.id) return;
    try {
      const resp = await specialtiesAPI.getTemplates(spec.id, 'customForms');
      const rows = resp.data.templates || [];
      setTemplatesCache(prev => ({ ...prev, [`${spec.id}:customForms`]: rows }));
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar las fichas');
    }
  };

  useEffect(() => {
    if (showForm && editingSpecialty && activeTab === 'forms') {
      loadCustomFormsTemplates(editingSpecialty);
    }
  }, [showForm, editingSpecialty, activeTab]);

  const addNewPrescTemplate = () => {
    const tmpId = `new-${Date.now()}`;
    const newTpl = { id: tmpId, name: 'Nueva plantilla', content: '', isDefault: prescTemplates.length === 0, isActive: true };
    setPrescTemplates(prev => [...prev, newTpl]);
    setSelectedPrescTemplateId(tmpId);
  };

  const savePrescTemplates = async () => {
    if (!editingSpecialty) return;
    try {
      setLoadingPresc(true);
      // Cargar estado actual de BD para comparar
      const resp = await specialtiesAPI.getTemplates(editingSpecialty.id, 'prescriptions');
      const db = (resp.data.templates || []).map(t => ({ id: t.id, name: t.name, content: t.content || '', isDefault: !!t.is_default, isActive: !!t.is_active }));
      const dbById = new Map(db.map(t => [String(t.id), t]));
      const curById = new Map(prescTemplates.map(t => [String(t.id), t]));

      // Eliminar
      for (const old of db) {
        if (!curById.has(String(old.id))) {
          await specialtiesAPI.deleteTemplate(editingSpecialty.id, 'prescriptions', old.id);
        }
      }
      // Crear/Actualizar
      for (const cur of prescTemplates) {
        if (String(cur.id).startsWith('new-')) {
          await specialtiesAPI.createTemplate(editingSpecialty.id, {
            type: 'prescriptions',
            name: cur.name,
            content: cur.content,
            isDefault: !!cur.isDefault,
            isActive: !!cur.isActive,
          });
        } else {
          const before = dbById.get(String(cur.id));
          if (!before || before.name !== cur.name || before.content !== cur.content || before.isDefault !== cur.isDefault || before.isActive !== cur.isActive) {
            await specialtiesAPI.updateTemplate(editingSpecialty.id, 'prescriptions', cur.id, {
              name: cur.name,
              content: cur.content,
              isDefault: !!cur.isDefault,
              isActive: !!cur.isActive,
            });
          }
        }
      }

      await loadPrescriptionsTemplates(editingSpecialty);
      // Actualizar la lista de especialidades (tarjetas) con el contenido por defecto
      setSpecialties(prev => prev.map(s => {
        if (s.id !== editingSpecialty.id) return s;
        const def = (prescTemplates.find(t => t.isDefault) || prescTemplates[0] || null);
        return {
          ...s,
          templates: {
            ...s.templates,
            prescriptions: def?.content || s.templates.prescriptions
          }
        };
      }));
      toast.success('Plantillas de prescripción guardadas');
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron guardar las plantillas');
    } finally {
      setLoadingPresc(false);
    }
  };

  // Refs y utilidades para editor enriquecido en tabs
  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'bullet' }, { list: 'ordered' }],
      ['blockquote', 'code-block'],
      [{ header: [1, 2, 3, false] }],
      ['clean'],
    ],
    clipboard: { matchVisual: false },
  };
  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'list', 'blockquote', 'code-block'
  ];

  // Cargar especialidades desde la API
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const resp = await specialtiesAPI.getAll();
        const list = resp.data.specialties || [];
        const withTemplates = await Promise.all(list.map(async (s) => {
          const [presc, evol, mo] = await Promise.all([
            specialtiesAPI.getTemplates(s.id, 'prescriptions').then(r => r.data.templates || []).catch(() => []),
            specialtiesAPI.getTemplates(s.id, 'evolutions').then(r => r.data.templates || []).catch(() => []),
            specialtiesAPI.getTemplates(s.id, 'medicalOrders').then(r => r.data.templates || []).catch(() => []),
          ]);
          const defaultOf = (arr) => (arr.find(t => t.is_default) || arr[0] || null);
          return {
            id: s.id,
            name: s.name,
            description: s.description,
            isActive: s.is_active,
            templates: {
              prescriptions: defaultOf(presc)?.content || '',
              evolutions: defaultOf(evol)?.content || '',
              medicalOrders: defaultOf(mo)?.content || '',
              firstTimeForm: '',
              followUpForm: ''
            }
          };
        }));
        setSpecialties(withTemplates);
      } catch (e) {
        console.error(e);
        toast.error('No se pudieron cargar las especialidades');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name.startsWith('templates.')) {
      const templateField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        templates: {
          ...prev.templates,
          [templateField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre de la especialidad es requerido');
      return;
    }

    try {
      if (editingSpecialty) {
        const payload = {
          name: formData.name,
          description: formData.description,
          isActive: !!formData.isActive,
        };
        const resp = await specialtiesAPI.update(editingSpecialty.id, payload);
        const updated = resp.data.specialty;
        setSpecialties(specialties.map(s => s.id === editingSpecialty.id ? {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          isActive: updated.is_active,
          templates: s.templates
        } : s));
        toast.success('Especialidad actualizada exitosamente');
      } else {
        const payload = {
          name: formData.name,
          description: formData.description,
          isActive: !!formData.isActive,
        };
        const resp = await specialtiesAPI.create(payload);
        const created = resp.data.specialty;
        setSpecialties([
          ...specialties,
          {
            id: created.id,
            name: created.name,
            description: created.description,
            isActive: created.is_active,
            templates: {
              prescriptions: '',
              evolutions: '',
              medicalOrders: '',
              firstTimeForm: '',
              followUpForm: ''
            }
          }
        ]);
        toast.success('Especialidad creada exitosamente');
      }
      setShowForm(false);
      setEditingSpecialty(null);
      resetForm();
    } catch (error) {
      console.error('Error saving specialty:', error);
      toast.error('Error al guardar especialidad');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isActive: true,
      templates: {
        prescriptions: '',
        evolutions: '',
        medicalOrders: '',
        firstTimeForm: '',
        followUpForm: ''
      }
    });
    setActiveTab('general');
  };

  const handleEdit = (specialty) => {
    setEditingSpecialty(specialty);
    setFormData({
      name: specialty.name || '',
      description: specialty.description || '',
      isActive: specialty.isActive !== false,
      templates: {
        prescriptions: specialty.templates?.prescriptions || '',
        evolutions: specialty.templates?.evolutions || '',
        medicalOrders: specialty.templates?.medicalOrders || '',
        firstTimeForm: specialty.templates?.firstTimeForm || '',
        followUpForm: specialty.templates?.followUpForm || ''
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar esta especialidad?')) {
      try {
        await specialtiesAPI.delete(id);
        setSpecialties(specialties.filter(s => s.id !== id));
        toast.success('Especialidad eliminada exitosamente');
      } catch (error) {
        console.error('Error deleting specialty:', error);
        toast.error('Error al eliminar especialidad');
      }
    }
  };

  const defaultTemplates = {
    prescriptions: `PRESCRIPCIÓN MÉDICA

Paciente: [NOMBRE_COMPLETO]
Fecha: [FECHA]
Especialidad: [ESPECIALIDAD]

MEDICAMENTOS:
1. [MEDICAMENTO_1]
   - Dosis: [DOSIS]
   - Frecuencia: [FRECUENCIA]
   - Duración: [DURACIÓN]
   - Observaciones: [OBSERVACIONES]

2. [MEDICAMENTO_2]
   - Dosis: [DOSIS]
   - Frecuencia: [FRECUENCIA]
   - Duración: [DURACIÓN]
   - Observaciones: [OBSERVACIONES]

INDICACIONES GENERALES:
- [INDICACIONES]

Firma del Médico: _________________
CMP: [NUMERO_COLEGIATURA]`,

    evolutions: `EVOLUCIÓN MÉDICA

Paciente: [NOMBRE_COMPLETO]
Fecha: [FECHA]
Especialidad: [ESPECIALIDAD]

MOTIVO DE CONSULTA:
[DESCRIPCIÓN_DEL_MOTIVO]

EXAMEN FÍSICO:
[DESCRIPCIÓN_DEL_EXAMEN]

DIAGNÓSTICO:
[DIAGNÓSTICO_PRINCIPAL]
[DIAGNÓSTICOS_SECUNDARIOS]

PLAN DE TRATAMIENTO:
1. [TRATAMIENTO_1]
2. [TRATAMIENTO_2]
3. [TRATAMIENTO_3]

EVOLUCIÓN:
[DESCRIPCIÓN_DE_LA_EVOLUCIÓN]

PRÓXIMA CITA:
[FECHA_Y_HORA]

Firma del Médico: _________________
CMP: [NUMERO_COLEGIATURA]`,

    medicalOrders: `ORDEN MÉDICA

Paciente: [NOMBRE_COMPLETO]
Fecha: [FECHA]
Especialidad: [ESPECIALIDAD]

EXÁMENES SOLICITADOS:
1. [EXAMEN_1]
   - Observaciones: [OBSERVACIONES]

2. [EXAMEN_2]
   - Observaciones: [OBSERVACIONES]

PROCEDIMIENTOS:
1. [PROCEDIMIENTO_1]
   - Observaciones: [OBSERVACIONES]

2. [PROCEDIMIENTO_2]
   - Observaciones: [OBSERVACIONES]

INDICACIONES ESPECIALES:
[INDICACIONES]

URGENCIA: [URGENTE/NORMAL]

Firma del Médico: _________________
CMP: [NUMERO_COLEGIATURA]`,

    firstTimeForm: `FICHA DE PRIMERA VEZ

DATOS PERSONALES:
Nombre Completo: [NOMBRE_COMPLETO]
Fecha de Nacimiento: [FECHA_NACIMIENTO]
Edad: [EDAD]
Género: [GENERO]
Identificación: [TIPO_DOC] [NUMERO_DOC]
Dirección: [DIRECCION]
Teléfono: [TELEFONO]
Email: [EMAIL]

ANTECEDENTES FAMILIARES:
[DESCRIPCIÓN_DE_ANTECEDENTES_FAMILIARES]

ANTECEDENTES PERSONALES:
[DESCRIPCIÓN_DE_ANTECEDENTES_PERSONALES]

ALERGIAS:
[DESCRIPCIÓN_DE_ALERGIAS]

MEDICAMENTOS ACTUALES:
[LISTA_DEMEDICAMENTOS]

HÁBITOS:
- Tabaquismo: [SI/NO]
- Alcohol: [SI/NO]
- Ejercicio: [SI/NO]
- Otros: [DESCRIPCIÓN]

MOTIVO DE CONSULTA:
[DESCRIPCIÓN_DEL_MOTIVO]

EXAMEN FÍSICO:
[DESCRIPCIÓN_DEL_EXAMEN]

DIAGNÓSTICO INICIAL:
[DIAGNÓSTICO]

PLAN DE TRATAMIENTO:
[PLAN_DE_TRATAMIENTO]

Firma del Médico: _________________
CMP: [NUMERO_COLEGIATURA]`,

    followUpForm: `FICHA DE CONTROL

Paciente: [NOMBRE_COMPLETO]
Fecha: [FECHA]
Especialidad: [ESPECIALIDAD]

MOTIVO DE CONTROL:
[DESCRIPCIÓN_DEL_MOTIVO]

EVOLUCIÓN DESDE LA ÚLTIMA VISITA:
[DESCRIPCIÓN_DE_LA_EVOLUCIÓN]

EXAMEN FÍSICO ACTUAL:
[DESCRIPCIÓN_DEL_EXAMEN]

EVALUACIÓN DE TRATAMIENTO:
[EVALUACIÓN_DEL_TRATAMIENTO_ANTERIOR]

NUEVO DIAGNÓSTICO:
[DIAGNÓSTICO_ACTUAL]

AJUSTES AL TRATAMIENTO:
[AJUSTES_REALIZADOS]

PRÓXIMA CITA:
[FECHA_Y_HORA]

Firma del Médico: _________________
CMP: [NUMERO_COLEGIATURA]`
  };

  const loadDefaultTemplate = (templateType) => {
    setFormData(prev => ({
      ...prev,
      templates: {
        ...prev.templates,
        [templateType]: defaultTemplates[templateType]
      }
    }));
  };

  const handleOpenTemplateEditor = async (templateType) => {
    if (!editingSpecialty) return;
    try {
      const cacheKey = `${editingSpecialty.id}:${templateType}`;
      let templates = templatesCache[cacheKey] || null;
      if (!templates) {
        const resp = await specialtiesAPI.getTemplates(editingSpecialty.id, templateType);
        const rows = resp.data.templates || [];
        templates = rows.map(t => ({
          id: t.id,
          name: t.name,
          content: t.content || '',
          isDefault: !!t.is_default,
          isActive: !!t.is_active,
          createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('es-ES') : '',
          createdBy: t.created_by || ''
        }));
        setTemplatesCache(prev => ({ ...prev, [cacheKey]: templates }));
      }
      setCurrentTemplateType(templateType);
      setCurrentSpecialty({ ...editingSpecialty, templates: { ...editingSpecialty.templates, [templateType]: templates } });
      setShowTemplateEditor(true);
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar las plantillas');
    }
  };

  const handleOpenCustomFormEditor = async (specialty) => {
    try {
      const resp = await specialtiesAPI.getTemplates(specialty.id, 'customForms');
      const forms = (resp.data.templates || []).map(t => ({
        id: t.id,
        name: t.name,
        fields: t.content || [],
        isDefault: !!t.is_default,
        isActive: !!t.is_active,
        createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('es-ES') : '',
        createdBy: t.created_by || ''
      }));
      setCurrentSpecialty({ ...specialty, customForms: forms });
      setShowCustomFormEditor(true);
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar las fichas');
    }
  };

  const handleSaveTemplates = async (templates) => {
    if (!editingSpecialty || !currentTemplateType) return;
    const cacheKey = `${editingSpecialty.id}:${currentTemplateType}`;
    const prev = templatesCache[cacheKey] || [];
    const prevById = new Map(prev.map(t => [t.id, t]));
    const nextById = new Map(templates.map(t => [t.id, t]));

    try {
      for (const old of prev) {
        if (!nextById.has(old.id)) {
          await specialtiesAPI.deleteTemplate(editingSpecialty.id, currentTemplateType, old.id);
        }
      }
      for (const cur of templates) {
        if (!prevById.has(cur.id)) {
          await specialtiesAPI.createTemplate(editingSpecialty.id, {
            type: currentTemplateType,
            name: cur.name,
            content: cur.content,
            isDefault: !!cur.isDefault,
            isActive: !!cur.isActive,
          });
        } else {
          const before = prevById.get(cur.id);
          if (
            before.name !== cur.name ||
            before.content !== cur.content ||
            before.isDefault !== cur.isDefault ||
            before.isActive !== cur.isActive
          ) {
            await specialtiesAPI.updateTemplate(editingSpecialty.id, currentTemplateType, cur.id, {
              name: cur.name,
              content: cur.content,
              isDefault: !!cur.isDefault,
              isActive: !!cur.isActive,
            });
          }
        }
      }

      const refreshed = await specialtiesAPI.getTemplates(editingSpecialty.id, currentTemplateType).then(r => r.data.templates || []);
      const mapped = refreshed.map(t => ({
        id: t.id,
        name: t.name,
        content: t.content || '',
        isDefault: !!t.is_default,
        isActive: !!t.is_active,
        createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('es-ES') : '',
        createdBy: t.created_by || ''
      }));
      setTemplatesCache(prevCache => ({ ...prevCache, [cacheKey]: mapped }));

      const defaultTpl = mapped.find(t => t.isDefault) || mapped[0] || null;
      setSpecialties(specialties.map(s => s.id === editingSpecialty.id ? {
        ...s,
        templates: {
          ...s.templates,
          [currentTemplateType]: defaultTpl?.content || ''
        }
      } : s));

      toast.success('Plantillas actualizadas');
      setShowTemplateEditor(false);
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron guardar las plantillas');
    }
  };

  const handleSaveCustomForms = async (forms) => {
    if (!currentSpecialty) return;
    try {
      const prev = currentSpecialty.customForms || [];
      const prevById = new Map(prev.map(f => [f.id, f]));
      const nextById = new Map(forms.map(f => [f.id, f]));

      for (const old of prev) {
        if (!nextById.has(old.id)) {
          await specialtiesAPI.deleteTemplate(currentSpecialty.id, 'customForms', old.id);
        }
      }
      for (const cur of forms) {
        if (!prevById.has(cur.id)) {
          await specialtiesAPI.createTemplate(currentSpecialty.id, {
            type: 'customForms',
            name: cur.name,
            fields: cur.fields || [],
            isDefault: !!cur.isDefault,
            isActive: !!cur.isActive,
          });
        } else {
          const before = prevById.get(cur.id);
          const changed = before.name !== cur.name || JSON.stringify(before.fields) !== JSON.stringify(cur.fields) || before.isDefault !== cur.isDefault || before.isActive !== cur.isActive;
          if (changed) {
            await specialtiesAPI.updateTemplate(currentSpecialty.id, 'customForms', cur.id, {
              name: cur.name,
              fields: cur.fields || [],
              isDefault: !!cur.isDefault,
              isActive: !!cur.isActive,
            });
          }
        }
      }

      const refreshed = await specialtiesAPI.getTemplates(currentSpecialty.id, 'customForms');
      const formsRef = (refreshed.data.templates || []).map(t => ({
        id: t.id,
        name: t.name,
        fields: t.content || [],
        isDefault: !!t.is_default,
        isActive: !!t.is_active,
        createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('es-ES') : '',
        createdBy: t.created_by || ''
      }));

      setSpecialties(specialties.map(s => s.id === currentSpecialty.id ? { ...s, customForms: formsRef } : s));
      toast.success('Fichas actualizadas');
      setShowCustomFormEditor(false);
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron guardar las fichas');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Especialidades</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingSpecialty(null);
            resetForm();
          }}
          className="btn-primary"
        >
          <span style={{ fontSize: '14px', marginRight: '8px' }}>➕</span>
          Nueva Especialidad
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            {editingSpecialty ? 'Editar Especialidad' : 'Nueva Especialidad'}
          </h2>
          
          <div className="mb-4">
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'general'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Información General
              </button>
              <button
                onClick={() => setActiveTab('prescriptions')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'prescriptions'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Prescripciones
              </button>
              <button
                onClick={() => setActiveTab('evolutions')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'evolutions'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Evoluciones
              </button>
              <button
                onClick={() => setActiveTab('medicalOrders')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'medicalOrders'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Órdenes Médicas
              </button>
              <button
                onClick={() => setActiveTab('forms')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'forms'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Fichas Personalizadas
              </button>
            </nav>
          </div>

          <form onSubmit={handleSubmit}>
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div>
                  <label className="form-label">Nombre de la Especialidad *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Descripción</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input-field"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 mr-2"
                    />
                    <span className="text-sm">Especialidad Activa</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'prescriptions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-700">Plantilla de Prescripciones</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => loadDefaultTemplate('prescriptions')}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Cargar Plantilla por Defecto
                    </button>
                  </div>
                </div>
                <div className="p-2 border rounded bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <button type="button" className="btn-primary text-sm" onClick={()=>{ setEditingPrescTemplateId(null); setShowPrescEditor(true); }}>+ Nueva plantillas</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">Nombre</th>
                          <th className="py-2 pr-4">Predeterminada</th>
                          <th className="py-2 pr-4">Estado</th>
                          <th className="py-2 pr-4">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescTemplates.map(t => (
                          <tr key={t.id} className="border-t">
                            <td className="py-2 pr-4">{t.name}</td>
                            <td className="py-2 pr-4">{t.isDefault ? 'Sí' : 'No'}</td>
                            <td className="py-2 pr-4">{t.isActive ? 'Activa' : 'Inactiva'}</td>
                            <td className="py-2 pr-4 space-x-2">
                              <button type="button" className="text-blue-600 hover:text-blue-800" onClick={()=>{ setEditingPrescTemplateId(t.id); setShowPrescEditor(true); }}>Editar</button>
                              <button type="button" className="text-red-600 hover:text-red-800" onClick={async ()=>{
                                if (!window.confirm('¿Eliminar esta plantilla?')) return;
                                try {
                                  await specialtiesAPI.deleteTemplate(editingSpecialty.id, 'prescriptions', t.id);
                                  await loadPrescriptionsTemplates(editingSpecialty);
                                  toast.success('Plantilla eliminada');
                                } catch (e) {
                                  console.error(e);
                                  toast.error('No se pudo eliminar');
                                }
                              }}>Eliminar</button>
                            </td>
                          </tr>
                        ))}
                        {prescTemplates.length===0 && (
                          <tr><td className="py-4 text-gray-500" colSpan="4">No hay plantillas</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Vista previa eliminada a petición */}
                </div>
              </div>
            )}

            {activeTab === 'evolutions' && (
              <div className="space-y-4">
                <div className="p-2 border rounded bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <button type="button" className="btn-primary text-sm" onClick={()=>{ setEditingEvolTemplateId(null); setShowEvolEditor(true); }}>+ Nueva plantillas</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">Nombre</th>
                          <th className="py-2 pr-4">Predeterminada</th>
                          <th className="py-2 pr-4">Estado</th>
                          <th className="py-2 pr-4">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(templatesCache && templatesCache[`${editingSpecialty?.id}:evolutions`]?.length ? templatesCache[`${editingSpecialty?.id}:evolutions`] : []).map(t => (
                          <tr key={t.id} className="border-t">
                            <td className="py-2 pr-4">{t.name}</td>
                            <td className="py-2 pr-4">{t.is_default ? 'Sí' : 'No'}</td>
                            <td className="py-2 pr-4">{t.is_active ? 'Activa' : 'Inactiva'}</td>
                            <td className="py-2 pr-4 space-x-2">
                              <button type="button" className="text-blue-600 hover:text-blue-800" onClick={()=>{ setEditingEvolTemplateId(t.id); setShowEvolEditor(true); }}>Editar</button>
                              <button type="button" className="text-red-600 hover:text-red-800" onClick={async ()=>{
                                if (!window.confirm('¿Eliminar esta plantilla?')) return;
                                try {
                                  await specialtiesAPI.deleteTemplate(editingSpecialty.id, 'evolutions', t.id);
                                  // recargar cache
                                  const refreshed = await specialtiesAPI.getTemplates(editingSpecialty.id, 'evolutions').then(r => r.data.templates || []);
                                  setTemplatesCache(prev => ({ ...prev, [`${editingSpecialty.id}:evolutions`]: refreshed }));
                                  toast.success('Plantilla eliminada');
                                } catch (e) {
                                  console.error(e);
                                  toast.error('No se pudo eliminar');
                                }
                              }}>Eliminar</button>
                            </td>
                          </tr>
                        ))}
                        {!(templatesCache && templatesCache[`${editingSpecialty?.id}:evolutions`]?.length) && (
                          <tr><td className="py-4 text-gray-500" colSpan="4">No hay plantillas</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'medicalOrders' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-700">Plantilla de Órdenes Médicas</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => loadDefaultTemplate('medicalOrders')}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Cargar Plantilla por Defecto
                    </button>
                  </div>
                </div>
                <div className="p-2 border rounded bg-gray-50">
                  <ReactQuill
                    theme="snow"
                    modules={quillModules}
                    formats={quillFormats}
                    value={formData.templates.medicalOrders || ''}
                    onChange={(html) => setFormData(prev => ({ ...prev, templates: { ...prev.templates, medicalOrders: html } }))}
                    className="bg-white rounded"
                  />
                </div>
              </div>
            )}

            {activeTab === 'forms' && (
              <div className="space-y-4">
                <div className="p-2 border rounded bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">Fichas personalizadas</div>
                    <button type="button" className="btn-primary text-sm" onClick={() => handleOpenCustomFormEditor(editingSpecialty)}>Configurar Fichas</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-2 pr-4">Nombre</th>
                          <th className="py-2 pr-4">Predeterminada</th>
                          <th className="py-2 pr-4">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(templatesCache && templatesCache[`${editingSpecialty?.id}:customForms`]?.length ? templatesCache[`${editingSpecialty?.id}:customForms`] : []).map(f => (
                          <tr key={f.id} className="border-t">
                            <td className="py-2 pr-4">{f.name}</td>
                            <td className="py-2 pr-4">{f.is_default ? 'Sí' : 'No'}</td>
                            <td className="py-2 pr-4">{f.is_active ? 'Activa' : 'Inactiva'}</td>
                          </tr>
                        ))}
                        {!(templatesCache && templatesCache[`${editingSpecialty?.id}:customForms`]?.length) && (
                          <tr><td className="py-4 text-gray-500" colSpan="3">No hay fichas</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingSpecialty(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                {editingSpecialty ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Especialidades */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Especialidades Registradas</h2>
        {loading && (
          <div className="text-sm text-gray-500 mb-3">Cargando...</div>
        )}
        {specialties.length === 0 ? (
          <div className="text-center py-8">
            <span style={{ fontSize: '48px' }}>🏥</span>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay especialidades registradas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comience agregando la primera especialidad.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specialties.map((specialty) => (
              <div key={specialty.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{specialty.name}</h3>
                    {specialty.description && (
                      <p className="text-sm text-gray-500 mt-1">{specialty.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    specialty.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {specialty.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span style={{ fontSize: '12px', marginRight: '6px' }}>💊</span>
                    <span>Prescripciones: {specialty.templates?.prescriptions ? 'Configurada' : 'Sin configurar'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span style={{ fontSize: '12px', marginRight: '6px' }}>📝</span>
                    <span>Evoluciones: {specialty.templates?.evolutions ? 'Configurada' : 'Sin configurar'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span style={{ fontSize: '12px', marginRight: '6px' }}>📋</span>
                    <span>Órdenes Médicas: {specialty.templates?.medicalOrders ? 'Configurada' : 'Sin configurar'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span style={{ fontSize: '12px', marginRight: '6px' }}>📄</span>
                    <span>Fichas: {specialty.templates?.firstTimeForm || specialty.templates?.followUpForm ? 'Configurada' : 'Sin configurar'}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleEdit(specialty)}
                    className="text-blue-600 hover:text-blue-900 text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(specialty.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      {showTemplateEditor && currentSpecialty && (
        <TemplateEditor
          title={`Plantillas de ${currentTemplateType === 'prescriptions' ? 'prescripciones' : 
                  currentTemplateType === 'evolutions' ? 'evoluciones' : 
                  currentTemplateType === 'medicalOrders' ? 'órdenes médicas' : 'plantillas'} - ${currentSpecialty.name}`}
          templates={currentSpecialty.templates?.[currentTemplateType] || []}
          onSave={handleSaveTemplates}
          onClose={() => setShowTemplateEditor(false)}
          templateType={currentTemplateType}
        />
      )}

      {/* Custom Form Editor Modal */}
      {showCustomFormEditor && currentSpecialty && (
        <CustomFormEditor
          specialtyName={currentSpecialty.name}
          forms={currentSpecialty.customForms || []}
          onSave={handleSaveCustomForms}
          onClose={() => setShowCustomFormEditor(false)}
        />
      )}

      {showPrescEditor && editingSpecialty && (
        <PrescriptionsTemplateEditor
          specialty={editingSpecialty}
          selectedTemplateId={editingPrescTemplateId}
          onClose={()=>setShowPrescEditor(false)}
          onSaved={()=>loadPrescriptionsTemplates(editingSpecialty)}
        />
      )}

      {showEvolEditor && editingSpecialty && (
        <EvolutionsTemplateEditor
          specialty={editingSpecialty}
          selectedTemplateId={editingEvolTemplateId}
          onClose={()=>setShowEvolEditor(false)}
          onSaved={async ()=>{
            const refreshed = await specialtiesAPI.getTemplates(editingSpecialty.id, 'evolutions').then(r => r.data.templates || []);
            setTemplatesCache(prev => ({ ...prev, [`${editingSpecialty.id}:evolutions`]: refreshed }));
          }}
        />
      )}
    </div>
  );
};

export default Specialties; 