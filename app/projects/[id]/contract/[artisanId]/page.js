import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signContract } from "../../../actions";
import Link from "next/link";

export default async function ContractPage({ params, searchParams }) {
  const supabase = createClient();
  const { id, artisanId } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id, artisan_id")
    .eq("id", id)
    .single();

  if (!project) return <p className="px-4 py-12">Projet introuvable.</p>;

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  const isAdmin = !!profile?.is_admin;
  const isClient = user.id === project.client_id;
  const isThisArtisan = user.id === artisanId;

  // Le contrat (contenu, montant, signatures) d'un professionnel ne
  // regarde que le client, l'admin, et ce professionnel lui-même — pas
  // les autres professionnels du projet.
  if (!isClient && !isThisArtisan && !isAdmin) {
    return <p className="px-4 py-12">Tu n'as pas accès à ce contrat.</p>;
  }

  const { data: artisan } = await supabase
    .from("artisan_profiles")
    .select("trade, profiles ( full_name )")
    .eq("id", artisanId)
    .single();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("project_id", id)
    .eq("artisan_id", artisanId)
    .single();

  if (!contract) return <p className="px-4 py-12">Contrat introuvable pour cet artisan.</p>;
  const hasSigned = isClient ? !!contract.client_signed_at : !!contract.artisan_signed_at;
  const bothSigned = !!contract.client_signed_at && !!contract.artisan_signed_at;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-heading text-2xl font-bold">Contrat, {project.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        Avec {artisan?.profiles?.full_name} ({artisan?.trade})
      </p>

      {bothSigned ? (
        <p className="mt-3 rounded-lg bg-forest-light p-3 text-sm text-forest">
          Contrat signé par les deux parties. Les travaux peuvent démarrer.
        </p>
      ) : contract.client_signed_at ? (
        <p className="mt-3 rounded-lg bg-brand-light p-3 text-sm text-brand-dark">
          Le client a signé — en attente de la signature de l'artisan.
        </p>
      ) : (
        <p className="mt-3 rounded-lg bg-brand-light p-3 text-sm text-brand-dark">
          Le client doit signer en premier, puis l'artisan, avant le démarrage des travaux.
        </p>
      )}

      {searchParams?.error && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{searchParams.error}</p>
      )}

      <div className="mt-6 whitespace-pre-line rounded-lg bg-white shadow-card p-6 text-sm leading-relaxed text-ink">
        {contract.content}
      </div>

      <div className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-white shadow-card p-4">
          <p className="font-medium">Client</p>
          <p className="mt-1 text-gray-500">
            {contract.client_signed_at
              ? `Signé le ${new Date(contract.client_signed_at).toLocaleString("fr-FR")}`
              : "Pas encore signé"}
          </p>
        </div>
        <div className="rounded-lg bg-white shadow-card p-4">
          <p className="font-medium">Artisan</p>
          <p className="mt-1 text-gray-500">
            {contract.artisan_signed_at
              ? `Signé le ${new Date(contract.artisan_signed_at).toLocaleString("fr-FR")}`
              : "Pas encore signé"}
          </p>
        </div>
      </div>

      {!hasSigned && isThisArtisan && !contract.client_signed_at ? (
        <p className="mt-6 text-sm text-gray-400">En attente de la signature du client avant de pouvoir signer.</p>
      ) : !hasSigned && (isClient || isThisArtisan) && (
        <form action={signContract} className="mt-6">
          <input type="hidden" name="contractId" value={contract.id} />
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="artisanId" value={artisanId} />
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" required className="mt-1" />
            Je confirme avoir lu et j'accepte les termes de ce contrat.
          </label>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand px-6 py-3 font-heading font-bold text-white hover:bg-brand-dark"
          >
            Signer le contrat
          </button>
        </form>
      )}

      <Link href={`/projects/${project.id}`} className="mt-6 inline-block text-sm text-brand hover:underline">
        ← Retour au projet
      </Link>
    </div>
  );
}
