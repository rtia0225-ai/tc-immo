import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Pas de page intermédiaire : dès que la personne clique "Discuter par
// message" depuis un profil artisan, on retrouve (ou on crée) directement
// la conversation et on atterrit tout de suite dans la messagerie.
// `regarding` : quand le contact est redirigé vers le technicien recruteur
// d'un maçon, précise de quel maçon il s'agit.
export default async function NewConversationPage({ searchParams }) {
  const artisanId = searchParams?.artisan;
  const regardingArtisanId = searchParams?.regarding || null;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const currentPath = `/messages/new?artisan=${artisanId}${regardingArtisanId ? `&regarding=${regardingArtisanId}` : ""}`;
    redirect(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  if (user.id === artisanId) {
    redirect(`/artisans/${regardingArtisanId || artisanId}`);
  }

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("approval_status")
    .eq("id", user.id)
    .single();
  if (senderProfile?.approval_status !== "approved") {
    redirect("/dashboard");
  }

  let existingQuery = supabase
    .from("conversations")
    .select("id")
    .eq("client_id", user.id)
    .eq("artisan_id", artisanId)
    .is("project_id", null);

  existingQuery = regardingArtisanId
    ? existingQuery.eq("regarding_artisan_id", regardingArtisanId)
    : existingQuery.is("regarding_artisan_id", null);

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    redirect(`/messages/${existing.id}`);
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      client_id: user.id,
      artisan_id: artisanId,
      regarding_artisan_id: regardingArtisanId,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/artisans/${regardingArtisanId || artisanId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/messages/${created.id}`);
}
