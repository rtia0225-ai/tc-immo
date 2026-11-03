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

export async function approveDeliverable(formData) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  const milestoneId = formData.get("milestoneId");

  const { data: milestone } = await supabase
    .from("project_milestones")
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      deliverable_review_status: "approved",
      deliverable_reviewed_at: new Date().toISOString(),
      deliverable_reviewed_by: admin.id,
    })
    .eq("id", milestoneId)
    .select("title, project_id, artisan_id")
    .single();

  if (milestone) {
    await logTimelineEvent(supabase, {
      projectId: milestone.project_id,
      eventType: "document_added",
      title: `Document validé (vérification manuelle) : ${milestone.title}`,
      actorId: admin.id,
    });
    await sendPush(
      milestone.artisan_id,
      "Document validé",
      `Votre document pour "${milestone.title}" a été validé, le paiement peut être débloqué.`,
      `/projects/${milestone.project_id}`
    );
  }

  redirect("/admin/documents");
}

export async function rejectDeliverable(formData) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  const milestoneId = formData.get("milestoneId");
  const reason = formData.get("reason");

  const { data: milestone } = await supabase
    .from("project_milestones")
    .update({
      is_completed: false,
      deliverable_review_status: "rejected",
      deliverable_review_note: reason || "Document non conforme.",
      deliverable_reviewed_at: new Date().toISOString(),
      deliverable_reviewed_by: admin.id,
    })
    .eq("id", milestoneId)
    .select("title, project_id, artisan_id")
    .single();

  if (milestone) {
    await logTimelineEvent(supabase, {
      projectId: milestone.project_id,
      eventType: "document_pending_review",
      title: `Document refusé : ${milestone.title}`,
      description: reason || "Document non conforme.",
      actorId: admin.id,
    });
    await sendPush(
      milestone.artisan_id,
      "Document à refaire",
      `Votre document pour "${milestone.title}" n'a pas été validé${reason ? " : " + reason : ""}. Merci d'en déposer un nouveau.`,
      `/projects/${milestone.project_id}`
    );
  }

  redirect("/admin/documents");
}
