import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logClientActivity } from "@/lib/activityLog";
import { requestNotification } from "./actions";

// Le temps que les démarches administratives soient prêtes, ces actions
// ne sont pas encore actives — on enregistre l'intérêt du client (utile
// pour l'étude de marché) sans réaliser l'action elle-même.
export default async function InterestRegisteredPage({ searchParams }) {
  const type = searchParams?.type;
  const artisanId = searchParams?.artisan;
  const regardingArtisanId = searchParams?.regarding || null;
  const notified = searchParams?.notified === "1";

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

  if (profile?.role === "client" && !notified) {
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
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Ce service n'est pas encore disponible sur la plateforme, mais il arrive très bientôt. Soyez parmi les premiers informés : activez une notification et nous vous préviendrons dès son ouverture.
      </p>

      {notified ? (
        <p className="mt-6 rounded-lg bg-forest-light p-3 text-sm font-medium text-forest">
          C'est noté — nous vous préviendrons dès l'ouverture.
        </p>
      ) : (
        <form action={requestNotification} className="mt-6">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="artisanId" value={artisanId} />
          {regardingArtisanId && <input type="hidden" name="regardingArtisanId" value={regardingArtisanId} />}
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-heading font-bold text-white hover:bg-brand-dark"
          >
            🔔 Me notifier dès l'ouverture
          </button>
        </form>
      )}

      <Link href={backHref} className="mt-5 block text-sm text-gray-500 hover:text-brand">
        Retour au profil
      </Link>
    </div>
  );
}
