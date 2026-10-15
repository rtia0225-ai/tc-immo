"use client";

import { useState } from "react";
import { submitTechnicianReport, requestAddition, reviewAdditionRequest } from "@/app/projects/activityActions";
import FileInputButton from "@/components/FileInputButton";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

// Mises à jour libres sur le chantier : rapports photo/vidéo envoyés par
// le technicien, et demandes d'ajout (paiement, document, autre) à
// valider par l'équipe. Le détail de chaque étape (statut, paiement,
// rendez-vous, documents) vit dans ProjectJourney — ce composant ne
// reconstruit pas une deuxième chronologie du même avancement.
export default function ProjectActivityLog({
  projectId,
  progressReports,
  additionRequests,
  isArtisan,
  isAdmin,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  const pendingRequests = (additionRequests || []).filter((r) => r.status === "pending");

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-card">
      <div className="flex items-center justify-between bg-forest px-5 py-4">
        <h2 className="font-heading text-lg font-bold text-white">Mises à jour & demandes</h2>
        <div className="flex gap-2">
          {isArtisan && (
            <button
              type="button"
              onClick={() => setShowReportForm((v) => !v)}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-forest hover:bg-gray-100"
            >
              📸 Envoyer un rapport
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-lg font-bold text-white hover:bg-brand-dark"
            title="Demander l'ajout de quelque chose"
          >
            +
          </button>
        </div>
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

        {showAddForm && (
          <form action={requestAddition} className="mt-4 flex flex-col gap-3 rounded-lg bg-gray-50 p-4">
            <input type="hidden" name="projectId" value={projectId} />
            <p className="text-xs font-semibold text-gray-500">Demander l'ajout d'un paiement, d'un document ou autre, à valider par l'équipe TCHolding-Immo</p>
            <select name="requestType" className="rounded-lg border border-gray-300 p-2 text-sm" required>
              <option value="payment">Paiement</option>
              <option value="document">Document</option>
              <option value="other">Autre</option>
            </select>
            <input name="title" placeholder="Titre" required className="rounded-lg border border-gray-300 p-2 text-sm" />
            <input name="amount" type="number" placeholder="Montant (si paiement)" className="rounded-lg border border-gray-300 p-2 text-sm" />
            <textarea
              name="justification"
              placeholder="Pourquoi cet ajout est-il nécessaire ?"
              required
              rows={3}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
            <button type="submit" className="w-fit rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">
              Envoyer la demande
            </button>
          </form>
        )}

        {pendingRequests.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {pendingRequests.map((r) => (
              <div key={r.id} className="rounded-lg bg-gold p-3 text-sm text-ink shadow-card">
                <p className="font-bold">
                  En attente de validation : {r.title} {r.amount ? `(${r.amount})` : ""}
                </p>
                <p className="mt-0.5 text-xs text-ink/70">
                  Demandé par {r.requester?.full_name} — {r.justification}
                </p>
                {isAdmin && (
                  <div className="mt-2 flex gap-2">
                    <form action={reviewAdditionRequest}>
                      <input type="hidden" name="requestId" value={r.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="decision" value="approved" />
                      <button type="submit" className="rounded-md bg-forest px-3 py-1 text-xs font-bold text-white hover:bg-forest-dark">
                        Valider
                      </button>
                    </form>
                    <form action={reviewAdditionRequest}>
                      <input type="hidden" name="requestId" value={r.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="decision" value="rejected" />
                      <button type="submit" className="rounded-md bg-white px-3 py-1 text-xs font-bold text-ink shadow-card hover:bg-gray-50">
                        Refuser
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {progressReports?.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3">
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
          !showReportForm &&
          !showAddForm &&
          pendingRequests.length === 0 && (
            <p className="text-sm text-gray-500">Aucune mise à jour pour le moment.</p>
          )
        )}
      </div>
    </div>
  );
}
