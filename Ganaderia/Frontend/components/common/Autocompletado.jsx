import React, { useState, useEffect, useRef } from 'react';

export default function AutocompleteInput({
  options = [], 
  value = '',   
  onChange,  
  placeholder = 'Buscar...',
  required = false,
  disabled = false,
  className = '',
  name = ''
}) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || '');
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar opciones según lo escrito
  const filteredOptions = options.filter(option => {
    if (!inputValue || !inputValue.trim()) return true;
    
    const search = inputValue.toLowerCase().trim();
    const label = (option.label || '').toLowerCase();
    const sublabel = (option.sublabel || '').toLowerCase();
    const extra = (option.extra || '').toLowerCase();
    
    return label.includes(search) || 
           sublabel.includes(search) || 
           extra.includes(search);
  });

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    setHighlightedIndex(-1);
    
    // Si borra todo, limpiar selección
    if (!val.trim()) {
      onChange && onChange(null);
    }
  };

  const handleSelect = (option) => {
    setInputValue(option.label);
    setIsOpen(false);
    onChange && onChange(option);
  };

  const handleClear = () => {
    setInputValue('');
    setIsOpen(false);
    onChange && onChange(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || filteredOptions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    if (options.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="w-full border rounded-lg p-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          autoComplete="off"
        />
        
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <div
              key={option.id || index}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-4 py-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                index === highlightedIndex 
                  ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                  : 'hover:bg-gray-50 border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800">{option.label}</p>
                  {option.sublabel && (
                    <p className="text-xs text-gray-500 mt-0.5">{option.sublabel}</p>
                  )}
                </div>
                {option.extra && (
                  <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                    {option.extra}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && inputValue.trim() && filteredOptions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-400">
          <p>No se encontraron resultados para "{inputValue}"</p>
        </div>
      )}
    </div>
  );
}