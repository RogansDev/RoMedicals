import React, { useState, useRef, useEffect } from 'react';

const OverlaySelect = ({ name, value, options, onChange, placeholder = 'Seleccione una opción', className = 'input-field' }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));
  const label = selected ? selected.label : placeholder;

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
  const filteredOptions = options.filter(o => normalized(o.label).includes(normalized(searchTerm)));

  return (
    <div ref={containerRef} className="relative">
      <button type="button" className={`${className} w-full text-left flex items-center justify-between cursor-pointer`} onClick={() => setOpen(o => !o)}>
        <span className={!selected ? 'text-gray-400' : ''}>{label}</span>
        <span className="ml-2 text-gray-500">▾</span>
      </button>

      {open && (
        <div
          data-overlay-select-list
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden"
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
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default OverlaySelect;


