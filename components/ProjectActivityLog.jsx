"use client";

import { useState } from "react";
import { submitTechnicianReport, requestAddition, reviewAdditionRequest } from "@/app/projects/activityActions";
import FileInputButton from "@/components/FileInputButton";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

const EVENT_ICONS = {
  contract_signed: "📄",
  milestone_completed: "✅",
  payment_made: "💰",
  document_added: "📎",
  photo_report: "📸",
  addition_requested: "➕",
  addition_approved: "✔️",
  addition_rejected: "✖️",
  appointment: "📅",
};

export default function ProjectActivityLog({
  projectId,
  timelineEvents,
  progressReports,
  additionRequests,
  appointments,
  userId,
  isArtisan,
  isAdmin,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  // Fusionne événements du journal + rendez-vous en une seule chronologie,
  // la plus récente en premier.
  const combined = [
    ...(timelineEvents || []).map((e) => ({
      key: `event-${e.id}`,
      date: e.event_at,
      icon: EVENT_ICONS[e.event_type] || "•",
      title: e.title,
      description: e.description,
      mediaUrl: e.media_url,
      actor: e.actor?.full_name,
    })),
    ...(appointments || []).map((a) => ({
      key: `appt-${a.id}`,
      date: a.scheduled_at,
      icon: EVENT_ICONS.appointment,
      title: `Rendez-vous avec ${a.artisan?.profiles?.full_name || "le professionnel"} (${a.status})`,
      description: a.notes,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const pendingRequests = (additionRequests || []).filter((r) => r.status === "pending");

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-ink">Journal du chantier</h2>
        <div className="flex gap-2">
          {isArtisan && (
            <button
              type="button"
              onClick={() => setShowReportForm((v) => !v)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-ink hover:bg-gray-50"
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

      {showReportForm && (
        <form action={submitTechnicianReport} className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
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
        <form action={requestAddition} className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
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
            <div key={r.id} className="rounded-lg border border-gold/40 bg-amber-50 p-3 text-sm">
              <p className="font-bold text-ink">
                En attente de validation : {r.title} {r.amount ? `(${r.amount})` : ""}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
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
                    <button type="submit" className="rounded-md border border-gray-300 px-3 py-1 text-xs font-bold text-ink hover:bg-gray-50">
                      Refuser
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {progressReports?.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {progressReports.map((r) => (
            <div key={r.id} className="rounded-lg border border-gray-200 p-3">
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
      )}

      <ol className="relative mt-5 border-l-2 border-gray-200 pl-5">
        {combined.length === 0 && (
          <p className="text-sm text-gray-500">Aucun événement pour le moment.</p>
        )}
        {combined.map((item) => (
          <li key={item.key} className="mb-5 last:mb-0">
            <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px]">
              {item.icon}
            </span>
            <p className="text-xs text-gray-400">{formatDate(item.date)}</p>
            <p className="text-sm font-bold text-ink">{item.title}</p>
            {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
            {item.actor && <p className="text-xs text-gray-400">Par {item.actor}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
