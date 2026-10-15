import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { updateMilestoneEducationContent } from "./actions";

export default async function MilestoneContentPage({ searchParams }) {
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

  const { data: phases } = await supabase
    .from("milestone_education_content")
    .select("*")
    .order("phase_title", { ascending: true });

  return (
    <div>
      <AdminNav current="/admin/milestone-content" />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-heading text-2xl font-bold text-ink">Contenu pédagogique par étape</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pour chaque phase du chantier, la vidéo et le PDF renseignés ici s'affichent automatiquement sur tous les projets qui ont une étape de ce nom.
        </p>

        {searchParams?.success && (
          <p className="mt-4 rounded-lg bg-forest-light p-3 text-sm font-medium text-forest">Enregistré.</p>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {phases?.map((p) => (
            <details key={p.id} className="rounded-lg bg-white shadow-card p-4" open={!p.video_url && !p.pdf_url}>
              <summary className="cursor-pointer font-heading font-bold text-ink">
                {p.phase_title}
                {!p.video_url && !p.pdf_url && (
                  <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">À compléter</span>
                )}
              </summary>
              <form action={updateMilestoneEducationContent} className="mt-4 flex flex-col gap-3">
                <input type="hidden" name="phaseTitle" value={p.phase_title} />
                <div>
                  <label className="text-xs font-semibold text-gray-500">Résumé (ce qui se passe à cette étape)</label>
                  <textarea
                    name="summary"
                    defaultValue={p.summary || ""}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Lien vidéo (YouTube/Vimeo non répertorié)</label>
                  <input
                    name="videoUrl"
                    type="url"
                    defaultValue={p.video_url || ""}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Lien du PDF</label>
                  <input
                    name="pdfUrl"
                    type="url"
                    defaultValue={p.pdf_url || ""}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Questions à poser au technicien (une par ligne)</label>
                  <textarea
                    name="questionsToAsk"
                    defaultValue={p.questions_to_ask || ""}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm"
                  />
                </div>
                <button type="submit" className="w-fit rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">
                  Enregistrer
                </button>
              </form>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
