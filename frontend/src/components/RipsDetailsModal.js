import React, { useState, useEffect, useRef } from 'react';

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

  const panelRef = useRef(null);

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

  const handleWheelCapture = (e) => {
    const panel = panelRef.current;
    if (!panel) return;
    const atTop = panel.scrollTop <= 0;
    const atBottom = Math.ceil(panel.scrollTop + panel.clientHeight) >= panel.scrollHeight;
    const isSelect = e.target && e.target.tagName === 'SELECT';
    if (isSelect || (atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
      panel.scrollTop += e.deltaY;
      e.preventDefault();
    }
  };

  const openSelectList = (e) => {
    try { e.target.size = 6; } catch (_) {}
  };
  const closeSelectList = (e) => {
    try { e.target.size = 1; } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={panelRef} onWheelCapture={handleWheelCapture} className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain">
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
            <select name="causaExterna" className="input-field" value={form.causaExterna} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
              <option value="">Seleccione una opción</option>
              {causaExternaFlatOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Tipo de diagnóstico</label>
            <select name="tipoDiagnostico" className="input-field" value={form.tipoDiagnostico} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
              {tipoDiagnosticoOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Finalidad consulta</label>
            <select name="finalidadConsulta" className="input-field" value={form.finalidadConsulta} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
              {finalidadConsultaOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Finalidad procedimiento</label>
            <select name="finalidadProcedimiento" className="input-field" value={form.finalidadProcedimiento} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
              {finalidadProcedimientoOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
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
              <select name="diagnosticoSecundario1" className="input-field" value={form.diagnosticoSecundario1} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
                {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              <select name="diagnosticoSecundario2" className="input-field" value={form.diagnosticoSecundario2} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
                {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
              <select name="diagnosticoSecundario3" className="input-field" value={form.diagnosticoSecundario3} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
                {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Modalidad de atención</label>
            <select name="modalidadAtencion" className="input-field" value={form.modalidadAtencion} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
              {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Ámbito de atención</label>
            <select name="ambitoAtencion" className="input-field" value={form.ambitoAtencion} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
              {placeholderOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>

          <div>
            <label className="form-label">Tipo de servicio</label>
            <select name="tipoServicio" className="input-field" value={form.tipoServicio} onChange={update} onFocus={openSelectList} onBlur={closeSelectList} onClick={openSelectList}>
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


