/**
 * CustomSelect — styled dropdown consistent with locale selector.
 * Replaces native <select> with a button + panel for consistent look.
 */

import { useState, useEffect, useRef } from 'react';

export default function CustomSelect({
  id,
  value,
  onChange,
  options = [],
  optionGroups = null,
  placeholder = 'Select…',
  required = false,
  disabled = false,
  className = '',
  'aria-describedby': ariaDescribedby,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const flatOptions = optionGroups
    ? optionGroups.flatMap((g) => g.options || [])
    : options;
  const selectedOption = flatOptions.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  function handleSelect(optionValue) {
    onChange(optionValue);
    setOpen(false);
  }

  return (
    <div
      ref={ref}
      className={`custom-select${open ? ' custom-select-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        id={id}
        className={`custom-select-trigger${!selectedOption ? ' custom-select-trigger-placeholder' : ''}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-describedby={ariaDescribedby || undefined}
        disabled={disabled}
        aria-required={required}
      >
        <span className="custom-select-value">{displayLabel}</span>
        <svg className="custom-select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className={`custom-select-menu${open ? ' custom-select-menu-open' : ''}`}
        role="listbox"
        aria-labelledby={id}
        aria-activedescendant={open && value ? `${id}-option-${value}` : undefined}
      >
        {optionGroups ? (
          optionGroups.map((group, gi) => (
            <div key={gi} className="custom-select-group">
              <div className="custom-select-group-label">{group.label}</div>
              {(group.options || []).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  id={`${id}-option-${opt.value}`}
                  aria-selected={value === opt.value}
                  className={`custom-select-item${value === opt.value ? ' custom-select-item-selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ))
        ) : (
          options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              id={`${id}-option-${opt.value}`}
              aria-selected={value === opt.value}
              className={`custom-select-item${value === opt.value ? ' custom-select-item-selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
