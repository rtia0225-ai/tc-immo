import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VoiceRecorder from "@/components/VoiceRecorder";
import ConversationMessageForm from "@/components/ConversationMessageForm";
import ConversationSpacePanel from "@/components/ConversationSpacePanel";

function formatDateTime(d) {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export default async function ConversationPage({ params, searchParams }) {
  const supabase = createClient();
  const { id } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("project_id, regarding:regarding_artisan_id ( profiles ( full_name ) ), project:project_id ( title )")
    .eq("id", id)
    .maybeSingle();

  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", id);
  const participantIds = new Set((participantRows || []).map((p) => p.user_id));

  // Tous les professionnels du projet (principal + participants) ainsi que
  // le client, pour afficher aussi bien ceux déjà dans l'espace (📞
  // contact) que ceux qu'on peut y ajouter d'un coup (+) — dans les deux
  // sens : un professionnel peut ajouter le client, le client peut ajouter
  // un professionnel (cf. demande du 2026-11).
  let professionals = [];
  let isClientViewer = false;
  if (conversation?.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select(
        "artisan_id, client_id, artisan:artisan_id ( trade, profiles ( full_name, avatar_url, phone ) ), client:client_id ( full_name, avatar_url, phone )"
      )
      .eq("id", conversation.project_id)
      .single();
    const { data: projectParticipants } = await supabase
      .from("project_participants")
      .select("artisan_id, artisan:artisan_id ( trade, profiles ( full_name, avatar_url, phone ) )")
      .eq("project_id", conversation.project_id);

    isClientViewer = project?.client_id === user.id;

    const everyone = [
      ...(project?.artisan_id
        ? [{
            id: project.artisan_id,
            name: project.artisan?.profiles?.full_name,
            trade: project.artisan?.trade,
            avatarUrl: project.artisan?.profiles?.avatar_url,
            phone: project.artisan?.profiles?.phone,
          }]
        : []),
      ...(projectParticipants || []).map((p) => ({
        id: p.artisan_id,
        name: p.artisan?.profiles?.full_name,
        trade: p.artisan?.trade,
        avatarUrl: p.artisan?.profiles?.avatar_url,
        phone: p.artisan?.profiles?.phone,
      })),
      ...(project?.client_id
        ? [{
            id: project.client_id,
            name: project.client?.full_name,
            trade: "Client",
            avatarUrl: project.client?.avatar_url,
            phone: project.client?.phone,
            isClient: true,
          }]
        : []),
    ];

    professionals = everyone
      .filter((p) => p.id !== user.id)
      .map((p) => ({ ...p, inConversation: participantIds.has(p.id) }));
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, content, audio_url, document_url, document_type, video_link, video_scheduled_at, sender_id, created_at, sender:sender_id ( full_name )")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const messagesWithDocs = await Promise.all(
    (messages || []).map(async (m) => {
      if (!m.document_url) return m;
      const { data } = await supabase.storage.from("project-deliverables").createSignedUrl(m.document_url, 3600);
      return { ...m, documentSignedUrl: data?.signedUrl || null };
    })
  );

  return (
    <div className="mx-auto flex h-[80vh] max-w-3xl flex-col px-4 py-4">
      {conversation?.regarding?.profiles?.full_name && (
        <p className="mb-2 text-sm text-gray-500">
          Au sujet de : <strong className="text-ink">{conversation.regarding.profiles.full_name}</strong>
        </p>
      )}

      <ConversationSpacePanel conversationId={id} professionals={professionals} isClientViewer={isClientViewer} />

      {searchParams?.error && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {searchParams.error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-card p-4">
        {!messagesWithDocs || messagesWithDocs.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun message. Écris le premier !</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messagesWithDocs.map((m) => (
              <div
                key={m.id}
                className={`max-w-xs rounded-lg p-3 text-sm ${
                  m.sender_id === user.id ? "ml-auto bg-brand text-white" : "bg-gray-100"
                }`}
              >
                {m.sender_id !== user.id && participantIds.size > 2 && (
                  <p className="mb-1 text-[10px] font-bold text-gray-400">{m.sender?.full_name}</p>
                )}
                {m.audio_url && <audio controls src={m.audio_url} className="h-10 w-56" />}
                {m.content && <p>{m.content}</p>}
                {m.video_link && (
                  <div className="mt-1">
                    {m.video_scheduled_at && (
                      <p className="text-xs font-semibold">
                        📅 RDV visio — {formatDateTime(m.video_scheduled_at)}
                      </p>
                    )}
                    <a
                      href={m.video_link}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-1 inline-block rounded-lg px-3 py-1.5 text-xs font-bold ${
                        m.sender_id === user.id ? "bg-white text-brand" : "bg-brand text-white"
                      }`}
                    >
                      📹 Rejoindre l'appel
                    </a>
                  </div>
                )}
                {m.documentSignedUrl && (
                  <a
                    href={m.documentSignedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-1 inline-block text-xs font-semibold underline ${m.sender_id === user.id ? "text-white" : "text-brand"}`}
                  >
                    📎 Voir le document
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <VoiceRecorder conversationId={id} />
        <ConversationMessageForm conversationId={id} projectId={conversation?.project_id} currentUserId={user.id} />
      </div>
    </div>
  );
}
