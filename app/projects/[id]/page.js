import { createClient } from "@/lib/supabase/server";
import ProjectActivityLog from "@/components/ProjectActivityLog";
import ProjectRoadmap from "@/components/ProjectRoadmap";
import { removeParticipant, advanceProjectStatus } from "../actions";
import Link from "next/link";
import { redirect } from "next/navigation";

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
  // le bucket est privé. Le client ne voit le document que si la
  // vérification (automatique ou admin) l'a approuvé — tant que c'est
  // "en attente", seuls l'artisan qui l'a déposé et les admins y ont
  // accès (lib/documentReview.js).
  const milestonesWithDeliverables = await Promise.all(
    (allMilestones || []).map(async (m) => {
      if (!m.deliverable_document_url) return m;
      const canSeeDeliverable = isAdmin || isArtisan || m.deliverable_review_status === "approved";
      if (!canSeeDeliverable) return { ...m, deliverableSignedUrl: null };
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

      {/* Le parcours du projet : un seul fil horizontal, un arrêt par
          intervenant (architecte, ingénieur, technicien, chef de
          chantier...), dans l'ordre réel du chantier. On clique sur un
          arrêt pour voir son détail (contrat, étapes, paiements,
          rendez-vous, documents) ; les autres restent visibles mais
          réduits à leur nom, pour qu'on voie le chemin complet sans être
          noyé sous le détail de tout le monde à la fois. */}
      <div className="mb-6 rounded-lg bg-white shadow-card p-4">
        <ProjectRoadmap
          artisans={artisansOnProject.map((a) => {
            const contract = allContracts?.find((c) => c.artisan_id === a.artisanId);
            const contractSignedAt =
              contract?.client_signed_at && contract?.artisan_signed_at
                ? [contract.client_signed_at, contract.artisan_signed_at].sort().pop()
                : null;
            const artisanMilestones = (milestonesWithDeliverables || []).filter((m) => m.artisan_id === a.artisanId);
            const artisanAppointments = (projectAppointments || []).filter((ap) => ap.artisan_id === a.artisanId);
            const artisanAdditionRequests = (additionRequests || []).filter((r) => r.artisan_id === a.artisanId);

            return {
              artisanId: a.artisanId,
              trade: a.trade,
              contractSignedAt,
              milestones: artisanMilestones,
              journeyProps: {
                projectId: project.id,
                artisanId: a.artisanId,
                artisanName: a.fullName,
                trade: a.trade,
                totalAmount: a.amount,
                currency: a.currency,
                contractSignedAt,
                contractHref: `/projects/${project.id}/contract/${a.artisanId}`,
                milestones: artisanMilestones,
                appointments: artisanAppointments,
                additionRequests: artisanAdditionRequests,
                educationByTitle,
                isArtisan: isArtisan && user.id === a.artisanId,
                isClient,
              },
            };
          })}
          defaultOpenArtisanId={isArtisan ? user.id : undefined}
        />
      </div>

      {/* Rapports d'avancement libres (photos/vidéos) envoyés par le
          technicien — les ajouts imprévus (paiement, document, autre) se
          font désormais directement sur la ligne du parcours ci-dessus,
          au "+" entre deux étapes. */}
      <div className="mb-6">
        <ProjectActivityLog
          projectId={project.id}
          progressReports={progressReports}
          isArtisan={isArtisan}
        />
      </div>

      {/* Raccourcis : messagerie, rendez-vous, documents, paiement — une
          seule ligne compacte avec icône + libellé, plus de carrés de
          couleur. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-white px-4 py-3 text-sm shadow-card">
        <Link
          href={conversation ? `/messages/${conversation.id}` : "/messages"}
          className="flex items-center gap-1.5 font-medium text-ink hover:text-brand"
        >
          <span aria-hidden>💬</span> Messagerie
        </Link>
        <Link
          href={`/appointments/new?artisan=${project.artisan_id}&project=${project.id}`}
          className="flex items-center gap-1.5 font-medium text-ink hover:text-brand"
        >
          <span aria-hidden>📅</span> Rendez-vous
        </Link>
        <span className="flex items-center gap-1.5 font-medium text-gray-400">
          <span aria-hidden>📄</span> Documents
        </span>
        <Link
          href={`/projects/${project.id}/paiement`}
          className="flex items-center gap-1.5 font-medium text-ink hover:text-brand"
        >
          <span aria-hidden>💳</span> Paiement
        </Link>
      </div>

      {/* Dernière étape, manuelle et réservée à l'admin : une fois le
          projet "completed" (toutes les étapes payées), libérer
          définitivement les fonds côté plateforme. Pas automatique —
          c'est un geste financier final, pas une étape du parcours. */}
      {isAdmin && project.status === "completed" && (
        <form action={advanceProjectStatus} className="mt-3">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="newStatus" value="released" />
          <button type="submit" className="text-xs font-bold text-forest hover:underline">
            [Admin] Marquer les fonds comme définitivement libérés
          </button>
        </form>
      )}
    </div>
  );
}
