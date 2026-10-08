import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TrustBanner from "@/components/TrustBanner";
import ConstructionWizard from "@/components/ConstructionWizard";
import { CI_CITIES, CONSTRUCTION_SERVICES, HOUSE_TYPES, RECOMMENDATION_OPTIONS } from "@/lib/constants";
import CitySelect from "@/components/CitySelect";

const STEPS = [
  {
    n: 1,
    title: "Choisissez vos prestataires",
    text: "Consultez les profils vérifiés (artisans, géomètre, architecte, technicien de suivi) et échangez avec eux avant de démarrer.",
    image: "/etapes/etape1.jpg",
  },
  {
    n: 2,
    title: "Démarrez votre projet",
    text: "Validez avec chaque prestataire un échéancier de paiement en plusieurs étapes. Un abonnement mensuel s'active dès le lancement du projet.",
    image: "/etapes/etape2.avif",
  },
  {
    n: 3,
    title: "Payez en toute confiance",
    text: "Chaque paiement correspond à une étape réellement validée. Rien n'est versé d'un coup, tout reste tracé sur la plateforme.",
    image: "/etapes/etape3.avif",
  },
  {
    n: 4,
    title: "Suivez vos travaux à distance",
    text: "Consultez l'avancement depuis votre espace, où que vous soyez, et ajoutez d'autres professionnels au projet à tout moment si besoin.",
    image: "/etapes/etape4.avif",
  },
];

export default async function HomePage() {
  const supabase = createClient();

  const { data: heroSection } = await supabase
    .from("page_sections")
    .select("title, body")
    .eq("page", "accueil")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();

  const heroTitle = heroSection?.title || "Construisez chez vous, en toute sécurité, depuis n'importe où";
  const heroSubtitle = heroSection?.body || "TCHolding-Immo connecte la diaspora à des artisans vérifiés en Côte d'Ivoire.";

  const { data: allArtisans } = await supabase
    .from("artisan_profiles")
    .select(`id, trade, is_verified, years_experience, pricing_info, profiles!inner ( full_name, city, avatar_url, approval_status )`)
    .eq("is_suspended", false)
    .eq("profiles.approval_status", "approved")
    .order("is_verified", { ascending: false });

  // Mélange en alternance par métier (1 maçon, 1 architecte, 1
  // géomètre...), pour qu'un seul métier très représenté ne truste pas
  // à lui seul la mise en avant de l'accueil.
  const byTrade = new Map();
  for (const a of allArtisans || []) {
    if (!byTrade.has(a.trade)) byTrade.set(a.trade, []);
    byTrade.get(a.trade).push(a);
  }
  const buckets = Array.from(byTrade.values());
  const mixed = [];
  let bucketIndex = 0;
  while (mixed.length < (allArtisans?.length || 0)) {
    for (const bucket of buckets) {
      if (bucketIndex < bucket.length) mixed.push(bucket[bucketIndex]);
    }
    bucketIndex += 1;
  }
  const artisans = mixed.slice(0, 6);

  return (
    <div>
      {/* Hero plein écran : photo en fond, titre, simulateur et recherche
          réunis dans le même bloc, la première impression ne doit pas
          être coupée. */}
      <section
        className="relative flex min-h-[400px] flex-col overflow-hidden sm:min-h-[640px] lg:min-h-[720px]"
        style={{ background: "radial-gradient(circle at center, #4a2c18 0%, #241307 65%, #140a04 100%)" }}
      >
        {/* Sur mobile : la photo entière reste visible (object-contain),
            jamais recadrée ni zoomée, quitte à garder un peu de fond uni
            de part et d'autre. À partir de sm, assez de largeur pour
            recouvrir le cadre sans recadrage excessif (object-cover). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-elephants.jpg"
          alt="Savane en Côte d'Ivoire"
          className="absolute inset-0 h-full w-full object-contain sm:object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/70" />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-white sm:gap-10 sm:py-14">
          <div className="flex max-w-2xl gap-5">
            <div className="mt-2 w-1 shrink-0 self-stretch rounded-full bg-brand" aria-hidden="true" />
            <div>
              <h1 className="font-heading text-4xl font-extrabold leading-[1.1] sm:text-5xl">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-md text-base text-white/90 sm:text-lg">
                {heroSubtitle}
              </p>
            </div>
          </div>

          <ConstructionWizard />
        </div>

        {/* Bandeau de recherche dense, pratique, ancré en bas du hero */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-10">
          <form
            action="/artisans"
            className="grid gap-px overflow-hidden rounded-xl bg-brand shadow-xl sm:grid-cols-5"
          >
            <div className="bg-white p-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Métier</label>
              <select name="trade" defaultValue="" className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none">
                <option value="">Tous</option>
                {CONSTRUCTION_SERVICES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="bg-white p-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Type de bien</label>
              <select name="house_type" defaultValue="" className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none">
                <option value="">Tous</option>
                {HOUSE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="bg-white p-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Ville</label>
              <CitySelect
                cities={CI_CITIES}
                name="city"
                placeholder="Toutes"
                inputClassName="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none"
              />
            </div>
            <div className="bg-white p-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">Recommandation</label>
              <select name="recommendation" defaultValue="" className="mt-0.5 w-full border-0 bg-transparent p-0 text-sm font-medium text-ink focus:outline-none">
                <option value="">Toute la liste</option>
                {RECOMMENDATION_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-brand text-sm font-bold text-white hover:bg-brand-dark"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Rechercher
            </button>
          </form>
        </div>
      </section>

      {/* Artisans vérifiés */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between">
          <h2 className="font-heading text-2xl font-bold text-ink">Artisans vérifiés</h2>
          <Link href="/artisans" className="text-sm font-semibold text-brand hover:underline">
            Voir tous les profils
          </Link>
        </div>

        {!artisans || artisans.length === 0 ? (
          <p className="mt-6 text-gray-500">Aucun artisan pour le moment.</p>
        ) : (
          <div className="mt-6 flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
            {artisans.map((a) => (
              <Link
                key={a.id}
                href={`/artisans/${a.id}`}
                className="group w-80 shrink-0 overflow-hidden rounded-lg bg-white shadow-card"
              >
                <div className="relative">
                  {a.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${a.profiles.avatar_url}?v=${Date.now()}`}
                      alt={a.profiles?.full_name}
                      className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-gray-50 font-heading text-2xl font-bold text-gray-300">
                      {a.profiles?.full_name?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute left-2.5 top-2.5 rounded bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {a.trade}
                  </span>
                  {a.is_verified && (
                    <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-forest">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="font-heading line-clamp-1 text-sm font-bold text-ink">{a.profiles?.full_name}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                    {a.profiles?.city || "Côte d'Ivoire"}
                    {a.years_experience ? ` · ${a.years_experience} ans` : ""}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
                    {a.pricing_info ? (
                      <div className="min-w-0 max-w-[60%]">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Tarif</p>
                        <p className="truncate text-xs font-semibold text-brand">{a.pricing_info}</p>
                      </div>
                    ) : (
                      <span />
                    )}
                    <span className="shrink-0 rounded-full bg-brand px-2 py-1 text-[9px] font-bold text-white">
                      Voir le profil
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Comment ça marche */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-2xl font-bold text-ink">Comment ça marche</h2>
          <p className="mt-1 text-sm text-gray-600">Vous gérez vos travaux, nous gérons la sécurité.</p>

          <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-40 w-full rounded-lg object-cover"
                  />
                  <span className="absolute left-3 top-3 rounded bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Étape {String(step.n).padStart(2, "0")}
                  </span>
                </div>
                <p className="font-heading mt-3 text-base font-bold leading-snug text-ink">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{step.text}</p>

                {(i === 0 || i === 2) && (
                  <svg
                    width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className="absolute -right-7 top-16 hidden text-gray-300 sm:block"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <TrustBanner />
    </div>
  );
}
