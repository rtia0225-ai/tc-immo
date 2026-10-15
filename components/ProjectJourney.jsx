"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleMilestone, releasePayment, uploadDeliverable } from "@/app/projects/milestones-actions";
import { requestAppointment, markAppointmentCompleted } from "@/app/appointments/actions";
import FileInputButton from "@/components/FileInputButton";
import { SINGLE_INSTALLMENT_TRADES } from "@/lib/constants";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function formatDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

// Formulaire compact pour planifier l'appel de validation d'une étape.
// Toujours disponible, à n'importe quel moment — seule la VALIDATION de
// l'étape dépend de son existence, pas la possibilité de la programmer.
function ScheduleRequiredCall({ projectId, artisanId, milestoneId }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-fit rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-dark"
      >
        📅 Planifier l'appel de validation
      </button>
    );
  }
  return (
    <form action={requestAppointment} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-white p-3 shadow-card">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="artisanId" value={artisanId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input type="hidden" name="isRequired" value="true" />
      <div>
        <label className="block text-[11px] font-semibold text-gray-500">Date et heure</label>
        <input
          type="datetime-local"
          name="scheduledAt"
          required
          className="mt-0.5 rounded-md border border-gray-300 p-1.5 text-xs"
        />
      </div>
      <button type="submit" className="rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-dark">
        Proposer ce créneau
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
        Annuler
      </button>
    </form>
  );
}

function RequiredCallStatus({ projectId, appointment }) {
  const isPast = new Date(appointment.scheduled_at) < new Date();
  const label =
    appointment.status === "completed"
      ? "Terminé"
      : appointment.status === "cancelled"
        ? "Annulé"
        : isPast
          ? "Passé — à confirmer"
          : "Prévu";
  const color =
    appointment.status === "completed"
      ? "bg-forest-light text-forest"
      : appointment.status === "cancelled"
        ? "bg-gray-100 text-gray-500"
        : "bg-gold text-ink";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white p-2.5 shadow-card">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>{label}</span>
      <span className="text-xs text-gray-600">
        Appel de validation — {formatDateTime(appointment.scheduled_at)}
      </span>
      {appointment.status !== "completed" && appointment.status !== "cancelled" && (
        <form action={markAppointmentCompleted}>
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <button type="submit" className="text-xs font-bold text-forest hover:underline">
            Marquer comme terminé
          </button>
        </form>
      )}
    </div>
  );
}

function EducationBlock({ content }) {
  const [open, setOpen] = useState(false);
  if (!content || (!content.summary && !content.video_url && !content.pdf_url)) return null;

  return (
    <div className="mt-3 rounded-lg border border-dashed border-forest/40 bg-forest-light/40 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-xs font-bold text-forest"
      >
        🎓 Ce qui se passe à cette étape, et quoi vérifier
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 text-xs text-ink">
          {content.summary && <p className="leading-relaxed">{content.summary}</p>}
          {content.video_url && (
            <a href={content.video_url} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
              🎥 Voir la vidéo explicative
            </a>
          )}
          {content.pdf_url && (
            <a href={content.pdf_url} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
              📄 Lire le PDF détaillé
            </a>
          )}
          {content.questions_to_ask && (
            <div>
              <p className="font-semibold text-gray-600">Questions à poser à votre technicien :</p>
              <ul className="mt-1 list-disc pl-4">
                {content.questions_to_ask.split("\n").filter(Boolean).map((q, i) => (
                  <li key={i}>{q.trim()}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// LE parcours du projet : un seul chemin, toutes les phases visibles en
// permanence (jamais révélées au fur et à mesure), avec pour chacune son
// statut, son paiement, son rendez-vous de validation, ses documents et
// son contenu pédagogique réunis dans la même carte. Remplace les
// anciens affichages séparés (chemin compact, échéancier de paiement,
// journal d'activité) qui dupliquaient la même information.
export default function ProjectJourney({
  projectId,
  artisanId,
  artisanName,
  trade,
  totalAmount,
  currency,
  contractSignedAt,
  contractHref,
  milestones,
  appointments,
  educationByTitle,
  isArtisan,
  isClient,
}) {
  const requiresDeliverable = !!SINGLE_INSTALLMENT_TRADES[trade];
  const sortedMilestones = [...(milestones || [])].sort((a, b) => a.order_index - b.order_index);
  const appointmentsByMilestone = {};
  const looseAppointments = [];
  (appointments || []).forEach((a) => {
    if (a.milestone_id) {
      appointmentsByMilestone[a.milestone_id] = [...(appointmentsByMilestone[a.milestone_id] || []), a];
    } else {
      looseAppointments.push(a);
    }
  });

  return (
    <div className="overflow-hidden rounded-lg shadow-card">
      <div className="bg-brand p-4">
        <h3 className="font-heading font-bold text-white">{artisanName}, {trade}</h3>
        <p className="text-xs text-brand-light">{totalAmount?.toLocaleString("fr-FR")} {currency} au total</p>
      </div>

      <div className="flex flex-col gap-4 bg-[#FAF8F3] p-4">
        {/* Contrat */}
        <div className="rounded-lg bg-white p-3.5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">📄 Contrat</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${contractSignedAt ? "bg-forest-light text-forest" : "bg-gold text-ink"}`}>
              {contractSignedAt ? `Signé le ${formatDate(contractSignedAt)}` : "En attente de signature"}
            </span>
          </div>
          {!contractSignedAt && contractHref && (
            <Link href={contractHref} className="mt-2 inline-block text-xs font-bold text-brand hover:underline">
              Consulter et signer le contrat →
            </Link>
          )}
        </div>

        {sortedMilestones.map((m, i) => {
          const requiredAppointments = (appointmentsByMilestone[m.id] || []).filter((a) => a.is_required);
          const hasBlockingRequirement = requiredAppointments.length > 0 && !requiredAppointments.some((a) => a.status === "completed");
          const status = m.paid_at ? "Payée" : m.is_completed ? "Validée" : "En cours";
          const statusColor = m.paid_at
            ? "bg-forest-light text-forest"
            : m.is_completed
              ? "bg-brand-light text-brand"
              : "bg-gold text-ink";
          const education = educationByTitle?.[m.title];

          return (
            <div key={m.id} className="rounded-lg bg-white p-3.5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink">
                  {i + 1}. {m.title}
                </p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor}`}>{status}</span>
              </div>

              {m.amount != null && (
                <p className="mt-1 text-xs font-semibold text-gray-600">
                  {m.amount.toLocaleString("fr-FR")} {currency}
                  {m.paid_at && ` — payé le ${formatDate(m.paid_at)}`}
                </p>
              )}

              {/* Rendez-vous de validation */}
              {requiredAppointments.length > 0 ? (
                requiredAppointments.map((a) => (
                  <RequiredCallStatus key={a.id} projectId={projectId} appointment={a} />
                ))
              ) : (
                !m.is_completed && (
                  <ScheduleRequiredCall projectId={projectId} artisanId={artisanId} milestoneId={m.id} />
                )
              )}

              {/* Document / validation de l'étape */}
              {m.deliverableSignedUrl && (
                <p className="mt-2 text-xs">
                  <a href={m.deliverableSignedUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
                    📎 Voir le document livré
                  </a>
                </p>
              )}

              {isArtisan && !m.is_completed && (
                hasBlockingRequirement ? (
                  <p className="mt-2 text-xs text-gray-400">
                    L'appel de validation doit être terminé avant de pouvoir valider cette étape.
                  </p>
                ) : requiresDeliverable ? (
                  <form action={uploadDeliverable} className="mt-2 flex flex-col gap-2">
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <FileInputButton name="document" accept=".pdf,image/*" required label="Choisir le document" />
                    <button type="submit" className="w-fit rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                      Envoyer et débloquer le paiement
                    </button>
                  </form>
                ) : (
                  <form action={toggleMilestone} className="mt-2">
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="isCompleted" value="false" />
                    <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                      Marquer comme terminé
                    </button>
                  </form>
                )
              )}

              {isClient && m.is_completed && !m.paid_at && (
                <form action={releasePayment} className="mt-2">
                  <input type="hidden" name="milestoneId" value={m.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <button type="submit" className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-dark">
                    Confirmer le virement effectué
                  </button>
                </form>
              )}

              <EducationBlock content={education} />
            </div>
          );
        })}

        {looseAppointments.length > 0 && (
          <div className="rounded-lg bg-white p-3.5 shadow-card">
            <p className="text-sm font-bold text-ink">📞 Autres appels</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {looseAppointments.map((a) => (
                <p key={a.id} className="text-xs text-gray-600">
                  {formatDateTime(a.scheduled_at)} — {a.status}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="bg-gray-50 p-3 text-[11px] text-gray-500">
        L'échéancier a été défini à la création du projet, selon le contrat convenu avec l'artisan ; il ne peut plus être modifié.
      </p>
    </div>
  );
}
