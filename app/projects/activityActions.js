"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logTimelineEvent } from "@/lib/projectTimeline";

// Le technicien envoie son rapport périodique (photos/vidéos + notes
// d'avancement), en plus de la simple validation des étapes.
export async function submitTechnicianReport(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const notes = formData.get("notes");
  const files = formData.getAll("media").filter((f) => f && typeof f !== "string" && f.size > 0);

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

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${projectId}/${report.id}/${crypto.randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("project-deliverables")
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false });
    if (!uploadError) {
      await supabase.from("technician_report_media").insert({
        report_id: report.id,
        media_url: path,
        media_type: file.type.startsWith("video/") ? "video" : "image",
      });
    }
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
// prévu au départ (paiement, document...) — jamais effectif tant que
// l'admin ne l'a pas validé.
export async function requestAddition(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const requestType = formData.get("requestType");
  const title = formData.get("title");
  const justification = formData.get("justification");
  const amount = formData.get("amount") || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("project_addition_requests").insert({
    project_id: projectId,
    requested_by: user.id,
    request_type: requestType,
    title,
    justification,
    amount,
  });

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "addition_requested",
    title: `Demande d'ajout : ${title}`,
    description: justification,
    actorId: user.id,
  });

  redirect(`/projects/${projectId}`);
}

// L'admin valide ou refuse une demande d'ajout.
export async function reviewAdditionRequest(formData) {
  const supabase = createClient();
  const requestId = formData.get("requestId");
  const projectId = formData.get("projectId");
  const decision = formData.get("decision"); // 'approved' ou 'rejected'
  const adminNote = formData.get("adminNote");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect(`/projects/${projectId}`);

  const { data: request } = await supabase
    .from("project_addition_requests")
    .update({ status: decision, admin_note: adminNote || null, reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("title")
    .single();

  await logTimelineEvent(supabase, {
    projectId,
    eventType: decision === "approved" ? "addition_approved" : "addition_rejected",
    title: `${decision === "approved" ? "Ajout validé" : "Ajout refusé"} : ${request?.title || ""}`,
    description: adminNote || null,
    actorId: user.id,
  });

  redirect(`/projects/${projectId}`);
}
