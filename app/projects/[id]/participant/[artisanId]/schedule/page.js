import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { submitParticipantMilestoneSchedule } from "../../../../actions";
import MilestoneBuilder from "@/components/MilestoneBuilder";
import SubmitButton from "@/components/SubmitButton";

// Pendant de /projects/[id]/schedule/page.js, mais pour un participant
// (artisan ajouté après le principal) plutôt que l'artisan principal du
// projet — même logique : c'est le professionnel qui remplit, pas le client.
export default async function ParticipantSchedulePage({ params, searchParams }) {
  const supabase = createClient();
  const { id, artisanId } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, currency, client:client_id ( full_name )")
    .eq("id", id)
    .single();

  if (!project) return <p className="px-4 py-12">Projet introuvable.</p>;

  const { data: participant } = await supabase
    .from("project_participants")
    .select("id, artisan_id, status, milestone_feedback_note")
    .eq("project_id", id)
    .eq("artisan_id", artisanId)
    .single();

  if (!participant || participant.artisan_id !== user.id) {
    redirect(`/projects/${id}`);
  }

  const { data: artisan } = await supabase
    .from("artisan_profiles")
    .select("trade")
    .eq("id", user.id)
    .single();

  const { data: existingMilestones } = await supabase
    .from("project_milestones")
    .select("id, title, payment_percentage, milestone_deliverables ( label, order_index )")
    .eq("project_id", id)
    .eq("artisan_id", user.id)
    .order("order_index", { ascending: true });

  const initialRows = (existingMilestones || []).map((m) => ({
    title: m.title,
    percentage: String(m.payment_percentage ?? ""),
    deliverable: (m.milestone_deliverables || [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((d) => d.label)
      .join(", "),
  }));

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-heading text-2xl font-bold">Échéancier de paiement</h1>
      <p className="mt-1 text-sm text-gray-500">
        {project.title}, demandé par {project.client?.full_name || "le client"}
      </p>

      {participant.milestone_feedback_note && (
        <div className="mt-4 rounded-lg bg-gold/40 p-4 text-sm text-ink">
          <p className="font-bold">Le client a demandé une correction :</p>
          <p className="mt-1">{participant.milestone_feedback_note}</p>
        </div>
      )}

      {searchParams?.error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{searchParams.error}</p>
      )}

      <p className="mt-4 text-sm text-gray-500">
        Remplis les étapes réelles de ta prestation, leurs pourcentages et le montant total convenu avec le client.
      </p>

      <form action={submitParticipantMilestoneSchedule} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="projectId" value={id} />
        <input type="hidden" name="participantId" value={participant.id} />

        <div>
          <label className="mb-1 block text-sm font-medium">
            Montant total convenu ({project.currency || "XOF"})
          </label>
          <input type="number" name="amount" required min="0" step="0.01" className="w-full rounded-lg border border-gray-300 p-2" />
        </div>

        <MilestoneBuilder trade={artisan?.trade} initialRows={initialRows} />

        <SubmitButton
          pendingLabel="Envoi en cours…"
          className="mt-2 rounded-lg bg-brand py-3 font-heading font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          Envoyer au client pour validation
        </SubmitButton>
      </form>
    </div>
  );
}
