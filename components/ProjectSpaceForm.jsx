"use client";

import { useRef, useState } from "react";
import { sendProjectMessage } from "@/app/projects/espaceActions";
import { createClient } from "@/lib/supabase/client";

// Même principe que pour les rapports d'avancement : le document part
// directement du navigateur vers le stockage (pas de limite de 1 Mo du
// Server Action), et seul son chemin est transmis ensuite.
export default function ProjectSpaceForm({ projectId, currentUserId, isClient }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [professionalsOnly, setProfessionalsOnly] = useState(false);
  const formRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const form = e.target;
    const content = form.content.value;
    const file = form.document.files?.[0];

    setSending(true);
    try {
      let documentUrl = null;
      let documentType = null;
      if (file && file.size > 0) {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "bin";
        const path = `${projectId}/${currentUserId}/espace/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("project-deliverables")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(`Le document n'a pas pu être envoyé : ${uploadError.message}`);
        documentUrl = path;
        documentType = file.type;
      }

      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("content", content);
      if (documentUrl) {
        fd.set("documentUrl", documentUrl);
        fd.set("documentType", documentType || "");
      }
      if (professionalsOnly) fd.set("audience", "professionals");
      await sendProjectMessage(fd);
      formRef.current?.reset();
      setProfessionalsOnly(false);
    } catch (err) {
      if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
      setSending(false);
      setError(err.message || "L'envoi a échoué, merci de réessayer.");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-gray-100 pt-3">
      <textarea
        name="content"
        placeholder="Écrire dans l'espace projet..."
        rows={2}
        className="rounded-lg border border-gray-300 p-2 text-sm"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500 hover:text-brand">
            📎 Joindre un document
            <input type="file" name="document" className="hidden" />
          </label>
          {!isClient && (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={professionalsOnly}
                onChange={(e) => setProfessionalsOnly(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Entre professionnels (caché du client)
            </label>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {sending ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </form>
  );
}
