"use client";

import { useState } from "react";

// Liste de choix prédéfinis (cases à cocher) + un champ libre pour ajouter
// une valeur qui n'y figure pas (ex: "technicien BTP" n'est pas vraiment un
// service, Rose fournira une vraie liste de services plus tard — en
// attendant, ce composant permet déjà à l'artisan de compléter la liste).
// Tout repart sous le même `name`, comme des checkboxes classiques, donc
// formData.getAll(name) côté serveur n'a rien à changer.
export default function TagPicker({ options, name, initialValues = [], placeholder = "Si ce n'est pas dans la liste, ajoutez-le ici..." }) {
  const [checked, setChecked] = useState(initialValues.filter((v) => options.includes(v)));
  const [custom, setCustom] = useState(initialValues.filter((v) => !options.includes(v)));
  const [draft, setDraft] = useState("");

  const toggle = (opt) => {
    setChecked((c) => (c.includes(opt) ? c.filter((x) => x !== opt) : [...c, opt]));
  };

  const addCustom = () => {
    const value = draft.trim();
    if (value && !custom.includes(value) && !options.includes(value)) {
      setCustom((c) => [...c, value]);
    }
    setDraft("");
  };

  const removeCustom = (value) => setCustom((c) => c.filter((v) => v !== value));

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={checked.includes(opt)} onChange={() => toggle(opt)} />
            {opt}
          </label>
        ))}
      </div>

      {custom.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {custom.map((v) => (
            <span key={v} className="flex items-center gap-1 rounded-full bg-forest-light px-2 py-0.5 text-xs text-forest">
              {v}
              <button type="button" onClick={() => removeCustom(v)} aria-label={`Retirer ${v}`}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 p-2 text-sm"
        />
        <button
          type="button"
          onClick={addCustom}
          className="shrink-0 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-ink hover:bg-gray-200"
        >
          Ajouter
        </button>
      </div>

      {checked.map((v) => (
        <input key={`c-${v}`} type="hidden" name={name} value={v} />
      ))}
      {custom.map((v) => (
        <input key={`x-${v}`} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
