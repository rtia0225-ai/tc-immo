import { createClient } from "@/lib/supabase/server";
import ProjectActivityLog from "@/components/ProjectActivityLog";
import ProjectJourney from "@/components/ProjectJourney";
import { advanceProjectStatus, removeParticipant } from "../actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { translateStatus } from "@/lib/statusLabels";

export default async function ProjectPage({ params, searchParams }) {
  const supabase = createClient();
  const { id } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();
  const isArtisan = profile?.role === "artisan";
  const isAdmin = !!profile?.is_admin;

  const { data: project } = await supabase
    .from("projects")
    .select("*, artisan:artisan_id ( trade, profiles ( full_name, avatar_url ) )")
    .eq("id", id)
    .single();

  if (!project) return <p>Projet introuvable.</p>;

  const { data: progressReports } = await supabase
    .from("technician_progress_reports")
    .select("*, technician:technician_id ( full_name ), technician_report_media ( media_url, media_type )")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const { data: additionRequests } = await supabase
    .from("project_addition_requests")
    .select("*, requester:requested_by ( full_name )")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const { data: projectAppointments } = await supabase
    .from("appointments")
    .select("*, artisan:artisan_id ( profiles ( full_name ) )")
    .eq("project_id", id)
    .order("scheduled_at", { ascending: false });

  const { data: participants } = await supabase
    .from("project_participants")
    .select("id, artisan_id, amount, description, currency, artisan:artisan_id ( trade, profiles ( full_name, avatar_url ) )")
    .eq("project_id", id);

  // Tous les artisans du projet : le principal + chaque participant,
  // chacun avec sa propre prestation, son propre échéancier, son propre contrat.
  const artisansOnProject = [
    {
      artisanId: project.artisan_id,
      isPrimary: true,
      trade: project.artisan?.trade,
      fullName: project.artisan?.profiles?.full_name,
      avatarUrl: project.artisan?.profiles?.avatar_url,
      amount: project.amount,
      currency: project.currency,
      description: project.description,
    },
    ...(participants || []).map((p) => ({
      artisanId: p.artisan_id,
      isPrimary: false,
      participantId: p.id,
      trade: p.artisan?.trade,
      fullName: p.artisan?.profiles?.full_name,
      avatarUrl: p.artisan?.profiles?.avatar_url,
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

  // Liens signés temporaires pour les documents livrés (Permis/ACD),
  // le bucket est privé.
  const milestonesWithDeliverables = await Promise.all(
    (allMilestones || []).map(async (m) => {
      if (!m.deliverable_document_url) return m;
      const { data } = await supabase.storage
        .from("project-deliverables")
        .createSignedUrl(m.deliverable_document_url, 3600);
      return { ...m, deliverableSignedUrl: data?.signedUrl || null };
    })
  );

  const { data: allContracts } = await supabase
    .from("contracts")
    .select("artisan_id, client_signed_at, artisan_signed_at")
    .eq("project_id", id)
    .in("artisan_id", artisanIds);

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", id)
    .maybeSingle();

  const isClient = project.client_id === user.id;

  const { data: educationRows } = await supabase
    .from("milestone_education_content")
    .select("phase_title, summary, video_url, pdf_url, questions_to_ask");
  const educationByTitle = Object.fromEntries((educationRows || []).map((r) => [r.phase_title, r]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-brand-dark">
        {project.title}
      </h1>
      <p className="mb-6 text-gray-600">{project.description}</p>

      {searchParams?.error && (
        <div className="mb-6 rounded-lg bg-gold p-4 text-sm font-medium text-ink shadow-card">
          {searchParams.error}
        </div>
      )}

      {(project.terrain_location || project.terrain_reference_number || project.terrain_document_type || project.terrain_area || project.terrain_notes || project.terrain_latitude) && (
        <div className="mb-6 rounded-lg bg-white shadow-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
            Informations sur le terrain
          </p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {project.terrain_location && (
              <div className="col-span-2">
                <dt className="text-gray-400">Localisation</dt>
                <dd className="text-ink">{project.terrain_location}</dd>
              </div>
            )}
            {project.terrain_latitude && project.terrain_longitude && (
              <div className="col-span-2">
                <dt className="text-gray-400">Position GPS</dt>
                <dd>
                  <a
                    href={`https://www.google.com/maps?q=${project.terrain_latitude},${project.terrain_longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand hover:underline"
                  >
                    Voir sur la carte
                  </a>
                </dd>
              </div>
            )}
            {project.terrain_document_type && (
              <div>
                <dt className="text-gray-400">Document foncier</dt>
                <dd className="text-ink">{project.terrain_document_type}</dd>
              </div>
            )}
            {project.terrain_reference_number && (
              <div>
                <dt className="text-gray-400">N° de référence</dt>
                <dd className="text-ink">{project.terrain_reference_number}</dd>
              </div>
            )}
            {project.terrain_area && (
              <div>
                <dt className="text-gray-400">Superficie</dt>
                <dd className="text-ink">{project.terrain_area}</dd>
              </div>
            )}
            {project.terrain_notes && (
              <div className="col-span-2">
                <dt className="text-gray-400">Notes</dt>
                <dd className="text-ink">{project.terrain_notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Participants au projet */}
      <div className="mb-6 rounded-lg bg-white shadow-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Participants</h2>
          {!isArtisan && (
            <Link
              href={`/projects/${project.id}/add-participant`}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark"
              aria-label="Ajouter un participant"
            >
              +
            </Link>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {artisansOnProject.map((a) => (
            <div key={a.artisanId} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {a.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-xs font-bold text-gray-300">
                    {a.fullName?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{a.fullName}</p>
                  <p className="text-xs text-gray-500">{a.trade}{a.isPrimary ? " · Principal" : ""}</p>
                </div>
              </div>
              {!isArtisan && !a.isPrimary && (
                <form action={removeParticipant}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="participantId" value={a.participantId} />
                  <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
                    Retirer
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Le parcours du projet : un seul chemin par prestataire, tout
          visible en permanence (contrat, étapes, paiements, rendez-vous
          de validation, documents et contenu pédagogique réunis). */}
      <div className="mb-6 flex flex-col gap-4">
        {artisansOnProject.map((a) => {
          const contract = allContracts?.find((c) => c.artisan_id === a.artisanId);
          const contractSignedAt =
            contract?.client_signed_at && contract?.artisan_signed_at
              ? [contract.client_signed_at, contract.artisan_signed_at].sort().pop()
              : null;
          const artisanMilestones = (milestonesWithDeliverables || []).filter((m) => m.artisan_id === a.artisanId);
          const artisanAppointments = (projectAppointments || []).filter((ap) => ap.artisan_id === a.artisanId);

          return (
            <ProjectJourney
              key={a.artisanId}
              projectId={project.id}
              artisanId={a.artisanId}
              artisanName={a.fullName}
              trade={a.trade}
              totalAmount={a.amount}
              currency={a.currency}
              contractSignedAt={contractSignedAt}
              contractHref={`/projects/${project.id}/contract/${a.artisanId}`}
              milestones={artisanMilestones}
              appointments={artisanAppointments}
              educationByTitle={educationByTitle}
              isArtisan={isArtisan && user.id === a.artisanId}
              isClient={isClient}
            />
          );
        })}
      </div>

      {/* Mises à jour libres : rapports photo du technicien, demandes
          d'ajout à valider. Pas une deuxième chronologie des étapes — ce
          qui se passe sur chaque étape vit désormais dans le parcours
          ci-dessus. */}
      <div className="mb-6">
        <ProjectActivityLog
          projectId={project.id}
          progressReports={progressReports}
          additionRequests={additionRequests}
          isArtisan={isArtisan}
          isAdmin={isAdmin}
        />
      </div>

      {/* Statut global du projet */}
      <div className="mb-6 rounded-lg bg-white shadow-card p-5">
        <h2 className="mb-3 font-semibold">Avancement global</h2>
        <p className="text-sm text-gray-600">Statut : {translateStatus(project.status)}</p>
        {(() => {
          const NEXT_STATUS = {
            draft: "awaiting_payment",
            awaiting_payment: "funded",
            funded: "in_progress",
            in_progress: "completed",
            completed: "released",
          };
          const nextStatus = NEXT_STATUS[project.status];
          if (!nextStatus) return null;
          return (
            <form action={advanceProjectStatus} className="mt-3">
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="newStatus" value={nextStatus} />
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Faire avancer le statut → {translateStatus(nextStatus)}
              </button>
            </form>
          );
        })()}
      </div>

      {/* Raccourci restant : la messagerie n'est pas liée à une étape précise */}
      <Link
        href={conversation ? `/messages/${conversation.id}` : "/messages"}
        className="block rounded-lg bg-brand p-4 text-white shadow-card transition hover:bg-brand-dark"
      >
        <p className="font-medium">Ma messagerie</p>
        <p className="text-sm text-brand-light">
          Fil de discussion sur ce projet
        </p>
      </Link>
    </div>
  );
}
