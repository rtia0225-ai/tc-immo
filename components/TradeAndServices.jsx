"use client";

import { useState } from "react";
import { CONSTRUCTION_SERVICES, SENIOR_TRADES, SPECIALTY_SERVICES, SPECIALTY_UNRESTRICTED_TRADES } from "@/lib/constants";

export default function TradeAndServices({ initialTrade = "", initialServices = [] }) {
  const [trade, setTrade] = useState(initialTrade);

  // Un ingénieur ou un architecte peut avoir une équipe de maçons, de
  // charpentiers, etc. (ça descend). L'inverse n'a pas de sens : un maçon
  // ne peut pas cocher qu'il a une équipe d'ingénieurs ou d'architectes.
  const isSenior = SENIOR_TRADES.includes(trade);
  const availableServices = isSenior
    ? CONSTRUCTION_SERVICES
    : CONSTRUCTION_SERVICES.filter((s) => !SENIOR_TRADES.includes(s));

  const isSpecialtyUnrestricted = SPECIALTY_UNRESTRICTED_TRADES.includes(trade);
  const availableSpecialties = isSpecialtyUnrestricted
    ? SPECIALTY_SERVICES
    : SPECIALTY_SERVICES.filter((s) => s === "Suivi de chantier");

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium">Métier principal</label>
        <select
          name="trade"
          required
          value={trade}
          onChange={(e) => setTrade(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2"
        >
          <option value="" disabled>Choisir un métier</option>
          {CONSTRUCTION_SERVICES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Services proposés (plusieurs choix possibles)
        </label>
        {!isSenior && (
          <p className="mb-2 text-xs text-gray-500">
            Réservé aux architectes et ingénieurs : diriger une équipe pluridisciplinaire. Choisis ici les corps de métier que tu maîtrises toi-même.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {availableServices.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="services"
                value={s}
                defaultChecked={initialServices.includes(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Prestations spécifiques (en plus de ton métier)
        </label>
        <p className="mb-2 text-xs text-gray-500">
          {isSpecialtyUnrestricted
            ? "En tant qu'architecte, ingénieur ou topographe, tu peux cocher toutes les prestations pertinentes."
            : "Réservé sans restriction aux architectes, ingénieurs et topographes. Pour ton métier, seul le suivi de chantier est disponible ici."}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {availableSpecialties.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="services"
                value={s}
                defaultChecked={initialServices.includes(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
