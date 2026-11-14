"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Envoie un message (et/ou un document déjà uploadé côté navigateur, cf.
// ProjectSpaceForm) dans l'espace projet partagé. La RLS sur
// project_messages vérifie elle-même que l'auteur collabore bien sur ce
// projet (client, artisan principal, ou participant) — rien à vérifier
// ici en plus.
export async function sendProjectMessage(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const content = formData.get("content")?.trim() || null;
  const documentUrl = formData.get("documentUrl") || null;
  const documentType = formData.get("documentType") || null;
  const requestedAudience = formData.get("audience") === "professionals" ? "professionals" : "all";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (!content && !documentUrl) {
    redirect(`/projects/${projectId}/espace`);
  }

  // Le client ne peut jamais poster en "réservé aux professionnels" —
  // ça n'aurait pas de sens (il ne pourrait même pas relire son propre
  // message), donc on le force côté serveur quoi que le formulaire ait
  // envoyé.
  const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single();
  const audience = project?.client_id === user.id ? "all" : requestedAudience;

  await supabase.from("project_messages").insert({
    project_id: projectId,
    sender_id: user.id,
    content,
    document_url: documentUrl,
    document_type: documentType,
    audience,
  });

  redirect(`/projects/${projectId}/espace`);
}
