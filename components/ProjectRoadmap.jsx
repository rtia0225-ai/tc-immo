"use client";

import { useState } from "react";
import ProjectJourney from "@/components/ProjectJourney";
import { CONSTRUCTION_SERVICES } from "@/lib/constants";

// Statut d'un intervenant sur le fil horizontal : "upcoming" (contrat pas
// encore signé, rien à voir pour l'instant), "done" (toutes ses étapes
// payées) ou "active" (en cours).
function statusOf(a) {
  if (!a.contractSignedAt) return "upcoming";
  const ms = a.milestones || [];
  if (ms.length > 0 && ms.every((m) => m.paid_at)) return "done";
  return "active";
}

// Vu par le CLIENT (ou un admin) : un seul fil, horizontal d'abord — un
// arrêt par intervenant (architecte, ingénieur, technicien, chef de
// chantier...), dans l'ordre réel du chantier — puis vertical une fois
// qu'on clique sur l'un d'eux, pour voir son détail (contrat, étapes,
// paiements, rendez-vous, documents).
//
// Vu par un PROFESSIONNEL (isArtisanViewer) : pas de fil, pas d'autres
// arrêts à voir ou à deviner — uniquement son propre échéancier. Pour
// voir qui sont les autres intervenants et leur parler, c'est la liste
// des participants au-dessus (sur la page projet) qui sert à ça, pas ici.
export default function ProjectRoadmap({ artisans, defaultOpenArtisanId, viewerId, isArtisanViewer }) {
  const ordered = [...(artisans || [])].sort((a, b) => {
    const ia = CONSTRUCTION_SERVICES.indexOf(a.trade);
    const ib = CONSTRUCTION_SERVICES.indexOf(b.trade);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  if (ordered.length === 0) return null;

  if (isArtisanViewer) {
    const mine = ordered.find((a) => a.artisanId === viewerId);
    if (!mine) return null;
    return <ProjectJourney key={mine.artisanId} {...mine.journeyProps} />;
  }

  const statuses = ordered.map(statusOf);
  const defaultOpenFromProp = defaultOpenArtisanId
    ? ordered.findIndex((a) => a.artisanId === defaultOpenArtisanId)
    : -1;
  const firstActive = statuses.findIndex((s) => s === "active");
  const initialOpen = defaultOpenFromProp !== -1 ? defaultOpenFromProp : firstActive !== -1 ? firstActive : 0;

  const [openIndex, setOpenIndex] = useState(initialOpen);

  return (
    <div>
      {/* Fil horizontal : un arrêt par intervenant */}
      <div className="flex items-start gap-0 overflow-x-auto pb-1">
        {ordered.map((a, i) => {
          const status = statuses[i];
          const isOpen = i === openIndex;
          const isLast = i === ordered.length - 1;
          return (
            <div key={a.artisanId} className="flex shrink-0 items-start">
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                className="flex flex-col items-center gap-1 px-1.5 pt-1"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                    status === "done"
                      ? "bg-forest text-white shadow-sm"
                      : status === "active"
                        ? `bg-brand text-white shadow-sm ${isOpen ? "ring-4 ring-brand/20" : ""}`
                        : "border-2 border-dashed border-gray-300 bg-white text-gray-400"
                  }`}
                  title={a.trade}
                >
                  {status === "done" ? "✓" : (a.trade || "?").slice(0, 1).toUpperCase()}
                </div>
                <span
                  className={`max-w-[76px] truncate text-center text-[10px] font-semibold leading-tight ${
                    isOpen ? "text-ink" : status === "upcoming" ? "text-gray-300" : "text-gray-400"
                  }`}
                >
                  {a.trade}
                </span>
              </button>
              {!isLast && (
                <div
                  className={`mt-5 h-0.5 w-6 shrink-0 sm:w-12 ${
                    status === "done" ? "bg-forest" : "border-t-2 border-dashed border-gray-300"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Détail vertical de l'intervenant sélectionné */}
      {ordered[openIndex] && (
        <div className="mt-4">
          <ProjectJourney key={ordered[openIndex].artisanId} {...ordered[openIndex].journeyProps} />
        </div>
      )}
    </div>
  );
}
