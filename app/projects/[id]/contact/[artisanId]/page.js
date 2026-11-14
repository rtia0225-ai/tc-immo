import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Pas de page à afficher : on retrouve (ou on crée) la conversation
// directe entre deux professionnels du même projet, et on atterrit tout
// de suite dans la messagerie — même principe que /messages/new, mais
// entre collègues du chantier plutôt qu'entre client et artisan.
//
// On range toujours les deux id dans un ordre fixe (le plus petit dans
// client_id, le plus grand dans artisan_id) : ça évite de créer deux
// conversations différentes selon qui clique le premier, et ça respecte
// la contrainte d'unicité (client_id, artisan_id, project_id).
export default async function ProjectContactPage({ params }) {
  const { id: projectId, artisanId } = params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=${encodeURIComponent(`/projects/${projectId}/contact/${artisanId}`)}`);
  }

  if (user.id === artisanId) {
    redirect(`/projects/${projectId}`);
  }

  // Les deux doivent réellement intervenir sur ce projet (principal ou
  // participant) — on ne crée pas de conversation "à l'aveugle".
  const { data: project } = await supabase.from("projects").select("artisan_id").eq("id", projectId).single();
  const { data: participants } = await supabase
    .from("project_participants")
    .select("artisan_id")
    .eq("project_id", projectId);
  const artisanIdsOnProject = new Set([project?.artisan_id, ...(participants || []).map((p) => p.artisan_id)]);
  if (!artisanIdsOnProject.has(user.id) || !artisanIdsOnProject.has(artisanId)) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Ce professionnel n'intervient pas sur ce projet.")}`);
  }

  const [a, b] = [user.id, artisanId].sort();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .eq("client_id", a)
    .eq("artisan_id", b)
    .maybeSingle();

  if (existing) {
    redirect(`/messages/${existing.id}`);
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ client_id: a, artisan_id: b, project_id: projectId })
    .select("id")
    .single();

  if (error) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("La discussion n'a pas pu être ouverte : " + error.message)}`);
  }

  redirect(`/messages/${created.id}`);
}
