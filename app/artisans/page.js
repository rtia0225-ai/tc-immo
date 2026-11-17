import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CI_CITIES, CONSTRUCTION_SERVICES, RECOMMENDATION_OPTIONS } from "@/lib/constants";
import CitySelect from "@/components/CitySelect";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";

export const metadata = {
  title: "Trouver un artisan vérifié en Côte d'Ivoire",
  description: "Maçons, électriciens, plombiers, architectes, géomètres... Recherchez parmi les artisans et professionnels vérifiés de TCHolding-Immo, par métier et par ville.",
};

// searchParams renvoie une chaîne s'il n'y a qu'une valeur, un tableau
// s'il y en a plusieurs, rien si absent : on uniformise toujours en tableau.
function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// Mélange les artisans en alternant les métiers (1 maçon, 1 architecte, 1
// géomètre...), pour qu'une recherche sans filtre montre un vrai mélange
// de corps de métier plutôt que d'être dominée par le plus nombreux.
function interleaveByTrade(list) {
  const byTrade = new Map();
  for (const a of list) {
    if (!byTrade.has(a.trade)) byTrade.set(a.trade, []);
    byTrade.get(a.trade).push(a);
  }
  const buckets = Array.from(byTrade.values());
  const result = [];
  let index = 0;
  while (result.length < list.length) {
    for (const bucket of buckets) {
      if (index < bucket.length) result.push(bucket[index]);
    }
    index += 1;
  }
  return result;
}

export default async function ArtisansPage({ searchParams }) {
  const supabase = createClient();
  const trades = toArray(searchParams?.trade);
  const cities = toArray(searchParams?.city);
  const { recommendation, house_type } = searchParams || {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (house_type) {
    await supabase.from("search_analytics").insert({
      house_type,
      trade: trades[0] || null,
      city: cities[0] || null,
      recommendation: recommendation || null,
      searched_by: user?.id || null,
    });
  }

  const { data: allArtisans } = await supabase
    .from("artisan_profiles")
    .select(
      `id, trade, bio, years_experience, is_verified, pricing_info,
       services, projects_completed, mobility_scope, mobility_cities,
       profiles ( full_name, city, avatar_url, approval_status )`
    )
    .eq("is_suspended", false)
    .order("is_verified", { ascending: false });

  let artisans = (allArtisans || []).filter((a) => a.profiles?.approval_status === "approved");

  artisans = artisans.filter((a) => {
    const matchesTrade =
      trades.length === 0 || trades.includes(a.trade) || (a.services || []).some((s) => trades.includes(s));
    const matchesCity =
      cities.length === 0 ||
      cities.includes(a.profiles?.city) ||
      a.mobility_scope === "all" ||
      (a.mobility_cities || []).some((c) => cities.includes(c));
    return matchesTrade && matchesCity;
  });

  // Pas de métier précis demandé : on mélange plutôt que de laisser le
  // métier le plus représenté (souvent la maçonnerie) truster le début.
  if (trades.length === 0) {
    artisans = interleaveByTrade(artisans);
  }

  if (recommendation === "top3") {
    artisans = [...artisans]
      .sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0))
      .slice(0, 3);
  }

  const resultCountLabel = `${artisans.length} artisan${artisans.length > 1 ? "s" : ""} trouvé${artisans.length > 1 ? "s" : ""}`;

  return (
    <div className="bg-[#F8F6F1]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-heading text-2xl font-bold text-ink">Trouver un artisan</h1>

        {/* Bandeau vert reprenant la forme de la barre de recherche de référence,
            sans le bloc titre/sous-titre : juste la barre blanche arrondie avec les
            filtres et le bouton "Rechercher". */}
        <div className="mt-4 rounded-2xl bg-forest px-5 py-5 text-center text-white sm:px-8">
          <form
            action="/artisans"
            className="mx-auto flex max-w-4xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-card sm:flex-row sm:items-stretch sm:gap-0 sm:rounded-full"
          >
            <div className="sm:flex-1">
              <MultiSelectDropdown
                name="trade"
                options={CONSTRUCTION_SERVICES}
                defaultValues={trades}
                placeholder="Toutes catégories"
              />
            </div>
            <div className="hidden w-px bg-gray-200 sm:block" />
            <div className="sm:flex-1">
              <MultiSelectDropdown
                name="city"
                options={CI_CITIES}
                defaultValues={cities}
                placeholder="Ville ou code postal..."
                searchable
              />
            </div>
            <div className="hidden w-px bg-gray-200 sm:block" />
            <div className="sm:flex-1">
              <select
                name="recommendation"
                defaultValue={recommendation || ""}
                className="h-full w-full rounded-full bg-transparent p-3 text-left text-sm text-ink focus:outline-none"
              >
                <option value="">Mot-clé libre...</option>
                {RECOMMENDATION_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-full bg-gold px-7 py-3 text-sm font-bold text-white hover:bg-gold/90"
            >
              Rechercher
            </button>
          </form>
        </div>

        {!user && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-lg bg-brand p-4 text-white sm:flex-row">
            <p className="text-sm font-medium">
              Crée un compte pour contacter un artisan, prendre rendez-vous ou démarrer un projet.
            </p>
            <Link
              href="/auth/signup"
              className="shrink-0 rounded-md bg-white px-5 py-2 text-sm font-bold text-brand hover:bg-gray-100"
            >
              Créer un compte
            </Link>
          </div>
        )}

        {recommendation === "top3" && (
          <p className="mt-4 text-sm text-gray-500">Nos 3 recommandations les plus expérimentées.</p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">{resultCountLabel}</p>
          <p className="text-sm text-gray-500">
            Tri : <span className="font-bold text-brand">Certifiés en premier</span>
          </p>
        </div>

        {artisans.length === 0 ? (
          <p className="mt-10 text-gray-500">Aucun artisan ne correspond à votre recherche.</p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {artisans.map((a) => {
              const firstName = (a.profiles?.full_name || "").trim().split(/\s+/)[0] || "Professionnel";
              return (
                <Link
                  key={a.id}
                  href={`/artisans/${a.id}`}
                  className="group overflow-hidden rounded-lg border border-gray-100 bg-white shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <div className="relative">
                    {a.profiles?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${a.profiles.avatar_url}?v=${Date.now()}`}
                        alt={firstName}
                        className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center bg-brand-light text-brand">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                        </svg>
                      </div>
                    )}
                    {a.is_verified && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <div className="p-3.5">
                    <p className="font-heading line-clamp-1 text-sm font-bold text-brand">{firstName}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                        <path d="M3 7.5 12 3l9 4.5M4.5 10v9h15v-9" />
                      </svg>
                      <span className="line-clamp-1">{a.trade}</span>
                    </p>
                    {a.years_experience ? (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        {a.years_experience} an{a.years_experience > 1 ? "s" : ""} d&apos;expérience
                      </p>
                    ) : null}
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                        <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      <span className="line-clamp-1">
                        {a.profiles?.city || "Côte d'Ivoire"}
                        {a.mobility_scope === "all" && " · Partout"}
                      </span>
                    </p>

                    {a.services && a.services.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.services.slice(0, 2).map((s) => (
                          <span key={s} className="rounded bg-brand-light px-1.5 py-0.5 text-[10px] font-medium text-brand">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
