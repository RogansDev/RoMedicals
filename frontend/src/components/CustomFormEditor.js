import React, { useState } from 'react';
import toast from 'react-hot-toast';

const CustomFormEditor = ({ 
  specialtyName, 
  forms, 
  onSave, 
  onClose 
}) => {
  const [selectedForm, setSelectedForm] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [formFields, setFormFields] = useState([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({
    name: '',
    type: 'text',
    required: false,
    options: []
  });

  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'textarea', label: 'Texto, multilínea' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Fecha' },
    { value: 'select', label: 'Selección' },
    { value: 'select-multiple', label: 'Selección múltiple' },
    { value: 'radio', label: 'Opción única' },
    { value: 'checkbox', label: 'Casilla de verificación' },
    { value: 'file', label: 'Archivo' }
  ];

  const handleCreateForm = () => {
    if (!newFormName.trim()) {
      toast.error('El nombre de la ficha es requerido');
      return;
    }

    const newForm = {
      id: Date.now(),
      name: newFormName,
      fields: formFields,
      isDefault: false,
      isActive: true,
      createdAt: new Date().toLocaleDateString('es-ES'),
      createdBy: 'Administrador'
    };

    onSave([...forms, newForm]);
    setSelectedForm(newForm);
    setShowCreateForm(false);
    setNewFormName('');
    setFormFields([]);
    toast.success('Ficha creada exitosamente');
  };

  const handleSaveForm = () => {
    if (!selectedForm) return;

    const updatedForm = {
      ...selectedForm,
      fields: formFields
    };

    const updatedForms = forms.map(f => 
      f.id === selectedForm.id ? updatedForm : f
    );

    onSave(updatedForms);
    toast.success('Ficha guardada exitosamente');
  };

  const handleDeleteForm = (formId) => {
    if (window.confirm('¿Está seguro de eliminar esta ficha?')) {
      const updatedForms = forms.filter(f => f.id !== formId);
      onSave(updatedForms);
      
      if (selectedForm?.id === formId) {
        setSelectedForm(null);
        setFormFields([]);
      }
      
      toast.success('Ficha eliminada exitosamente');
    }
  };

  const handleSetDefault = (formId) => {
    const updatedForms = forms.map(f => ({
      ...f,
      isDefault: f.id === formId
    }));
    onSave(updatedForms);
    toast.success('Ficha predeterminada actualizada');
  };

  const handleSelectForm = (form) => {
    setSelectedForm(form);
    setFormFields(form.fields || []);
  };

  const handleAddField = () => {
    if (!newField.name.trim()) {
      toast.error('El nombre del campo es requerido');
      return;
    }

    const field = {
      id: Date.now(),
      ...newField
    };

    setFormFields([...formFields, field]);
    setNewField({
      name: '',
      type: 'text',
      required: false,
      options: []
    });
    setShowAddField(false);
  };

  const handleRemoveField = (fieldId) => {
    setFormFields(formFields.filter(f => f.id !== fieldId));
  };

  const handleMoveField = (fieldId, direction) => {
    const index = formFields.findIndex(f => f.id === fieldId);
    if (index === -1) return;

    const newFields = [...formFields];
    if (direction === 'up' && index > 0) {
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else if (direction === 'down' && index < newFields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }

    setFormFields(newFields);
  };

  const getFieldTypeLabel = (type) => {
    const fieldType = fieldTypes.find(ft => ft.value === type);
    return fieldType ? fieldType.label : type;
  };

  const renderFieldOptions = () => {
    if (!['select', 'select-multiple', 'radio'].includes(newField.type)) {
      return null;
    }

    return (
      <div className="mt-2">
        <label className="form-label">Opciones (una por línea)</label>
        <textarea
          value={newField.options.join('\n')}
          onChange={(e) => setNewField({
            ...newField,
            options: e.target.value.split('\n').filter(opt => opt.trim())
          })}
          className="input-field"
          rows="3"
          placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Fichas personalizadas para {specialtyName}
          </h2>
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
          {/* Left Panel - Form List */}
          <div className="w-1/3 border-r bg-gray-50 p-4">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md mb-4 flex items-center justify-center"
            >
              <span style={{ fontSize: '16px', marginRight: '8px' }}>➕</span>
              Crear una nueva ficha
            </button>

            {showCreateForm && (
              <div className="mb-4 p-4 bg-white rounded border">
                <input
                  type="text"
                  placeholder="Nombre de la ficha"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  className="input-field mb-2"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateForm}
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
              {forms.map((form) => (
                <div
                  key={form.id}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedForm?.id === form.id
                      ? 'bg-blue-100 border-blue-300 border'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                  onClick={() => handleSelectForm(form)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {form.isDefault && (
                        <span style={{ fontSize: '14px', marginRight: '6px' }}>⭐</span>
                      )}
                      <span className="font-medium">{form.name}</span>
                    </div>
                    <span style={{ fontSize: '12px' }}>→</span>
                  </div>
                </div>
              ))}
            </div>

            {forms.length === 0 && (
              <div className="text-center py-8">
                <span style={{ fontSize: '48px', color: '#9CA3AF' }}>📄</span>
                <p className="text-gray-500 mt-2">No se han creado fichas</p>
              </div>
            )}
          </div>

          {/* Right Panel - Form Editor */}
          <div className="flex-1 flex flex-col">
            {selectedForm ? (
              <>
                {/* Form Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="form-label">Nombre ficha:</label>
                        <input
                          type="text"
                          value={selectedForm.name}
                          onChange={(e) => {
                            const updatedForm = { ...selectedForm, name: e.target.value };
                            const updatedForms = forms.map(f => 
                              f.id === selectedForm.id ? updatedForm : f
                            );
                            onSave(updatedForms);
                            setSelectedForm(updatedForm);
                          }}
                          className="input-field"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleSetDefault(selectedForm.id)}
                          className={`px-3 py-1 rounded text-sm ${
                            selectedForm.isDefault
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-800'
                          }`}
                        >
                          ⭐ Predeterminada
                        </button>
                        <button
                          onClick={() => handleDeleteForm(selectedForm.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Deshabilitar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fields Section */}
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Campos ficha:</h3>
                    
                    {formFields.length === 0 ? (
                      <div className="text-center py-8">
                        <span style={{ fontSize: '48px', color: '#9CA3AF' }}>📋</span>
                        <p className="text-gray-500 mt-2">No hay campos configurados</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {formFields.map((field, index) => (
                          <div key={field.id} className="flex items-center p-3 border border-gray-200 rounded bg-white">
                            <div className="flex items-center space-x-2 mr-3">
                              <button
                                onClick={() => handleMoveField(field.id, 'up')}
                                disabled={index === 0}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                title="Mover arriba"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => handleMoveField(field.id, 'down')}
                                disabled={index === formFields.length - 1}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                title="Mover abajo"
                              >
                                ↓
                              </button>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{field.name}</div>
                              <div className="text-sm text-gray-500">
                                {getFieldTypeLabel(field.type)}
                                {field.required && ' (Requerido)'}
                                {field.options.length > 0 && ` - ${field.options.length} opciones`}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveField(field.id)}
                              className="text-red-600 hover:text-red-800 ml-2"
                              title="Eliminar campo"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Field Button */}
                  <button
                    onClick={() => setShowAddField(true)}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md flex items-center justify-center"
                  >
                    <span style={{ fontSize: '14px', marginRight: '8px' }}>➕</span>
                    Agregar un campo
                  </button>

                  {/* Add Field Modal */}
                  {showAddField && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                      <div className="bg-white rounded-lg p-6 w-96">
                        <h3 className="text-lg font-medium mb-4">Agregar Campo</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="form-label">Nombre del campo</label>
                            <input
                              type="text"
                              value={newField.name}
                              onChange={(e) => setNewField({...newField, name: e.target.value})}
                              className="input-field"
                              placeholder="Ej: Motivo de consulta"
                            />
                          </div>

                          <div>
                            <label className="form-label">Tipo de campo</label>
                            <select
                              value={newField.type}
                              onChange={(e) => setNewField({...newField, type: e.target.value})}
                              className="input-field"
                            >
                              {fieldTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={newField.required}
                                onChange={(e) => setNewField({...newField, required: e.target.checked})}
                                className="rounded border-gray-300 mr-2"
                              />
                              <span className="text-sm">Campo requerido</span>
                            </label>
                          </div>

                          {renderFieldOptions()}
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                          <button
                            onClick={() => setShowAddField(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleAddField}
                            className="btn-primary"
                          >
                            Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <span style={{ fontSize: '48px', color: '#9CA3AF' }}>📄</span>
                  <p className="text-gray-500 mt-2">Selecciona una ficha para editar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
          {selectedForm && (
            <>
              <button
                onClick={() => handleDeleteForm(selectedForm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center"
              >
                <span style={{ fontSize: '14px', marginRight: '6px' }}>🗑️</span>
                Deshabilitar
              </button>
              <button
                onClick={handleSaveForm}
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

export default CustomFormEditor; 