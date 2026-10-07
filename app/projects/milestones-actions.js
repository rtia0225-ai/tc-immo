"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logTimelineEvent } from "@/lib/projectTimeline";

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


// Pour Architecte/Topographe : l'artisan envoie le document livré
// (Permis de Construire / ACD), ça marque l'étape comme terminée
// automatiquement et débloque le paiement en un seul virement.
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

  const ext = file.name.split(".").pop() || "pdf";
  const path = `${projectId}/${user.id}/livrable.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("project-deliverables")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { data: deliveredMilestone } = await supabase
    .from("project_milestones")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      deliverable_document_url: path,
    })
    .eq("id", milestoneId)
    .select("title")
    .single();

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "document_added",
    title: `Document livré : ${deliveredMilestone?.title || ""}`,
    mediaUrl: path,
    actorId: user.id,
  });

  redirect(`/projects/${projectId}`);
}
