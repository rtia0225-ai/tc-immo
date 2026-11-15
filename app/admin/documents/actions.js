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

// Approuve/refuse UN fichier précis (un livrable peut désormais en avoir
// plusieurs, chacun vérifié séparément). N'affecte jamais is_completed
// directement : c'est toujours le professionnel qui valide l'étape
// lui-même, une fois tous les livrables approuvés ET le client payé
// (cf. toggleMilestone). Un fichier refusé reste visible (marqué refusé)
// plutôt que supprimé — le professionnel peut en ajouter un autre sans
// perdre la trace de celui-ci.
export async function approveDeliverable(formData) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  const fileId = formData.get("fileId");

  const { data: file } = await supabase
    .from("deliverable_files")
    .update({
      review_status: "approved",
      review_note: "Validé manuellement par l'équipe TC-Immo.",
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq("id", fileId)
    .select("deliverable:deliverable_id ( label, milestone:milestone_id ( title, project_id, artisan_id ) )")
    .single();

  if (file) {
    const label = file.deliverable?.label;
    const { project_id, artisan_id, title } = file.deliverable?.milestone || {};
    await logTimelineEvent(supabase, {
      projectId: project_id,
      eventType: "document_added",
      title: `Document validé (vérification manuelle) : ${label}`,
      actorId: admin.id,
    });
    await sendPush(
      artisan_id,
      "Document validé",
      `Ton document "${label}" (${title}) a été validé.`,
      `/projects/${project_id}`
    );
  }

  redirect("/admin/documents");
}

export async function rejectDeliverable(formData) {
  const supabase = createClient();
  const admin = await requireAdmin(supabase);
  const fileId = formData.get("fileId");
  const reason = formData.get("reason");

  const { data: file } = await supabase
    .from("deliverable_files")
    .update({
      review_status: "rejected",
      review_note: reason || "Document non conforme.",
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq("id", fileId)
    .select("deliverable:deliverable_id ( label, milestone:milestone_id ( title, project_id, artisan_id ) )")
    .single();

  if (file) {
    const label = file.deliverable?.label;
    const { project_id, artisan_id, title } = file.deliverable?.milestone || {};
    await logTimelineEvent(supabase, {
      projectId: project_id,
      eventType: "document_pending_review",
      title: `Document refusé : ${label}`,
      description: reason || "Document non conforme.",
      actorId: admin.id,
    });
    await sendPush(
      artisan_id,
      "Document à refaire",
      `Ton document "${label}" (${title}) n'a pas été validé${reason ? " : " + reason : ""}. Merci d'en déposer un nouveau.`,
      `/projects/${project_id}`
    );
  }

  redirect("/admin/documents");
}
