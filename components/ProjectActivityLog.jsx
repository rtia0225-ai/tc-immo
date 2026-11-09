"use client";

import { useState } from "react";
import { submitTechnicianReport } from "@/app/projects/activityActions";
import FileInputButton from "@/components/FileInputButton";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

// Rapports d'avancement libres (photos/vidéos + notes) envoyés par le
// technicien sur le chantier. Les ajouts imprévus (paiement, document,
// rendez-vous, autre) se font directement sur la ligne du parcours
// (ProjectJourney), au "+" entre deux étapes — plus ici.
export default function ProjectActivityLog({ projectId, progressReports, isArtisan }) {
  const [showReportForm, setShowReportForm] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-card">
      <div className="flex items-center justify-between bg-forest px-5 py-4">
        <h2 className="font-heading text-lg font-bold text-white">Rapports d'avancement</h2>
        {isArtisan && (
          <button
            type="button"
            onClick={() => setShowReportForm((v) => !v)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-forest hover:bg-gray-100"
          >
            📸 Envoyer un rapport
          </button>
        )}
      </div>

      <div className="bg-[#FAF8F3] p-5">
        {showReportForm && (
          <form action={submitTechnicianReport} className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4">
            <input type="hidden" name="projectId" value={projectId} />
            <p className="text-xs font-semibold text-gray-500">Rapport d'avancement (photos/vidéos + notes)</p>
            <FileInputButton name="media" accept="image/*,video/*" multiple label="Ajouter des photos/vidéos" compress />
            <textarea
              name="notes"
              placeholder="Notes sur l'avancement..."
              rows={3}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
            <button type="submit" className="w-fit rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">
              Envoyer le rapport
            </button>
          </form>
        )}

        {progressReports?.length > 0 ? (
          <div className={showReportForm ? "mt-4 flex flex-col gap-3" : "flex flex-col gap-3"}>
            {progressReports.map((r) => (
              <div key={r.id} className="rounded-lg bg-white p-3 shadow-card">
                <p className="text-xs font-semibold text-gray-500">
                  Rapport de {r.technician?.full_name} — {formatDate(r.created_at)}
                </p>
                {r.notes && <p className="mt-1 text-sm text-gray-700">{r.notes}</p>}
                {r.technician_report_media?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.technician_report_media.map((m, i) => (
                      <a key={i} href={m.media_url} target="_blank" rel="noreferrer" className="text-xs text-brand underline">
                        {m.media_type === "video" ? "🎥 Vidéo" : "📷 Photo"} {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !showReportForm && <p className="text-sm text-gray-500">Aucun rapport pour le moment.</p>
        )}
      </div>
    </div>
  );
}
