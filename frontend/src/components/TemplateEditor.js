import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const TemplateEditor = ({ 
  title, 
  templates, 
  onSave, 
  onClose, 
  templateType = 'prescriptions' 
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState(''); // almacena HTML
  const editorRef = useRef(null);

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

PLAN DE TRATAMIENTO:
1. [TRATAMIENTO_1]
2. [TRATAMIENTO_2]

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

PROCEDIMIENTOS:
1. [PROCEDIMIENTO_1]
   - Observaciones: [OBSERVACIONES]

INDICACIONES ESPECIALES:
[INDICACIONES]

URGENCIA: [URGENTE/NORMAL]

Firma del Médico: _________________
CMP: [NUMERO_COLEGIATURA]`
  };

  const toHtml = (textOrHtml) => {
    if (!textOrHtml) return '';
    const looksHtml = /<\w+[^>]*>/.test(textOrHtml) || /<br\s*\/?\s*>|<p\b/.test(textOrHtml);
    return looksHtml ? textOrHtml : textOrHtml.replace(/\n/g, '<br>');
  };

  useEffect(() => {
    // Mantener el contenido del contentEditable sincronizado
    if (editorRef.current && typeof templateContent === 'string') {
      if (editorRef.current.innerHTML !== templateContent) {
        editorRef.current.innerHTML = templateContent || '';
      }
    }
  }, [templateContent]);

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error('El nombre de la plantilla es requerido');
      return;
    }

    const newTemplate = {
      id: Date.now(),
      name: newTemplateName,
      content: (templateContent && templateContent.trim())
        ? templateContent
        : toHtml(defaultTemplates[templateType]),
      createdAt: new Date().toLocaleDateString('es-ES'),
      createdBy: 'Administrador',
      isDefault: false,
      isActive: true
    };

    onSave([...templates, newTemplate]);
    setSelectedTemplate(newTemplate);
    setShowCreateForm(false);
    setNewTemplateName('');
    setTemplateContent('');
    toast.success('Plantilla creada exitosamente');
  };

  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;

    const updatedTemplates = templates.map(t => 
      t.id === selectedTemplate.id 
        ? { ...selectedTemplate, content: templateContent }
        : t
    );

    onSave(updatedTemplates);
    toast.success('Plantilla guardada exitosamente');
  };

  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('¿Está seguro de eliminar esta plantilla?')) {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      onSave(updatedTemplates);
      
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setTemplateContent('');
      }
      
      toast.success('Plantilla eliminada exitosamente');
    }
  };

  const handleSetDefault = (templateId) => {
    const updatedTemplates = templates.map(t => ({
      ...t,
      isDefault: t.id === templateId
    }));
    onSave(updatedTemplates);
    toast.success('Plantilla predeterminada actualizada');
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateContent(toHtml(template.content));
  };

  const exec = (cmd, value = null) => {
    try {
      document.execCommand(cmd, false, value);
      // sincronizar estado desde el editor
      if (editorRef.current) {
        setTemplateContent(editorRef.current.innerHTML);
      }
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Template List */}
          <div className="w-1/3 border-r bg-gray-50 p-4">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md mb-4 flex items-center justify-center"
            >
              <span style={{ fontSize: '16px', marginRight: '8px' }}>➕</span>
              Crear nueva plantilla
            </button>

            {showCreateForm && (
              <div className="mb-4 p-4 bg-white rounded border">
                <input
                  type="text"
                  placeholder="Nombre de la plantilla"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="input-field mb-2"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateTemplate}
                    className="btn-primary text-sm"
                  >
                    Crear
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-blue-100 border-blue-300 border'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {template.isDefault && (
                        <span style={{ fontSize: '14px', marginRight: '6px' }}>⭐</span>
                      )}
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <span style={{ fontSize: '12px' }}>→</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Creada el {template.createdAt} ({template.createdBy})
                  </div>
                </div>
              ))}
            </div>

            {templates.length === 0 && (
              <div className="text-center py-8">
                <span style={{ fontSize: '48px', color: '#9CA3AF' }}>📁</span>
                <p className="text-gray-500 mt-2">No se han creado plantillas</p>
              </div>
            )}
          </div>

          {/* Right Panel - Template Editor */}
          <div className="flex-1 flex flex-col">
            {selectedTemplate ? (
              <>
                {/* Editor Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{selectedTemplate.name}</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSetDefault(selectedTemplate.id)}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedTemplate.isDefault
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-800'
                        }`}
                      >
                        ⭐ Predeterminada
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Deshabilitar
                      </button>
                    </div>
                  </div>
                </div>

            {/* Toolbar */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => exec('bold')}
                      className="px-3 py-1 border border-gray-300 rounded text-sm font-bold"
                      title="Negrita"
                    >
                      B
                    </button>
                    <button
                      onClick={() => exec('italic')}
                      className="px-3 py-1 border border-gray-300 rounded text-sm italic"
                      title="Cursiva"
                    >
                      /
                    </button>
                    <button
                      onClick={() => exec('underline')}
                      className="px-3 py-1 border border-gray-300 rounded text-sm underline"
                      title="Subrayado"
                    >
                      U
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-2"></div>
                    <button
                      onClick={() => exec('insertUnorderedList')}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                      title="Lista con viñetas"
                    >
                      •
                    </button>
                    <button
                      onClick={() => exec('insertOrderedList')}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                      title="Lista numerada"
                    >
                      1.
                    </button>
                <button
                      onClick={() => exec('insertHorizontalRule')}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                      title="Línea separadora"
                >
                  ―
                </button>
                    <div className="flex-1"></div>
                    <button
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                      title="Pantalla completa"
                    >
                      <span style={{ fontSize: '12px' }}>⛶</span>
                    </button>
                  </div>
                </div>

            {/* Rich Text Editor */}
            <div className="flex-1 p-4">
              <div
                ref={editorRef}
                className="w-full h-full border border-gray-300 rounded p-4 text-sm focus:outline-none bg-white overflow-auto prose max-w-none"
                style={{ minHeight: '360px' }}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  if (editorRef.current) setTemplateContent(editorRef.current.innerHTML);
                }}
                onBlur={() => {
                  if (editorRef.current) setTemplateContent(editorRef.current.innerHTML);
                }}
                placeholder="Ingresa el contenido de la plantilla..."
              />
            </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <span style={{ fontSize: '48px', color: '#9CA3AF' }}>📝</span>
                  <p className="text-gray-500 mt-2">Selecciona una plantilla para editar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
          {selectedTemplate && (
            <>
              <button
                onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center"
              >
                <span style={{ fontSize: '14px', marginRight: '6px' }}>🗑️</span>
                Deshabilitar
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center"
              >
                <span style={{ fontSize: '14px', marginRight: '6px' }}>✓</span>
                Guardar
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor; 