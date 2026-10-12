import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";

const RANGE_OPTIONS = [
  { key: "7", label: "7 jours", days: 7 },
  { key: "30", label: "30 jours", days: 30 },
  { key: "90", label: "90 jours", days: 90 },
];

function refererBucket(referrer, path) {
  if (!referrer) return "Direct";
  if (referrer.startsWith("/")) return "Navigation interne";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.includes("tcholding-immo")) return "Navigation interne";
    if (host.includes("google")) return "Recherche Google";
    if (host.includes("facebook") || host.includes("instagram") || host.includes("whatsapp") || host.includes("tiktok") || host.includes("linkedin")) {
      return "Réseaux sociaux";
    }
    return host;
  } catch {
    return "Direct";
  }
}

export default async function AnalyticsPage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!myProfile?.is_admin) redirect("/dashboard");

  const rangeKey = RANGE_OPTIONS.some((r) => r.key === searchParams?.range) ? searchParams.range : "30";
  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey);
  const since = new Date(Date.now() - range.days * 24 * 60 * 60 * 1000);

  const { data: views } = await supabase
    .from("page_views")
    .select("path, referrer, device_type, visitor_id, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(10000);

  const rows = views || [];

  // --- Agrégations, calculées ici plutôt qu'en SQL : le volume est pour
  // l'instant faible (phase de lancement), pas besoin de vues matérialisées.
  const uniqueVisitors = new Set(rows.map((r) => r.visitor_id)).size;
  const totalVisits = rows.length;

  const byDay = {};
  for (let i = 0; i < range.days; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    byDay[key] = 0;
  }
  rows.forEach((r) => {
    const key = r.created_at.slice(0, 10);
    if (key in byDay) byDay[key] += 1;
  });
  const dailySeries = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30); // jamais plus de 30 barres à l'écran, même sur 90 jours
  const maxDaily = Math.max(1, ...dailySeries.map(([, v]) => v));

  const pathCounts = {};
  rows.forEach((r) => {
    const key = r.path.split("?")[0];
    pathCounts[key] = (pathCounts[key] || 0) + 1;
  });
  const topPages = Object.entries(pathCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const maxPage = Math.max(1, ...topPages.map(([, v]) => v));

  const deviceCounts = { mobile: 0, desktop: 0 };
  rows.forEach((r) => {
    deviceCounts[r.device_type === "mobile" ? "mobile" : "desktop"] += 1;
  });
  const mobilePct = totalVisits ? Math.round((deviceCounts.mobile / totalVisits) * 100) : 0;

  const referrerCounts = {};
  rows.forEach((r) => {
    const key = refererBucket(r.referrer, r.path);
    referrerCounts[key] = (referrerCounts[key] || 0) + 1;
  });
  const topReferrers = Object.entries(referrerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);
  const maxReferrer = Math.max(1, ...topReferrers.map(([, v]) => v));

  return (
    <div>
      <AdminNav current="/admin/analytics" />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-ink">Fréquentation du site</h1>
            <p className="mt-1 text-sm text-gray-500">
              Mesure interne, uniquement les visiteurs ayant accepté les cookies de mesure d'audience.
            </p>
          </div>
          <div className="flex gap-2">
            {RANGE_OPTIONS.map((r) => (
              <a
                key={r.key}
                href={`/admin/analytics?range=${r.key}`}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  r.key === rangeKey ? "bg-ink text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r.label}
              </a>
            ))}
          </div>
        </div>

        {/* Chiffres clés */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-brand p-4 text-white shadow-card">
            <p className="text-2xl font-heading font-bold">{totalVisits}</p>
            <p className="text-xs text-brand-light">Pages vues</p>
          </div>
          <div className="rounded-lg bg-forest p-4 text-white shadow-card">
            <p className="text-2xl font-heading font-bold">{uniqueVisitors}</p>
            <p className="text-xs text-forest-light">Visiteurs uniques</p>
          </div>
          <div className="rounded-lg bg-azure p-4 text-white shadow-card">
            <p className="text-2xl font-heading font-bold">{mobilePct}%</p>
            <p className="text-xs text-azure-light">Sur mobile</p>
          </div>
        </div>

        {/* Visites par jour */}
        <div className="mt-6 rounded-lg bg-white p-5 shadow-card">
          <h2 className="font-heading font-bold text-ink">Visites par jour</h2>
          {dailySeries.every(([, v]) => v === 0) ? (
            <p className="mt-3 text-sm text-gray-500">Aucune visite enregistrée sur cette période.</p>
          ) : (
            <div className="mt-4 flex items-end gap-1" style={{ height: "120px" }}>
              {dailySeries.map(([day, count]) => (
                <div key={day} className="group relative flex-1">
                  <div
                    className="w-full rounded-t bg-brand transition hover:bg-brand-dark"
                    style={{ height: `${Math.max(4, (count / maxDaily) * 100)}px` }}
                    title={`${day} : ${count} visite(s)`}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-between text-[10px] text-gray-400">
            <span>{dailySeries[0]?.[0]}</span>
            <span>{dailySeries[dailySeries.length - 1]?.[0]}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {/* Pages les plus vues */}
          <div className="rounded-lg bg-white p-5 shadow-card">
            <h2 className="font-heading font-bold text-ink">Pages les plus vues</h2>
            {topPages.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Pas encore de données.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                {topPages.map(([path, count]) => (
                  <div key={path}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium text-ink">{path}</span>
                      <span className="shrink-0 text-gray-500">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-brand"
                        style={{ width: `${(count / maxPage) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* D'où viennent les visiteurs */}
          <div className="rounded-lg bg-white p-5 shadow-card">
            <h2 className="font-heading font-bold text-ink">D'où viennent les visiteurs</h2>
            {topReferrers.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Pas encore de données.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                {topReferrers.map(([source, count]) => (
                  <div key={source}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium text-ink">{source}</span>
                      <span className="shrink-0 text-gray-500">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-forest"
                        style={{ width: `${(count / maxReferrer) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Pour une analyse plus poussée (parcours détaillé, carte des visiteurs, temps réel), Google Analytics est aussi actif sur le site et consultable sur analytics.google.com.
        </p>
      </div>
    </div>
  );
}
