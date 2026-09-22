import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const EVENT_LABELS = {
  message_started: "A démarré une conversation",
  appointment_booked: "A réservé un rendez-vous",
  project_started: "A démarré un projet",
  participant_added: "A ajouté un participant à un projet",
};

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

  // Petit résumé : nombre d'actions par client, pour repérer qui est
  // le plus engagé.
  const { data: allEvents } = await supabase
    .from("client_activity_events")
    .select("user_id, client:user_id ( full_name )");

  const countByClient = {};
  (allEvents || []).forEach((e) => {
    const key = e.user_id;
    if (!countByClient[key]) {
      countByClient[key] = { id: key, name: e.client?.full_name || "—", count: 0 };
    }
    countByClient[key].count += 1;
  });
  const topClients = Object.values(countByClient).sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-ink">Parcours des clients</h1>
      <p className="mt-1 text-sm text-gray-500">
        Suivi des actions clés (messages, rendez-vous, projets démarrés) — utile pour l'étude de marché.
      </p>

      {topClients.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/admin/activity"
            className={`rounded-full px-3 py-1 text-xs font-bold ${!filterClientId ? "bg-ink text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Tous
          </a>
          {topClients.map((c) => (
            <a
              key={c.id}
              href={`/admin/activity?client=${c.id}`}
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
          <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
            <p className="font-medium text-ink">
              {e.client?.full_name || "Client"} — {EVENT_LABELS[e.event_type] || e.event_type}
            </p>
            {e.target?.profiles?.full_name && (
              <p className="text-xs text-gray-500">Avec {e.target.profiles.full_name}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {new Date(e.created_at).toLocaleString("fr-FR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
