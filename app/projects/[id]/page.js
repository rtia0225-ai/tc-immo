import { createClient } from "@/lib/supabase/server";
import ProjectActivityLog from "@/components/ProjectActivityLog";
import ProjectRoadmap from "@/components/ProjectRoadmap";
import {
  removeParticipant,
  validateMilestoneSchedule,
  requestMilestoneChanges,
  validateParticipantMilestoneSchedule,
  requestParticipantMilestoneChanges,
} from "../actions";
import { addExternalProvider, removeExternalProvider, releasePayment } from "../milestones-actions";
import { DEFAULT_MILESTONES_BY_TRADE, SINGLE_INSTALLMENT_TRADES, FINAL_DOCUMENT_TRADES, CONSTRUCTION_SERVICES } from "@/lib/constants";
import Link from "next/link";
import { redirect } from "next/navigation";
import { firstNameOnly } from "@/lib/displayName";
import SubmitButton from "@/components/SubmitButton";

const PENDING_STATUSES = ["pending_schedule", "pending_client_review", "pending_contract_signature"];

// Échéancier à titre d'exemple (pas encore réel), affiché au client pour
// qu'il ait quand même une idée du déroulé pendant qu'il attend que le
// professionnel remplisse le vrai — remplacé dès que le contrat est signé.
function IndicativeSchedule({ trade }) {
  const singleDoc = SINGLE_INSTALLMENT_TRADES[trade];
  const finalDoc = FINAL_DOCUMENT_TRADES[trade];
  const rows = singleDoc
    ? [{ title: `Livraison du ${singleDoc}`, percentage: "100" }]
    : DEFAULT_MILESTONES_BY_TRADE[trade];

  if (!rows) return null;

  return (
    <div className="mt-4 rounded-lg border border-dashed border-gray-200 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
        Exemple de déroulé pour ce métier{finalDoc ? ` (se termine par : ${finalDoc})` : ""}, à titre indicatif
      </p>
      <div className="mt-2 flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.title} className="flex items-center justify-between text-xs text-gray-500">
            <span>{r.title}</span>
            <span>{r.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const isClient = project.client_id === user.id;
  // Un client ne doit jamais voir le nom de famille d'un professionnel sur
  // la plateforme (cf. consigne Rose) ; les autres professionnels du
  // projet et l'admin continuent de voir les noms complets entre eux.
  const nameForViewer = (full) => (isClient ? firstNameOnly(full) : full);

  const { data: rawProgressReports } = await supabase
    .from("technician_progress_reports")
    .select("*, technician:technician_id ( full_name ), technician_report_media ( media_url, media_type )")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // Le bucket est privé : il faut un lien signé temporaire pour chaque
  // photo/vidéo de rapport, pas le chemin de stockage brut (qui renvoie
  // une erreur d'accès si on le met tel quel dans un lien).
  const progressReports = await Promise.all(
    (rawProgressReports || []).map(async (r) => ({
      ...r,
      technician_report_media: await Promise.all(
        (r.technician_report_media || []).map(async (m) => {
          const { data } = await supabase.storage.from("project-deliverables").createSignedUrl(m.media_url, 3600);
          return { ...m, signedUrl: data?.signedUrl || null };
        })
      ),
    }))
  );

  const { data: rawAdditionRequests } = await supabase
    .from("project_addition_requests")
    .select("*, requester:requested_by ( full_name )")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // "Demandé par" est visible de tout le monde sur le projet : si le
  // demandeur est un professionnel et que je suis le client, je ne vois
  // que son prénom. Si le demandeur est le client lui-même, son nom (le
  // mien, ou celui que je lis en tant que professionnel) n'est pas
  // concerné par cette règle.
  const additionRequests = (rawAdditionRequests || []).map((r) => ({
    ...r,
    requester: {
      ...r.requester,
      full_name:
        isClient && r.requested_by !== project.client_id
          ? firstNameOnly(r.requester?.full_name)
          : r.requester?.full_name,
    },
  }));

  const { data: projectAppointments } = await supabase
    .from("appointments")
    .select("*, artisan:artisan_id ( profiles ( full_name ) )")
    .eq("project_id", id)
    .order("scheduled_at", { ascending: false });

  const { data: participants } = await supabase
    .from("project_participants")
    .select(
      "id, artisan_id, amount, description, currency, status, milestone_feedback_note, artisan:artisan_id ( trade, profiles ( full_name, avatar_url ) )"
    )
    .eq("project_id", id);

  // Un participant suit le même pipeline que l'artisan principal (demande
  // -> échéancier rempli par lui -> validation client -> contrat) avant
  // de rejoindre le vrai parcours. Tant que ce n'est pas fait, on
  // l'affiche à part (point d'étape), pas dans le fil horizontal.
  const PARTICIPANT_PENDING_STATUSES = ["pending_schedule", "pending_client_review", "pending_contract_signature"];
  const pendingParticipants = (participants || []).filter((p) => PARTICIPANT_PENDING_STATUSES.includes(p.status));
  const activeParticipants = (participants || []).filter((p) => !PARTICIPANT_PENDING_STATUSES.includes(p.status));

  // Tous les artisans ACTIFS du projet : le principal (une fois son propre
  // pipeline terminé) + chaque participant déjà passé par le sien,
  // chacun avec sa propre prestation, son propre échéancier, son propre contrat.
  const artisansOnProject = [
    ...(!PENDING_STATUSES.includes(project.status)
      ? [
          {
            artisanId: project.artisan_id,
            isPrimary: true,
            trade: project.artisan?.trade,
            fullName: nameForViewer(project.artisan?.profiles?.full_name),
            avatarUrl: project.artisan?.profiles?.avatar_url,
            amount: project.amount,
            currency: project.currency,
            description: project.description,
          },
        ]
      : []),
    ...activeParticipants.map((p) => ({
      artisanId: p.artisan_id,
      isPrimary: false,
      participantId: p.id,
      trade: p.artisan?.trade,
      fullName: nameForViewer(p.artisan?.profiles?.full_name),
      avatarUrl: p.artisan?.profiles?.avatar_url,
      amount: p.amount,
      currency: p.currency,
      description: p.description,
    })),
  ];

  // Pour l'affichage de la liste "Participants" (tout le monde, actifs ou
  // pas) et le calcul des milestones/contrats, qui couvre aussi le
  // principal même pendant son propre pipeline.
  const allArtisansOnProjectForList = [
    {
      artisanId: project.artisan_id,
      isPrimary: true,
      trade: project.artisan?.trade,
      fullName: nameForViewer(project.artisan?.profiles?.full_name),
      avatarUrl: project.artisan?.profiles?.avatar_url,
    },
    ...(participants || []).map((p) => ({
      artisanId: p.artisan_id,
      isPrimary: false,
      participantId: p.id,
      trade: p.artisan?.trade,
      fullName: nameForViewer(p.artisan?.profiles?.full_name),
      avatarUrl: p.artisan?.profiles?.avatar_url,
    })),
  ];

  const artisanIds = allArtisansOnProjectForList.map((a) => a.artisanId);

  const { data: allMilestones } = await supabase
    .from("project_milestones")
    .select(
      "*, milestone_deliverables ( id, label, order_index, deliverable_files ( id, document_url, review_status, review_note, created_at, reviewed_at ) )"
    )
    .eq("project_id", id)
    .in("artisan_id", artisanIds)
    .order("order_index", { ascending: true });

  // Liens signés temporaires pour les documents livrés, le bucket est
  // privé. Le client ne voit un fichier que si la vérification
  // (automatique ou admin) l'a approuvé — tant que c'est "en attente",
  // seuls l'artisan qui l'a déposé et les admins y ont accès
  // (lib/documentReview.js). Une étape peut avoir plusieurs livrables, et
  // chaque livrable peut désormais contenir plusieurs fichiers.
  const milestonesWithDeliverables = await Promise.all(
    (allMilestones || []).map(async (m) => {
      const deliverables = await Promise.all(
        [...(m.milestone_deliverables || [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map(async (d) => {
            const files = await Promise.all(
              (d.deliverable_files || []).map(async (f) => {
                // isArtisan seul ne suffit pas : ça couvre tous les
                // professionnels du projet, pas seulement celui à qui ce
                // livrable appartient — un fichier pas encore approuvé ne
                // doit être visible que par son auteur, pas par un autre
                // professionnel du même projet.
                const canSee = isAdmin || (isArtisan && user.id === m.artisan_id) || f.review_status === "approved";
                if (!canSee) return { ...f, signedUrl: null };
                const { data } = await supabase.storage.from("project-deliverables").createSignedUrl(f.document_url, 3600);
                return { ...f, signedUrl: data?.signedUrl || null };
              })
            );
            return { ...d, files };
          })
      );
      return { ...m, deliverables };
    })
  );

  // Répartitions internes d'étapes (ex: chef de chantier → ses maçons) :
  // seulement utile à un professionnel regardant ses propres étapes,
  // jamais au client — on ne va même pas chercher ces données sinon,
  // pour ne jamais les faire transiter vers la page du client.
  const splitsByParent = {};
  if (isArtisan && !isAdmin) {
    const { data: milestoneSplitsRaw } = await supabase
      .from("project_milestones")
      .select("id, parent_milestone_id, amount, paid_at, is_completed, artisan:artisan_id ( profiles ( full_name ) )")
      .eq("project_id", id)
      .not("parent_milestone_id", "is", null);

    (milestoneSplitsRaw || []).forEach((s) => {
      if (!splitsByParent[s.parent_milestone_id]) splitsByParent[s.parent_milestone_id] = [];
      splitsByParent[s.parent_milestone_id].push({
        id: s.id,
        amount: s.amount,
        paidAt: s.paid_at,
        isCompleted: s.is_completed,
        recipientName: s.artisan?.profiles?.full_name || "Professionnel",
      });
    });
  }

  const { data: allContracts } = await supabase
    .from("contracts")
    .select("artisan_id, client_signed_at, artisan_signed_at")
    .eq("project_id", id)
    .in("artisan_id", artisanIds);

  // Prestataires externes déclarés par un technicien (ex: menuisier,
  // ferrailleur) : jamais rattachés à l'échéancier d'un artisan du projet,
  // payés directement par le client, et son identité n'est JAMAIS
  // remontée ici — on ne sélectionne même pas son nom, pour qu'elle ne
  // transite jamais vers la page. Cf. consigne Rose du 2026-11-25.
  const { data: externalProviders } = await supabase
    .from("project_milestones")
    .select("id, title, amount, paid_at, declared_by_id, artisan_id")
    .eq("project_id", id)
    .not("declared_by_id", "is", null);

  const myTrade = artisansOnProject.find((a) => a.artisanId === user.id)?.trade;
  const canAddExternalProvider = isArtisan && !isAdmin && myTrade === "Technicien BTP";

  // Échéancier d'exécution (gros œuvre) d'un architecte en suivi de
  // chantier : track='execution', toujours payé à l'architecte, mais
  // affiché à part de ses honoraires. Visible du client, de l'architecte
  // et du chef de chantier délégué (RLS) — jamais des autres.
  const { data: executionMilestones } = await supabase
    .from("project_milestones")
    .select("id, title, amount, payment_percentage, paid_at, artisan_id")
    .eq("project_id", id)
    .eq("track", "execution")
    .order("order_index", { ascending: true });

  const isArchitectWithSupervision =
    project.architect_site_supervision && isArtisan && !isAdmin && user.id === project.artisan_id;
  const isDelegatedSiteManager = isArtisan && !isAdmin && project.architect_site_manager_id === user.id;

  // Documents qu'un professionnel a reçus (partagés par le client depuis le
  // dossier d'un autre professionnel du même projet) — on génère un lien
  // signé pour chacun, comme pour les livrables classiques.
  const { data: rawSharedDeliverables } = await supabase
    .from("shared_deliverables")
    .select("id, recipient_artisan_id, source_artisan_id, label, document_url, document_date")
    .eq("project_id", id)
    .in("recipient_artisan_id", artisanIds);

  const sharedDeliverables = await Promise.all(
    (rawSharedDeliverables || []).map(async (s) => {
      const { data } = await supabase.storage.from("project-deliverables").createSignedUrl(s.document_url, 3600);
      const sourceArtisan = allArtisansOnProjectForList.find((a) => a.artisanId === s.source_artisan_id);
      return { ...s, signedUrl: data?.signedUrl || null, sourceArtisanName: sourceArtisan?.fullName || null };
    })
  );

  // Il peut désormais exister plusieurs conversations sur un même projet
  // (client ↔ artisan principal, mais aussi professionnel ↔ professionnel) :
  // on prend celle qui concerne l'utilisateur courant, pas "la" conversation
  // du projet.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", id)
    .or(`client_id.eq.${user.id},artisan_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  const { data: educationRows } = await supabase
    .from("milestone_education_content")
    .select("phase_title, summary, video_url, pdf_url, questions_to_ask");
  const educationByTitle = Object.fromEntries((educationRows || []).map((r) => [r.phase_title, r]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-brand-dark">
        {project.title}
      </h1>
      <p className="mb-6 text-gray-600">{project.description}</p>

      {searchParams?.error && (
        <div className="mb-6 rounded-lg bg-gold p-4 text-sm font-medium text-ink shadow-card">
          {searchParams.error}
        </div>
      )}

      {/* Raccourcis en haut, bien en couleur — même traitement que
          l'espace professionnel (ConversationSpacePanel). */}
      <div className="mb-6 flex gap-3">
        <Link
          href={conversation ? `/messages/${conversation.id}` : "/messages"}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-gray-50 py-3 hover:bg-gray-100"
        >
          <span className="text-2xl" aria-hidden>💬</span>
          <span className="text-xs font-semibold text-ink">Messagerie</span>
        </Link>
        <Link
          href={`/appointments/new?artisan=${project.artisan_id}&project=${project.id}`}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-gray-50 py-3 hover:bg-gray-100"
        >
          <span className="text-2xl" aria-hidden>📅</span>
          <span className="text-xs font-semibold text-ink">Rendez-vous</span>
        </Link>
        <Link
          href={`/projects/${project.id}/documents`}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-gray-50 py-3 hover:bg-gray-100"
        >
          <span className="text-2xl" aria-hidden>📄</span>
          <span className="text-xs font-semibold text-ink">Documents</span>
        </Link>
        <Link
          href={`/projects/${project.id}/paiement`}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-gray-50 py-3 hover:bg-gray-100"
        >
          <span className="text-2xl" aria-hidden>💳</span>
          <span className="text-xs font-semibold text-ink">Paiement</span>
        </Link>
      </div>

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
          {allArtisansOnProjectForList.map((a) => {
            const isSelf = a.artisanId === user.id;
            const participantRecord = !a.isPrimary ? participants?.find((p) => p.id === a.participantId) : null;
            // Où en est le démarrage d'un professionnel (échéancier,
            // contrat...) ne regarde que le client, l'admin, et le
            // professionnel lui-même — pas les autres professionnels du
            // projet.
            const canSeeStartupStatus = isClient || isAdmin || isSelf;
            const pendingLabel = !canSeeStartupStatus
              ? null
              : a.isPrimary && PENDING_STATUSES.includes(project.status)
                ? "En cours de démarrage"
                : participantRecord && PARTICIPANT_PENDING_STATUSES.includes(participantRecord.status)
                  ? "En cours de démarrage"
                  : null;
            const avatar = a.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-xs font-bold text-gray-300">
                {a.fullName?.slice(0, 2).toUpperCase()}
              </div>
            );
            const info = (
              <div className="flex items-center gap-3">
                {avatar}
                <div>
                  <p className="text-sm font-medium">
                    {a.fullName}
                    {isSelf ? " (moi)" : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.trade}
                    {a.isPrimary ? " · Principal" : ""}
                    {pendingLabel && <span className="ml-1 text-gold-dark">· {pendingLabel}</span>}
                  </p>
                </div>
              </div>
            );

            return (
              <div key={a.artisanId} className="flex items-center justify-between">
                {isSelf ? (
                  info
                ) : (
                  <Link
                    href={`/projects/${project.id}/contact/${a.artisanId}`}
                    className="flex items-center gap-3 hover:opacity-70"
                    title={`Discuter avec ${a.fullName || "ce professionnel"}`}
                  >
                    {avatar}
                    <div>
                      <p className="text-sm font-medium text-ink">{a.fullName}</p>
                      <p className="text-xs text-gray-500">
                        {a.trade}
                        {a.isPrimary ? " · Principal" : ""}
                        {pendingLabel && <span className="text-gold-dark"> · {pendingLabel}</span>} ·{" "}
                        <span className="text-brand">Discuter</span>
                      </p>
                    </div>
                  </Link>
                )}
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
            );
          })}
        </div>
      </div>

      {/* Chaque participant suit le même pipeline de démarrage que
          l'artisan principal (demande → échéancier rempli par lui →
          validation client → contrat) avant de rejoindre le vrai parcours
          — un point d'étape par participant encore en cours. Ce qui
          concerne un professionnel (son échéancier, son contrat...) ne
          regarde que lui, le client et l'admin — pas les autres
          professionnels du projet. */}
      {pendingParticipants
        .filter((p) => isClient || isAdmin || (isArtisan && user.id === p.artisan_id))
        .map((p) => (
        <div key={p.id} className="mb-6 rounded-lg bg-white shadow-card p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            {nameForViewer(p.artisan?.profiles?.full_name)} ({p.artisan?.trade})
          </p>

          {p.status === "pending_schedule" && (
            isClient ? (
              <>
                <p className="font-bold text-ink">
                  ⏳ En attente que {p.artisan?.profiles?.full_name ? firstNameOnly(p.artisan.profiles.full_name) : "le professionnel"} remplisse l'échéancier de paiement.
                </p>
                {p.milestone_feedback_note && (
                  <p className="mt-2 text-sm text-gray-500">Ta demande de correction lui a été envoyée.</p>
                )}
              </>
            ) : isArtisan && user.id === p.artisan_id ? (
              <>
                <p className="font-bold text-ink">À faire : remplir l'échéancier de paiement de ta prestation.</p>
                <Link
                  href={`/projects/${project.id}/participant/${p.artisan_id}/schedule`}
                  className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
                >
                  Remplir l'échéancier →
                </Link>
              </>
            ) : null
          )}

          {p.status === "pending_client_review" && (
            isClient ? (
              <>
                <p className="font-bold text-ink">
                  À valider : échéancier proposé par {p.artisan?.profiles?.full_name ? firstNameOnly(p.artisan.profiles.full_name) : "le professionnel"}
                </p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {milestonesWithDeliverables
                    .filter((m) => m.artisan_id === p.artisan_id)
                    .map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 text-sm">
                        <span className="text-ink">{m.title}</span>
                        <span className="text-gray-500">
                          {m.payment_percentage}% : {Number(m.amount || 0).toLocaleString("fr-FR")} {p.currency}
                        </span>
                      </div>
                    ))}
                </div>
                <p className="mt-2 text-sm font-bold text-ink">
                  Montant total : {Number(p.amount || 0).toLocaleString("fr-FR")} {p.currency}
                </p>
                <div className="mt-4 flex flex-wrap items-start gap-3">
                  <form action={validateParticipantMilestoneSchedule}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input type="hidden" name="participantId" value={p.id} />
                    <button type="submit" className="rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest-dark">
                      Valider
                    </button>
                  </form>
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-brand">Demander une modification</summary>
                    <form action={requestParticipantMilestoneChanges} className="mt-2 flex flex-col gap-2">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="participantId" value={p.id} />
                      <textarea
                        name="note"
                        required
                        rows={2}
                        placeholder="Qu'est-ce qui doit être corrigé ?"
                        className="w-64 rounded-lg border border-gray-300 p-2 text-sm"
                      />
                      <button type="submit" className="w-fit rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-card hover:bg-gray-50">
                        Envoyer la demande
                      </button>
                    </form>
                  </details>
                </div>
              </>
            ) : (
              <p className="font-bold text-ink">⏳ En attente de la validation du client sur l'échéancier envoyé.</p>
            )
          )}

          {p.status === "pending_contract_signature" && (
            <>
              <p className="font-bold text-ink">📝 Échéancier validé. Il ne reste plus qu'à signer le contrat.</p>
              <Link
                href={`/projects/${project.id}/contract/${p.artisan_id}`}
                className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
              >
                Consulter et signer le contrat →
              </Link>
            </>
          )}
        </div>
      ))}

      {/* Avant que l'échéancier (principal) ne soit rempli, validé et le
          contrat signé des deux côtés, on affiche le point d'étape du
          pipeline de démarrage à la place du vrai parcours — qui n'existe
          pas encore. Ça ne concerne que le client, l'artisan principal
          lui-même, et l'admin — un autre professionnel du projet n'a pas
          à voir où en est le démarrage de quelqu'un d'autre. */}
      {PENDING_STATUSES.includes(project.status) ? (
        (isClient || isAdmin || (isArtisan && user.id === project.artisan_id)) && (
        <div className="mb-6 rounded-lg bg-white shadow-card p-5">
          {project.status === "pending_schedule" && (
            isClient ? (
              <>
                <p className="font-bold text-ink">
                  ⏳ En attente que {project.artisan?.profiles?.full_name ? firstNameOnly(project.artisan.profiles.full_name) : "le professionnel"} remplisse l'échéancier de paiement.
                </p>
                {project.milestone_feedback_note && (
                  <p className="mt-2 text-sm text-gray-500">Ta demande de correction lui a été envoyée.</p>
                )}
                <IndicativeSchedule trade={project.artisan?.trade} />
              </>
            ) : isArtisan && user.id === project.artisan_id ? (
              <>
                <p className="font-bold text-ink">À faire : remplir l'échéancier de paiement de ce projet.</p>
                <Link
                  href={`/projects/${project.id}/schedule`}
                  className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
                >
                  Remplir l'échéancier →
                </Link>
              </>
            ) : null
          )}

          {project.status === "pending_client_review" && (
            isClient ? (
              <>
                <p className="font-bold text-ink">
                  À valider : échéancier proposé par {project.artisan?.profiles?.full_name ? firstNameOnly(project.artisan.profiles.full_name) : "le professionnel"}
                </p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {milestonesWithDeliverables
                    .filter((m) => m.artisan_id === project.artisan_id)
                    .map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 text-sm">
                        <span className="text-ink">{m.title}</span>
                        <span className="text-gray-500">
                          {m.payment_percentage}% : {Number(m.amount || 0).toLocaleString("fr-FR")} {project.currency}
                        </span>
                      </div>
                    ))}
                </div>
                <p className="mt-2 text-sm font-bold text-ink">
                  Montant total : {Number(project.amount || 0).toLocaleString("fr-FR")} {project.currency}
                </p>
                <div className="mt-4 flex flex-wrap items-start gap-3">
                  <form action={validateMilestoneSchedule}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <button type="submit" className="rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest-dark">
                      Valider
                    </button>
                  </form>
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-brand">Demander une modification</summary>
                    <form action={requestMilestoneChanges} className="mt-2 flex flex-col gap-2">
                      <input type="hidden" name="projectId" value={project.id} />
                      <textarea
                        name="note"
                        required
                        rows={2}
                        placeholder="Qu'est-ce qui doit être corrigé ?"
                        className="w-64 rounded-lg border border-gray-300 p-2 text-sm"
                      />
                      <button type="submit" className="w-fit rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-card hover:bg-gray-50">
                        Envoyer la demande
                      </button>
                    </form>
                  </details>
                </div>
              </>
            ) : (
              <p className="font-bold text-ink">⏳ En attente de la validation du client sur l'échéancier envoyé.</p>
            )
          )}

          {project.status === "pending_contract_signature" && (
            <>
              <p className="font-bold text-ink">📝 Échéancier validé. Il ne reste plus qu'à signer le contrat.</p>
              <Link
                href={`/projects/${project.id}/contract/${project.artisan_id}`}
                className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
              >
                Consulter et signer le contrat →
              </Link>
            </>
          )}
        </div>
        )
      ) : (
        <>
          {/* Le parcours du projet : un seul fil horizontal, un arrêt par
              intervenant (architecte, ingénieur, technicien, chef de
              chantier...), dans l'ordre réel du chantier. On clique sur un
              arrêt pour voir son détail (contrat, étapes, paiements,
              rendez-vous, documents) ; les autres restent visibles mais
              réduits à leur nom, pour qu'on voie le chemin complet sans être
              noyé sous le détail de tout le monde à la fois. */}
          <div className="mb-6 rounded-lg bg-white shadow-card p-4">
            <ProjectRoadmap
              artisans={(isArtisan && !isAdmin ? artisansOnProject.filter((a) => a.artisanId === user.id) : artisansOnProject).map((a) => {
                const contract = allContracts?.find((c) => c.artisan_id === a.artisanId);
                const contractSignedAt =
                  contract?.client_signed_at && contract?.artisan_signed_at
                    ? [contract.client_signed_at, contract.artisan_signed_at].sort().pop()
                    : null;
                // Le suivi d'exécution (gros œuvre) d'un architecte est un
                // échéancier à part (track='execution'), affiché dans sa
                // propre section plus bas — jamais mélangé à son échéancier
                // d'honoraires ici.
                const artisanMilestones = (milestonesWithDeliverables || []).filter(
                  (m) => m.artisan_id === a.artisanId && !m.track
                );
                const artisanAppointments = (projectAppointments || []).filter((ap) => ap.artisan_id === a.artisanId);
                const artisanAdditionRequests = (additionRequests || []).filter((r) => r.artisan_id === a.artisanId);
                // Les documents que CE professionnel a reçus d'un autre,
                // et les autres professionnels du projet avec qui le client
                // peut partager un document DEPUIS le dossier de celui-ci.
                const artisanSharedDocuments = sharedDeliverables.filter((s) => s.recipient_artisan_id === a.artisanId);
                const otherArtisans = artisansOnProject
                  .filter((other) => other.artisanId !== a.artisanId)
                  .map((other) => ({ artisanId: other.artisanId, fullName: other.fullName, trade: other.trade }));
                // Jamais transmis quand ce n'est pas le professionnel qui
                // regarde ses propres étapes (client, admin, autre
                // professionnel du projet) : même si l'UI ne l'affiche
                // pas, ces infos (noms/montants des maçons) ne doivent
                // pas se retrouver dans la page envoyée à quelqu'un d'autre.
                const isOwnArtisanViewer = isArtisan && !isAdmin && user.id === a.artisanId;
                const milestoneSplits = isOwnArtisanViewer
                  ? Object.fromEntries(artisanMilestones.map((m) => [m.id, splitsByParent[m.id] || []]))
                  : {};
                // Téléphones déjà déclarés en remplissant l'échéancier
                // (avant même la validation du client) : permet d'attribuer
                // une part sans les ressaisir, une fois le contrat signé.
                const declaredTeamPhones = isOwnArtisanViewer
                  ? Object.fromEntries(artisanMilestones.map((m) => [m.id, m.team_phones || []]))
                  : {};

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
                    sharedDocuments: artisanSharedDocuments,
                    otherArtisans,
                    milestoneSplits,
                    declaredTeamPhones,
                  },
                };
              })}
              defaultOpenArtisanId={isArtisan ? user.id : undefined}
              viewerId={user.id}
              isArtisanViewer={isArtisan && !isAdmin}
            />
          </div>

          {/* Prestataires externes occasionnels (menuisier, ferrailleur...)
              déclarés par un technicien : payés directement par le client,
              jamais visibles nommément — seul l'intitulé du métier l'est. */}
          {(externalProviders?.length > 0 || canAddExternalProvider) && (
            <div className="mb-6 rounded-lg bg-white shadow-card p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                Prestataires externes
              </p>

              {(externalProviders || []).length > 0 && (
                <ul className="flex flex-col gap-2">
                  {externalProviders.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
                      <div>
                        <p className="font-semibold text-ink">{m.title}</p>
                        <p className="text-gray-500">
                          {Number(m.amount || 0).toLocaleString("fr-FR")} {project.currency || "XOF"}
                          {m.paid_at ? " · Payé" : " · En attente de paiement"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isClient && !m.paid_at && (
                          <form action={releasePayment}>
                            <input type="hidden" name="milestoneId" value={m.id} />
                            <input type="hidden" name="projectId" value={project.id} />
                            <SubmitButton
                              pendingLabel="…"
                              className="rounded-md bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
                            >
                              Je confirme avoir payé
                            </SubmitButton>
                          </form>
                        )}
                        {m.declared_by_id === user.id && !m.paid_at && (
                          <form action={removeExternalProvider}>
                            <input type="hidden" name="milestoneId" value={m.id} />
                            <input type="hidden" name="projectId" value={project.id} />
                            <button type="submit" className="text-xs font-medium text-gray-400 hover:text-brand">
                              Retirer
                            </button>
                          </form>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {canAddExternalProvider && (
                <form action={addExternalProvider} className="mt-4 grid grid-cols-1 gap-2 border-t border-gray-100 pt-4 sm:grid-cols-4">
                  <input type="hidden" name="projectId" value={project.id} />
                  <select name="label" required className="rounded-md border border-gray-300 p-2 text-sm sm:col-span-2">
                    <option value="">Métier du prestataire</option>
                    {CONSTRUCTION_SERVICES.filter((s) => s !== "Technicien BTP").map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="providerPhone"
                    required
                    placeholder="Téléphone du prestataire"
                    className="rounded-md border border-gray-300 p-2 text-sm"
                  />
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0"
                    step="0.01"
                    placeholder={`Montant (${project.currency || "XOF"})`}
                    className="rounded-md border border-gray-300 p-2 text-sm"
                  />
                  <SubmitButton
                    pendingLabel="Ajout…"
                    className="rounded-md bg-forest px-3 py-2 text-xs font-bold text-white hover:opacity-90 sm:col-span-4"
                  >
                    + Ajouter ce prestataire (son identité ne sera jamais montrée au client)
                  </SubmitButton>
                </form>
              )}
            </div>
          )}

          {/* Suivi de chantier (gros œuvre) d'un architecte : échéancier à
              part de ses honoraires, mais toujours payé à lui. */}
          {(executionMilestones?.length > 0 || isArchitectWithSupervision || isDelegatedSiteManager) && (
            <div className="mb-6 rounded-lg bg-white shadow-card p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                Suivi de chantier (gros œuvre)
              </p>

              {(executionMilestones || []).length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {executionMilestones.map((m) => (
                    <li key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
                      <div>
                        <p className="font-semibold text-ink">{m.title}</p>
                        <p className="text-gray-500">
                          {m.payment_percentage}% · {Number(m.amount || 0).toLocaleString("fr-FR")} {project.currency || "XOF"}
                          {m.paid_at ? " · Payé" : " · En attente de paiement"}
                        </p>
                      </div>
                      {isClient && !m.paid_at && (
                        <form action={releasePayment}>
                          <input type="hidden" name="milestoneId" value={m.id} />
                          <input type="hidden" name="projectId" value={project.id} />
                          <SubmitButton
                            pendingLabel="…"
                            className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
                          >
                            Je confirme avoir payé
                          </SubmitButton>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Aucune étape déclarée pour l'instant.</p>
              )}

              {(isArchitectWithSupervision || isDelegatedSiteManager) && (
                <Link
                  href={`/projects/${project.id}/execution-schedule`}
                  className="mt-4 inline-block rounded-md bg-forest px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                >
                  {executionMilestones?.length > 0 ? "Modifier l'échéancier d'exécution" : "Remplir l'échéancier d'exécution"}
                </Link>
              )}
            </div>
          )}

          {/* Rapports d'avancement libres (photos/vidéos) envoyés par le
              technicien — les ajouts imprévus (paiement, document, autre) se
              font désormais directement sur la ligne du parcours ci-dessus,
              au "+" entre deux étapes. */}
          <div className="mb-6">
            <ProjectActivityLog
              projectId={project.id}
              progressReports={progressReports}
              isArtisan={isArtisan}
              currentUserId={user.id}
            />
          </div>
        </>
      )}

    </div>
  );
}
