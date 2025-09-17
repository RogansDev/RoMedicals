import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { uploadsAPI, buildFileUrl, aiAPI } from '../config/api';
import api from '../config/api';

const ImagesDocsSection = ({ patientId, appointmentId, onlyDocuments = false }) => {
  const [activeTab, setActiveTab] = useState(onlyDocuments ? 'documents' : 'media'); // media | documents
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [fallbackSrcById, setFallbackSrcById] = useState({});
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // { src, name }
  const [analyzingId, setAnalyzingId] = useState(null); // upload id en análisis
  const [analysis, setAnalysis] = useState(null); // { name, content }
  const [hasAnalysisById, setHasAnalysisById] = useState({}); // uploadId -> boolean

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (preview || analysis) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [preview, analysis]);

  const mediaItems = useMemo(() => items.filter(i => (i.file_type || '').startsWith('image/') || (i.file_type || '').startsWith('video/')), [items]);
  const documentItems = useMemo(() => items.filter(i => !(i.file_type || '').startsWith('image/') && !(i.file_type || '').startsWith('video/')), [items]);

  const load = async () => {
    if (!appointmentId) return;
    try {
      setLoading(true);
      const { data } = await uploadsAPI.getByAppointment(appointmentId);
      const all = data.uploads || [];
      // Filtrar por categoría de manera inclusiva para soportar registros antiguos
      const filtered = all.filter(it => {
        const cat = it.upload_type || it.uploadType || '';
        const ft = (it.file_type || '').toLowerCase();
        const isMedia = ft.startsWith('image/') || ft.startsWith('video/');
        if (onlyDocuments) {
          // Mostrar documentos clínicos explícitos, o cualquier archivo no multimedia que no esté marcado como images_docs
          return cat === 'clinical_docs' || (!isMedia && cat !== 'images_docs');
        } else {
          // Mostrar todo excepto lo explícitamente clínico
          return cat !== 'clinical_docs';
        }
      });
      setItems(filtered);
    } catch (e) {
      console.error('Error cargando archivos:', e);
      toast.error('No se pudieron cargar los archivos');
    } finally {
      setLoading(false);
    }
  };

  // Cache local para análisis por documento
  const getCacheKey = (id) => `aiAnalysis:upload:${id}`;
  const readCachedAnalysis = (id) => {
    try {
      const raw = localStorage.getItem(getCacheKey(id));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (obj && obj.content) return obj;
      return null;
    } catch (_) { return null; }
  };
  const writeCachedAnalysis = (id, payload) => {
    try {
      const toSave = { content: payload.content || payload, name: payload.name || '', createdAt: new Date().toISOString() };
      localStorage.setItem(getCacheKey(id), JSON.stringify(toSave));
    } catch (_) {}
  };

  useEffect(() => {
    // Refrescar mapa de disponibilidad de análisis al cambiar items
    const map = {};
    for (const it of items) {
      map[it.id] = !!readCachedAnalysis(it.id);
    }
    setHasAnalysisById(map);
  }, [items]);

  const normalizeAiContent = (input) => {
    try {
      let t = input;
      if (t == null) return '';
      if (typeof t !== 'string') t = String(t);
      const trimmed = t.trim();
      // Si es JSON con { message: "..." }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const obj = JSON.parse(trimmed);
          if (obj && typeof obj === 'object') {
            t = obj.message || obj.text || obj.content || t;
          }
        } catch (_) {}
        // Fallback: si no se pudo parsear, intentar extraer con regex el campo message
        if (typeof t === 'string' && t.trim().startsWith('{')) {
          const m = t.match(/"message"\s*:\s*"([\s\S]*?)"\s*\}?\s*$/);
          if (m && m[1]) {
            t = m[1];
          }
        }
      }
      // Quitar comillas exteriores si vienen
      if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('\'') && t.endsWith('\''))) {
        t = t.slice(1, -1);
      }
      // Des-escape de secuencias visibles
      for (let i = 0; i < 2; i++) {
        t = t.replace(/\\n/g, '\n')
             .replace(/\\t/g, '  ')
             .replace(/\\"/g, '"')
             .replace(/\\\//g, '/');
      }
      return t;
    } catch (_) {
      return typeof input === 'string' ? input : '';
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
        // uploadType separa las secciones del UI para persistir categoría
        form.append('uploadType', onlyDocuments ? 'clinical_docs' : (kind === 'image' || kind === 'video' ? 'images_docs' : 'images_docs'));
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

  const loadScriptOnce = (src, globalCheck) => new Promise((resolve, reject) => {
    try {
      if (globalCheck && globalCheck()) return resolve();
    } catch (_) {}
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`No se pudo cargar script: ${src}`));
    document.head.appendChild(el);
  });

  const extractTextFromPdf = async (arrayBuffer) => {
    try {
      let pdfjsLib = null;
      try {
        pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf')).default || (await import('pdfjs-dist/legacy/build/pdf'));
      } catch (_) {
        await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', () => window.pdfjsLib);
        pdfjsLib = window.pdfjsLib;
      }
      try {
        if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      } catch (_) {}
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, 20);
      let fullText = '';
      for (let p = 1; p <= maxPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const strings = content.items.map((it) => it.str).filter(Boolean);
        fullText += `\n\n[Página ${p}]\n` + strings.join(' ');
        if (fullText.length > 120000) break; // límite de seguridad
      }
      return fullText.trim();
    } catch (e) {
      console.warn('Fallo extrayendo PDF:', e);
      return '';
    }
  };

  const ocrFromPdf = async (arrayBuffer) => {
    try {
      // Cargar PDF.js (para renderizar páginas a <canvas>)
      let pdfjsLib = null;
      try {
        pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf')).default || (await import('pdfjs-dist/legacy/build/pdf'));
      } catch (_) {
        await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', () => window.pdfjsLib);
        pdfjsLib = window.pdfjsLib;
      }
      try {
        if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      } catch (_) {}

      // Cargar Tesseract desde CDN
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js', () => window.Tesseract);
      const Tesseract = window.Tesseract;

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const pagesToProcess = Math.min(pdf.numPages, 3); // OCR en primeras 3 páginas por performance
      let fullText = '';

      for (let p = 1; p <= pagesToProcess; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        const { data: { text } } = await Tesseract.recognize(dataUrl, 'spa+eng');
        fullText += `\n\n[Página ${p} OCR]\n` + (text || '');
        if (fullText.length > 80000) break;
      }

      return fullText.trim();
    } catch (e) {
      console.warn('Fallo en OCR PDF:', e);
      return '';
    }
  };

  const extractTextFromDocx = async (arrayBuffer) => {
    try {
      const mammoth = await import('mammoth/mammoth.browser');
      const result = await mammoth.extractRawText({ arrayBuffer });
      return (result?.value || '').trim();
    } catch (e) {
      console.warn('Fallo extrayendo DOCX:', e);
      return '';
    }
  };

  const extractTextGeneric = async (arrayBuffer, mime, name) => {
    const ext = (name || '').toLowerCase().split('.').pop();
    if ((mime || '').includes('pdf') || ext === 'pdf') {
      return extractTextFromPdf(arrayBuffer);
    }
    if ((mime || '').includes('wordprocessingml') || ext === 'docx') {
      return extractTextFromDocx(arrayBuffer);
    }
    if ((mime || '').startsWith('text/') || ext === 'txt') {
      try { return new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer)).trim(); } catch (_) { return ''; }
    }
    return '';
  };

  const handleAnalyze = async (it) => {
    try {
      setAnalyzingId(it.id);
      const url = buildFileUrl(it.file_path);
      // Descargar el archivo y extraer texto si es posible
      let extracted = '';
      try {
        const resp = await api.get(url, { responseType: 'arraybuffer', timeout: 60000 });
        const buf = resp?.data;
        if (buf) {
          extracted = await extractTextGeneric(buf, it.file_type, it.original_name);
          if (!extracted && ((it.file_type || '').includes('pdf') || (it.original_name || '').toLowerCase().endsWith('.pdf'))) {
            // Intento OCR si no se pudo extraer texto
            extracted = await ocrFromPdf(buf);
          }
        }
      } catch (e) {
        console.warn('No se pudo descargar el archivo para extracción:', e);
      }

      let prompt = '';
      if (extracted && extracted.length > 0) {
        const max = 6000; // reducir tamaño para evitar límites del backend/LLM
        const snippet = extracted.slice(0, max);
        prompt = `Analiza clínicamente el siguiente documento (examen o resultado médico). Devuelve en Markdown con secciones: Resumen, Hallazgos relevantes con valores, Interpretación, Riesgos/alertas, Recomendaciones/próximos pasos, Limitaciones.\n\nCONTENIDO:\n${snippet}`;
      } else {
        prompt = `Analiza clínicamente este documento: ${url}. Si no puedes leerlo, indícalo y sugiere que el usuario copie el texto del PDF o adjunte una versión con texto seleccionable.`;
      }
      // Enviar solo campos permitidos por el backend
      const resp = await aiAPI.assist({ intent: 'chat', prompt, patientId, appointmentId }, { timeout: 60000 });
      const data = resp?.data || {};
      let text = data.analysis || data.summary || data.message || data.reply || data.text || '';
      text = normalizeAiContent(text);

      // Reintento con prompt corto si viene vacío
      if (!text || !String(text).trim()) {
        if (extracted) {
          const snippet2 = extracted.slice(0, 2000);
          const prompt2 = `Devuelve un análisis clínico breve (en HTML con <h2> y <ul>) usando este contenido:\n\n${snippet2}`;
          try {
            const r2 = await aiAPI.assist({ intent: 'chat', prompt: prompt2, patientId, appointmentId }, { timeout: 60000 });
            const d2 = r2?.data || {};
            const t2 = normalizeAiContent(d2.analysis || d2.summary || d2.message || d2.reply || d2.text || '');
            if (t2 && String(t2).trim()) text = t2;
          } catch (_) {}
        }
      }

      let content = text;
      if (!content || !String(content).trim()) {
        if (extracted) {
          const show = extracted.slice(0, 4000).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
          content = `<p>No se obtuvo un análisis automático. A continuación el contenido extraído para referencia:</p><details><summary>Ver contenido extraído</summary><pre style=\"white-space:pre-wrap\">${show}</pre></details>`;
        } else {
          content = 'No se pudo extraer texto del documento. Sube una versión con texto seleccionable o comparte el contenido aquí.';
        }
      }

      setAnalysis({ name: it.original_name, content });
      writeCachedAnalysis(it.id, { name: it.original_name, content });
      setHasAnalysisById(prev => ({ ...prev, [it.id]: true }));
    } catch (e) {
      console.error('Error analizando documento:', e);
      let msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Error realizando análisis con IA';
      try {
        const raw = e?.response?.data;
        if (raw && typeof raw === 'object') {
          const extra = JSON.stringify(raw).slice(0, 300);
          if (extra && extra !== '{}' && !msg.includes(extra)) msg = `${msg}: ${extra}`;
        } else if (typeof raw === 'string') {
          const extra = raw.slice(0, 300);
          if (extra && !msg.includes(extra)) msg = `${msg}: ${extra}`;
        }
      } catch (_) {}
      toast.error(msg);
    } finally {
      setAnalyzingId(null);
    }
  };

  const openCachedAnalysis = (it) => {
    const cached = readCachedAnalysis(it.id);
    if (cached) {
      setAnalysis({ name: it.original_name || cached.name || 'Documento', content: cached.content });
      return true;
    }
    return false;
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
          <div className="flex items-center justify-end gap-3">
            <button
              className={`hover:text-blue-800 ${analyzingId === it.id ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600'}`}
              onClick={() => {
                if (analyzingId) return;
                if (hasAnalysisById[it.id]) {
                  openCachedAnalysis(it);
                } else {
                  handleAnalyze(it);
                }
              }}
              disabled={analyzingId === it.id}
              title={hasAnalysisById[it.id] ? 'Ver análisis AI' : 'Análisis AI del documento'}
            >
              {hasAnalysisById[it.id] ? 'Ver análisis AI' : (analyzingId === it.id ? 'Analizando…' : 'Análisis AI')}
            </button>
            <button className="text-red-600 hover:text-red-800" onClick={() => handleDelete(it.id)}>Eliminar</button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
    <div>
      {!onlyDocuments ? (
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
      ) : null}

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
    {analysis ? createPortal(
      (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setAnalysis(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded shadow" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute -top-3 -right-3 bg-white text-gray-700 rounded-full w-8 h-8 shadow flex items-center justify-center hover:bg-gray-100"
              onClick={() => setAnalysis(null)}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <div className="p-4 border-b">
              <div className="text-sm text-gray-500">Análisis AI del documento</div>
              <div className="font-medium truncate">{analysis.name}</div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {(() => {
                const html = String(analysis.content || '')
                  .replace(/^\{\s*"message"\s*:\s*"/, '')
                  .replace(/"\s*\}$/,'')
                  .replace(/\\n/g, '\n');
                return (
                  <>
                    <style>{`
                      .ai-analysis h1 { font-size: 1.5rem; line-height: 2rem; font-weight: 600; margin: 0 0 0.75rem 0; color: #111827; }
                      .ai-analysis h2 { font-size: 1.125rem; line-height: 1.75rem; font-weight: 600; margin: 1rem 0 0.5rem 0; color: #111827; }
                      .ai-analysis h3 { font-size: 1rem; line-height: 1.5rem; font-weight: 600; margin: 0.75rem 0 0.5rem 0; color: #111827; }
                      .ai-analysis p { margin: 0.5rem 0; color: #374151; line-height: 1.7; }
                      .ai-analysis ul, .ai-analysis ol { padding-left: 1.25rem; margin: 0.5rem 0; }
                      .ai-analysis li { margin: 0.25rem 0; }
                      .ai-analysis strong { color: #111827; }
                      .ai-analysis table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
                      .ai-analysis table th, .ai-analysis table td { border-bottom: 1px solid #E5E7EB; padding: 0.5rem; text-align: left; }
                    `}</style>
                    <div className="ai-analysis prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
                  </>
                );
              })()}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button type="button" className="btn-secondary" onClick={() => setAnalysis(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      ),
      document.body
    ) : null}
    </>
  );
};

export default ImagesDocsSection;
