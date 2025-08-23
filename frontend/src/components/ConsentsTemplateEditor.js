import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { specialtiesAPI } from '../config/api';
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

const ConsentsTemplateEditor = ({ specialty, onClose, onSaved, selectedTemplateId }) => {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const resp = await specialtiesAPI.getTemplates(specialty.id, 'consents');
      const rows = resp.data.templates || [];
      const mapped = rows.map(t => ({
        id: t.id,
        name: t.name,
        content: t.content || '',
        isDefault: !!t.is_default,
        isActive: !!t.is_active,
        createdAt: t.created_at,
      }));
      setTemplates(mapped);
      const pre = mapped.find(t => String(t.id) === String(selectedTemplateId));
      setSelected(pre || mapped[0] || null);
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedTemplateId]);

  const addNew = () => {
    const tmpId = `new-${Date.now()}`;
    const item = { id: tmpId, name: 'Nuevo consentimiento', content: '', isDefault: templates.length === 0, isActive: true };
    setTemplates(prev => [...prev, item]);
    setSelected(item);
  };

  const setDefault = (id) => {
    setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })));
  };

  const remove = (id) => {
    const rest = templates.filter(t => t.id !== id);
    setTemplates(rest);
    setSelected(rest[0] || null);
  };

  const save = async () => {
    try {
      setLoading(true);
      const resp = await specialtiesAPI.getTemplates(specialty.id, 'consents');
      const db = (resp.data.templates || []).map(t => ({ id: t.id, name: t.name, content: t.content || '', isDefault: !!t.is_default, isActive: !!t.is_active }));
      const dbById = new Map(db.map(t => [String(t.id), t]));
      const curById = new Map(templates.map(t => [String(t.id), t]));

      // delete
      for (const old of db) {
        if (!curById.has(String(old.id))) {
          await specialtiesAPI.deleteTemplate(specialty.id, 'consents', old.id);
        }
      }
      // create/update
      for (const cur of templates) {
        if (String(cur.id).startsWith('new-')) {
          await specialtiesAPI.createTemplate(specialty.id, {
            type: 'consents', name: cur.name, content: cur.content,
            isDefault: !!cur.isDefault, isActive: !!cur.isActive,
          });
        } else {
          const before = dbById.get(String(cur.id));
          if (!before || before.name !== cur.name || before.content !== cur.content || before.isDefault !== cur.isDefault || before.isActive !== cur.isActive) {
            await specialtiesAPI.updateTemplate(specialty.id, 'consents', cur.id, {
              name: cur.name, content: cur.content, isDefault: !!cur.isDefault, isActive: !!cur.isActive,
            });
          }
        }
      }

      toast.success('Plantillas de consentimiento guardadas');
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron guardar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Plantillas de consentimientos - {specialty.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r bg-gray-50 p-4">
            <button onClick={addNew} className="w-full bg-green-600 text-white px-4 py-2 rounded-md mb-4">+ Nueva plantilla</button>
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className={`p-3 rounded border cursor-pointer ${selected?.id===t.id?'bg-blue-100 border-blue-300':'bg-white border-gray-200 hover:bg-gray-50'}`} onClick={()=>setSelected(t)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t.isDefault && <span>⭐</span>}
                      <span className="font-medium">{t.name}</span>
                    </div>
                    <span>→</span>
                  </div>
                </div>
              ))}
              {templates.length===0 && (
                <div className="text-center py-8 text-gray-500">No hay plantillas</div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {selected ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <input type="text" className="input-field" value={selected.name} onChange={(e)=>setSelected({ ...selected, name: e.target.value })} onBlur={()=>setTemplates(prev=>prev.map(t=>t.id===selected.id?{...t, name:selected.name}:t))} />
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!selected.isDefault} onChange={(e)=>{ setSelected({ ...selected, isDefault: e.target.checked }); setDefault(selected.id); }} /> Predeterminada</label>
                    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!selected.isActive} onChange={(e)=>setSelected({ ...selected, isActive: e.target.checked })} /> Activa</label>
                    <button onClick={()=>{ remove(selected.id); }} className="ml-auto text-red-600 hover:text-red-800 text-sm">Eliminar</button>
                  </div>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                  <ReactQuill theme="snow" modules={quillModules} formats={quillFormats} value={selected.content} onChange={(html)=>setSelected(prev=>({ ...prev, content: html }))} className="h-[calc(100%-2rem)]" />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">Seleccione o cree una plantilla</div>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button onClick={save} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-md">{loading?'Guardando...':'Guardar'}</button>
        </div>
      </div>
    </div>
  );
};

export default ConsentsTemplateEditor;


