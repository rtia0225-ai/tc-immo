"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendPush } from "@/lib/notifications";
import { logTimelineEvent } from "@/lib/projectTimeline";

async function requireAdmin(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");
  return user;
}

// Approuve/refuse UN livrable précis (pas toute l'étape — une étape peut
// en avoir plusieurs). N'affecte jamais is_completed directement : c'est
// toujours le professionnel qui valide l'étape lui-même, une fois tous
// les livrables approuvés ET le client payé (cf. toggleMilestone).
export async function approveDeliverable(formData) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  const deliverableId = formData.get("deliverableId");

  const { data: deliverable } = await supabase
    .from("milestone_deliverables")
    .update({
      review_status: "approved",
      review_note: "Validé manuellement par l'équipe TC-Immo.",
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq("id", deliverableId)
    .select("label, milestone:milestone_id ( title, project_id, artisan_id )")
    .single();

  if (deliverable) {
    const { project_id, artisan_id, title } = deliverable.milestone || {};
    await logTimelineEvent(supabase, {
      projectId: project_id,
      eventType: "document_added",
      title: `Document validé (vérification manuelle) : ${deliverable.label}`,
      actorId: admin.id,
    });
    await sendPush(
      artisan_id,
      "Document validé",
      `Ton document "${deliverable.label}" (${title}) a été validé.`,
      `/projects/${project_id}`
    );
  }

  redirect("/admin/documents");
}

export async function rejectDeliverable(formData) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  const deliverableId = formData.get("deliverableId");
  const reason = formData.get("reason");

  const { data: deliverable } = await supabase
    .from("milestone_deliverables")
    .update({
      document_url: null,
      review_status: "rejected",
      review_note: reason || "Document non conforme.",
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq("id", deliverableId)
    .select("label, milestone:milestone_id ( title, project_id, artisan_id )")
    .single();

  if (deliverable) {
    const { project_id, artisan_id, title } = deliverable.milestone || {};
    await logTimelineEvent(supabase, {
      projectId: project_id,
      eventType: "document_pending_review",
      title: `Document refusé : ${deliverable.label}`,
      description: reason || "Document non conforme.",
      actorId: admin.id,
    });
    await sendPush(
      artisan_id,
      "Document à refaire",
      `Ton document "${deliverable.label}" (${title}) n'a pas été validé${reason ? " : " + reason : ""}. Merci d'en déposer un nouveau.`,
      `/projects/${project_id}`
    );
  }

  redirect("/admin/documents");
}
