import React, { useState, useEffect } from 'react';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CogIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { specialtiesAPI, consultationTemplatesAPI } from '../config/api';
import toast from 'react-hot-toast';

const Configuration = () => {
  const [activeTab, setActiveTab] = useState('specialties');
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSpecialtyForm, setShowSpecialtyForm] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [specialtyToDelete, setSpecialtyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');

  // Formulario para especialidades
  const [specialtyForm, setSpecialtyForm] = useState({
    name: '',
    description: ''
  });

  // Estados para plantillas de consulta
  const [consultationTemplates, setConsultationTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateFields, setTemplateFields] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newField, setNewField] = useState({
    name: '',
    type: 'text',
    required: false,
    options: []
  });
  const [newTemplateName, setNewTemplateName] = useState('');

  const tabs = [
    { id: 'specialties', label: 'Especialidades', icon: AcademicCapIcon },
    { id: 'consultation-templates', label: 'Plantillas de Consulta', icon: DocumentTextIcon },
    { id: 'settings', label: 'Configuración General', icon: CogIcon },
  ];

  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    try {
      setLoading(true);
      const response = await specialtiesAPI.getAll();
      console.log('Respuesta completa:', response);
      console.log('Datos de especialidades:', response.data);
      
      const specialtiesData = response.data || response;
      setSpecialties(Array.isArray(specialtiesData) ? specialtiesData : []);
      
      console.log('Especialidades cargadas:', specialtiesData);
    } catch (error) {
      console.error('Error cargando especialidades:', error);
      toast.error('Error al cargar las especialidades');
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialtyInputChange = (field, value) => {
    setSpecialtyForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetSpecialtyForm = () => {
    setSpecialtyForm({
      name: '',
      description: ''
    });
    setEditingSpecialty(null);
    setShowSpecialtyForm(false);
  };

  const handleCreateSpecialty = async (e) => {
    e.preventDefault();
    
    if (!specialtyForm.name.trim()) {
      toast.error('El nombre de la especialidad es requerido');
      return;
    }

    try {
      setLoading(true);
      
      const dataToSend = {
        name: specialtyForm.name,
        description: specialtyForm.description
      };
      
      console.log('Datos a enviar:', dataToSend);
      console.log('Editando especialidad:', editingSpecialty);
      
      if (editingSpecialty) {
        // Actualizar especialidad existente
        console.log('Actualizando especialidad con ID:', editingSpecialty.id);
        await specialtiesAPI.update(editingSpecialty.id, dataToSend);
        toast.success('Especialidad actualizada exitosamente');
      } else {
        // Crear nueva especialidad
        console.log('Creando nueva especialidad');
        await specialtiesAPI.create(dataToSend);
        toast.success('Especialidad creada exitosamente');
      }
      
      resetSpecialtyForm();
      loadSpecialties();
      
    } catch (error) {
      console.error('Error guardando especialidad:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Error al guardar la especialidad';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSpecialty = (specialty) => {
    setEditingSpecialty(specialty);
    setSpecialtyForm({
      name: specialty.name,
      description: specialty.description || ''
    });
    setShowSpecialtyForm(true);
  };

  const handleNewSpecialty = () => {
    setEditingSpecialty(null);
    setSpecialtyForm({
      name: '',
      description: ''
    });
    setShowSpecialtyForm(true);
  };

  const handleDeleteSpecialty = (specialty) => {
    setSpecialtyToDelete(specialty);
    setShowDeleteModal(true);
    setDeleteErrorMessage('');
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSpecialtyToDelete(null);
    setIsDeleting(false);
    setDeleteErrorMessage('');
  };

  const confirmDelete = async () => {
    if (!specialtyToDelete) return;
    
    try {
      setIsDeleting(true);
      setDeleteErrorMessage('');
      await specialtiesAPI.delete(specialtyToDelete.id);
      toast.success('Especialidad eliminada exitosamente');
      loadSpecialties();
      cancelDelete();
    } catch (error) {
      console.error('Error eliminando especialidad:', error);
      const errorMessage = error.response?.data?.message || 'Error al eliminar la especialidad';
      setDeleteErrorMessage(errorMessage);
      toast.error(errorMessage);
      setIsDeleting(false);
    }
  };

  // Funciones para plantillas de consulta
  const loadConsultationTemplates = async () => {
    try {
      setLoading(true);
      const response = await consultationTemplatesAPI.getAll();
      setConsultationTemplates(response.data || []);
    } catch (error) {
      console.error('Error cargando plantillas:', error);
      toast.error('Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'consultation-templates') {
      loadConsultationTemplates();
    }
  }, [activeTab]);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('El nombre de la plantilla es requerido');
      return;
    }

    try {
      setLoading(true);
      const response = await consultationTemplatesAPI.create({
        name: newTemplateName.trim(),
        fields: []
      });
      const newTemplate = response.data;
      setConsultationTemplates([...consultationTemplates, newTemplate]);
      setSelectedTemplate(newTemplate);
      setTemplateFields([]);
      setNewTemplateName('');
      setShowTemplateForm(false);
      toast.success('Plantilla creada exitosamente');
    } catch (error) {
      console.error('Error creando plantilla:', error);
      toast.error(error.response?.data?.message || 'Error al crear la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateFields(template.fields || []);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      const response = await consultationTemplatesAPI.update(selectedTemplate.id, {
        name: selectedTemplate.name,
        fields: templateFields
      });
      const updatedTemplate = response.data;
      const updated = consultationTemplates.map(t =>
        t.id === selectedTemplate.id ? updatedTemplate : t
      );
      setConsultationTemplates(updated);
      setSelectedTemplate(updatedTemplate);
      toast.success('Plantilla guardada exitosamente');
    } catch (error) {
      console.error('Error guardando plantilla:', error);
      toast.error(error.response?.data?.message || 'Error al guardar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = (template) => {
    setTemplateToDelete(template);
    setShowDeleteTemplateModal(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;

    try {
      setLoading(true);
      await consultationTemplatesAPI.delete(templateToDelete.id);
      const updated = consultationTemplates.filter(t => t.id !== templateToDelete.id);
      setConsultationTemplates(updated);

      if (selectedTemplate?.id === templateToDelete.id) {
        setSelectedTemplate(null);
        setTemplateFields([]);
      }

      setShowDeleteTemplateModal(false);
      setTemplateToDelete(null);
      toast.success('Plantilla eliminada exitosamente');
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const cancelDeleteTemplate = () => {
    setShowDeleteTemplateModal(false);
    setTemplateToDelete(null);
  };

  const handleAddField = () => {
    if (!newField.name.trim()) {
      toast.error('El nombre del campo es requerido');
      return;
    }

    if ((newField.type === 'select' || newField.type === 'selection') && newField.options.length === 0) {
      toast.error('Debe agregar al menos una opción para el campo de selección');
      return;
    }

    const field = {
      id: Date.now().toString(),
      ...newField
    };

    setTemplateFields([...templateFields, field]);
    setNewField({
      name: '',
      type: 'text',
      required: false,
      options: []
    });
    setShowAddFieldModal(false);
  };

  const handleRemoveField = (fieldId) => {
    setTemplateFields(templateFields.filter(f => f.id !== fieldId));
  };

  const handleMoveField = (fieldId, direction) => {
    const index = templateFields.findIndex(f => f.id === fieldId);
    if (index === -1) return;

    const newFields = [...templateFields];
    if (direction === 'up' && index > 0) {
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else if (direction === 'down' && index < newFields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }

    setTemplateFields(newFields);
  };

  const getFieldTypeLabel = (type) => {
    const labels = {
      'text': 'Texto',
      'textarea': 'Texto largo',
      'select': 'Selección',
      'selection': 'Selección'
    };
    return labels[type] || type;
  };

  const renderSpecialtiesTab = () => (
    <div className="space-y-6">
      {/* Header con botón agregar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestión de Especialidades</h2>
          <p className="text-gray-600">Administra las especialidades médicas disponibles</p>
        </div>
        <button
          onClick={handleNewSpecialty}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Nueva Especialidad</span>
        </button>
      </div>

      {/* Lista de especialidades */}
      {console.log('Estado actual de specialties:', specialties, 'Longitud:', specialties.length)}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Cargando especialidades...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {specialties.map((specialty) => (
            <div key={specialty.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{specialty.name}</h3>
                  {specialty.description && (
                    <p className="text-sm text-gray-600 mb-3">{specialty.description}</p>
                  )}
                  <div className="flex items-center text-xs text-gray-500">
                    <span>Estado: </span>
                    <span className={`ml-1 px-2 py-1 rounded-full ${
                      specialty.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {specialty.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEditSpecialty(specialty)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSpecialty(specialty)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {specialties.length === 0 && !showSpecialtyForm && (
            <div className="col-span-full text-center py-12">
              <AcademicCapIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay especialidades</h3>
              <p className="text-gray-600 mb-4">Comienza agregando tu primera especialidad médica</p>
              <button
                onClick={handleNewSpecialty}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Agregar Especialidad
              </button>
            </div>
          )}
          
          {/* Formulario de especialidad - aparece cuando no hay especialidades */}
          {showSpecialtyForm && !editingSpecialty && specialties.length === 0 && (
            <div className="col-span-full">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Nueva Especialidad</h3>
                  <button
                    onClick={resetSpecialtyForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <form onSubmit={handleCreateSpecialty} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Especialidad *
                    </label>
                    <input
                      type="text"
                      value={specialtyForm.name}
                      onChange={(e) => handleSpecialtyInputChange('name', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Cardiología, Pediatría, etc."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={specialtyForm.description}
                      onChange={(e) => handleSpecialtyInputChange('description', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Descripción opcional de la especialidad"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={resetSpecialtyForm}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !specialtyForm.name.trim()}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        loading || !specialtyForm.name.trim()
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {loading ? 'Guardando...' : 'Crear'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );

  const renderConsultationTemplatesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Plantillas de Consulta</h2>
          <p className="text-gray-600">Crea y gestiona plantillas de consulta para uso en las consultas médicas</p>
        </div>
        <button
          onClick={() => {
            setShowTemplateForm(true);
            setNewTemplateName('');
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Nueva Plantilla</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de plantillas */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Plantillas</h3>
            
            {showTemplateForm && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="text"
                  placeholder="Nombre de la plantilla"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateTemplate()}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateTemplate}
                    className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => {
                      setShowTemplateForm(false);
                      setNewTemplateName('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {consultationTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No hay plantillas creadas</p>
                </div>
              ) : (
                consultationTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.fields?.length || 0} campo(s)
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                        className="text-red-500 hover:text-red-700 ml-2"
                        title="Eliminar"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Editor de plantilla */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {selectedTemplate ? (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Agrega y configura los campos que aparecerán en esta plantilla de consulta
                  </p>
                </div>

                {/* Lista de campos */}
                <div className="mb-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Campos de la plantilla</h4>
                  
                  {templateFields.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <p className="text-gray-500">No hay campos agregados</p>
                      <p className="text-sm text-gray-400 mt-1">Agrega campos usando el botón de abajo</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {templateFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center space-x-2 mr-3">
                            <button
                              onClick={() => handleMoveField(field.id, 'up')}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              title="Mover arriba"
                            >
                              <ChevronUpIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveField(field.id, 'down')}
                              disabled={index === templateFields.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              title="Mover abajo"
                            >
                              <ChevronDownIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{field.name}</div>
                            <div className="text-sm text-gray-500">
                              {getFieldTypeLabel(field.type)}
                              {field.required && ' • Requerido'}
                              {(field.type === 'select' || field.type === 'selection') && field.options?.length > 0 && (
                                ` • ${field.options.length} opción(es)`
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveField(field.id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                            title="Eliminar campo"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón agregar campo */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAddFieldModal(true)}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Agregar Campo</span>
                  </button>
                  <button
                    onClick={handleSaveTemplate}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span>Guardar Plantilla</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una plantilla</h3>
                <p className="text-gray-600">Selecciona una plantilla de la lista para editarla o crea una nueva</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para agregar campo */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={() => setShowAddFieldModal(false)}></div>
          <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Agregar Campo</h3>
              <button
                onClick={() => setShowAddFieldModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del campo *
                </label>
                <input
                  type="text"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Motivo de consulta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de campo *
                </label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value, options: e.target.value === 'select' || e.target.value === 'selection' ? [] : newField.options })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="text">Texto</option>
                  <option value="textarea">Texto largo</option>
                  <option value="select">Selección</option>
                </select>
              </div>

              {(newField.type === 'select' || newField.type === 'selection') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opciones (una por línea) *
                  </label>
                  <textarea
                    value={newField.options.join('\n')}
                    onChange={(e) => setNewField({
                      ...newField,
                      options: e.target.value.split('\n').filter(opt => opt.trim())
                    })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cada línea será una opción del selector</p>
                </div>
              )}

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                    className="rounded border-gray-300 mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Campo requerido</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  setNewField({
                    name: '',
                    type: 'text',
                    required: false,
                    options: []
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddField}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación de plantilla */}
      {showDeleteTemplateModal && templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={cancelDeleteTemplate}></div>
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Confirmar eliminación</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                ¿Seguro que deseas eliminar la plantilla
                {" "}
                <span className="font-medium text-gray-900">{templateToDelete.name}</span>?
                Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelDeleteTemplate}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteTemplate}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Configuración General</h2>
        <p className="text-gray-600">Configuraciones generales del sistema</p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Próximamente</h3>
        <p className="text-gray-600">Esta sección estará disponible en futuras actualizaciones.</p>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Administra la configuración de tu sistema</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenido de tabs */}
      {activeTab === 'specialties' && renderSpecialtiesTab()}
      {activeTab === 'consultation-templates' && renderConsultationTemplatesTab()}
      {activeTab === 'settings' && renderSettingsTab()}

      {/* Modal de edición/creación de especialidad */}
      {showSpecialtyForm && (editingSpecialty || specialties.length > 0) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={resetSpecialtyForm}></div>
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingSpecialty ? 'Editar Especialidad' : 'Nueva Especialidad'}
                </h3>
                <button
                  onClick={resetSpecialtyForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleCreateSpecialty} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Especialidad *
                  </label>
                  <input
                    type="text"
                    value={specialtyForm.name}
                    onChange={(e) => handleSpecialtyInputChange('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Cardiología, Pediatría, etc."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={specialtyForm.description}
                    onChange={(e) => handleSpecialtyInputChange('description', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción opcional de la especialidad"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetSpecialtyForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !specialtyForm.name.trim()}
                    className={`px-4 py-2 rounded-md text-white transition-colors ${
                      loading || !specialtyForm.name.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? 'Guardando...' : editingSpecialty ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && specialtyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={cancelDelete}></div>
          <div className="relative z-10 w-full max-w-md mx-4">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Confirmar eliminación</h3>
              </div>
              {deleteErrorMessage && (
                <div className="mb-3 p-3 rounded bg-red-50 text-red-700 text-sm border border-red-200">
                  {deleteErrorMessage}
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                ¿Seguro que deseas eliminar la especialidad
                {" "}
                <span className="font-medium text-gray-900">{specialtyToDelete.name}</span>?
                Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className={`px-4 py-2 rounded-md text-white transition-colors ${
                    isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuration;
