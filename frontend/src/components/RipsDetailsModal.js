import React, { useState, useEffect } from 'react';

// Modal de Detalles RIPS con 11 selectores y textos de colocación.
// Las opciones serán proporcionadas posteriormente; por ahora se usan placeholders.
const RipsDetailsModal = ({ isOpen, onClose, onSave, initialValues }) => {
  const [form, setForm] = useState({
    causaExterna: '',
    tipoDiagnostico: '',
    finalidadConsulta: '',
    finalidadProcedimiento: '',
    diagnosticoPrincipal: '',
    diagnosticoSecundario1: '',
    diagnosticoSecundario2: '',
    diagnosticoSecundario3: '',
    modalidadAtencion: '',
    ambitoAtencion: '',
    tipoServicio: ''
  });

  useEffect(() => {
    if (isOpen && initialValues) {
      setForm(prev => ({ ...prev, ...initialValues }));
    }
  }, [isOpen, initialValues]);

  if (!isOpen) return null;

  const placeholderOptions = [
    { value: '', label: 'Seleccione una opción' },
    { value: 'opcion1', label: '— Colocar opciones —' }
  ];

  const causaExternaOptions = [
    { value: '', label: 'Seleccione una opción' },
    { value: 'accidente_trabajo', label: 'Accidente de trabajo' },
    { value: 'en_el_hogar', label: 'En el hogar' },
    { value: 'transito_origen_comun', label: 'De tránsito de origen común' },
    { value: 'transito_origen_laboral', label: 'De tránsito de origen laboral' },
    { value: 'entorno_educativo', label: 'En el entorno educativo' },
    { value: 'otro_accidente', label: 'Otro tipo de accidente' },
    { value: 'evento_catastrofico_natural', label: 'Evento catastrófico de origen natural' },
    { value: 'lesion_agresion', label: 'Lesión por agresión' },
    { value: 'auto_infligida', label: 'Autoinfligida' },
    { value: 'sospecha_violencia_fisica', label: 'Sospecha de violencia física' },
    { value: 'violencia_psicologica', label: 'De violencia psicológica' },
    { value: 'violencia_sexual', label: 'De violencia sexual' },
    { value: 'negligencia_abandono', label: 'De negligencia y abandono' },
    { value: 'ive_peligro_salud_vida', label: 'IVE relacionado con peligro a la salud o vida de la mujer' },
    { value: 'ive_malformacion_incompatible_vida', label: 'IVE por malformación congénita incompatible con la vida' }
  ];

  const update = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setForm({
      causaExterna: '',
      tipoDiagnostico: '',
      finalidadConsulta: '',
      finalidadProcedimiento: '',
      diagnosticoPrincipal: '',
      diagnosticoSecundario1: '',
      diagnosticoSecundario2: '',
      diagnosticoSecundario3: '',
      modalidadAtencion: '',
      ambitoAtencion: '',
      tipoServicio: ''
    });
  };

  const handleSave = () => {
    onSave && onSave(form);
    onClose && onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Establecer detalles de la consulta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Cerrar">
            <span style={{ fontSize: '20px' }}>✕</span>
          </button>
        </div>

        {/* Aviso informativo */}
        <div className="px-6 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800 text-sm">
            Medilink pre llena los campos basándose en atenciones pasadas. Es responsabilidad del profesional revisar y modificarlos en caso de ser necesario.
          </div>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-5">
          <div>
            <label className="form-label">Causa externa</label>
            <select name="causaExterna" className="input-field" value={form.causaExterna} onChange={update}>
              {causaExternaOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Tipo de diagnóstico</label>
            <select name="tipoDiagnostico" className="input-field" value={form.tipoDiagnostico} onChange={update}>
              {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Finalidad consulta</label>
            <select name="finalidadConsulta" className="input-field" value={form.finalidadConsulta} onChange={update}>
              {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Finalidad procedimiento</label>
            <select name="finalidadProcedimiento" className="input-field" value={form.finalidadProcedimiento} onChange={update}>
              {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Diagnóstico principal</label>
            <select name="diagnosticoPrincipal" className="input-field" value={form.diagnosticoPrincipal} onChange={update}>
              {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Diagnósticos secundarios</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select name="diagnosticoSecundario1" className="input-field" value={form.diagnosticoSecundario1} onChange={update}>
                {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              <select name="diagnosticoSecundario2" className="input-field" value={form.diagnosticoSecundario2} onChange={update}>
                {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              <select name="diagnosticoSecundario3" className="input-field" value={form.diagnosticoSecundario3} onChange={update}>
                {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Modalidad de atención</label>
            <select name="modalidadAtencion" className="input-field" value={form.modalidadAtencion} onChange={update}>
              {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Ámbito de atención</label>
            <select name="ambitoAtencion" className="input-field" value={form.ambitoAtencion} onChange={update}>
              {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Tipo de servicio</label>
            <select name="tipoServicio" className="input-field" value={form.tipoServicio} onChange={update}>
              {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          {/* Botones */}
          <div className="sticky bottom-0 z-10 bg-white -mx-6 px-6 pt-4 pb-4 border-t border-gray-200 flex items-center justify-between">
            <button type="button" className="btn-secondary" onClick={handleClear}>Limpiar datos</button>
            <div className="flex space-x-4">
              <button type="button" className="btn-secondary" onClick={onClose}>Cerrar</button>
              <button type="button" className="btn-primary" onClick={handleSave}>Guardar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RipsDetailsModal;


