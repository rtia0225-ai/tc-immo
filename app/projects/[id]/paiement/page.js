import { createClient } from "@/lib/supabase/server";
import ProjectTimeline from "@/components/ProjectTimeline";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProjectPaymentPage({ params }) {
  const supabase = createClient();
  const { id } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isArtisan = profile?.role === "artisan";

  const { data: project } = await supabase
    .from("projects")
    .select("*, artisan:artisan_id ( trade, profiles ( full_name ) )")
    .eq("id", id)
    .single();

  if (!project) return <p className="px-4 py-12">Projet introuvable.</p>;

  const { data: participants } = await supabase
    .from("project_participants")
    .select("id, artisan_id, amount, description, currency, artisan:artisan_id ( trade, profiles ( full_name ) )")
    .eq("project_id", id);

  const artisansOnProject = [
    {
      artisanId: project.artisan_id,
      isPrimary: true,
      trade: project.artisan?.trade,
      fullName: project.artisan?.profiles?.full_name,
      amount: project.amount,
      currency: project.currency,
      description: project.description,
    },
    ...(participants || []).map((p) => ({
      artisanId: p.artisan_id,
      isPrimary: false,
      trade: p.artisan?.trade,
      fullName: p.artisan?.profiles?.full_name,
      amount: p.amount,
      currency: p.currency,
      description: p.description,
    })),
  ];
  const artisanIds = artisansOnProject.map((a) => a.artisanId);

  const { data: allMilestones } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", id)
    .in("artisan_id", artisanIds)
    .order("order_index", { ascending: true });

  const { data: allContracts } = await supabase
    .from("contracts")
    .select("artisan_id, client_signed_at, artisan_signed_at")
    .eq("project_id", id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-brand">
        ← Retour au projet
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-ink">Paiement du projet</h1>
      <p className="mt-1 text-sm text-gray-600">{project.title}</p>

      <div className="mt-6 flex flex-col gap-4">
        {artisansOnProject.map((a) => {
          const contract = allContracts?.find((c) => c.artisan_id === a.artisanId);
          const contractSigned = !!contract?.client_signed_at && !!contract?.artisan_signed_at;
          const artisanMilestones = (allMilestones || []).filter((m) => m.artisan_id === a.artisanId);

          return (
            <div key={a.artisanId} className="rounded-lg bg-white shadow-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-bold">{a.fullName}, {a.trade}</p>
                  {a.description && <p className="mt-0.5 text-sm text-gray-500">{a.description}</p>}
                  <p className="mt-0.5 text-sm font-medium text-gray-700">
                    {a.amount} {a.currency}
                  </p>
                </div>
                <Link
                  href={`/projects/${id}/contract/${a.artisanId}`}
                  className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold ${
                    contractSigned ? "bg-forest-light text-forest" : "bg-brand text-white"
                  }`}
                >
                  {contractSigned ? "Contrat signé" : "Signer le contrat"}
                </Link>
              </div>

              <div className="mt-4">
                <ProjectTimeline
                  projectId={id}
                  milestones={artisanMilestones}
                  isArtisan={isArtisan && user.id === a.artisanId}
                  currency={a.currency}
                  trade={a.trade}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
