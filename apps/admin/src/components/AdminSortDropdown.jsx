import { useState, useRef, useEffect } from 'react';

/**
 * Accessible sort dropdown with glass-styled list. Replaces native select
 * so the opened list can use backdrop-filter and translucent background.
 */
export default function AdminSortDropdown({ options, value, onChange, id, ariaLabelledBy }) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const selectedIndex = options.findIndex((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => (i < options.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => (i > 0 ? i - 1 : options.length - 1));
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedIndex >= 0 && options[focusedIndex]) {
          onChange(options[focusedIndex].value);
          setOpen(false);
        }
        return;
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, focusedIndex, options, onChange]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current && focusedIndex >= 0) {
      const el = listRef.current.children[focusedIndex];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [open, focusedIndex]);

  useEffect(() => {
    setFocusedIndex(selectedIndex);
  }, [open, selectedIndex]);

  function handleSelect(option) {
    onChange(option.value);
    setOpen(false);
  }

  return (
    <div className="admin-sort-dropdown" ref={containerRef}>
      <button
        type="button"
        id={id}
        className="admin-sort-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={ariaLabelledBy}
        aria-label="Sort companies"
      >
        <span className="admin-sort-dropdown-value">{selectedOption.label}</span>
        <svg className="admin-sort-dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          className="admin-sort-dropdown-list"
          role="listbox"
          aria-labelledby={id}
          aria-activedescendant={focusedIndex >= 0 ? `${id}-option-${focusedIndex}` : undefined}
        >
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`${id}-option-${i}`}
              role="option"
              aria-selected={option.value === value}
              className={`admin-sort-dropdown-item${option.value === value ? ' admin-sort-dropdown-item-selected' : ''}${i === focusedIndex ? ' admin-sort-dropdown-item-focused' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault();
                handleSelect(option);
              }}
              onPointerEnter={() => setFocusedIndex(i)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
