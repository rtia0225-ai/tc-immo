import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { approveDeliverable, rejectDeliverable } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function AdminDocumentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: myProfile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!myProfile?.is_admin) redirect("/dashboard");

  const { data: pending } = await supabase
    .from("deliverable_files")
    .select(
      "id, document_url, review_note, reviewed_at, deliverable:deliverable_id ( label, milestone:milestone_id ( title, project_id, project:project_id ( title, client:client_id ( full_name ) ), artisan:artisan_id ( trade, profiles ( full_name ) ) ) )"
    )
    .eq("review_status", "needs_manual_review")
    .order("reviewed_at", { ascending: true });

  const withUrls = await Promise.all(
    (pending || []).map(async (d) => {
      const { data } = await supabase.storage
        .from("project-deliverables")
        .createSignedUrl(d.document_url, 3600);
      return { ...d, signedUrl: data?.signedUrl || null };
    })
  );

  return (
    <div>
      <AdminNav current="/admin/documents" />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-heading text-2xl font-bold text-ink">
          Documents à vérifier ({withUrls.length})
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          La vérification automatique n'était pas sûre pour ces documents (fichier douteux, format non reconnu, ou erreur technique). Tant que rien n'est tranché ici, le client ne les voit pas et le paiement reste bloqué.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {withUrls.length === 0 && <p className="text-sm text-gray-500">Rien en attente pour le moment.</p>}
          {withUrls.map((d) => (
            <div key={d.id} className="rounded-lg bg-white shadow-card p-4">
              <p className="text-sm font-bold text-ink">{d.deliverable?.label} <span className="font-normal text-gray-400">({d.deliverable?.milestone?.title})</span></p>
              <p className="text-xs text-gray-500">
                {d.deliverable?.milestone?.project?.title} : {d.deliverable?.milestone?.artisan?.profiles?.full_name} ({d.deliverable?.milestone?.artisan?.trade}), client : {d.deliverable?.milestone?.project?.client?.full_name}
              </p>
              {d.review_note && (
                <p className="mt-1 text-xs italic text-gray-400">Raison de l'IA : {d.review_note}</p>
              )}
              {d.signedUrl && (
                <a href={d.signedUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-brand underline">
                  📎 Voir le document
                </a>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <form action={approveDeliverable}>
                  <input type="hidden" name="fileId" value={d.id} />
                  <SubmitButton className="rounded-md bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-dark" pendingLabel="...">
                    Approuver
                  </SubmitButton>
                </form>
                <form action={rejectDeliverable} className="flex items-center gap-2">
                  <input type="hidden" name="fileId" value={d.id} />
                  <input
                    type="text"
                    name="reason"
                    placeholder="Raison (optionnel)"
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                  />
                  <SubmitButton className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200" pendingLabel="...">
                    Refuser
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
