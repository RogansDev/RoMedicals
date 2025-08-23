import React, { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { consentsAPI } from '../config/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'bullet' }, { list: 'ordered' }],
    [{ header: [1, 2, 3, false] }],
    ['blockquote', 'code-block'],
    ['clean'],
  ],
  clipboard: { matchVisual: false },
};
const quillFormats = ['header', 'bold', 'italic', 'underline', 'list', 'blockquote', 'code-block'];

const Consents = () => {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const editorRef = useRef(null);

  const load = async () => {
    try {
      setLoading(true);
      const resp = await consentsAPI.getAll();
      const rows = resp.data.templates || [];
      const mapped = rows.map(t => ({ id: t.id, name: t.name, content: t.content || '', isDefault: !!t.is_default, isActive: !!t.is_active }));
      setTemplates(mapped);
      setSelected(mapped[0] || null);
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addNew = () => {
    const tmpId = `new-${Date.now()}`;
    const item = { id: tmpId, name: 'Nuevo consentimiento', content: '', isDefault: templates.length === 0, isActive: true };
    setTemplates(prev => [...prev, item]);
    setSelected(item);
  };

  const setDefault = (id) => {
    setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })));
  };

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    try {
      if (!String(id).startsWith('new-')) {
        await consentsAPI.delete(id);
      }
      setTemplates(prev => prev.filter(t => t.id !== id));
      setSelected(null);
      toast.success('Plantilla eliminada');
    } catch (e) {
      console.error(e);
      toast.error('No se pudo eliminar');
    }
  };

  const insertAtCursor = (text) => {
    const quill = editorRef.current && editorRef.current.getEditor ? editorRef.current.getEditor() : null;
    if (!quill) return;
    const range = quill.getSelection(true);
    const index = range ? range.index : quill.getLength();
    quill.insertText(index, text, 'user');
    quill.setSelection(index + text.length, 0, 'user');
    const html = quill.root.innerHTML;
    setSelected(prev => ({ ...prev, content: html }));
  };

  const insertVariable = (type) => {
    switch (type) {
      case 'paciente':
        insertAtCursor('{{NOMBRE_PACIENTE}}');
        break;
      case 'doctor':
        insertAtCursor('{{NOMBRE_DOCTOR}}');
        break;
      case 'cedula':
        insertAtCursor('{{CEDULA_PACIENTE}}');
        break;
      case 'fecha':
        insertAtCursor('{{FECHA_ACTUAL}}');
        break;
      case 'custom': {
        insertAtCursor('{{TEXTO_PERSONALIZADO}}');
        break;
      }
      default:
        break;
    }
  };

  const save = async () => {
    try {
      setLoading(true);
      const currentTemplates = (selected ? templates.map(t => t.id === selected.id ? {
        ...t,
        name: selected.name,
        content: selected.content,
        isDefault: !!selected.isDefault,
        isActive: !!selected.isActive,
      } : t) : templates);

      const resp = await consentsAPI.getAll();
      const db = (resp.data.templates || []).map(t => ({ id: t.id, name: t.name, content: t.content || '', isDefault: !!t.is_default, isActive: !!t.is_active }));
      const dbById = new Map(db.map(t => [String(t.id), t]));
      const curById = new Map(currentTemplates.map(t => [String(t.id), t]));

      for (const old of db) {
        if (!curById.has(String(old.id))) {
          await consentsAPI.delete(old.id);
        }
      }
      for (const cur of currentTemplates) {
        if (String(cur.id).startsWith('new-')) {
          await consentsAPI.create({
            name: cur.name,
            content: cur.content,
            isDefault: !!cur.isDefault,
            isActive: !!cur.isActive,
          });
        } else {
          const before = dbById.get(String(cur.id));
          if (!before || before.name !== cur.name || before.content !== cur.content || before.isDefault !== cur.isDefault || before.isActive !== cur.isActive) {
            await consentsAPI.update(cur.id, {
              name: cur.name,
              content: cur.content,
              isDefault: !!cur.isDefault,
              isActive: !!cur.isActive,
            });
          }
        }
      }

      toast.success('Consentimientos guardados');
      load();
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consentimientos</h1>
          <p className="text-gray-600">Plantillas de consentimientos informados</p>
        </div>
        <button onClick={save} disabled={loading} className="btn-primary">{loading? 'Guardando...' : 'Guardar'}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card col-span-1">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Plantillas</h2>
            <button onClick={addNew} className="btn-secondary text-sm">+ Nueva</button>
          </div>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className={`p-3 border rounded cursor-pointer ${selected?.id===t.id?'bg-blue-50 border-blue-300':'bg-white border-gray-200'}`} onClick={()=>setSelected(t)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {t.isDefault && <span>⭐</span>}
                    <span className="font-medium">{t.name}</span>
                  </div>
                  <div className="space-x-2">
                    <button className="text-red-600 text-sm" onClick={(e)=>{ e.stopPropagation(); remove(t.id); }}>Eliminar</button>
                  </div>
                </div>
              </div>
            ))}
            {templates.length===0 && (
              <div className="text-gray-500 text-sm">No hay plantillas</div>
            )}
          </div>
        </div>

        <div className="card col-span-2">
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input type="text" className="input-field" value={selected.name} onChange={(e)=>setSelected({ ...selected, name: e.target.value })} onBlur={()=>setTemplates(prev=>prev.map(t=>t.id===selected.id?{...t, name:selected.name}:t))} />
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!selected.isDefault} onChange={(e)=>{ setSelected({ ...selected, isDefault: e.target.checked }); setDefault(selected.id); }} /> Predeterminada</label>
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!selected.isActive} onChange={(e)=>setSelected({ ...selected, isActive: e.target.checked })} /> Activa</label>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Variables:</span>
                <button type="button" className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-50" onClick={()=>insertVariable('paciente')}>Paciente</button>
                <button type="button" className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-50" onClick={()=>insertVariable('doctor')}>Doctor</button>
                <button type="button" className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-50" onClick={()=>insertVariable('cedula')}>Cédula</button>
                <button type="button" className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-50" onClick={()=>insertVariable('fecha')}>Fecha actual</button>
                <button type="button" className="px-2 py-1 text-sm border rounded bg-white hover:bg-gray-50" onClick={()=>insertVariable('custom')}>Texto personalizado</button>
              </div>

              <ReactQuill
                ref={editorRef}
                theme="snow"
                modules={quillModules}
                formats={quillFormats}
                value={selected.content}
                onChange={(html)=>setSelected(prev=>({ ...prev, content: html }))}
              />
            </div>
          ) : (
            <div className="text-gray-500">Seleccione o cree una plantilla</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Consents;

