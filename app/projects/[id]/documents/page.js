import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

// Tous les documents déposés sur le projet, en une seule liste cliquable :
// les livrables de chaque étape (permis, ACD, plans...) et les
// photos/vidéos des rapports d'avancement. Remplace l'ancien "espace
// projet" (fil de discussion de groupe, retiré).
export default async function ProjectDocumentsPage({ params }) {
  const supabase = createClient();
  const { id: projectId } = params;

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

  const { data: project } = await supabase.from("projects").select("id, title").eq("id", projectId).single();
  if (!project) return <p className="px-4 py-12">Projet introuvable.</p>;

  const { data: milestones } = await supabase
    .from("project_milestones")
    .select(
      "id, title, artisan:artisan_id ( trade, profiles ( full_name ) ), milestone_deliverables ( label, deliverable_files ( document_url, review_status, created_at, reviewed_at ) )"
    )
    .eq("project_id", projectId);

  const { data: reports } = await supabase
    .from("technician_progress_reports")
    .select("id, created_at, technician:technician_id ( full_name ), technician_report_media ( media_url, media_type )")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // Le client ne voit un fichier que s'il a été validé ; un professionnel
  // ou un admin les voit tous. Un livrable peut contenir plusieurs
  // fichiers, chacun listé séparément ici.
  const milestoneDocs = (
    await Promise.all(
      (milestones || []).flatMap((m) =>
        (m.milestone_deliverables || []).flatMap((deliv) =>
          (deliv.deliverable_files || []).map(async (f) => {
            const canSee = isAdmin || isArtisan || f.review_status === "approved";
            if (!canSee) return null;
            const { data } = await supabase.storage.from("project-deliverables").createSignedUrl(f.document_url, 3600);
            return {
              id: `file-${f.document_url}`,
              label: `${deliv.label} — ${m.title}`,
              who: m.artisan?.profiles?.full_name,
              trade: m.artisan?.trade,
              date: f.reviewed_at || f.created_at,
              url: data?.signedUrl || null,
            };
          })
        )
      )
    )
  ).filter(Boolean);

  const reportDocs = (
    await Promise.all(
      (reports || []).flatMap((r) =>
        (r.technician_report_media || []).map(async (media) => {
          const { data } = await supabase.storage.from("project-deliverables").createSignedUrl(media.media_url, 3600);
          return {
            id: `report-${r.id}-${media.media_url}`,
            label: media.media_type === "video" ? "Vidéo de rapport d'avancement" : "Photo de rapport d'avancement",
            who: r.technician?.full_name,
            date: r.created_at,
            url: data?.signedUrl || null,
          };
        })
      )
    )
  );

  const allDocs = [...milestoneDocs.filter(Boolean), ...reportDocs]
    .filter((d) => d.url)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-gray-500 hover:text-brand">
        ← Retour au projet
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-ink">Documents</h1>
      <p className="mt-1 text-sm text-gray-500">{project.title}</p>

      <div className="mt-6 flex flex-col gap-2">
        {allDocs.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun document pour le moment.</p>
        ) : (
          allDocs.map((d) => (
            <a
              key={d.id}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg bg-white p-3 text-sm shadow-card hover:shadow-md"
            >
              <div>
                <p className="font-medium text-ink">{d.label}</p>
                <p className="text-xs text-gray-500">
                  {[d.who, d.trade].filter(Boolean).join(" · ")}
                  {d.date ? ` — ${formatDate(d.date)}` : ""}
                </p>
              </div>
              <span className="text-brand" aria-hidden>↗</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
