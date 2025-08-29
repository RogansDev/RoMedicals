import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { uploadsAPI, buildFileUrl } from '../config/api';

const ImagesDocsSection = ({ patientId, appointmentId }) => {
  const [activeTab, setActiveTab] = useState('media'); // media | documents
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [fallbackSrcById, setFallbackSrcById] = useState({});
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // { src, name }

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (preview) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [preview]);

  const mediaItems = useMemo(() => items.filter(i => (i.file_type || '').startsWith('image/') || (i.file_type || '').startsWith('video/')), [items]);
  const documentItems = useMemo(() => items.filter(i => !(i.file_type || '').startsWith('image/') && !(i.file_type || '').startsWith('video/')), [items]);

  const load = async () => {
    if (!appointmentId) return;
    try {
      setLoading(true);
      const { data } = await uploadsAPI.getByAppointment(appointmentId);
      setItems(data.uploads || []);
    } catch (e) {
      console.error('Error cargando archivos:', e);
      toast.error('No se pudieron cargar los archivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [appointmentId]);

  const handleUpload = async (e, kind) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setUploading(true);
      for (const file of files) {
        const form = new FormData();
        form.append(kind === 'image' ? 'image' : kind === 'document' ? 'document' : 'files', file);
        form.append('patientId', String(patientId));
        form.append('appointmentId', String(appointmentId));
        form.append('type', kind);
        if (kind === 'image') {
          await uploadsAPI.uploadImage(form);
        } else if (kind === 'document') {
          await uploadsAPI.uploadDocument(form);
        } else {
          await uploadsAPI.uploadMultiple(form);
        }
      }
      toast.success('Archivo(s) subidos');
      await load();
    } catch (e2) {
      console.error('Error subiendo archivo:', e2);
      toast.error(e2?.response?.data?.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      await uploadsAPI.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Eliminado');
    } catch (e) {
      console.error('Error eliminando archivo:', e);
      toast.error('No se pudo eliminar');
    }
  };

  const getMediaSrc = (it) => {
    const tries = fallbackSrcById[it.id] || 0;
    const basePrimary = buildFileUrl(it.file_path);
    if (tries === 0) return basePrimary;
    // Segundo intento: mismo origen vía /api/uploads
    if (tries === 1) {
      if (it.file_path?.startsWith('/uploads')) return `/api${it.file_path}`;
      return it.file_path;
    }
    // Tercer intento: apuntar directo al backend común en dev (3001)
    if (tries === 2) {
      try {
        const origin = window.location.origin;
        const backendOrigin = origin.replace(':3000', ':3001');
        const p = it.file_path?.startsWith('/uploads') ? `/api${it.file_path}` : it.file_path || '';
        return `${backendOrigin}${p}`;
      } catch (_) {
        return basePrimary;
      }
    }
    return basePrimary;
  };

  const handleImgError = (id) => {
    setFallbackSrcById(prev => ({ ...prev, [id]: Math.min((prev[id] || 0) + 1, 3) }));
  };

  const renderMediaCard = (it) => {
    const url = getMediaSrc(it);
    if ((it.file_type || '').startsWith('image/')) {
      return (
        <div key={it.id} className="group border rounded-md overflow-hidden">
          <div className="relative cursor-zoom-in" onClick={() => setPreview({ src: url, name: it.original_name })}>
            <img src={url} alt={it.original_name} className="w-full h-40 object-cover" onError={() => handleImgError(it.id)} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-black/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl">🔍</div>
            </div>
          </div>
          <div className="p-2 text-sm flex items-center justify-between">
            <span className="truncate" title={it.original_name}>{it.original_name}</span>
            <button className="text-red-600 hover:text-red-800" onClick={() => handleDelete(it.id)}>Eliminar</button>
          </div>
        </div>
      );
    }
    if ((it.file_type || '').startsWith('video/')) {
      return (
        <div key={it.id} className="border rounded-md overflow-hidden">
          <video src={url} controls className="w-full h-40 object-contain bg-black" />
          <div className="p-2 text-sm flex items-center justify-between">
            <span className="truncate" title={it.original_name}>{it.original_name}</span>
            <button className="text-red-600 hover:text-red-800" onClick={() => handleDelete(it.id)}>Eliminar</button>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderDocRow = (it) => {
    const url = buildFileUrl(it.file_path);
    return (
      <tr key={it.id} className="text-sm">
        <td className="py-2">
          <span className="inline-flex items-center gap-2">
            <span>📄</span>
            <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 truncate max-w-[320px]" title={it.original_name}>{it.original_name}</a>
          </span>
        </td>
        <td className="py-2 text-gray-500 hidden md:table-cell">{(it.file_type || '').split('/')[1] || it.file_type}</td>
        <td className="py-2 text-gray-500 hidden md:table-cell">{Math.round((it.file_size || 0) / 1024)} KB</td>
        <td className="py-2 text-right">
          <button className="text-red-600 hover:text-red-800" onClick={() => handleDelete(it.id)}>Eliminar</button>
        </td>
      </tr>
    );
  };

  return (
    <>
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          className={`px-3 py-1 rounded ${activeTab==='media' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('media')}
        >
          Imágenes/Videos
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded ${activeTab==='documents' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('documents')}
        >
          Documentos
        </button>
      </div>

      {activeTab === 'media' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="btn-secondary cursor-pointer text-sm">
              Subir imagen
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e)=>handleUpload(e,'image')} />
            </label>
            <label className="btn-secondary cursor-pointer text-sm">
              Subir video
              <input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={(e)=>handleUpload(e,'video')} />
            </label>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : mediaItems.length === 0 ? (
            <div className="text-sm text-gray-500">No hay imágenes ni videos.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {mediaItems.map(renderMediaCard)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="btn-secondary cursor-pointer text-sm">
              Subir documento
              <input type="file" accept="application/pdf,.doc,.docx,.txt" className="hidden" disabled={uploading} onChange={(e)=>handleUpload(e,'document')} />
            </label>
          </div>
          {loading ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : documentItems.length === 0 ? (
            <div className="text-sm text-gray-500">No hay documentos.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-xs text-gray-500 text-left">
                    <th className="py-2 font-medium">Nombre</th>
                    <th className="py-2 font-medium hidden md:table-cell">Tipo</th>
                    <th className="py-2 font-medium hidden md:table-cell">Tamaño</th>
                    <th className="py-2 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentItems.map(renderDocRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
    {preview ? createPortal(
      (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-6xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full w-8 h-8 shadow flex items-center justify-center hover:bg-gray-100"
              onClick={() => setPreview(null)}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <img src={preview.src} alt={preview.name || 'Imagen'} className="w-full max-h-[90vh] object-contain rounded" />
            {preview.name ? (
              <div className="mt-2 text-center text-sm text-white/90 truncate">{preview.name}</div>
            ) : null}
          </div>
        </div>
      ),
      document.body
    ) : null}
    </>
  );
};

export default ImagesDocsSection;
