import { createClient } from "@/lib/supabase/server";
import ReviewList from "@/components/ReviewList";
import PhotoCarousel from "@/components/PhotoCarousel";
import Link from "next/link";
import { SINGLE_INSTALLMENT_TRADES, FINAL_DOCUMENT_TRADES, MIN_INSTALLMENTS_OTHER_TRADES } from "@/lib/constants";

// Crédits photo discrets pour quelques profils de démonstration dont la
// photo vient d'une banque d'images gratuite (licence Freepik).
const AVATAR_PHOTO_CREDITS = {
  "eb4f5d1c-7f3a-4cb4-bfdd-022fde6e0493": "Freepik", // Koffi Armand Yao
  "1cbe062c-1fa8-47be-977a-efa5e51aeaa4": "Freepik", // Koffi Kouadio Alphonse
  "35f5c752-1e54-4f0f-b1e3-4262effd0da7": "Freepik", // Traoré Moussa
  "4c4ac297-db57-456f-9af0-1595ee1437f7": "ASphotofamily / Freepik", // Kacou Régine
};

export async function generateMetadata({ params }) {
  const supabase = createClient();
  const { data: artisan } = await supabase
    .from("artisan_profiles")
    .select("trade, bio, profiles ( full_name, city )")
    .eq("id", params.id)
    .single();

  if (!artisan) return { title: "Artisan" };

  const name = artisan.profiles?.full_name || "Artisan";
  const city = artisan.profiles?.city;

  return {
    title: `${name}, ${artisan.trade}${city ? ` à ${city}` : ""}`,
    description: artisan.bio?.slice(0, 155) || `${artisan.trade} vérifié sur TCHolding-Immo${city ? `, disponible à ${city}` : ""}.`,
  };
}

export default async function ArtisanProfilePage({ params }) {
  const supabase = createClient();
  const { id } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerIsArtisan = false;
  let isOwnProfile = false;
  let viewerIsAdmin = false;
  if (user) {
    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("role, is_admin")
      .eq("id", user.id)
      .single();
    viewerIsArtisan = viewerProfile?.role === "artisan";
    isOwnProfile = user.id === id;
    viewerIsAdmin = !!viewerProfile?.is_admin;
  }

  const { data: artisan } = await supabase
    .from("artisan_profiles")
    .select(
      `id, trade, bio, years_experience, is_verified, pricing_info,
       services, projects_completed, mobility_scope, mobility_cities,
       is_suspended, recruited_by_technician_id,
       profiles ( full_name, city, avatar_url, approval_status ),
       technician:recruited_by_technician_id ( id, profiles ( full_name ) )`
    )
    .eq("id", id)
    .single();

  // Un profil suspendu ou pas encore approuvé reste consultable
  // uniquement par l'artisan lui-même, pas par le public.
  if ((artisan?.is_suspended || artisan?.profiles?.approval_status !== "approved") && !isOwnProfile) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-gray-500">Ce profil n'est pas disponible pour le moment.</p>
      </div>
    );
  }

  const { data: photos } = await supabase
    .from("artisan_photos")
    .select("id, photo_url, caption")
    .eq("artisan_id", id)
    .order("created_at", { ascending: true });

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, profiles ( full_name )")
    .eq("artisan_id", id)
    .order("created_at", { ascending: false });

  if (!artisan) {
    return <p className="px-4 py-12">Artisan introuvable.</p>;
  }

  const firstName = (artisan.profiles?.full_name || "").trim().split(/\s+/)[0] || "Professionnel";
  const ratings = (reviews || []).map((r) => r.rating).filter((r) => typeof r === "number");
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const filledStars = Math.round(avgRating);

  // Texte "à savoir" condensé en une ou deux phrases courtes, pour ne pas
  // noyer la page sous le texte — le détail complet reste discuté avec
  // l'artisan au moment de la négociation.
  let aSavoirText;
  if (SINGLE_INSTALLMENT_TRADES[artisan.trade]) {
    aSavoirText = `Paiement en une fois, à la livraison du ${SINGLE_INSTALLMENT_TRADES[artisan.trade]}. Les frais administratifs se règlent au fur et à mesure.`;
  } else if (FINAL_DOCUMENT_TRADES[artisan.trade]) {
    aSavoirText = `Plusieurs étapes, la dernière étant la livraison du ${FINAL_DOCUMENT_TRADES[artisan.trade]}. Nombre de versements à discuter avec le professionnel.`;
  } else {
    aSavoirText = `Échéancier d'au moins ${MIN_INSTALLMENTS_OTHER_TRADES} étapes, à définir avec l'artisan selon l'avancement des travaux.`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Plaquette de présentation, séparée de la barre de navigation */}
      <div className="mt-2 flex flex-col items-center gap-4 rounded-2xl bg-forest p-6 text-center text-white sm:flex-row sm:p-8 sm:text-left">
        {artisan.profiles?.avatar_url ? (
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${artisan.profiles.avatar_url}?v=${Date.now()}`}
              alt={firstName}
              className="h-28 w-28 rounded-xl object-cover shadow-md"
            />
            {AVATAR_PHOTO_CREDITS[artisan.id] && (
              <p className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[6px] leading-none text-white/60 [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
                {AVATAR_PHOTO_CREDITS[artisan.id]}
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-white/10 font-heading text-2xl font-bold text-white shadow-md">
            {firstName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-heading text-2xl font-bold">{firstName}</h1>
          <p className="mt-0.5 text-sm text-forest-light">{artisan.trade}</p>

          <div className="mt-2 flex items-center justify-center gap-1 sm:justify-start">
            {[1, 2, 3, 4, 5].map((n) => (
              <svg
                key={n}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={n <= filledStars ? "#f5a623" : "none"}
                stroke={n <= filledStars ? "#f5a623" : "rgba(255,255,255,0.5)"}
                strokeWidth="1.5"
              >
                <path d="M12 2.5 14.9 8.6l6.6.9-4.8 4.7 1.1 6.6L12 17.8l-5.8 3 1.1-6.6-4.8-4.7 6.6-.9Z" />
              </svg>
            ))}
            <span className="ml-1 text-sm font-semibold">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-forest-light">({reviews?.length || 0} avis)</span>
          </div>

          {/* Où est-ce qu'il est disponible */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
              📍 {artisan.profiles?.city || "Côte d'Ivoire"}
            </span>
            {artisan.mobility_scope === "all" ? (
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                Disponible partout
              </span>
            ) : (
              artisan.mobility_cities
                ?.filter((c) => c !== artisan.profiles?.city)
                .map((c) => (
                  <span key={c} className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
                    {c}
                  </span>
                ))
            )}
            {artisan.years_experience ? (
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
                {artisan.years_experience} an{artisan.years_experience > 1 ? "s" : ""} d&apos;expérience
              </span>
            ) : null}
            {artisan.is_verified && (
              <span className="inline-flex items-center rounded-full bg-gold px-2.5 py-1 text-xs font-bold">
                Profil vérifié
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions, un artisan ne peut ni se contacter ni démarrer un
          projet avec lui-même ; seul un client peut démarrer un projet.
          Si l'artisan est lié à un technicien recruteur, le contact
          (message/RDV) est redirigé vers lui, le paiement et le projet,
          eux, restent toujours directement liés à cet artisan. */}
      {isOwnProfile ? (
        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
          Ceci est votre propre profil public.{" "}
          <Link href="/dashboard/profile" className="font-medium text-brand hover:underline">
            Le modifier
          </Link>
        </div>
      ) : (
        <>
          {artisan.technician && (
            <p className="mt-4 text-sm text-gray-500">
              Représenté par <strong className="text-ink">{artisan.technician.profiles?.full_name}</strong>, il répond aux messages et rendez-vous pour cet artisan.
            </p>
          )}
          <div className={`mt-4 grid gap-3 ${viewerIsArtisan ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            <Link
              href={
                viewerIsAdmin
                  ? `/appointments/new?artisan=${artisan.technician?.id || artisan.id}&regarding=${artisan.id}`
                  : `/interet?type=appointment&artisan=${artisan.technician?.id || artisan.id}&regarding=${artisan.id}`
              }
              className="rounded-md bg-brand px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-dark"
            >
              Rendez-vous visio
            </Link>
            <Link
              href={
                viewerIsAdmin
                  ? `/messages/new?artisan=${artisan.technician?.id || artisan.id}&regarding=${artisan.id}`
                  : `/interet?type=message&artisan=${artisan.technician?.id || artisan.id}&regarding=${artisan.id}`
              }
              className="rounded-md bg-gray-100 px-4 py-3 text-center text-sm font-bold text-ink hover:bg-gray-200"
            >
              Message
            </Link>
            {(!viewerIsArtisan || viewerIsAdmin) && (
              <Link
                href={viewerIsAdmin ? `/projects/new?artisan=${artisan.id}` : `/interet?type=project&artisan=${artisan.id}`}
                className="rounded-md bg-forest px-4 py-3 text-center text-sm font-bold text-white hover:bg-forest-dark"
              >
                Démarrer un projet
              </Link>
            )}
          </div>
        </>
      )}

      {/* Colonne principale (services, description, galerie, avis) +
          colonne latérale (simulation, puis à savoir condensé). */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(artisan.services?.length > 0 || artisan.bio) && (
            <div className="rounded-lg bg-white shadow-card p-6">
              {artisan.services && artisan.services.length > 0 && (
                <div className={artisan.bio ? "mb-5" : ""}>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Services proposés</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {artisan.services.map((s) => (
                      <span key={s} className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {artisan.bio && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Description</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{artisan.bio}</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg bg-white shadow-card p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Galerie de réalisations</p>
            <PhotoCarousel photos={photos} />
          </div>

          {/* Avis */}
          <div className="rounded-lg bg-white shadow-card p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Avis clients ({reviews?.length || 0})</p>
            <div className="mt-3">
              <ReviewList reviews={reviews} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-white shadow-card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Simulation</p>
            <div className="mt-3 flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-200 text-center text-xs text-gray-400">
              Simulation à venir
            </div>
          </div>

          <div className="rounded-lg bg-brand-light p-4 text-xs leading-relaxed text-brand-dark">
            <strong>À savoir avant de négocier :</strong> {aSavoirText}
          </div>
        </div>
      </div>
    </div>
  );
}
