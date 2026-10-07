// Enregistre un événement dans le journal chronologique d'un projet
// (contrat, étape validée, paiement, rendez-vous, photo, rapport...).
// À appeler juste après l'action correspondante a réussi.
export async function logTimelineEvent(supabase, { projectId, eventType, title, description, mediaUrl, actorId, eventAt }) {
  await supabase.from("project_timeline_events").insert({
    project_id: projectId,
    event_type: eventType,
    title,
    description: description || null,
    media_url: mediaUrl || null,
    actor_id: actorId || null,
    event_at: eventAt || new Date().toISOString(),
  });
}
