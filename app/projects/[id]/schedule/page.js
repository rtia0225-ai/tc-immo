import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { submitMilestoneSchedule } from "../../actions";
import MilestoneBuilder from "@/components/MilestoneBuilder";

// L'artisan principal remplit (ou corrige) l'échéancier de paiement de ce
// projet : étapes, pourcentages, montant total. Pré-rempli avec l'exemple
// par défaut de son métier (MilestoneBuilder), ou avec sa précédente
// proposition si le client a demandé une correction.
export default async function ProjectSchedulePage({ params, searchParams }) {
  const supabase = createClient();
  const { id } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id, artisan_id, status, currency, milestone_feedback_note, client:client_id ( full_name )")
    .eq("id", id)
    .single();

  if (!project) return <p className="px-4 py-12">Projet introuvable.</p>;

  if (project.artisan_id !== user.id) {
    redirect(`/projects/${id}`);
  }

  const { data: artisan } = await supabase
    .from("artisan_profiles")
    .select("trade")
    .eq("id", user.id)
    .single();

  // Si une proposition existe déjà (corrige après une demande du client),
  // on repart de ce qui a été rempli la dernière fois, pas de l'exemple.
  const { data: existingMilestones } = await supabase
    .from("project_milestones")
    .select("title, payment_percentage")
    .eq("project_id", id)
    .eq("artisan_id", user.id)
    .order("order_index", { ascending: true });

  const initialRows = (existingMilestones || []).map((m) => ({ title: m.title, percentage: String(m.payment_percentage ?? "") }));

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-heading text-2xl font-bold">Échéancier de paiement</h1>
      <p className="mt-1 text-sm text-gray-500">
        {project.title} — demandé par {project.client?.full_name || "le client"}
      </p>

      {project.milestone_feedback_note && (
        <div className="mt-4 rounded-lg bg-gold/40 p-4 text-sm text-ink">
          <p className="font-bold">Le client a demandé une correction :</p>
          <p className="mt-1">{project.milestone_feedback_note}</p>
        </div>
      )}

      {searchParams?.error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{searchParams.error}</p>
      )}

      <p className="mt-4 text-sm text-gray-500">
        Remplis les étapes réelles de ta prestation, leurs pourcentages et le montant total convenu avec le client. C'est ce qui sera visible dans le contrat.
      </p>

      <form action={submitMilestoneSchedule} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="projectId" value={project.id} />

        <div>
          <label className="mb-1 block text-sm font-medium">
            Montant total convenu ({project.currency || "XOF"})
          </label>
          <input
            type="number"
            name="amount"
            required
            min="0"
            step="0.01"
            defaultValue={project.amount > 0 ? project.amount : undefined}
            className="w-full rounded-lg border border-gray-300 p-2"
          />
        </div>

        <MilestoneBuilder trade={artisan?.trade} initialRows={initialRows} />

        <button
          type="submit"
          className="mt-2 rounded-lg bg-brand py-3 font-heading font-bold text-white hover:bg-brand-dark"
        >
          Envoyer au client pour validation
        </button>
      </form>
    </div>
  );
}
