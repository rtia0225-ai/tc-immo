"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logTimelineEvent } from "@/lib/projectTimeline";

// Le technicien envoie son rapport périodique (photos/vidéos + notes
// d'avancement), en plus de la simple validation des étapes. Les
// fichiers sont déjà uploadés côté navigateur (ProjectActivityLog,
// directement vers Supabase Storage) avant d'appeler cette action — une
// vidéo dépasse largement la limite de taille d'une requête de Server
// Action (1 Mo par défaut), donc le binaire ne doit jamais transiter par
// ici. On ne reçoit que les chemins déjà en place, en JSON.
export async function submitTechnicianReport(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const notes = formData.get("notes");
  let uploadedMedia = [];
  try {
    uploadedMedia = JSON.parse(formData.get("media") || "[]");
  } catch {
    uploadedMedia = [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: report, error } = await supabase
    .from("technician_progress_reports")
    .insert({ project_id: projectId, technician_id: user.id, notes })
    .select("id")
    .single();

  if (error || !report) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Le rapport n'a pas pu être enregistré.")}`);
  }

  for (const media of uploadedMedia) {
    if (!media?.path) continue;
    await supabase.from("technician_report_media").insert({
      report_id: report.id,
      media_url: media.path,
      media_type: media.type === "video" ? "video" : "image",
    });
  }

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "photo_report",
    title: "Rapport d'avancement envoyé",
    description: notes || null,
    actorId: user.id,
  });

  redirect(`/projects/${projectId}`);
}

// Le client ou l'artisan demande l'ajout de quelque chose qui n'était pas
// prévu au départ (paiement, document...). C'est le CLIENT qui valide,
// pas l'admin — Rose ne veut pas avoir à approuver chaque ajout, juste
// garder un œil dessus via le journal du projet. Si c'est le client
// lui-même qui fait la demande, elle est effective tout de suite (il n'y
// a personne d'autre à faire valider).
export async function requestAddition(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const requestType = formData.get("requestType");
  const title = formData.get("title");
  const justification = formData.get("justification");
  const amount = formData.get("amount") || null;
  // Position dans le parcours : sur quel professionnel, et juste avant
  // quelle étape (null = juste après le contrat) — pour afficher l'ajout
  // au bon endroit sur la ligne verticale une fois validé.
  const artisanId = formData.get("artisanId") || null;
  const afterMilestoneId = formData.get("afterMilestoneId") || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single();
  const requestedByClient = project?.client_id === user.id;

  await supabase.from("project_addition_requests").insert({
    project_id: projectId,
    requested_by: user.id,
    request_type: requestType,
    title,
    justification,
    amount,
    artisan_id: artisanId,
    after_milestone_id: afterMilestoneId,
    status: requestedByClient ? "approved" : "pending",
    reviewed_at: requestedByClient ? new Date().toISOString() : null,
  });

  await logTimelineEvent(supabase, {
    projectId,
    eventType: requestedByClient ? "addition_approved" : "addition_requested",
    title: requestedByClient ? `Ajout : ${title}` : `Demande d'ajout : ${title}`,
    description: justification,
    actorId: user.id,
  });

  redirect(`/projects/${projectId}`);
}

// Le client valide ou refuse une demande d'ajout faite par l'artisan.
export async function reviewAdditionRequest(formData) {
  const supabase = createClient();
  const requestId = formData.get("requestId");
  const projectId = formData.get("projectId");
  const decision = formData.get("decision"); // 'approved' ou 'rejected'
  const clientNote = formData.get("adminNote");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single();
  if (project?.client_id !== user.id) redirect(`/projects/${projectId}`);

  const { data: request } = await supabase
    .from("project_addition_requests")
    .update({ status: decision, admin_note: clientNote || null, reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("title")
    .single();

  await logTimelineEvent(supabase, {
    projectId,
    eventType: decision === "approved" ? "addition_approved" : "addition_rejected",
    title: `${decision === "approved" ? "Ajout validé" : "Ajout refusé"} : ${request?.title || ""}`,
    description: clientNote || null,
    actorId: user.id,
  });

  redirect(`/projects/${projectId}`);
}
