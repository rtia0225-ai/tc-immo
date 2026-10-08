import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { approveAccount, rejectAccount } from "../actions";
import AdminNav from "@/components/AdminNav";

export default async function PendingAccountsPage() {
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

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, city, created_at")
    .eq("approval_status", "pending")
    .eq("role", "artisan")
    .order("created_at", { ascending: true });

  const { data: bookings } = await supabase
    .from("interview_bookings")
    .select("applicant_id, slot:slot_id ( date, start_time )");
  const bookingByApplicant = Object.fromEntries((bookings || []).map((b) => [b.applicant_id, b.slot]));

  const tradeById = {};
  if (pending?.length) {
    const artisanIds = pending.filter((p) => p.role === "artisan").map((p) => p.id);
    if (artisanIds.length > 0) {
      const { data: artisans } = await supabase
        .from("artisan_profiles")
        .select("id, trade")
        .in("id", artisanIds);
      (artisans || []).forEach((a) => (tradeById[a.id] = a.trade));
    }
  }

  return (
    <div>
      <AdminNav current="/admin/pending" />
      <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-ink">
        Professionnels en attente ({pending?.length || 0})
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Seuls les comptes professionnels (artisans) nécessitent une validation. Les clients accèdent directement à leur espace.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {(!pending || pending.length === 0) && (
          <p className="text-sm text-gray-500">Rien en attente pour le moment.</p>
        )}
        {pending?.map((p) => (
          <div key={p.id} className="rounded-lg bg-white shadow-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink">{p.full_name}</p>
                <p className="text-xs text-gray-500">
                  {p.role === "artisan" ? "Artisan" : "Client"} · {p.city || "Ville non renseignée"} · {p.phone || "—"}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Inscrit le {new Date(p.created_at).toLocaleDateString("fr-FR")}
                </p>
                {p.role === "artisan" && tradeById[p.id] !== "Maçonnerie" && (
                  bookingByApplicant[p.id] ? (
                    <p className="mt-1 text-xs font-medium text-forest">
                      Entretien réservé le {new Date(bookingByApplicant[p.id].date).toLocaleDateString("fr-FR")} à {bookingByApplicant[p.id].start_time.slice(0, 5)}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-brand">Entretien pas encore réservé</p>
                  )
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={rejectAccount}>
                  <input type="hidden" name="userId" value={p.id} />
                  <button type="submit" className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200">
                    Refuser
                  </button>
                </form>
                <form action={approveAccount}>
                  <input type="hidden" name="userId" value={p.id} />
                  <button type="submit" className="rounded-md bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-dark">
                    Approuver
                  </button>
                </form>
              </div>
            </div>
            {p.role === "artisan" && (
              <a
                href={`/admin/artisans/${p.id}`}
                className="mt-2 inline-block text-xs font-medium text-brand hover:underline"
              >
                Voir sa fiche complète →
              </a>
            )}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
