"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleMilestone, releasePayment, uploadDeliverable } from "@/app/projects/milestones-actions";
import { requestAppointment, markAppointmentCompleted } from "@/app/appointments/actions";
import { requestAddition, reviewAdditionRequest } from "@/app/projects/activityActions";
import FileInputButton from "@/components/FileInputButton";
import { SINGLE_INSTALLMENT_TRADES, FINAL_DOCUMENT_TRADES } from "@/lib/constants";

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

const ADDITION_TYPE_LABEL = { payment: "Paiement", document: "Document", other: "Autre" };

// Une ligne d'ajout déjà existante à cet endroit précis du parcours
// (en attente de validation du client, ou déjà validée).
function AdditionItem({ projectId, item, isClient }) {
  const pending = item.status === "pending";
  return (
    <div className={`mt-1 rounded-lg p-2.5 text-xs ${pending ? "bg-gold/30" : "bg-gray-50"}`}>
      <p className="font-bold text-ink">
        {ADDITION_TYPE_LABEL[item.request_type] || "Ajout"} — {item.title}
        {item.amount ? ` (${Number(item.amount).toLocaleString("fr-FR")})` : ""}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500">
        {pending ? "En attente de validation" : item.status === "rejected" ? "Refusé" : "Validé"}
        {item.requester?.full_name ? ` — demandé par ${item.requester.full_name}` : ""}
        {item.justification ? ` — ${item.justification}` : ""}
      </p>
      {pending && isClient && (
        <div className="mt-1.5 flex gap-2">
          <form action={reviewAdditionRequest}>
            <input type="hidden" name="requestId" value={item.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="decision" value="approved" />
            <button type="submit" className="rounded-md bg-forest px-2.5 py-1 text-[11px] font-bold text-white hover:bg-forest-dark">
              Valider
            </button>
          </form>
          <form action={reviewAdditionRequest}>
            <input type="hidden" name="requestId" value={item.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="decision" value="rejected" />
            <button type="submit" className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-ink shadow-card hover:bg-gray-50">
              Refuser
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Le "+" sur la ligne verticale, entre deux étapes (ou juste après le
// contrat) : permet d'insérer un paiement, un document, un rendez-vous ou
// autre chose à cet endroit précis — garde l'ouverture nécessaire pour
// tout ce qui n'était pas prévu au départ, sans passer par une section à
// part. Remplace l'ancienne "Mise à jour des demandes".
function GapInsertion({ projectId, artisanId, afterMilestoneId, items, isClient, canAdd, hasLineBelow }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-3">
      <div className="flex w-6 shrink-0 flex-col items-center">
        {canAdd ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            title="Ajouter un paiement, un document, un rendez-vous ou autre chose ici"
            className="flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-gray-300 text-[11px] font-bold leading-none text-gray-400 hover:border-brand hover:text-brand"
          >
            +
          </button>
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-gray-200" />
        )}
        {hasLineBelow && <div className="mt-1 w-px flex-1 border-l border-dashed border-gray-200" />}
      </div>
      <div className="flex-1 pb-6">
        {(items || []).map((r) => (
          <AdditionItem key={r.id} projectId={projectId} item={r} isClient={isClient} />
        ))}
        {open && (
          <form action={requestAddition} className="mt-1 flex flex-col gap-2 rounded-lg bg-gray-50 p-3">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="artisanId" value={artisanId} />
            <input type="hidden" name="afterMilestoneId" value={afterMilestoneId || ""} />
            <select name="requestType" className="rounded-lg border border-gray-300 p-2 text-xs" required>
              <option value="payment">Paiement</option>
              <option value="document">Document</option>
              <option value="other">Rendez-vous / autre</option>
            </select>
            <input name="title" placeholder="Titre" required className="rounded-lg border border-gray-300 p-2 text-xs" />
            <input name="amount" type="number" placeholder="Montant (si paiement)" className="rounded-lg border border-gray-300 p-2 text-xs" />
            <textarea
              name="justification"
              placeholder="Pourquoi cet ajout, à cet endroit précis ?"
              required
              rows={2}
              className="rounded-lg border border-gray-300 p-2 text-xs"
            />
            <div className="flex gap-2">
              <button type="submit" className="w-fit rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark">
                Ajouter ici
              </button>
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// LE parcours du projet : un seul chemin, toutes les phases visibles en
// permanence (jamais révélées au fur et à mesure), avec pour chacune son
// statut, son paiement, son rendez-vous de validation, ses documents et
// son contenu pédagogique réunis dans la même carte. Entre chaque étape,
// un "+" permet d'insérer un ajout imprévu directement à cet endroit.
// Remplace les anciens affichages séparés (chemin compact, échéancier de
// paiement, journal d'activité) qui dupliquaient la même information.
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
  additionRequests,
  educationByTitle,
  isArtisan,
  isClient,
}) {
  // Topographe (SINGLE_INSTALLMENT_TRADES) : son unique étape exige le
  // document livré. Architecte/Ingénieur (FINAL_DOCUMENT_TRADES) : plusieurs
  // étapes bien réelles, seule la DERNIÈRE (le document final) exige l'envoi
  // d'un document — les précédentes se valident normalement.
  const isSingleInstallmentTrade = !!SINGLE_INSTALLMENT_TRADES[trade];
  const isFinalDocumentTrade = !!FINAL_DOCUMENT_TRADES[trade];
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

  // Les ajouts déjà demandés/validés à cet endroit précis du parcours,
  // regroupés par position (clé = id de l'étape juste avant laquelle ils
  // ont été insérés, ou "contract" pour juste après le contrat).
  const additionsByGap = {};
  (additionRequests || []).forEach((r) => {
    const key = r.after_milestone_id || "contract";
    additionsByGap[key] = [...(additionsByGap[key] || []), r];
  });

  // Client et artisan peuvent tous les deux ouvrir un "+" à n'importe quel
  // endroit — seule la validation diffère (automatique pour le client,
  // soumise à son accord pour l'artisan).
  const canAdd = isClient || isArtisan;

  return (
    <div className="flex flex-col">
      {/* Juste une ligne verticale en pointillés, un point par étape, et
          le texte — pas de carte, pas d'en-tête de couleur. */}
      <p className="mb-2 text-xs font-semibold text-gray-400">{artisanName} · {trade}</p>

      {/* Contrat — premier maillon du parcours. */}
      <div className="flex gap-3">
        <div className="flex w-6 shrink-0 flex-col items-center">
          <div
            className={`h-2.5 w-2.5 rounded-full ${contractSignedAt ? "bg-forest" : "border-2 border-dashed border-gray-300 bg-white"}`}
          />
          <div className={`mt-1 w-px flex-1 ${contractSignedAt ? "bg-forest" : "border-l border-dashed border-gray-300"}`} />
        </div>
        <div className="flex-1 pb-8">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-bold text-ink">Contrat</p>
            <span className="text-xs text-gray-500">
              {contractSignedAt ? `Signé le ${formatDate(contractSignedAt)}` : "En attente de signature"}
            </span>
          </div>
          {!contractSignedAt && contractHref && (
            <Link href={contractHref} className="mt-1 inline-block text-xs font-bold text-brand hover:underline">
              Consulter et signer le contrat →
            </Link>
          )}
        </div>
      </div>

      {/* Ouverture entre le contrat et la première étape. */}
      <GapInsertion
        projectId={projectId}
        artisanId={artisanId}
        afterMilestoneId={null}
        items={additionsByGap["contract"]}
        isClient={isClient}
        canAdd={canAdd}
        hasLineBelow={sortedMilestones.length > 0}
      />

      {sortedMilestones.map((m, i) => {
        const requiredAppointments = (appointmentsByMilestone[m.id] || []).filter((a) => a.is_required);
        const hasBlockingRequirement = requiredAppointments.length > 0 && !requiredAppointments.some((a) => a.status === "completed");
        const status = m.paid_at ? "Payée" : m.is_completed ? "Validée" : "En cours";
        const education = educationByTitle?.[m.title];
        const isLast = i === sortedMilestones.length - 1;
        const requiresDeliverable = isSingleInstallmentTrade || (isFinalDocumentTrade && isLast);

        return (
          <div key={m.id}>
            <div className="flex gap-3">
              <div className="flex w-6 shrink-0 flex-col items-center">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    m.paid_at || m.is_completed ? "bg-forest" : "border-2 border-dashed border-gray-300 bg-white"
                  }`}
                />
                <div className={`mt-1 w-px flex-1 ${m.paid_at || m.is_completed ? "bg-forest" : "border-l border-dashed border-gray-300"}`} />
              </div>
              <div className="flex-1 pb-8">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-sm font-bold text-ink">{m.title}</p>
                  <span className="text-xs text-gray-500">{status}</span>
                  {m.amount != null && (
                    <span className="text-xs text-gray-500">
                      — {m.amount.toLocaleString("fr-FR")} {currency}
                      {m.paid_at && ` payé le ${formatDate(m.paid_at)}`}
                    </span>
                  )}
                </div>

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
                  <p className="mt-1 text-xs">
                    <a href={m.deliverableSignedUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
                      📎 Voir le document livré
                    </a>
                  </p>
                )}
                {m.deliverable_document_url && !m.deliverableSignedUrl && m.deliverable_review_status === "needs_manual_review" && (
                  <p className="mt-1 text-xs text-gray-500">
                    📎 Document déposé, en cours de vérification avant d'être rendu visible.
                  </p>
                )}
                {m.deliverable_review_status === "rejected" && (
                  <p className="mt-1 text-xs text-brand">
                    Le document déposé n'a pas été validé{isArtisan ? " — merci d'en déposer un nouveau." : "."}
                  </p>
                )}

                {isArtisan && !m.is_completed && (
                  hasBlockingRequirement ? (
                    <p className="mt-1 text-xs text-gray-400">
                      L'appel de validation doit être terminé avant de pouvoir valider cette étape.
                    </p>
                  ) : requiresDeliverable ? (
                    <form action={uploadDeliverable} className="mt-1 flex flex-col gap-2">
                      <input type="hidden" name="milestoneId" value={m.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <FileInputButton name="document" accept=".pdf,image/*" required label="Choisir le document" />
                      <button type="submit" className="w-fit text-xs font-bold text-brand hover:underline">
                        Envoyer et débloquer le paiement
                      </button>
                    </form>
                  ) : (
                    <form action={toggleMilestone} className="mt-1">
                      <input type="hidden" name="milestoneId" value={m.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="isCompleted" value="false" />
                      <button type="submit" className="text-xs font-bold text-brand hover:underline">
                        Marquer comme terminé
                      </button>
                    </form>
                  )
                )}

                {isClient && m.is_completed && !m.paid_at && (
                  <form action={releasePayment} className="mt-1">
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <button type="submit" className="text-xs font-bold text-forest hover:underline">
                      Confirmer le virement effectué
                    </button>
                  </form>
                )}

                <EducationBlock content={education} />
              </div>
            </div>

            {/* Ouverture entre cette étape et la suivante (ou la fin). */}
            <GapInsertion
              projectId={projectId}
              artisanId={artisanId}
              afterMilestoneId={m.id}
              items={additionsByGap[m.id]}
              isClient={isClient}
              canAdd={canAdd}
              hasLineBelow={!isLast}
            />
          </div>
        );
      })}

      {looseAppointments.length > 0 && (
        <div className="ml-6 pl-3">
          <p className="text-xs font-bold text-ink">📞 Autres appels</p>
          <div className="mt-1 flex flex-col gap-0.5">
            {looseAppointments.map((a) => (
              <p key={a.id} className="text-xs text-gray-500">
                {formatDateTime(a.scheduled_at)} — {a.status}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
