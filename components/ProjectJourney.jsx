"use client";

import { useState } from "react";
import Link from "next/link";
import { toggleMilestone, releasePayment, uploadDeliverable, shareDossier, addMilestoneSplit, removeMilestoneSplit } from "@/app/projects/milestones-actions";
import { markAppointmentCompleted } from "@/app/appointments/actions";
import { requestAddition, reviewAdditionRequest } from "@/app/projects/activityActions";
import FileInputButton from "@/components/FileInputButton";
import SubmitButton from "@/components/SubmitButton";
import { MANDATORY_CALL_TRADES } from "@/lib/constants";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function formatDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

// Un seul bouton, pas de formulaire : on part directement vers la prise de
// rendez-vous (créneaux déjà déclarés par le professionnel, un clic = c'est
// réservé, pas de date à taper ni de type d'appel à choisir — audio ou
// vidéo, c'est eux qui en décident une fois en ligne).
function CallButton({ projectId, artisanId, milestoneId, mandatory }) {
  return (
    <Link
      href={`/appointments/new?artisan=${artisanId}&project=${projectId}&milestone=${milestoneId}&required=${mandatory ? "true" : "false"}`}
      className="mt-2 inline-block w-fit rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
    >
      📞 Appeler pour faire le point
    </Link>
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
          ? "Passé, à confirmer"
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
      <span className="text-xs text-gray-600">Appel de validation : {formatDateTime(appointment.scheduled_at)}</span>
      {appointment.meeting_link && appointment.status !== "cancelled" && (
        <a href={appointment.meeting_link} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand hover:underline">
          Rejoindre l'appel →
        </a>
      )}
      {appointment.status !== "completed" && appointment.status !== "cancelled" && (
        <form action={markAppointmentCompleted}>
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <SubmitButton className="text-xs font-bold text-forest hover:underline" pendingLabel="...">
            Marquer comme terminé
          </SubmitButton>
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

// Bouton de partage du DOSSIER ENTIER d'un professionnel (pas un document
// à la fois) vers un autre professionnel du projet : un clic révèle la
// liste des autres professionnels, un clic sur l'un d'eux envoie tout le
// dossier directement. Le "+" porte un libellé ("Partager avec") pour que
// son rôle soit clair sans avoir à survoler. Les professionnels sont
// identifiés par leur métier (Architecte, Technicien...), jamais par leur
// nom : ce qui intéresse celui qui envoie, c'est le rôle, pas qui c'est.
function ShareDossierButton({ projectId, sourceArtisanId, otherArtisans }) {
  const [open, setOpen] = useState(false);
  if (!otherArtisans || otherArtisans.length === 0) return null;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-dark"
      >
        <span aria-hidden>+</span> Partager avec
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {otherArtisans.map((a) => (
        <form key={a.artisanId} action={shareDossier}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="sourceArtisanId" value={sourceArtisanId} />
          <input type="hidden" name="recipientArtisanId" value={a.artisanId} />
          <SubmitButton className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-ink hover:bg-gray-200" pendingLabel="...">
            {a.trade}
          </SubmitButton>
        </form>
      ))}
      <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-gray-400 hover:text-gray-600">
        Annuler
      </button>
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
        {ADDITION_TYPE_LABEL[item.request_type] || "Ajout"} : {item.title}
        {item.amount ? ` (${Number(item.amount).toLocaleString("fr-FR")})` : ""}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500">
        {pending ? "En attente de validation" : item.status === "rejected" ? "Refusé" : "Validé"}
        {item.requester?.full_name ? `, demandé par ${item.requester.full_name}` : ""}
        {item.justification ? `, ${item.justification}` : ""}
      </p>
      {pending && isClient && (
        <div className="mt-1.5 flex gap-2">
          <form action={reviewAdditionRequest}>
            <input type="hidden" name="requestId" value={item.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="decision" value="approved" />
            <SubmitButton className="rounded-md bg-forest px-2.5 py-1 text-[11px] font-bold text-white hover:bg-forest-dark" pendingLabel="...">
              Valider
            </SubmitButton>
          </form>
          <form action={reviewAdditionRequest}>
            <input type="hidden" name="requestId" value={item.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="decision" value="rejected" />
            <SubmitButton className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-ink shadow-card hover:bg-gray-50" pendingLabel="...">
              Refuser
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

// Un document reçu du dossier d'un autre professionnel du projet, inséré
// dans le parcours à sa date réelle (pas la date de partage).
function SharedDocumentItem({ doc }) {
  return (
    <div className="mt-1 rounded-lg bg-forest-light/50 p-2.5 text-xs">
      <p className="font-bold text-ink">📎 {doc.label}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">
        Reçu de {doc.sourceArtisanName || "un autre professionnel"} : {formatDate(doc.document_date)}
      </p>
      {doc.signedUrl && (
        <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-block font-semibold text-brand underline">
          Voir le document
        </a>
      )}
    </div>
  );
}

// Le "+" sur la ligne verticale, entre deux étapes (ou juste après le
// contrat) : permet d'insérer un paiement, un document, un rendez-vous ou
// autre chose à cet endroit précis — garde l'ouverture nécessaire pour
// tout ce qui n'était pas prévu au départ, sans passer par une section à
// part. Remplace l'ancienne "Mise à jour des demandes".
function GapInsertion({ projectId, artisanId, afterMilestoneId, items, sharedDocs, isClient, canAdd, hasLineBelow }) {
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
        {(sharedDocs || []).map((d) => (
          <SharedDocumentItem key={d.id} doc={d} />
        ))}
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
              <SubmitButton className="w-fit rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark" pendingLabel="Ajout...">
                Ajouter ici
              </SubmitButton>
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

// Permet au professionnel propriétaire d'une étape (ex: un chef de
// chantier) de répartir une partie de son montant avec d'autres
// professionnels déjà inscrits sur la plateforme (ex: ses maçons),
// rattachés ici au cas par cas, projet par projet. Invisible du client :
// ce bloc n'est rendu que pour isArtisan (voir au-dessus). C'est lui qui
// décide seul de la répartition, le client n'a rien à valider — l'argent
// de chaque part suit automatiquement le même paiement et la même
// validation que l'étape principale.
function MilestoneSplitManager({ projectId, milestoneId, milestoneAmount, currency, splits }) {
  const totalSplit = splits.reduce((s, r) => s + Number(r.amount || 0), 0);
  const remaining = Number(milestoneAmount || 0) - totalSplit;

  return (
    <div className="mt-2 rounded-md border border-dashed border-gray-200 p-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Répartir avec mon équipe</p>
      {splits.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1">
          {splits.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">
                {s.recipientName} : {Number(s.amount || 0).toLocaleString("fr-FR")} {currency}
                <span className="ml-1 text-gray-400">
                  ({s.paidAt ? "payée" : s.isCompleted ? "en attente du virement" : "à venir"})
                </span>
              </span>
              {!s.paidAt && (
                <form action={removeMilestoneSplit}>
                  <input type="hidden" name="splitId" value={s.id} />
                  <input type="hidden" name="projectId" value={projectId} />
                  <button type="submit" className="text-gray-400 hover:text-brand" aria-label="Retirer cette part">
                    ✕
                  </button>
                </form>
              )}
            </div>
          ))}
          <p className="text-[11px] text-gray-500">
            Il te reste {remaining.toLocaleString("fr-FR")} {currency} sur cette étape.
          </p>
        </div>
      )}
      <form action={addMilestoneSplit} className="mt-1.5 flex flex-wrap items-end gap-1.5">
        <input type="hidden" name="parentMilestoneId" value={milestoneId} />
        <input type="hidden" name="projectId" value={projectId} />
        <input
          name="recipientPhone"
          required
          placeholder="Téléphone du professionnel"
          className="w-40 rounded-md border border-gray-300 p-1.5 text-xs"
        />
        <input
          name="amount"
          type="number"
          min="0"
          step="1"
          required
          placeholder={`Part (${currency})`}
          className="w-28 rounded-md border border-gray-300 p-1.5 text-xs"
        />
        <SubmitButton className="rounded-md bg-forest px-2.5 py-1.5 text-xs font-bold text-white hover:bg-forest-dark" pendingLabel="Ajout...">
          + Ajouter
        </SubmitButton>
      </form>
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
  sharedDocuments,
  otherArtisans,
  milestoneSplits,
}) {
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

  // Documents reçus du dossier d'un autre professionnel : insérés à leur
  // date réelle (document_date), pas à la date du partage — entre le
  // contrat et la première étape, entre deux étapes, ou après la dernière.
  const sharedDocsByGap = {};
  (sharedDocuments || []).forEach((doc) => {
    const docTime = new Date(doc.document_date).getTime();
    const idx = sortedMilestones.findIndex((m) => new Date(m.paid_at || m.created_at || contractSignedAt || 0).getTime() > docTime);
    const key =
      idx === -1
        ? sortedMilestones.length > 0
          ? sortedMilestones[sortedMilestones.length - 1].id
          : "contract"
        : idx === 0
          ? "contract"
          : sortedMilestones[idx - 1].id;
    sharedDocsByGap[key] = [...(sharedDocsByGap[key] || []), doc];
  });

  // Mini-dossier : tous les documents déjà uploadés par CE professionnel,
  // tous livrables confondus — point d'entrée pour les partager vers un
  // autre professionnel du projet (le contrat lui-même n'y figure pas).
  const myDeliverables = sortedMilestones.flatMap((m) =>
    (m.deliverables || []).filter((d) => (d.files || []).length > 0).map((d) => ({ ...d, milestoneTitle: m.title }))
  );

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
        sharedDocs={sharedDocsByGap["contract"]}
        isClient={isClient}
        canAdd={canAdd}
        hasLineBelow={sortedMilestones.length > 0}
      />

      {sortedMilestones.map((m, i) => {
        const milestoneAppointments = appointmentsByMilestone[m.id] || [];
        const callIsMandatory = MANDATORY_CALL_TRADES.includes(trade);
        // La possibilité de passer l'appel est toujours affichée, pour
        // tous les métiers — seul Technicien BTP en fait une obligation
        // qui bloque la validation de l'étape.
        const showCallBlock = true;
        const hasCompletedCall = milestoneAppointments.some((a) => a.status === "completed");
        const hasBlockingRequirement = callIsMandatory && !hasCompletedCall;
        const status = m.is_completed ? "Validée" : m.paid_at ? "Payée, à valider" : "En cours";
        const education = educationByTitle?.[m.title];
        const isLast = i === sortedMilestones.length - 1;
        // Le livrable est désormais attendu à CHAQUE étape (plus seulement
        // pour les métiers à document unique/final) : c'est la base de la
        // nouvelle règle "document déposé + client payé" avant de pouvoir
        // valider l'étape.

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
                      : {m.amount.toLocaleString("fr-FR")} {currency}
                      {m.paid_at && ` payé le ${formatDate(m.paid_at)}`}
                    </span>
                  )}
                </div>
                {/* Rendez-vous de validation : affiché seulement pour les
                    métiers concernés (absent pour maçon, plombier...),
                    obligatoire pour Technicien BTP/Chef de chantier,
                    facultatif pour Architecte/Ingénieur. */}
                {showCallBlock &&
                  (milestoneAppointments.length > 0 ? (
                    milestoneAppointments.map((a) => <RequiredCallStatus key={a.id} projectId={projectId} appointment={a} />)
                  ) : (
                    !m.is_completed && (
                      <CallButton
                        projectId={projectId}
                        artisanId={artisanId}
                        milestoneId={m.id}
                        mandatory={callIsMandatory}
                      />
                    )
                  ))}

                {/* Une étape peut avoir plusieurs livrables, et chaque
                    livrable peut désormais contenir plusieurs fichiers
                    (ex : une esquisse en plusieurs planches) — chacun
                    vérifié séparément. */}
                {(m.deliverables || []).length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-1">
                    {m.deliverables.map((d) => {
                      const files = d.files || [];
                      const approvedFiles = files.filter((f) => f.signedUrl);
                      const pendingCount = files.filter((f) => !f.signedUrl && f.review_status === "needs_manual_review").length;
                      const rejectedCount = files.filter((f) => f.review_status === "rejected").length;
                      return (
                        <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-md bg-gray-50 px-2 py-1 text-xs">
                          <span className="font-medium text-ink">{d.label}</span>
                          {approvedFiles.map((f, idx) => (
                            <a key={f.id} href={f.signedUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
                              📎 {approvedFiles.length > 1 ? `Document ${idx + 1}` : "Voir le document"}
                            </a>
                          ))}
                          {pendingCount > 0 && (
                            <span className="text-gray-500">
                              {pendingCount > 1 ? `${pendingCount} fichiers en cours de vérification` : "en cours de vérification"}
                            </span>
                          )}
                          {rejectedCount > 0 && (
                            <span className="text-brand">
                              {rejectedCount > 1 ? `${rejectedCount} fichiers non validés` : "1 fichier non validé"}
                            </span>
                          )}
                          {files.length === 0 && !isArtisan && <span className="text-gray-400">pas encore envoyé</span>}
                          {isArtisan && (
                            <form action={uploadDeliverable} className="flex items-center gap-1.5">
                              <input type="hidden" name="deliverableId" value={d.id} />
                              <input type="hidden" name="milestoneId" value={m.id} />
                              <input type="hidden" name="projectId" value={projectId} />
                              <FileInputButton
                                name="document"
                                accept=".pdf,image/*"
                                required={files.length === 0}
                                multiple
                                label={files.length > 0 ? "Ajouter un fichier" : "Envoyer"}
                                autoSubmit
                              />
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isArtisan && !m.is_completed && (() => {
                  const deliverables = m.deliverables || [];
                  const allUploaded = deliverables.every((d) => (d.files || []).length > 0);
                  if (hasBlockingRequirement) {
                    return (
                      <p className="mt-1 text-xs text-gray-400">
                        L'appel de validation doit être terminé avant de pouvoir valider cette étape.
                      </p>
                    );
                  }
                  if (!allUploaded) return null; // le formulaire d'envoi est déjà affiché au-dessus, livrable par livrable
                  if (!m.paid_at) {
                    return (
                      <p className="mt-1 text-xs text-gray-400">
                        ⏳ Livrable(s) envoyé(s). En attente du virement du client pour pouvoir valider l'étape.
                      </p>
                    );
                  }
                  return (
                    <form action={toggleMilestone} className="mt-1">
                      <input type="hidden" name="milestoneId" value={m.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="isCompleted" value="false" />
                      <SubmitButton className="text-xs font-bold text-forest hover:underline" pendingLabel="Validation...">
                        ✅ Valider l'étape
                      </SubmitButton>
                    </form>
                  );
                })()}

                {isClient && !m.paid_at && (m.deliverables || []).length > 0 && (m.deliverables || []).every((d) => (d.files || []).some((f) => f.signedUrl)) && (
                  <form action={releasePayment} className="mt-1">
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <SubmitButton className="text-xs font-bold text-forest hover:underline" pendingLabel="Confirmation...">
                      Confirmer le virement effectué
                    </SubmitButton>
                  </form>
                )}

                {isArtisan && (
                  <MilestoneSplitManager
                    projectId={projectId}
                    milestoneId={m.id}
                    milestoneAmount={m.amount}
                    currency={currency}
                    splits={milestoneSplits?.[m.id] || []}
                  />
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
              sharedDocs={sharedDocsByGap[m.id]}
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
                {formatDateTime(a.scheduled_at)} : {a.status}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Mini-dossier : tous les documents déjà déposés par ce
          professionnel. Le "+" partage le DOSSIER ENTIER d'un coup vers un
          autre professionnel du projet (ex : tout le dossier de
          l'architecte transmis à l'ingénieur) — pas document par
          document. */}
      {isClient && myDeliverables.length > 0 && (
        <div className="ml-6 mt-2 rounded-lg border border-dashed border-gray-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-ink">📁 Dossier de {artisanName}</p>
            <ShareDossierButton projectId={projectId} sourceArtisanId={artisanId} otherArtisans={otherArtisans} />
          </div>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {myDeliverables.map((d) => {
              const approvedFiles = (d.files || []).filter((f) => f.signedUrl);
              return (
                <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-xs">
                  <span className="font-medium text-ink">{d.label}</span>
                  <span className="text-gray-400">({d.milestoneTitle})</span>
                  {approvedFiles.map((f, idx) => (
                    <a key={f.id} href={f.signedUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
                      {approvedFiles.length > 1 ? `Voir ${idx + 1}` : "Voir"}
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
