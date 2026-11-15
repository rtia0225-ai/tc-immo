"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logTimelineEvent } from "@/lib/projectTimeline";
import { reviewDeliverableDocument } from "@/lib/documentReview";
import { sendPush } from "@/lib/notifications";
import { MANDATORY_CALL_TRADES } from "@/lib/constants";

// Une étape ne peut être validée que si son appel de validation (quand le
// métier du professionnel l'exige — Technicien BTP, Chef de chantier) a
// bien eu lieu. Pour les autres métiers, l'appel reste facultatif et ne
// bloque jamais. L'appel se fait toujours via la plateforme (jamais en
// échangeant les coordonnées directement), en audio ou en vidéo selon ce
// que choisissent client et professionnel — ce n'est jamais imposé par
// métier. Renvoie un message d'erreur si ce n'est pas le cas, sinon null.
async function checkRequiredAppointments(supabase, milestoneId) {
  const { data: milestone } = await supabase
    .from("project_milestones")
    .select("artisan:artisan_id ( trade )")
    .eq("id", milestoneId)
    .single();

  const isMandatory = MANDATORY_CALL_TRADES.includes(milestone?.artisan?.trade);
  if (!isMandatory) return null; // métier sans appel obligatoire

  const { data: completedCall } = await supabase
    .from("appointments")
    .select("id")
    .eq("milestone_id", milestoneId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (!completedCall) {
    return "Un appel (audio ou vidéo, au choix) terminé avec le client est obligatoire pour ce métier avant de valider cette étape.";
  }
  return null;
}

// Le client partage un document déposé par un professionnel vers le
// parcours d'un autre (mini-dossier en bas de chaque timeline). Le
// document apparaît ensuite chez le destinataire à la date du document
// d'origine (document_date), pas à la date du partage.
export async function shareDeliverable(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const deliverableId = formData.get("deliverableId");
  const recipientArtisanId = formData.get("recipientArtisanId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single();
  if (project?.client_id !== user.id) redirect(`/projects/${projectId}`);

  const { data: deliverable } = await supabase
    .from("milestone_deliverables")
    .select("label, document_url, reviewed_at, created_at, milestone:milestone_id ( project_id, artisan_id )")
    .eq("id", deliverableId)
    .single();

  if (!deliverable?.document_url || deliverable.milestone?.project_id !== projectId) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Ce document ne peut pas être partagé.")}`);
  }
  if (recipientArtisanId === deliverable.milestone.artisan_id) {
    redirect(`/projects/${projectId}`);
  }

  await supabase.from("shared_deliverables").insert({
    project_id: projectId,
    source_deliverable_id: deliverableId,
    source_artisan_id: deliverable.milestone.artisan_id,
    recipient_artisan_id: recipientArtisanId,
    shared_by: user.id,
    label: deliverable.label,
    document_url: deliverable.document_url,
    document_date: deliverable.reviewed_at || deliverable.created_at,
  });

  await sendPush(
    recipientArtisanId,
    "Document partagé",
    `Le client a ajouté "${deliverable.label}" à ton dossier sur ce projet.`,
    `/projects/${projectId}`
  );

  redirect(`/projects/${projectId}`);
}

export async function addMilestone(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const title = formData.get("title");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !title?.trim()) return;

  // Seul l'artisan du projet peut ajouter une étape (contrôlé aussi par la RLS)
  await supabase.from("project_milestones").insert({
    project_id: projectId,
    title: title.trim(),
  });

  redirect(`/projects/${projectId}`);
}

// Une étape peut attendre plusieurs livrables : vrai seulement si TOUS
// ont un fichier déposé (pas juste le premier).
async function checkAllDeliverablesUploaded(supabase, milestoneId) {
  const { data: deliverables } = await supabase
    .from("milestone_deliverables")
    .select("document_url")
    .eq("milestone_id", milestoneId);
  if (!deliverables || deliverables.length === 0) return true; // aucun livrable défini pour cette étape
  return deliverables.every((d) => !!d.document_url);
}

// L'artisan clique sur "Valider l'étape" (ou la décoche, cas rare).
// Pour VALIDER (passer à terminé), deux conditions sont obligatoires,
// vérifiées ici côté serveur (pas seulement cachées côté UI) :
//   1. tous les livrables attendus ont été déposés
//   2. le client a confirmé avoir payé (paid_at rempli)
// + l'éventuel rendez-vous obligatoire du métier (déjà vérifié avant).
// Sans ça, le bouton ne doit même pas apparaître côté client, mais on
// bloque aussi ici au cas où.
export async function toggleMilestone(formData) {
  const supabase = createClient();
  const milestoneId = formData.get("milestoneId");
  const projectId = formData.get("projectId");
  const isCompleted = formData.get("isCompleted") === "true";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (!isCompleted) {
    const blockReason = await checkRequiredAppointments(supabase, milestoneId);
    if (blockReason) {
      redirect(`/projects/${projectId}?error=${encodeURIComponent(blockReason)}`);
    }

    const allDeliverablesUploaded = await checkAllDeliverablesUploaded(supabase, milestoneId);
    if (!allDeliverablesUploaded) {
      redirect(
        `/projects/${projectId}?error=${encodeURIComponent("Dépose d'abord tous les livrables attendus pour cette étape avant de la valider.")}`
      );
    }

    const { data: milestoneToValidate } = await supabase
      .from("project_milestones")
      .select("paid_at")
      .eq("id", milestoneId)
      .single();

    if (!milestoneToValidate?.paid_at) {
      redirect(
        `/projects/${projectId}?error=${encodeURIComponent("Le client doit d'abord confirmer le virement avant que tu puisses valider cette étape.")}`
      );
    }
  }

  const { data: milestone } = await supabase
    .from("project_milestones")
    .update({
      is_completed: !isCompleted,
      completed_at: !isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId)
    .select("title")
    .single();

  if (!isCompleted && milestone) {
    await logTimelineEvent(supabase, {
      projectId,
      eventType: "milestone_completed",
      title: `Étape validée : ${milestone.title}`,
      actorId: user.id,
    });
  }

  redirect(`/projects/${projectId}`);
}

// Le client confirme avoir effectué le virement pour une étape validée par
// l'artisan. Manuel pour l'instant (pas de prestataire de paiement branché
// encore), enregistre juste la date à laquelle le paiement a été fait.
export async function releasePayment(formData) {
  const supabase = createClient();
  const milestoneId = formData.get("milestoneId");
  const projectId = formData.get("projectId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .single();

  // Seul le client du projet peut confirmer avoir payé, et uniquement une
  // fois que le professionnel a déposé TOUS les livrables attendus pour
  // cette étape — c'est ce paiement qui débloque ensuite, pour lui, le
  // droit de cliquer sur "Valider l'étape" (voir toggleMilestone), pas
  // l'inverse.
  if (project?.client_id !== user.id) redirect(`/projects/${projectId}`);

  const allDeliverablesUploaded = await checkAllDeliverablesUploaded(supabase, milestoneId);
  if (!allDeliverablesUploaded) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Le professionnel n'a pas encore déposé tous les livrables de cette étape.")}`);
  }

  const { data: paidMilestone } = await supabase
    .from("project_milestones")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", milestoneId)
    .select("title, amount")
    .single();

  if (paidMilestone) {
    await logTimelineEvent(supabase, {
      projectId,
      eventType: "payment_made",
      title: `Paiement effectué : ${paidMilestone.title}`,
      description: paidMilestone.amount ? `${paidMilestone.amount}` : null,
      actorId: user.id,
    });

    await advanceProjectStatusFromPayment(supabase, projectId);
  }

  redirect(`/projects/${projectId}`);
}

// Fait avancer le statut global du projet (utilisé par la page Revenus)
// entièrement seul, à partir des vrais paiements — aucun bouton, nulle
// part : "awaiting_payment" → "funded" dès le premier paiement confirmé,
// puis → "released" dès que toutes les étapes de tous les intervenants
// sont payées (l'argent est alors bien chez les professionnels, il n'y a
// rien d'autre à décider).
async function advanceProjectStatusFromPayment(supabase, projectId) {
  const { data: project } = await supabase.from("projects").select("status").eq("id", projectId).single();
  if (!project || project.status === "released") return;

  const { data: allMilestones } = await supabase
    .from("project_milestones")
    .select("paid_at")
    .eq("project_id", projectId);

  const allPaid = (allMilestones || []).length > 0 && allMilestones.every((m) => !!m.paid_at);

  let nextStatus = null;
  if (allPaid) {
    nextStatus = "released";
  } else if (project.status === "awaiting_payment" || project.status === "draft") {
    nextStatus = "funded";
  }

  if (nextStatus && nextStatus !== project.status) {
    await supabase
      .from("projects")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    await supabase.from("escrow_events").insert({
      project_id: projectId,
      event_type: nextStatus,
      metadata: { triggered_by: "auto_payment" },
    });
  }
}


// L'artisan envoie le fichier d'UN livrable précis d'une étape (une étape
// peut en avoir plusieurs). Avant de rendre le document visible au
// client, une IA vérifie que le fichier ressemble plausiblement au bon
// document (lib/documentReview.js). Si elle n'est pas sûre, le livrable
// reste en attente d'une vérification manuelle par un admin plutôt que
// d'être débloqué automatiquement.
export async function uploadDeliverable(formData) {
  const supabase = createClient();
  const deliverableId = formData.get("deliverableId");
  const milestoneId = formData.get("milestoneId");
  const projectId = formData.get("projectId");
  const file = formData.get("document");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (!file || typeof file === "string" || file.size === 0) {
    redirect(`/projects/${projectId}?error=Aucun+fichier+sélectionné`);
  }

  const blockReason = await checkRequiredAppointments(supabase, milestoneId);
  if (blockReason) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(blockReason)}`);
  }

  // Le métier du prestataire, pour donner le bon contexte à la
  // vérification automatique.
  const { data: milestoneBefore } = await supabase
    .from("project_milestones")
    .select("title, artisan_id, artisan:artisan_id ( trade )")
    .eq("id", milestoneId)
    .single();
  const { data: deliverableBefore } = await supabase
    .from("milestone_deliverables")
    .select("label")
    .eq("id", deliverableId)
    .single();

  const trade = milestoneBefore?.artisan?.trade;
  const documentLabel = deliverableBefore?.label || "livrable";

  const ext = file.name.split(".").pop() || "pdf";
  const path = `${projectId}/${user.id}/${deliverableId}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("project-deliverables")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(uploadError.message)}`);
  }

  const review = await reviewDeliverableDocument({
    fileBuffer: arrayBuffer,
    contentType: file.type,
    fileName: file.name,
    trade,
    documentLabel,
  });

  const approved = review.status === "approved";

  // L'upload ne valide plus l'étape automatiquement : il rend seulement le
  // document visible au client (s'il est approuvé) pour qu'il puisse
  // payer. L'étape n'est marquée "terminée" qu'au clic explicite de
  // l'artisan sur "Valider l'étape", une fois tous les livrables déposés
  // ET le virement confirmé (cf. toggleMilestone / releasePayment).
  await supabase
    .from("milestone_deliverables")
    .update({
      document_url: path,
      review_status: review.status,
      review_note: review.note,
      reviewed_at: new Date().toISOString(),
      reviewed_by: null, // null = vérification automatique
    })
    .eq("id", deliverableId);

  const milestoneTitle = milestoneBefore?.title || "";

  if (approved) {
    await logTimelineEvent(supabase, {
      projectId,
      eventType: "document_added",
      title: `Document livré : ${documentLabel} (${milestoneTitle})`,
      mediaUrl: path,
      actorId: user.id,
    });
  } else {
    await logTimelineEvent(supabase, {
      projectId,
      eventType: "document_pending_review",
      title: `Document déposé, en attente de vérification : ${documentLabel} (${milestoneTitle})`,
      description: review.note,
      mediaUrl: path,
      actorId: user.id,
    });

    // Notifie les admins (pas le client) : le document n'est pas encore
    // visible pour lui, inutile de l'avertir avant que ce soit tranché.
    const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
    await Promise.all(
      (admins || []).map((a) =>
        sendPush(
          a.id,
          "Document à vérifier",
          `${documentLabel} (${milestoneTitle}) — vérification automatique incertaine, à vérifier manuellement.`,
          "/admin/documents"
        )
      )
    );
  }

  redirect(`/projects/${projectId}`);
}
