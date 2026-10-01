import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CI_CITIES, CONSTRUCTION_SERVICES, RECOMMENDATION_OPTIONS } from "@/lib/constants";
import CitySelect from "@/components/CitySelect";

export const metadata = {
  title: "Trouver un artisan vérifié en Côte d'Ivoire",
  description: "Maçons, électriciens, plombiers, architectes, géomètres... Recherchez parmi les artisans et professionnels vérifiés de TC-Immo, par métier et par ville.",
};

export default async function ArtisansPage({ searchParams }) {
  const supabase = createClient();
  const { trade, city, recommendation, house_type } = searchParams || {};

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (house_type) {
    await supabase.from("search_analytics").insert({
      house_type,
      trade: trade || null,
      city: city || null,
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
      !trade || a.trade === trade || (a.services || []).includes(trade);
    const matchesCity =
      !city ||
      a.profiles?.city === city ||
      a.mobility_scope === "all" ||
      (a.mobility_cities || []).includes(city);
    return matchesTrade && matchesCity;
  });

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

      <form action="/artisans" className="mt-6 grid gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 sm:grid-cols-4">
        <select name="trade" defaultValue={trade || ""} className="bg-white p-3 text-sm text-ink focus:outline-none">
          <option value="">Tous les métiers</option>
          {CONSTRUCTION_SERVICES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <CitySelect
          cities={CI_CITIES}
          name="city"
          defaultValue={city || ""}
          placeholder="Toutes les villes"
          inputClassName="bg-white p-3 text-sm text-ink focus:outline-none w-full"
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
                <p className="font-heading text-sm font-bold text-ink">{a.profiles?.full_name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
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

                <div className="mt-2.5 flex items-end justify-between border-t border-gray-100 pt-2.5">
                  {a.pricing_info ? (
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Tarif</p>
                      <p className="truncate text-xs font-semibold text-brand">{a.pricing_info}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">{a.projects_completed || 0} projets réalisés</span>
                  )}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
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
