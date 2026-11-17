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

  return (
    <div className="bg-[#F8F6F1]">
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

        <form action="/artisans" className="mt-6 grid gap-px overflow-visible rounded-lg bg-forest p-1 shadow-card sm:grid-cols-4">
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
          <select name="recommendation" defaultValue={recommendation || ""} className="rounded-md bg-white p-3 text-sm text-ink focus:outline-none">
            <option value="">Toute la liste</option>
            {RECOMMENDATION_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button type="submit" className="rounded-md bg-forest-dark text-sm font-bold text-white hover:bg-forest">
            Rechercher
          </button>
        </form>

        {recommendation === "top3" && (
          <p className="mt-4 text-sm text-gray-500">Nos 3 recommandations les plus expérimentées.</p>
        )}

        <p className="mt-6 text-sm text-gray-500">{artisans.length} professionnel{artisans.length > 1 ? "s" : ""} trouvé{artisans.length > 1 ? "s" : ""}</p>

        {artisans.length === 0 ? (
          <p className="mt-10 text-gray-500">Aucun artisan ne correspond à votre recherche.</p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artisans.map((a) => {
              const firstName = (a.profiles?.full_name || "").trim().split(/\s+/)[0] || "Professionnel";
              return (
                <Link
                  key={a.id}
                  href={`/artisans/${a.id}`}
                  className="group rounded-xl bg-white p-3 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <div className="relative overflow-hidden rounded-xl">
                    {a.profiles?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${a.profiles.avatar_url}?v=${Date.now()}`}
                        alt={firstName}
                        className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center bg-forest-light text-forest">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                        </svg>
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-forest px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {a.trade}
                    </span>
                    {a.is_verified && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-forest">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <div className="px-1 pb-1 pt-3">
                    <p className="font-heading text-base font-bold text-forest">{firstName}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                        <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>
                      {a.profiles?.city || "Côte d'Ivoire"}
                      {a.mobility_scope === "all" && " · Disponible partout"}
                    </p>
                    {a.years_experience ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        {a.years_experience} an{a.years_experience > 1 ? "s" : ""} d&apos;expérience
                      </p>
                    ) : null}

                    {a.services && a.services.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.services.slice(0, 3).map((s) => (
                          <span key={s} className="rounded bg-forest-light px-1.5 py-0.5 text-[10px] font-medium text-forest">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-2.5 flex items-center justify-end border-t border-gray-100 pt-2.5">
                      <span className="shrink-0 rounded-full bg-forest px-3 py-1.5 text-[11px] font-bold text-white">
                        Voir le profil
                      </span>
                    </div>
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
