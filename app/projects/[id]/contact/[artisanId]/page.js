import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Pas de page à afficher : on retrouve (ou on crée) la conversation
// directe avec ce professionnel du projet (client → professionnel, ou
// professionnel → professionnel), et on atterrit tout de suite dans la
// messagerie — même principe que /messages/new.
//
// `artisan_id` a une contrainte de clé étrangère vers artisan_profiles :
// seul un vrai professionnel peut s'y trouver. Le client (s'il clique
// depuis la liste des participants) va donc toujours dans `client_id`.
// Entre deux professionnels, aucun des deux n'est "le client" : on range
// alors les deux id dans un ordre fixe (le plus petit dans client_id) pour
// toujours retomber sur la même conversation, quel que soit qui clique le
// premier, et respecter la contrainte d'unicité (client_id, artisan_id,
// project_id).
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

  // Le professionnel ciblé, et l'utilisateur courant (client ou
  // professionnel), doivent réellement être sur ce projet — on ne crée
  // pas de conversation "à l'aveugle".
  const { data: project } = await supabase.from("projects").select("artisan_id, client_id").eq("id", projectId).single();
  const { data: participants } = await supabase
    .from("project_participants")
    .select("artisan_id")
    .eq("project_id", projectId);
  const artisanIdsOnProject = new Set([project?.artisan_id, ...(participants || []).map((p) => p.artisan_id)]);

  const viewerIsClient = project?.client_id === user.id;
  const viewerIsProfessionalHere = artisanIdsOnProject.has(user.id);

  if (!artisanIdsOnProject.has(artisanId) || (!viewerIsClient && !viewerIsProfessionalHere)) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Ce professionnel n'intervient pas sur ce projet.")}`);
  }

  const [clientSlot, artisanSlot] = viewerIsClient ? [user.id, artisanId] : [user.id, artisanId].sort();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", projectId)
    .eq("client_id", clientSlot)
    .eq("artisan_id", artisanSlot)
    .maybeSingle();

  if (existing) {
    redirect(`/messages/${existing.id}`);
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ client_id: clientSlot, artisan_id: artisanSlot, project_id: projectId })
    .select("id")
    .single();

  if (error) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("La discussion n'a pas pu être ouverte : " + error.message)}`);
  }

  redirect(`/messages/${created.id}`);
}
