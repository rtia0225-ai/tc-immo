import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { submitExecutionSchedule } from "../../actions";
import MilestoneBuilder from "@/components/MilestoneBuilder";
import SubmitButton from "@/components/SubmitButton";

// Deuxième échéancier d'un architecte en suivi de chantier : le suivi
// d'exécution / gros œuvre, distinct de ses honoraires d'architecte
// (/schedule). Rempli soit par l'architecte lui-même, soit par le chef de
// chantier qu'il a déclaré — l'argent reste payé à l'architecte dans tous
// les cas. Cf. consigne Rose du 2026-11-25.
export default async function ExecutionSchedulePage({ params, searchParams }) {
  const supabase = createClient();
  const { id } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, currency, artisan_id, architect_site_supervision, architect_site_manager_id, client:client_id ( full_name ), artisan:artisan_id ( profiles ( full_name ) )"
    )
    .eq("id", id)
    .single();

  if (!project) return <p className="px-4 py-12">Projet introuvable.</p>;

  const isArchitect = project.artisan_id === user.id;
  const isDelegatedSiteManager = project.architect_site_manager_id === user.id;
  if (!project.architect_site_supervision || (!isArchitect && !isDelegatedSiteManager)) {
    redirect(`/projects/${id}`);
  }

  const { data: existingMilestones } = await supabase
    .from("project_milestones")
    .select("id, title, payment_percentage, team_phones, milestone_deliverables ( label, order_index )")
    .eq("project_id", id)
    .eq("artisan_id", project.artisan_id)
    .eq("track", "execution")
    .order("order_index", { ascending: true });

  const initialRows = (existingMilestones || []).map((m) => ({
    title: m.title,
    percentage: String(m.payment_percentage ?? ""),
    deliverable: (m.milestone_deliverables || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((d) => d.label)
      .join(", "),
    teamPhones: (m.team_phones || []).join(", "),
  }));

  const { data: existingAmountRow } = await supabase
    .from("project_milestones")
    .select("amount, payment_percentage")
    .eq("project_id", id)
    .eq("artisan_id", project.artisan_id)
    .eq("track", "execution")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();
  const impliedTotal =
    existingAmountRow?.payment_percentage > 0
      ? Math.round((Number(existingAmountRow.amount) * 100) / Number(existingAmountRow.payment_percentage))
      : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-heading text-2xl font-bold">Échéancier d'exécution (gros œuvre)</h1>
      <p className="mt-1 text-sm text-gray-500">
        {project.title} — suivi de chantier de {project.artisan?.profiles?.full_name || "l'architecte"}
      </p>
      <p className="mt-3 text-sm text-gray-500">
        {isDelegatedSiteManager
          ? "Tu remplis cet échéancier pour le compte de l'architecte : le client le paie à l'architecte, pas à toi directement."
          : "Distinct de ton échéancier d'honoraires : décris ici les étapes réelles du chantier (gros œuvre), leurs pourcentages et le montant total convenu avec le client."}
      </p>

      {searchParams?.error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{searchParams.error}</p>
      )}

      <form action={submitExecutionSchedule} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="projectId" value={project.id} />

        <div>
          <label className="mb-1 block text-sm font-medium">
            Montant total convenu pour le gros œuvre ({project.currency || "XOF"})
          </label>
          <input
            type="number"
            name="amount"
            required
            min="0"
            step="0.01"
            defaultValue={impliedTotal}
            className="w-full rounded-lg border border-gray-300 p-2"
          />
        </div>

        <MilestoneBuilder trade={null} initialRows={initialRows} />

        <SubmitButton
          pendingLabel="Envoi en cours…"
          className="mt-2 rounded-lg bg-brand py-3 font-heading font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          Envoyer au client
        </SubmitButton>
      </form>
    </div>
  );
}
