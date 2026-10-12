import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";

const EVENT_LABELS = {
  message_started: "A démarré une conversation",
  appointment_booked: "A réservé un rendez-vous",
  project_started: "A démarré un projet",
  participant_added: "A ajouté un participant à un projet",
  message_interest: "A cliqué sur \"Envoyer un message\" (non activé)",
  appointment_interest: "A cliqué sur \"Rendez-vous visio\" (non activé)",
  project_interest: "A cliqué sur \"Démarrer un projet\" (non activé)",
  message_notify_me: "Veut être notifié, \"Envoyer un message\"",
  appointment_notify_me: "Veut être notifié, \"Rendez-vous visio\"",
  project_notify_me: "Veut être notifié, \"Démarrer un projet\"",
};

// Libellés courts, pour les graphes (plus lisibles qu'une phrase entière).
const EVENT_SHORT_LABELS = {
  message_started: "Conversation démarrée",
  appointment_booked: "RDV réservé",
  project_started: "Projet démarré",
  participant_added: "Participant ajouté",
  message_interest: "Intérêt : message",
  appointment_interest: "Intérêt : RDV visio",
  project_interest: "Intérêt : démarrer un projet",
  message_notify_me: "Veut être notifié : message",
  appointment_notify_me: "Veut être notifié : RDV",
  project_notify_me: "Veut être notifié : projet",
};

// Pour chaque fonctionnalité, l'intérêt exprimé (clic + "me notifier",
// fonctionnalités pas encore activées) d'un côté, l'action réellement
// effectuée de l'autre — utile pour prioriser ce qui vaut la peine d'être
// activé en premier.
const FUNNELS = [
  { key: "message", label: "Messagerie", interest: ["message_interest", "message_notify_me"], action: ["message_started"] },
  { key: "appointment", label: "Rendez-vous visio", interest: ["appointment_interest", "appointment_notify_me"], action: ["appointment_booked"] },
  { key: "project", label: "Démarrer un projet", interest: ["project_interest", "project_notify_me"], action: ["project_started"] },
];

const RANGE_OPTIONS = [
  { key: "7", label: "7 jours", days: 7 },
  { key: "30", label: "30 jours", days: 30 },
  { key: "90", label: "90 jours", days: 90 },
  { key: "all", label: "Tout", days: null },
];

export default async function ClientActivityPage({ searchParams }) {
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

  const filterClientId = searchParams?.client;
  const rangeKey = RANGE_OPTIONS.some((r) => r.key === searchParams?.range) ? searchParams.range : "30";
  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey);
  const since = range.days ? new Date(Date.now() - range.days * 24 * 60 * 60 * 1000) : null;

  let query = supabase
    .from("client_activity_events")
    .select(
      `id, event_type, created_at, metadata,
       client:user_id ( id, full_name, city ),
       target:target_artisan_id ( id, profiles ( full_name ) )`
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (filterClientId) query = query.eq("user_id", filterClientId);

  const { data: events } = await query;

  // Toutes les actions (pas de limite, pour que les stats et graphes
  // soient justes même si la liste détaillée au-dessus est tronquée à 200).
  let statsQuery = supabase
    .from("client_activity_events")
    .select("user_id, event_type, created_at, client:user_id ( full_name )");
  if (since) statsQuery = statsQuery.gte("created_at", since.toISOString());
  const { data: allEvents } = await statsQuery;

  const rows = allEvents || [];

  const countByClient = {};
  rows.forEach((e) => {
    const key = e.user_id;
    if (!countByClient[key]) {
      countByClient[key] = { id: key, name: e.client?.full_name || "—", count: 0 };
    }
    countByClient[key].count += 1;
  });
  const topClients = Object.values(countByClient).sort((a, b) => b.count - a.count);

  // --- Dashboard : stats, graphes ---
  const totalActions = rows.length;
  const activeClients = Object.keys(countByClient).length;

  const byDay = {};
  const dayCount = range.days || 30;
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    byDay[d.toISOString().slice(0, 10)] = 0;
  }
  rows.forEach((e) => {
    const key = e.created_at.slice(0, 10);
    if (key in byDay) byDay[key] += 1;
  });
  const dailySeries = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30);
  const maxDaily = Math.max(1, ...dailySeries.map(([, v]) => v));

  const byType = {};
  rows.forEach((e) => {
    byType[e.event_type] = (byType[e.event_type] || 0) + 1;
  });
  const topTypes = Object.entries(byType).sort(([, a], [, b]) => b - a);
  const maxType = Math.max(1, ...topTypes.map(([, v]) => v));

  const funnelData = FUNNELS.map((f) => {
    const interest = f.interest.reduce((sum, t) => sum + (byType[t] || 0), 0);
    const action = f.action.reduce((sum, t) => sum + (byType[t] || 0), 0);
    return { ...f, interest, action };
  });
  const maxFunnel = Math.max(1, ...funnelData.flatMap((f) => [f.interest, f.action]));

  return (
    <div>
      <AdminNav current="/admin/activity" />
      <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Parcours des clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Suivi des actions clés (messages, rendez-vous, projets démarrés), utile pour l'étude de marché.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((r) => (
            <a
              key={r.key}
              href={`/admin/activity?range=${r.key}${filterClientId ? `&client=${filterClientId}` : ""}`}
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
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-brand p-4 text-white shadow-card">
          <p className="text-2xl font-heading font-bold">{totalActions}</p>
          <p className="text-xs text-brand-light">Actions enregistrées</p>
        </div>
        <div className="rounded-lg bg-forest p-4 text-white shadow-card">
          <p className="text-2xl font-heading font-bold">{activeClients}</p>
          <p className="text-xs text-forest-light">Clients actifs</p>
        </div>
      </div>

      {/* Actions par jour */}
      <div className="mt-6 rounded-lg bg-white p-5 shadow-card">
        <h2 className="font-heading font-bold text-ink">Actions par jour</h2>
        {dailySeries.every(([, v]) => v === 0) ? (
          <p className="mt-3 text-sm text-gray-500">Aucune action enregistrée sur cette période.</p>
        ) : (
          <>
            <div className="mt-4 flex items-end gap-1" style={{ height: "120px" }}>
              {dailySeries.map(([day, count]) => (
                <div key={day} className="group relative flex-1">
                  <div
                    className="w-full rounded-t bg-brand transition hover:bg-brand-dark"
                    style={{ height: `${Math.max(4, (count / maxDaily) * 100)}px` }}
                    title={`${day} : ${count} action(s)`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-gray-400">
              <span>{dailySeries[0]?.[0]}</span>
              <span>{dailySeries[dailySeries.length - 1]?.[0]}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {/* Répartition par type d'action */}
        <div className="rounded-lg bg-white p-5 shadow-card">
          <h2 className="font-heading font-bold text-ink">Types d'action</h2>
          {topTypes.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Pas encore de données.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2.5">
              {topTypes.map(([type, count]) => (
                <div key={type}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-ink">{EVENT_SHORT_LABELS[type] || type}</span>
                    <span className="shrink-0 text-gray-500">{count}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-brand"
                      style={{ width: `${(count / maxType) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Intérêt exprimé vs action réalisée, par fonctionnalité */}
        <div className="rounded-lg bg-white p-5 shadow-card">
          <h2 className="font-heading font-bold text-ink">Intérêt vs action réalisée</h2>
          <p className="mt-0.5 text-xs text-gray-400">Utile pour prioriser ce qui vaut la peine d'être activé.</p>
          <div className="mt-4 flex flex-col gap-3">
            {funnelData.map((f) => (
              <div key={f.key}>
                <p className="text-xs font-medium text-ink">{f.label}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[10px] text-gray-500">Intérêt</span>
                  <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-gold" style={{ width: `${(f.interest / maxFunnel) * 100}%` }} />
                  </div>
                  <span className="w-5 shrink-0 text-right text-[10px] text-gray-500">{f.interest}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[10px] text-gray-500">Action</span>
                  <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-forest" style={{ width: `${(f.action / maxFunnel) * 100}%` }} />
                  </div>
                  <span className="w-5 shrink-0 text-right text-[10px] text-gray-500">{f.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {topClients.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/admin/activity?range=${rangeKey}`}
            className={`rounded-full px-3 py-1 text-xs font-bold ${!filterClientId ? "bg-ink text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Tous
          </a>
          {topClients.map((c) => (
            <a
              key={c.id}
              href={`/admin/activity?range=${rangeKey}&client=${c.id}`}
              className={`rounded-full px-3 py-1 text-xs font-bold ${filterClientId === c.id ? "bg-ink text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {c.name} ({c.count})
            </a>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {(!events || events.length === 0) && (
          <p className="text-sm text-gray-500">Aucune activité enregistrée pour le moment.</p>
        )}
        {events?.map((e) => (
          <div key={e.id} className="rounded-lg bg-white shadow-card p-3 text-sm">
            <p className="font-medium text-ink">
              {e.client?.full_name || "Client"}, {EVENT_LABELS[e.event_type] || e.event_type}
            </p>
            {e.target?.profiles?.full_name && (
              <p className="text-xs text-gray-500">Avec {e.target.profiles.full_name}</p>
            )}
            {e.metadata?.urgency && (
              <p className="mt-0.5 text-xs font-semibold text-brand">
                {e.metadata.urgency === "urgent" ? "🔴 Urgent" : "🟡 En réflexion"}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {new Date(e.created_at).toLocaleString("fr-FR")}
            </p>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
