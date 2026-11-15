"use client";

import { useRef, useState } from "react";
import { sendMessage } from "@/app/messages/actions";
import { createClient } from "@/lib/supabase/client";

// Même principe que pour les rapports d'avancement : le document part
// directement du navigateur vers le stockage (pas de limite de 1 Mo du
// Server Action), et seul son chemin est transmis ensuite. Le trombone ne
// s'affiche que dans une discussion liée à un projet (c'est là que le
// document a un endroit où être rangé).
export default function ConversationMessageForm({ conversationId, projectId, currentUserId }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const form = e.target;
    const content = form.content.value;
    const file = form.document?.files?.[0];

    if (!content.trim() && !(file && file.size > 0)) return;

    setSending(true);
    try {
      let documentUrl = null;
      let documentType = null;
      if (file && file.size > 0 && projectId) {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "bin";
        const path = `${projectId}/${currentUserId}/messages/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("project-deliverables")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(`Le document n'a pas pu être envoyé : ${uploadError.message}`);
        documentUrl = path;
        documentType = file.type;
      }

      const fd = new FormData();
      fd.set("conversationId", conversationId);
      fd.set("content", content);
      if (documentUrl) {
        fd.set("documentUrl", documentUrl);
        fd.set("documentType", documentType || "");
      }
      await sendMessage(fd);
      formRef.current?.reset();
    } catch (err) {
      if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
      setSending(false);
      setError(err.message || "L'envoi a échoué, merci de réessayer.");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <form ref={formRef} onSubmit={handleSubmit} className="flex items-center gap-2">
        {projectId && (
          <label
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-gray-100 text-sm hover:bg-gray-200"
            title="Joindre un document"
          >
            📎
            <input type="file" name="document" className="hidden" />
          </label>
        )}
        <input
          id="conversation-message-input"
          name="content"
          placeholder="Écrivez votre message..."
          className="flex-1 rounded-lg border border-gray-300 p-2"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {sending ? "..." : "Envoyer"}
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
