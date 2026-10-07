import { createClient } from "@/lib/supabase/server";
import ReviewList from "@/components/ReviewList";
import PhotoCarousel from "@/components/PhotoCarousel";
import Link from "next/link";
import { SINGLE_INSTALLMENT_TRADES, MIN_INSTALLMENTS_OTHER_TRADES } from "@/lib/constants";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <PhotoCarousel photos={photos} />
      </div>

      {/* Identité */}
      <div className="mt-6 flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-6">
        {artisan.profiles?.avatar_url ? (
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${artisan.profiles.avatar_url}?v=${Date.now()}`}
              alt={artisan.profiles?.full_name}
              className="h-20 w-20 rounded-full object-cover"
            />
            {AVATAR_PHOTO_CREDITS[artisan.id] && (
              <p className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[6px] leading-none text-white/60 [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">
                {AVATAR_PHOTO_CREDITS[artisan.id]}
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-50 font-heading text-xl font-bold text-gray-300">
            {artisan.profiles?.full_name?.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">{artisan.profiles?.full_name}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {artisan.trade} · {artisan.profiles?.city || "Côte d'Ivoire"}
          </p>
          {artisan.is_verified && (
            <span className="mt-2 inline-block rounded bg-forest px-2 py-0.5 text-xs font-bold text-white">
              Profil vérifié
            </span>
          )}
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="font-heading text-2xl font-bold text-ink">{artisan.years_experience || 0}</p>
          <p className="text-xs text-gray-500">années d'expérience</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="font-heading text-2xl font-bold text-ink">{artisan.projects_completed || 0}</p>
          <p className="text-xs text-gray-500">projets réalisés sur la plateforme</p>
        </div>
        <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-4 text-center sm:col-span-1">
          <p className="font-heading text-sm font-bold text-ink">
            {artisan.mobility_scope === "all" ? "Toute la CI" : "Zones précises"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {artisan.mobility_scope === "all"
              ? "Disponible partout"
              : artisan.mobility_cities?.join(", ") || "Non précisé"}
          </p>
        </div>
      </div>

      {/* Règle de paiement à connaître avant toute négociation */}
      <div className="mt-4 rounded-lg bg-brand-light p-4 text-sm text-brand-dark">
        {SINGLE_INSTALLMENT_TRADES[artisan.trade] ? (
          <p>
            <strong>À savoir avant de négocier :</strong> la main d'œuvre de ce professionnel (ses honoraires) se paie en une seule fois, uniquement à la livraison du {SINGLE_INSTALLMENT_TRADES[artisan.trade]} sur la plateforme. Les frais administratifs liés au dossier (dépôts, taxes, timbres...) sont distincts : ils se règlent au fur et à mesure de l'avancement réel des démarches, pas en une fois.
          </p>
        ) : (
          <div>
            <p>
              <strong>À savoir avant de négocier :</strong> un échéancier de paiement en au moins {MIN_INSTALLMENTS_OTHER_TRADES} étapes est requis pour ce métier. Prévoyez ce découpage dans votre discussion avec l'artisan.
            </p>
            <p className="mt-2">
              {artisan.trade === "Maçonnerie" ? (
                <>
                  <strong>Exemple pour la maçonnerie :</strong> 20% après les fondations, 20% après l'élévation des murs, 20% après la dalle, 20% après le chaînage/poteaux, 20% après les enduits et finitions.
                </>
              ) : (
                <>
                  <strong>Découpe selon ce métier précis</strong>, à ne pas mélanger avec le travail d'un autre artisan du même projet.
                </>
              )}{" "}
              Autre possibilité : un paiement régulier (chaque semaine ou chaque mois) selon les jours réellement travaillés.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
        {artisan.pricing_info && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Tarification</p>
            <p className="mt-1 text-sm text-ink">{artisan.pricing_info}</p>
          </div>
        )}

        {artisan.services && artisan.services.length > 0 && (
          <div className="mb-5">
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
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Pourquoi moi</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{artisan.bio}</p>
          </div>
        )}
      </div>

      {/* Actions, un artisan ne peut ni se contacter ni démarrer un
          projet avec lui-même ; seul un client peut démarrer un projet.
          Si l'artisan est lié à un technicien recruteur, le contact
          (message/RDV) est redirigé vers lui, le paiement et le projet,
          eux, restent toujours directement liés à cet artisan. */}
      {isOwnProfile ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
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
          <div className={`mt-2 grid gap-3 ${viewerIsArtisan ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
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
              className="rounded-md border border-gray-300 px-4 py-3 text-center text-sm font-bold text-ink hover:bg-gray-50"
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

      {/* Avis */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Avis</p>
        <div className="mt-3">
          <ReviewList reviews={reviews} />
        </div>
      </div>
    </div>
  );
}
