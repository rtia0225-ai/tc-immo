import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CI_CITIES, CONSTRUCTION_SERVICES, RECOMMENDATION_OPTIONS } from "@/lib/constants";
import CitySelect from "@/components/CitySelect";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";

export const metadata = {
  title: "Trouver un artisan vérifié en Côte d'Ivoire",
  description: "Maçons, électriciens, plombiers, architectes, géomètres... Recherchez parmi les artisans et professionnels vérifiés de TC-Immo, par métier et par ville.",
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-heading text-2xl font-bold text-ink">Trouver un artisan</h1>

      {!user && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-lg bg-forest p-4 text-white sm:flex-row">
          <p className="text-sm font-medium">
            Crée un compte pour contacter un artisan, prendre rendez-vous ou démarrer un projet.
          </p>
          <Link
            href="/auth/signup"
            className="shrink-0 rounded-md bg-white px-5 py-2 text-sm font-bold text-forest hover:bg-gray-100"
          >
            Créer un compte
          </Link>
        </div>
      )}

      <form action="/artisans" className="mt-6 grid gap-px overflow-visible rounded-lg border border-gray-200 bg-gray-200 sm:grid-cols-4">
        <MultiSelectDropdown
          name="trade"
          options={CONSTRUCTION_SERVICES}
          defaultValues={trades}
          placeholder="Tous les métiers"
        />
        <MultiSelectDropdown
          name="city"
          options={CI_CITIES}
          defaultValues={cities}
          placeholder="Toutes les villes"
          searchable
        />
        <select name="recommendation" defaultValue={recommendation || ""} className="bg-white p-3 text-sm text-ink focus:outline-none">
          <option value="">Toute la liste</option>
          {RECOMMENDATION_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <button type="submit" className="bg-brand text-sm font-bold text-white hover:bg-brand-dark">
          Filtrer
        </button>
      </form>

      {recommendation === "top3" && (
        <p className="mt-4 text-sm text-gray-500">Nos 3 recommandations les plus expérimentées.</p>
      )}

      {artisans.length === 0 ? (
        <p className="mt-10 text-gray-500">Aucun artisan ne correspond à votre recherche.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artisans.map((a) => (
            <Link
              key={a.id}
              href={`/artisans/${a.id}`}
              className="group overflow-hidden rounded-lg border border-ink/15 bg-white"
            >
              <div className="relative">
                {a.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${a.profiles.avatar_url}?v=${Date.now()}`}
                    alt={a.profiles?.full_name}
                    className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-gray-50 font-heading text-2xl font-bold text-gray-300">
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
                  {a.mobility_scope === "all" && " · Toute la CI"}
                  {a.years_experience ? ` · ${a.years_experience} ans d'expérience` : ""}
                </p>

                {a.services && a.services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.services.slice(0, 3).map((s) => (
                      <span key={s} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-gray-100 pt-2.5">
                  {a.pricing_info ? (
                    <div className="min-w-0 max-w-[55%]">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Tarif</p>
                      <p className="truncate text-xs font-semibold text-brand">{a.pricing_info}</p>
                    </div>
                  ) : (
                    <span />
                  )}
                  <span className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-white">
                    Voir le profil
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
