"use client";

import { useEffect, useRef, useState } from "react";

// Sélecteur multi-choix : soumis dans un <form> classique via plusieurs
// champs cachés du même name, donc searchParams[name] devient un tableau
// côté serveur dès que plus d'une valeur est cochée.
export default function MultiSelectDropdown({ name, options, defaultValues = [], placeholder, searchable = false }) {
  const [selected, setSelected] = useState(defaultValues);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const visibleOptions = searchable
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (value) => {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const label =
    selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} sélectionnés`;

  return (
    <div className="relative" ref={ref}>
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-white p-3 text-left text-sm text-ink focus:outline-none"
      >
        <span className={selected.length === 0 ? "text-gray-400" : ""}>{label}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          {searchable && (
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="mb-2 w-full rounded border border-gray-200 p-1.5 text-sm focus:outline-none"
              autoFocus
            />
          )}
          {visibleOptions.map((opt) => (
            <label key={opt} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-brand"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
