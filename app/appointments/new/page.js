import { bookAvailabilitySlot } from "@/app/dashboard/availabilityActions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewAppointmentPage({ searchParams }) {
  const artisanId = searchParams?.artisan;
  const projectId = searchParams?.project;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const currentPath = `/appointments/new?artisan=${artisanId}${projectId ? `&project=${projectId}` : ""}`;
    redirect(`/auth/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  if (user.id === artisanId) {
    redirect(`/artisans/${artisanId}`);
  }

  const { data: artisan } = await supabase
    .from("artisan_profiles")
    .select("id, trade, profiles ( full_name )")
    .eq("id", artisanId)
    .single();

  const today = new Date().toISOString().slice(0, 10);

  const { data: slots } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("artisan_id", artisanId)
    .eq("is_booked", false)
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  // Regroupe les créneaux par jour, pour un affichage type calendrier
  const slotsByDate = (slots || []).reduce((acc, s) => {
    acc[s.date] = acc[s.date] || [];
    acc[s.date].push(s);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-1 font-heading text-2xl font-bold text-brand-dark">
        Prendre rendez-vous
      </h1>
      {artisan && (
        <p className="mb-6 text-gray-600">
          avec {artisan.profiles?.full_name} ({artisan.trade})
        </p>
      )}

      {searchParams?.error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {searchParams.error}
        </p>
      )}

      {Object.keys(slotsByDate).length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
          Aucun créneau disponible pour le moment — réessaie un peu plus tard.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(slotsByDate).map(([date, daySlots]) => (
            <div key={date}>
              <p className="mb-2 text-sm font-bold text-ink">
                {new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {daySlots.map((s) => (
                  <form key={s.id} action={bookAvailabilitySlot}>
                    <input type="hidden" name="slotId" value={s.id} />
                    <input type="hidden" name="artisanId" value={artisanId} />
                    {projectId && <input type="hidden" name="projectId" value={projectId} />}
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-ink hover:border-brand hover:bg-brand-light"
                    >
                      {s.start_time.slice(0, 5)}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Un clic confirme directement le rendez-vous. Vous pourrez toujours proposer un autre moment ensuite si besoin, depuis "Mes rendez-vous".
      </p>
    </div>
  );
}
