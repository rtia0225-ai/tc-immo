import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logClientActivity } from "@/lib/activityLog";

const TYPE_LABELS = {
  message: "Envoyer un message",
  appointment: "Prendre rendez-vous visio",
  project: "Démarrer un projet",
};

// Le temps que les démarches administratives soient prêtes, ces actions
// ne sont pas encore actives — on enregistre l'intérêt du client (utile
// pour l'étude de marché) sans réaliser l'action elle-même.
export default async function InterestRegisteredPage({ searchParams }) {
  const type = searchParams?.type;
  const artisanId = searchParams?.artisan;
  const regardingArtisanId = searchParams?.regarding || null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const currentPath = `/interet?type=${type}&artisan=${artisanId}${regardingArtisanId ? `&regarding=${regardingArtisanId}` : ""}`;
    redirect(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "client") {
    await logClientActivity(user.id, `${type}_interest`, artisanId, {
      regarding_artisan_id: regardingArtisanId,
    });
  }

  const backHref = `/artisans/${regardingArtisanId || artisanId}`;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-heading text-xl font-bold text-ink">
        Bientôt disponible
      </h1>
      <p className="mt-3 text-sm text-gray-600">
        "{TYPE_LABELS[type] || "Cette action"}" n'est pas encore activé le temps que nos démarches administratives soient finalisées.
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Ton intérêt a bien été noté — nous te recontacterons dès que ce sera disponible.
      </p>
      <Link
        href={backHref}
        className="mt-6 inline-block rounded-lg bg-brand px-6 py-3 font-heading font-bold text-white hover:bg-brand-dark"
      >
        Retour au profil
      </Link>
    </div>
  );
}
