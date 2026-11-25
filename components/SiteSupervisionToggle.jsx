"use client";

import { useState } from "react";

// Case réservée aux architectes : "je fais également le suivi de chantier".
// Jamais transmise au client — information interne qui, une fois cochée,
// rend obligatoire la déclaration du téléphone de l'ingénieur et du chef de
// chantier de l'architecte (cf. consigne Rose du 2026-11-25).
export default function SiteSupervisionToggle({ defaultChecked }) {
  const [checked, setChecked] = useState(!!defaultChecked);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <label className="flex items-start gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          name="siteSupervision"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5"
        />
        Je fais également le suivi de chantier
      </label>
      <p className="mt-1 text-xs text-gray-500">
        Information interne, jamais transmise au client. Si tu coches, tu dois déclarer ton ingénieur et ton chef de
        chantier : tu pourras ensuite leur attribuer une part de paiement sur n'importe quelle étape.
      </p>

      {checked && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Téléphone de ton ingénieur</label>
            <input
              type="tel"
              name="siteSupervisionEngineerPhone"
              required={checked}
              placeholder="ex: 0701020304"
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Téléphone de ton chef de chantier</label>
            <input
              type="tel"
              name="siteSupervisionSiteManagerPhone"
              required={checked}
              placeholder="ex: 0709998888"
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
