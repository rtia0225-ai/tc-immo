import { createClient } from "@/lib/supabase/server";
import { addConversationParticipant } from "../actions";
import { redirect } from "next/navigation";
import VoiceRecorder from "@/components/VoiceRecorder";
import ConversationMessageForm from "@/components/ConversationMessageForm";

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

  // Tous les participants actuels de la discussion (peut en compter plus
  // de deux depuis qu'on peut en ajouter en cours de route).
  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("user_id, profile:user_id ( full_name, role )")
    .eq("conversation_id", id);
  const participants = participantRows || [];
  const otherParticipants = participants.filter((p) => p.user_id !== user.id);

  // Candidats qu'on peut ajouter : les autres professionnels de ce même
  // projet qui ne sont pas déjà dans la discussion (jamais le client).
  let addableCandidates = [];
  if (conversation?.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("artisan_id, artisan:artisan_id ( trade, profiles ( full_name ) )")
      .eq("id", conversation.project_id)
      .single();
    const { data: projectParticipants } = await supabase
      .from("project_participants")
      .select("artisan_id, artisan:artisan_id ( trade, profiles ( full_name ) )")
      .eq("project_id", conversation.project_id);

    const everyProfessional = [
      ...(project?.artisan_id
        ? [{ id: project.artisan_id, name: project.artisan?.profiles?.full_name, trade: project.artisan?.trade }]
        : []),
      ...(projectParticipants || []).map((p) => ({
        id: p.artisan_id,
        name: p.artisan?.profiles?.full_name,
        trade: p.artisan?.trade,
      })),
    ];
    const currentIds = new Set(participants.map((p) => p.user_id));
    addableCandidates = everyProfessional.filter((p) => !currentIds.has(p.id));
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, content, audio_url, document_url, document_type, sender_id, created_at, sender:sender_id ( full_name )")
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
    <div className="mx-auto flex h-[70vh] max-w-3xl flex-col px-4 py-4">
      <h1 className="mb-1 text-xl font-bold text-brand-dark">Conversation</h1>
      {otherParticipants.length > 0 && (
        <p className="mb-0.5 text-sm text-gray-500">
          Avec : {otherParticipants.map((p) => p.profile?.full_name).filter(Boolean).join(", ")}
        </p>
      )}
      {conversation?.project?.title && (
        <p className="mb-1 text-xs text-gray-400">Projet : {conversation.project.title}</p>
      )}
      {conversation?.regarding?.profiles?.full_name && (
        <p className="mb-2 text-sm text-gray-500">
          Au sujet de : <strong className="text-ink">{conversation.regarding.profiles.full_name}</strong>
        </p>
      )}

      {addableCandidates.length > 0 && (
        <form action={addConversationParticipant} className="mb-3 flex items-center gap-2 text-sm">
          <input type="hidden" name="conversationId" value={id} />
          <label className="text-gray-500">Ajouter à la discussion :</label>
          <select name="userId" className="rounded-lg border border-gray-300 p-1.5" required>
            <option value="">Choisir un professionnel…</option>
            {addableCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.trade})
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium text-ink hover:bg-gray-200">
            Ajouter
          </button>
        </form>
      )}

      {searchParams?.error && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {searchParams.error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-card p-4">
        {!messagesWithDocs || messagesWithDocs.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun message. Écris le premier !
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messagesWithDocs.map((m) => (
              <div
                key={m.id}
                className={`max-w-xs rounded-lg p-3 text-sm ${
                  m.sender_id === user.id
                    ? "ml-auto bg-brand text-white"
                    : "bg-gray-100"
                }`}
              >
                {participants.length > 2 && m.sender_id !== user.id && (
                  <p className={`mb-1 text-[10px] font-bold ${m.sender_id === user.id ? "text-white/70" : "text-gray-400"}`}>
                    {m.sender?.full_name}
                  </p>
                )}
                {m.audio_url ? (
                  <audio controls src={m.audio_url} className="h-10 w-56" />
                ) : m.content ? (
                  <p>{m.content}</p>
                ) : null}
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
