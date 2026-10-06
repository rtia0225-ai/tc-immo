"use client";

import { useState } from "react";

export default function InterviewSlotPicker({ slots }) {
  const [selectedId, setSelectedId] = useState("");

  const slotsByDate = slots.reduce((acc, s) => {
    acc[s.date] = acc[s.date] || [];
    acc[s.date].push(s);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-brand bg-brand-light p-4">
      <p className="font-heading text-sm font-bold text-brand-dark">
        Réservez un rendez-vous avant que votre inscription soit validée
      </p>
      <p className="mt-1 text-xs text-brand-dark">
        Pour votre métier, un entretien avec l'équipe TCHolding-Immo est requis. Choisissez un créneau ci-dessous.
      </p>

      <input type="hidden" name="interviewSlotId" value={selectedId} required />

      {Object.keys(slotsByDate).length === 0 ? (
        <p className="mt-3 text-xs text-gray-600">Aucun créneau disponible pour le moment, réessaie un peu plus tard.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {Object.entries(slotsByDate).map(([date, daySlots]) => (
            <div key={date}>
              <p className="mb-1.5 text-xs font-bold text-ink">
                {new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {daySlots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`rounded-lg border py-2 text-sm font-medium ${
                      selectedId === s.id
                        ? "border-brand bg-brand text-white"
                        : "border-gray-300 bg-white text-ink hover:border-brand"
                    }`}
                  >
                    {s.start_time.slice(0, 5)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
