"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logTimelineEvent } from "@/lib/projectTimeline";
import { reviewDeliverableDocument } from "@/lib/documentReview";
import { sendPush } from "@/lib/notifications";
import { SINGLE_INSTALLMENT_TRADES } from "@/lib/constants";

// Une étape ne peut être validée que si tous ses rendez-vous obligatoires
// (appel de validation) ont bien eu lieu — renvoie un message d'erreur si
// ce n'est pas le cas, sinon null.
async function checkRequiredAppointments(supabase, milestoneId) {
  const { data: pending } = await supabase
    .from("appointments")
    .select("id")
    .eq("milestone_id", milestoneId)
    .eq("is_required", true)
    .neq("status", "completed")
    .neq("status", "cancelled");

  if (pending && pending.length > 0) {
    return "L'appel de validation de cette étape doit d'abord être marqué comme terminé.";
  }
  return null;
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

// L'artisan coche/décoche une étape terminée
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

  // Seul le client du projet peut confirmer avoir payé, et uniquement
  // pour une étape déjà validée par l'artisan.
  if (project?.client_id !== user.id) redirect(`/projects/${projectId}`);

  const { data: paidMilestone } = await supabase
    .from("project_milestones")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", milestoneId)
    .eq("is_completed", true)
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
  }

  redirect(`/projects/${projectId}`);
}


// Pour les métiers à livrable unique (SINGLE_INSTALLMENT_TRADES —
// Architecte/Topographe aujourd'hui, liste amenée à évoluer) : l'artisan
// envoie le document livré (Permis de Construire / ACD). Avant de
// débloquer le paiement et de rendre le document visible au client, une
// IA vérifie que le fichier ressemble plausiblement au bon document
// (lib/documentReview.js). Si elle n'est pas sûre, l'étape reste en
// attente d'une vérification manuelle par un admin plutôt que d'être
// débloquée automatiquement.
export async function uploadDeliverable(formData) {
  const supabase = createClient();
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

  const ext = file.name.split(".").pop() || "pdf";
  const path = `${projectId}/${user.id}/livrable.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("project-deliverables")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(uploadError.message)}`);
  }

  // Métier du prestataire qui dépose, pour savoir quel document est
  // attendu et donner le bon contexte à la vérification automatique.
  const { data: milestoneBefore } = await supabase
    .from("project_milestones")
    .select("title, artisan_id, artisan:artisan_id ( trade )")
    .eq("id", milestoneId)
    .single();
  const trade = milestoneBefore?.artisan?.trade;
  const documentLabel = SINGLE_INSTALLMENT_TRADES[trade] || "livrable";

  const review = await reviewDeliverableDocument({
    fileBuffer: arrayBuffer,
    contentType: file.type,
    fileName: file.name,
    trade,
    documentLabel,
  });

  const approved = review.status === "approved";

  const { data: deliveredMilestone } = await supabase
    .from("project_milestones")
    .update({
      is_completed: approved,
      completed_at: approved ? new Date().toISOString() : null,
      deliverable_document_url: path,
      deliverable_review_status: review.status,
      deliverable_review_note: review.note,
      deliverable_reviewed_at: new Date().toISOString(),
      deliverable_reviewed_by: null, // null = vérification automatique
    })
    .eq("id", milestoneId)
    .select("title")
    .single();

  const milestoneTitle = deliveredMilestone?.title || milestoneBefore?.title || "";

  if (approved) {
    await logTimelineEvent(supabase, {
      projectId,
      eventType: "document_added",
      title: `Document livré : ${milestoneTitle}`,
      mediaUrl: path,
      actorId: user.id,
    });
  } else {
    await logTimelineEvent(supabase, {
      projectId,
      eventType: "document_pending_review",
      title: `Document déposé, en attente de vérification : ${milestoneTitle}`,
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
          `${milestoneTitle} — vérification automatique incertaine, à vérifier manuellement.`,
          "/admin/documents"
        )
      )
    );
  }

  redirect(`/projects/${projectId}`);
}
