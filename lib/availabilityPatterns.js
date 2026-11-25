// Génère les créneaux réels (availability_slots) à partir des
// disponibilités "standard" (récurrentes par jour de semaine) d'un
// professionnel, sur un horizon glissant de HORIZON_DAYS jours. N'avance
// jamais en arrière le curseur generated_until, donc un créneau que le
// professionnel a supprimé lui-même (jour férié, absence ponctuelle) n'est
// jamais recréé tant que l'horizon ne dépasse pas sa date. Cf. consigne
// Rose du 2026-11-25.
const HORIZON_DAYS = 56; // 8 semaines

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

export async function ensureWeeklyAvailabilityGenerated(supabase, artisanId) {
  const { data: patterns } = await supabase
    .from("availability_weekly_patterns")
    .select("*")
    .eq("artisan_id", artisanId);

  if (!patterns || patterns.length === 0) return;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const targetUntil = new Date(today);
  targetUntil.setUTCDate(targetUntil.getUTCDate() + HORIZON_DAYS);
  const targetUntilStr = toDateString(targetUntil);

  for (const pattern of patterns) {
    if (pattern.generated_until >= targetUntilStr) continue; // déjà à jour

    const from = new Date(pattern.generated_until + "T00:00:00Z");
    from.setUTCDate(from.getUTCDate() + 1);
    // Jamais générer dans le passé, même si generated_until a pris du retard.
    if (from < today) from.setTime(today.getTime());

    const newSlots = [];
    for (let d = new Date(from); d <= targetUntil; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.getUTCDay() === pattern.weekday) {
        newSlots.push({
          artisan_id: artisanId,
          date: toDateString(d),
          start_time: pattern.start_time,
          end_time: pattern.end_time,
          source_pattern_id: pattern.id,
        });
      }
    }

    if (newSlots.length > 0) {
      await supabase.from("availability_slots").insert(newSlots);
    }
    await supabase
      .from("availability_weekly_patterns")
      .update({ generated_until: targetUntilStr })
      .eq("id", pattern.id);
  }
}

export const WEEKDAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
