"use client";

import { useState, useRef, useEffect } from "react";

// Permet à un maçon (ou autre artisan) de choisir, en tapant son nom, le
// technicien qui l'a recommandé sur la plateforme. Lien fixe, une fois
// pour toutes, sans validation admin nécessaire.
export default function RecruiterSelect({ technicians }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = technicians.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name="recruitedByTechnicianId" value={selectedId} />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Tape le nom du technicien..."
        className="w-full rounded-lg border border-gray-300 p-2 text-sm"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setQuery(t.name);
                setSelectedId(t.id);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
