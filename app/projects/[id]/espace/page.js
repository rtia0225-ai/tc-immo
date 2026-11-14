import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProjectSpaceForm from "@/components/ProjectSpaceForm";

function formatDateTime(d) {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// Espace projet : un seul fil partagé par TOUTES les personnes qui
// collaborent sur ce projet précis (client, artisan principal,
// participants ajoutés) — par opposition à la messagerie 1-à-1
// existante. Les documents échangés ici sont visibles par tout ce
// monde ; les professionnels peuvent en plus s'échanger des choses
// (contacts personnels notamment) à l'abri des yeux du client.
export default async function ProjectSpacePage({ params }) {
  const supabase = createClient();
  const { id: projectId } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, client_id, artisan_id, client:client_id ( full_name ), artisan:artisan_id ( trade, profiles ( full_name ) )")
    .eq("id", projectId)
    .single();

  if (!project) return <p className="px-4 py-12">Projet introuvable.</p>;

  const isClient = project.client_id === user.id;

  const { data: participants } = await supabase
    .from("project_participants")
    .select("artisan_id, artisan:artisan_id ( trade, profiles ( full_name ) )")
    .eq("project_id", projectId);

  const collaborators = [
    { name: project.client?.full_name, role: "Client" },
    { name: project.artisan?.profiles?.full_name, role: project.artisan?.trade },
    ...(participants || []).map((p) => ({ name: p.artisan?.profiles?.full_name, role: p.artisan?.trade })),
  ].filter((c) => c.name);

  // La RLS (table project_messages) filtre déjà : si on n'est pas
  // collaborateur sur ce projet, rien ne remonte ; si on est le client,
  // les messages "entre professionnels" sont automatiquement exclus.
  const { data: rawMessages } = await supabase
    .from("project_messages")
    .select("id, content, document_url, document_type, audience, created_at, sender:sender_id ( full_name )")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const messages = await Promise.all(
    (rawMessages || []).map(async (m) => {
      if (!m.document_url) return m;
      const { data } = await supabase.storage.from("project-deliverables").createSignedUrl(m.document_url, 3600);
      return { ...m, documentSignedUrl: data?.signedUrl || null };
    })
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/projects/${projectId}`} className="text-sm text-gray-500 hover:text-brand">
        ← Retour au projet
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-bold text-ink">Espace projet</h1>
      <p className="mt-1 text-sm text-gray-500">{project.title}</p>
      <p className="mt-2 text-xs text-gray-400">
        Collaborateurs : {collaborators.map((c) => `${c.name} (${c.role})`).join(" · ")}
      </p>

      <div className="mt-6 flex flex-col gap-3 rounded-lg bg-white p-4 shadow-card">
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun message pour le moment.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`rounded-lg p-2.5 text-sm ${m.audience === "professionals" ? "bg-gold/20" : "bg-gray-50"}`}>
                <p className="text-[11px] font-semibold text-gray-500">
                  {m.sender?.full_name} — {formatDateTime(m.created_at)}
                  {m.audience === "professionals" && (
                    <span className="ml-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold text-ink">
                      Entre pros
                    </span>
                  )}
                </p>
                {m.content && <p className="mt-1 text-ink">{m.content}</p>}
                {m.documentSignedUrl && (
                  <a href={m.documentSignedUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-brand underline">
                    📎 Voir le document
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        <ProjectSpaceForm projectId={projectId} currentUserId={user.id} isClient={isClient} />
      </div>
    </div>
  );
}
