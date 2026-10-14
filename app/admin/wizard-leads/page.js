import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";

// Récapitule, pour chaque jeu de réponses possible, ce que la personne a
// indiqué dans le simulateur "Trouver ma démarche" (page d'accueil).
function describeAnswers(answers) {
  if (!answers || Object.keys(answers).length === 0) return "—";
  const parts = [];
  if (answers.loti === "non") {
    parts.push("terrain non loti");
  } else {
    if (answers.titre === "provisoire") parts.push("titre provisoire");
    if (answers.titre === "permanent") parts.push("titre permanent");
    if (answers.cu === "non") parts.push("sans CU");
    if (answers.cu === "oui") parts.push("CU obtenu");
    if (answers.construction === "simple") parts.push("maison simple");
    if (answers.construction === "grand") parts.push("grand bâtiment");
  }
  return parts.join(", ") || "—";
}

export default async function WizardLeadsPage() {
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

  const { data: leads } = await supabase
    .from("wizard_report_leads")
    .select("id, email, answers, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div>
      <AdminNav current="/admin/wizard-leads" />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-heading text-2xl font-bold text-ink">Rapport simulateur — e-mails collectés</h1>
        <p className="mt-1 text-sm text-gray-500">
          Personnes ayant demandé le rapport détaillé depuis le simulateur "Trouver ma démarche" sur la page d'accueil.
        </p>

        <div className="mt-6 rounded-lg bg-brand p-4 text-white shadow-card inline-block">
          <p className="text-2xl font-heading font-bold">{leads?.length || 0}</p>
          <p className="text-xs text-brand-light">Demandes de rapport</p>
        </div>

        <div className="mt-6 overflow-x-auto rounded-lg bg-white shadow-card">
          {!leads || leads.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">Aucune demande pour le moment.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Situation renseignée</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium text-ink">{l.email}</td>
                    <td className="px-4 py-3 text-gray-600">{describeAnswers(l.answers)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(l.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
