import React, { useState, useEffect, useRef } from 'react';
import OverlaySelect from './OverlaySelect';

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
  const [cie10Options, setCie10Options] = useState([]);
  const [cie10Loading, setCie10Loading] = useState(false);
  const [cie10Error, setCie10Error] = useState('');
  const [secondaryCodes, setSecondaryCodes] = useState([]);
  const [secondarySelect, setSecondarySelect] = useState('');

  useEffect(() => {
    if (isOpen && initialValues) {
      setForm(prev => ({ ...prev, ...initialValues }));
      const sec = [
        initialValues.diagnosticoSecundario1 || '',
        initialValues.diagnosticoSecundario2 || '',
        initialValues.diagnosticoSecundario3 || ''
      ].filter(Boolean);
      // Unicos y válidos
      const uniq = Array.from(new Set(sec));
      setSecondaryCodes(uniq);
      setSecondarySelect('');
    }
  }, [isOpen, initialValues]);

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
      if (!isOpen) return;
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
  }, [isOpen]);

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
    setSecondaryCodes([]);
    setSecondarySelect('');
  };

  const handleSave = () => {
    const s1 = secondaryCodes[0] || '';
    const s2 = secondaryCodes[1] || '';
    const s3 = secondaryCodes[2] || '';
    // Construir mapa código->etiqueta para que el padre pueda registrar nombres
    const labelsMap = {};
    const putLabel = (code) => {
      const opt = (cie10Options || []).find(o => String(o.value) === String(code));
      if (opt) labelsMap[code] = opt.label;
    };
    if (form.diagnosticoPrincipal) putLabel(form.diagnosticoPrincipal);
    if (s1) putLabel(s1);
    if (s2) putLabel(s2);
    if (s3) putLabel(s3);

    const payload = {
      ...form,
      diagnosticoSecundario1: s1,
      diagnosticoSecundario2: s2,
      diagnosticoSecundario3: s3,
      _labelsMap: labelsMap
    };
    onSave && onSave(payload);
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

        {/* Formulario */}
        <div className="p-6 space-y-5">
          <div>
            <label className="form-label">Causa externa</label>
            <OverlaySelect
              name="causaExterna"
              value={form.causaExterna}
              options={[{ value: '', label: 'Seleccione una opción' }, ...causaExternaFlatOptions]}
              onChange={(val)=>setForm(prev=>({ ...prev, causaExterna: val }))}
            />
          </div>

          <div>
            <label className="form-label">Tipo de diagnóstico</label>
            <OverlaySelect
              name="tipoDiagnostico"
              value={form.tipoDiagnostico}
              options={tipoDiagnosticoOptions}
              onChange={(val)=>setForm(prev=>({ ...prev, tipoDiagnostico: val }))}
            />
          </div>

          <div>
            <label className="form-label">Finalidad consulta</label>
            <OverlaySelect
              name="finalidadConsulta"
              value={form.finalidadConsulta}
              options={finalidadConsultaOptions}
              onChange={(val)=>setForm(prev=>({ ...prev, finalidadConsulta: val }))}
            />
          </div>

          <div>
            <label className="form-label">Finalidad procedimiento</label>
            <OverlaySelect
              name="finalidadProcedimiento"
              value={form.finalidadProcedimiento}
              options={finalidadProcedimientoOptions}
              onChange={(val)=>setForm(prev=>({ ...prev, finalidadProcedimiento: val }))}
            />
          </div>

          <div>
            <label className="form-label">Diagnóstico principal</label>
            <OverlaySelect
              name="diagnosticoPrincipal"
              value={form.diagnosticoPrincipal}
              options={cie10Options.length ? cie10Options : [{ value: '', label: cie10Error ? `Error: ${cie10Error}` : 'Seleccione una opción' }]}
              onChange={(val)=>{
                setForm(prev=>({ ...prev, diagnosticoPrincipal: val }));
                if (val) {
                  setSecondaryCodes(prev => prev.filter(c => c !== val));
                }
              }}
              loading={cie10Loading}
              disabled={!!cie10Error}
            />
          </div>

          <div>
            <label className="form-label">Diagnósticos secundarios</label>
            {(() => {
              const maxSecondary = 3;
              const exclude = new Set([form.diagnosticoPrincipal, ...secondaryCodes].filter(Boolean));
              const filtered = (cie10Options || []).filter(o => !o.value || !exclude.has(o.value));
              return (
                <div>
                  <OverlaySelect
                    name="diagnosticoSecundarioAdd"
                    value={secondarySelect}
                    options={filtered.length ? filtered : [{ value: '', label: cie10Error ? `Error: ${cie10Error}` : 'Seleccione una opción' }]}
                    onChange={(val)=>{
                      if (!val) return;
                      setSecondaryCodes(prev => {
                        if (prev.includes(val)) return prev;
                        if (prev.length >= maxSecondary) return prev; // límite de compatibilidad
                        return [...prev, val];
                      });
                      setSecondarySelect('');
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
                            <button type="button" className="ml-1 text-blue-700 hover:text-blue-900" aria-label="Eliminar" onClick={()=>setSecondaryCodes(prev=>prev.filter(c=>c!==code))}>×</button>
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
            <label className="form-label">Modalidad de atención</label>
            <OverlaySelect name="modalidadAtencion" value={form.modalidadAtencion} options={modalidadAtencionOptions} onChange={(val)=>setForm(prev=>({ ...prev, modalidadAtencion: val }))} />
          </div>

          <div>
            <label className="form-label">Ámbito de atención</label>
            <OverlaySelect name="ambitoAtencion" value={form.ambitoAtencion} options={ambitoAtencionOptions} onChange={(val)=>setForm(prev=>({ ...prev, ambitoAtencion: val }))} />
          </div>

          <div>
            <label className="form-label">Tipo de servicio</label>
            <OverlaySelect name="tipoServicio" value={form.tipoServicio} options={tipoServicioOptions} onChange={(val)=>setForm(prev=>({ ...prev, tipoServicio: val }))} />
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


