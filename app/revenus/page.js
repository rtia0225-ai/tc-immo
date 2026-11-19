import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RevenusPage() {
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

  if (profile?.role !== "artisan") {
    redirect("/dashboard");
  }

  // Par les vraies étapes payées à CET artisan, pas par le statut global
  // du projet : un artisan ajouté comme participant (architecte,
  // ingénieur, chef de chantier...) n'est jamais le "artisan_id" du
  // projet lui-même, donc filtrer sur le projet le faisait disparaître
  // entièrement de cette page, même une fois payé.
  const { data: rawMilestones } = await supabase
    .from("project_milestones")
    .select("id, title, amount, is_completed, paid_at, project:project_id ( id, title, currency )")
    .eq("artisan_id", user.id)
    .order("created_at", { ascending: true });

  // Si une de mes étapes a été répartie avec d'autres professionnels (ex:
  // mes maçons), ce qui me revient réellement n'est pas le montant total
  // de l'étape mais ce qu'il en reste après leurs parts — leurs parts
  // apparaissent, elles, directement dans LEUR propre page Revenus (ce
  // sont des project_milestones à part entière, à leur nom).
  const myMilestoneIds = (rawMilestones || []).map((m) => m.id);
  const splitTotalByParent = {};
  if (myMilestoneIds.length > 0) {
    const { data: mySplits } = await supabase
      .from("project_milestones")
      .select("parent_milestone_id, amount")
      .in("parent_milestone_id", myMilestoneIds);
    (mySplits || []).forEach((s) => {
      splitTotalByParent[s.parent_milestone_id] = (splitTotalByParent[s.parent_milestone_id] || 0) + Number(s.amount || 0);
    });
  }

  const milestones = (rawMilestones || []).map((m) => {
    const reversed = splitTotalByParent[m.id] || 0;
    return {
      ...m,
      grossAmount: m.amount,
      amount: Number(m.amount || 0) - reversed,
      reversedToTeam: reversed,
    };
  });

  const paid = (milestones || []).filter((m) => m.paid_at);
  const awaitingTransfer = (milestones || []).filter((m) => m.is_completed && !m.paid_at);
  const upcoming = (milestones || []).filter((m) => !m.is_completed);

  const sum = (list) => list.reduce((s, m) => s + Number(m.amount || 0), 0);
  const totalPaid = sum(paid);
  const totalAwaitingTransfer = sum(awaitingTransfer);
  const totalUpcoming = sum(upcoming);
  const currency = milestones?.[0]?.project?.currency || "XOF";

  // Regroupées par projet pour le détail, dans l'ordre où elles ont été créées.
  const byProject = new Map();
  for (const m of milestones || []) {
    const key = m.project?.id || "sans-projet";
    if (!byProject.has(key)) byProject.set(key, { title: m.project?.title || "Projet", items: [] });
    byProject.get(key).items.push(m);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-brand-dark">Mes revenus</h1>
      <p className="mb-6 text-sm text-gray-500">
        Chaque étape apparaît ici dès que le client confirme le virement (en test, en attendant le prestataire de paiement).
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white shadow-card p-5">
          <p className="text-sm text-gray-500">Total perçu</p>
          <p className="text-2xl font-bold text-forest">
            {totalPaid.toLocaleString("fr-FR")} {currency}
          </p>
        </div>
        <div className="rounded-lg bg-white shadow-card p-5">
          <p className="text-sm text-gray-500">En attente du virement client</p>
          <p className="text-2xl font-bold text-gold">
            {totalAwaitingTransfer.toLocaleString("fr-FR")} {currency}
          </p>
        </div>
        <div className="rounded-lg bg-white shadow-card p-5">
          <p className="text-sm text-gray-500">À venir (étapes pas encore terminées)</p>
          <p className="text-2xl font-bold text-gray-500">
            {totalUpcoming.toLocaleString("fr-FR")} {currency}
          </p>
        </div>
      </div>

      <h2 className="mb-3 font-semibold">Détail par projet</h2>
      {!milestones || milestones.length === 0 ? (
        <p className="text-gray-600">Aucune étape pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...byProject.values()].map((group, gi) => (
            <div key={gi} className="rounded-lg bg-white shadow-card p-4">
              <p className="mb-2 font-semibold text-ink">{group.title}</p>
              <div className="flex flex-col gap-1.5">
                {group.items.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {m.title}
                      {m.reversedToTeam > 0 && (
                        <span className="ml-1 text-[11px] text-gray-400">
                          (dont {m.reversedToTeam.toLocaleString("fr-FR")} {currency} reversés à ton équipe)
                        </span>
                      )}
                    </span>
                    <span className="text-xs">
                      <span className="text-gray-500">
                        {Number(m.amount || 0).toLocaleString("fr-FR")} {currency}
                      </span>{" "}
                      <span
                        className={
                          m.paid_at ? "font-semibold text-forest" : m.is_completed ? "font-semibold text-gold" : "text-gray-400"
                        }
                      >
                        {m.paid_at ? "Payé" : m.is_completed ? "En attente du virement" : "À venir"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
