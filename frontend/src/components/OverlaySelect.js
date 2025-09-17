import React, { useState, useRef, useEffect, useMemo } from 'react';

const OverlaySelect = ({ name, value, options, onChange, placeholder = 'Seleccione una opción', className = 'input-field', loading = false, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openingBusy, setOpeningBusy] = useState(false);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));
  const label = selected ? selected.label : placeholder;
  const isDisabled = !!disabled || !!loading;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange && onChange(val);
    setOpen(false);
  };

  const normalized = (s) => String(s || '').toLowerCase();
  const filteredOptions = useMemo(() => {
    const term = normalized(searchTerm);
    return (options || []).filter(o => normalized(o.label).includes(term));
  }, [options, searchTerm]);

  useEffect(() => {
    if (open) {
      // Tras abrir, esperar dos frames para dejar pintar el spinner
      let id1 = null;
      let id2 = null;
      id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(() => {
          setOpeningBusy(false);
        });
      });
      return () => {
        if (id1) cancelAnimationFrame(id1);
        if (id2) cancelAnimationFrame(id2);
      };
    } else {
      setOpeningBusy(false);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={`${className} w-full text-left flex items-center justify-between ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => {
          if (isDisabled) return;
          setOpeningBusy(true);
          setOpen(o => !o);
        }}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
      >
        <span className={!selected ? 'text-gray-400' : ''}>{label}</span>
        <span className="ml-2 flex items-center">
          {loading && (
            <span
              className="inline-block w-4 h-4 mr-1 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"
              aria-label="Cargando"
            />
          )}
          <span className="text-gray-500">▾</span>
        </span>
      </button>

      {open && (
        <div
          data-overlay-select-list
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden"
          role="listbox"
        >
          <div className="sticky top-0 bg-white p-2 border-b border-gray-200">
            <input
              ref={searchInputRef}
              type="text"
              className="input-field w-full"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e)=>setSearchTerm(e.target.value)}
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading || openingBusy ? (
              <div className="px-3 py-3 text-sm text-gray-600 flex items-center">
                <span className="inline-block w-4 h-4 mr-2 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                Cargando...
              </div>
            ) : (
              <>
                {filteredOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className={`block w-full text-left px-3 py-2 hover:bg-gray-50 ${String(o.value) === String(value) ? 'bg-blue-100 text-gray-900' : 'text-gray-700'}`}
                    role="option"
                    aria-selected={String(o.value) === String(value)}
                  >
                    {o.label}
                  </button>
                ))}
                {filteredOptions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverlaySelect;


