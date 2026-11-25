import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { addAvailabilitySlot, removeAvailabilitySlot, addWeeklyAvailability, removeWeeklyAvailability } from "../availabilityActions";
import { ensureWeeklyAvailabilityGenerated, WEEKDAY_LABELS } from "@/lib/availabilityPatterns";

export default async function AvailabilityPage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "artisan") redirect("/dashboard");

  // Avant d'afficher la liste, on complète l'horizon glissant des
  // créneaux générés depuis les disponibilités standard, s'il reste
  // derrière (nouvelle semaine atteinte depuis la dernière visite).
  await ensureWeeklyAvailabilityGenerated(supabase, user.id);

  const { data: weeklyPatterns } = await supabase
    .from("availability_weekly_patterns")
    .select("*")
    .eq("artisan_id", user.id)
    .order("weekday", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);

  const { data: slots } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("artisan_id", user.id)
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-ink">Mes disponibilités</h1>
      <p className="mt-1 text-sm text-gray-500">
        Ajoutez les créneaux où vous êtes disponible pour un rendez-vous visio. Les clients ne voient que ce qui est encore libre, et réservent directement, modifiez cette liste aussi souvent que besoin.
      </p>

      {searchParams?.error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{searchParams.error}</p>
      )}

      {/* Disponibilités standard : un jour de la semaine + un horaire, une
          fois pour toutes — la plateforme génère elle-même les créneaux
          réels des prochaines semaines, sans ressaisie date par date. */}
      <div className="mt-6 rounded-lg bg-white shadow-card p-4">
        <p className="text-sm font-medium">Disponibilités standard (chaque semaine)</p>
        <p className="mt-1 text-xs text-gray-500">
          Ex : tous les lundis de 18h à 20h. Générées automatiquement pour les 8 prochaines semaines.
        </p>

        {weeklyPatterns?.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {weeklyPatterns.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-2.5 text-sm">
                <span className="font-medium text-ink">
                  {WEEKDAY_LABELS[p.weekday]}, {p.start_time.slice(0, 5)} – {p.end_time.slice(0, 5)}
                </span>
                <form action={removeWeeklyAvailability}>
                  <input type="hidden" name="patternId" value={p.id} />
                  <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
                    Retirer
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={addWeeklyAvailability} className="mt-3 grid grid-cols-3 gap-2">
          <select name="weekday" required defaultValue="" className="rounded-lg border border-gray-300 p-2 text-sm">
            <option value="" disabled>Jour</option>
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={i} value={i}>{label}</option>
            ))}
          </select>
          <input type="time" name="startTime" required className="rounded-lg border border-gray-300 p-2 text-sm" />
          <input type="time" name="endTime" required className="rounded-lg border border-gray-300 p-2 text-sm" />
          <button
            type="submit"
            className="col-span-3 rounded-lg bg-forest py-2 text-sm font-bold text-white hover:opacity-90"
          >
            Ajouter cette disponibilité standard
          </button>
        </form>
      </div>

      <form action={addAvailabilitySlot} className="mt-6 flex flex-col gap-3 rounded-lg bg-white shadow-card p-4">
        <p className="text-sm font-medium">Créneau exceptionnel (une seule date)</p>
        <div className="grid grid-cols-3 gap-2">
          <input type="date" name="date" required min={today} className="rounded-lg border border-gray-300 p-2 text-sm" />
          <input type="time" name="startTime" required className="rounded-lg border border-gray-300 p-2 text-sm" />
          <input type="time" name="endTime" required className="rounded-lg border border-gray-300 p-2 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-brand py-2 text-sm font-bold text-white hover:bg-brand-dark">
          Ajouter
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        {!slots || slots.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun créneau à venir pour le moment.</p>
        ) : (
          slots.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                s.is_booked ? "border-forest-light bg-forest-light" : "border-gray-200 bg-white"
              }`}
            >
              <div>
                <p className="font-medium text-ink">
                  {new Date(s.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-gray-500">
                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                  {s.is_booked && <span className="ml-2 font-medium text-forest">Réservé</span>}
                </p>
              </div>
              {!s.is_booked && (
                <form action={removeAvailabilitySlot}>
                  <input type="hidden" name="slotId" value={s.id} />
                  <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
                    Retirer
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
