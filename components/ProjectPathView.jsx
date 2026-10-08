function formatShortDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Construit un seul chemin ordonné : le contrat, puis chaque étape (jalon)
// dans l'ordre, avec les rendez-vous replacés chronologiquement entre
// elles — validés (colorés) ou à venir (grisés), tels qu'ils sont dans
// les autres parties de la plateforme (paiement, rendez-vous...).
function buildPath({ projectCreatedAt, milestones, appointments }) {
  const nodes = [
    {
      key: "contract",
      kind: "contrat",
      label: "Signature du contrat",
      date: projectCreatedAt,
      done: true,
    },
  ];

  const sortedMilestones = [...(milestones || [])].sort((a, b) => a.order_index - b.order_index);
  const sortedAppointments = [...(appointments || [])].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const doneAppointments = sortedAppointments.filter((a) => a.status === "completed" || new Date(a.scheduled_at) < new Date());
  const upcomingAppointments = sortedAppointments.filter((a) => !(a.status === "completed" || new Date(a.scheduled_at) < new Date()));

  let doneApptIndex = 0;
  for (const m of sortedMilestones) {
    if (m.is_completed) {
      // Place les rendez-vous passés avant cette étape, dans l'ordre, s'ils
      // ont eu lieu avant que l'étape soit validée.
      while (
        doneApptIndex < doneAppointments.length &&
        new Date(doneAppointments[doneApptIndex].scheduled_at) < new Date(m.completed_at)
      ) {
        const a = doneAppointments[doneApptIndex];
        nodes.push({
          key: `appt-${a.id}`,
          kind: "rdv",
          label: `Appel avec ${a.artisan?.profiles?.full_name || "le professionnel"}`,
          date: a.scheduled_at,
          done: true,
        });
        doneApptIndex += 1;
      }
      nodes.push({
        key: `m-${m.id}`,
        kind: "etape",
        label: m.title,
        date: m.completed_at,
        done: true,
      });
    } else {
      nodes.push({
        key: `m-${m.id}`,
        kind: "etape",
        label: m.title,
        date: null,
        done: false,
      });
    }
  }
  // Rendez-vous passés restants (après la dernière étape validée).
  while (doneApptIndex < doneAppointments.length) {
    const a = doneAppointments[doneApptIndex];
    nodes.push({
      key: `appt-${a.id}`,
      kind: "rdv",
      label: `Appel avec ${a.artisan?.profiles?.full_name || "le professionnel"}`,
      date: a.scheduled_at,
      done: true,
    });
    doneApptIndex += 1;
  }
  // Rendez-vous à venir, à la fin du chemin, dans l'ordre.
  for (const a of upcomingAppointments) {
    nodes.push({
      key: `appt-${a.id}`,
      kind: "rdv",
      label: `Appel avec ${a.artisan?.profiles?.full_name || "le professionnel"} (prévu)`,
      date: a.scheduled_at,
      done: false,
    });
  }

  return nodes;
}

export default function ProjectPathView({ projectCreatedAt, milestones, appointments }) {
  const path = buildPath({ projectCreatedAt, milestones, appointments });

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-0 px-1 py-4">
        {path.map((node, i) => (
          <div key={node.key} className="flex items-center">
            <div className="flex w-28 flex-col items-center text-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-base ${
                  node.done
                    ? node.kind === "rdv"
                      ? "bg-forest text-white shadow-md"
                      : "bg-brand text-white shadow-md"
                    : "border-2 border-dashed border-gray-300 bg-white text-gray-300"
                }`}
              >
                {node.kind === "rdv" ? "📞" : node.kind === "contrat" ? "📄" : "✓"}
              </div>
              <p className={`mt-2 text-xs font-bold leading-tight ${node.done ? "text-ink" : "text-gray-400"}`}>
                {node.label}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                {node.date ? formatShortDate(node.date) : "à venir"}
              </p>
            </div>
            {i < path.length - 1 && (
              <div className={`h-0.5 w-8 shrink-0 ${node.done && path[i + 1].done ? "bg-brand" : "border-t-2 border-dashed border-gray-300"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
