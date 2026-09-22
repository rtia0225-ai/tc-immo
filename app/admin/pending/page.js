import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { approveAccount, rejectAccount } from "../actions";

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
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-ink">
        Inscriptions en attente ({pending?.length || 0})
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Client comme artisan — tant que le compte n'est validé, la personne n'a pas accès à son espace.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {(!pending || pending.length === 0) && (
          <p className="text-sm text-gray-500">Rien en attente pour le moment.</p>
        )}
        {pending?.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink">{p.full_name}</p>
                <p className="text-xs text-gray-500">
                  {p.role === "artisan" ? "Artisan" : "Client"} · {p.city || "Ville non renseignée"} · {p.phone || "—"}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Inscrit le {new Date(p.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={rejectAccount}>
                  <input type="hidden" name="userId" value={p.id} />
                  <button type="submit" className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50">
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
  );
}
