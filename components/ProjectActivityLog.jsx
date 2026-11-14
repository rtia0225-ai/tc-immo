"use client";

import { useState, useRef } from "react";
import { submitTechnicianReport } from "@/app/projects/activityActions";
import { createClient } from "@/lib/supabase/client";
import FileInputButton from "@/components/FileInputButton";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

// Rapports d'avancement libres (photos/vidéos + notes) envoyés par le
// technicien sur le chantier. Les ajouts imprévus (paiement, document,
// rendez-vous, autre) se font directement sur la ligne du parcours
// (ProjectJourney), au "+" entre deux étapes — plus ici.
export default function ProjectActivityLog({ projectId, progressReports, isArtisan, currentUserId }) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const formRef = useRef(null);

  // Les vidéos passent directement du navigateur vers le stockage
  // Supabase, SANS transiter par le serveur Next.js : un Server Action a
  // une limite de taille de requête bien trop basse pour une vidéo (1 Mo
  // par défaut), ce qui faisait échouer l'envoi avant même d'atteindre le
  // code côté serveur. Seuls les chemins déjà uploadés (du texte, donc
  // minuscules) sont ensuite transmis au Server Action pour créer les
  // lignes en base.
  async function handleSubmit(e) {
    e.preventDefault();
    setUploadError("");
    const form = e.target;
    const notes = form.notes.value;
    const files = Array.from(form.media.files || []).filter((f) => f && f.size > 0);

    setUploading(true);
    try {
      const supabase = createClient();
      const uploaded = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "bin";
        // [2] du chemin doit être l'id de l'utilisateur connecté : c'est
        // ce que vérifie la policy RLS d'upload sur ce bucket.
        const path = `${projectId}/${currentUserId}/reports/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("project-deliverables")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          throw new Error(`"${file.name}" n'a pas pu être envoyé : ${error.message}`);
        }
        uploaded.push({ path, type: file.type.startsWith("video/") ? "video" : "image" });
      }

      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("notes", notes);
      fd.set("media", JSON.stringify(uploaded));
      await submitTechnicianReport(fd);
    } catch (err) {
      // Le Server Action redirige en cas de succès (redirect() lève une
      // erreur spéciale que Next.js intercepte lui-même pour naviguer) —
      // à laisser passer, ce n'est pas un échec.
      if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
      setUploading(false);
      setUploadError(err.message || "L'envoi a échoué, merci de réessayer.");
    }
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-card">
      <div className="flex items-center justify-between bg-forest px-5 py-4">
        <h2 className="font-heading text-lg font-bold text-white">Rapports d'avancement</h2>
        {isArtisan && (
          <button
            type="button"
            onClick={() => setShowReportForm((v) => !v)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-forest hover:bg-gray-100"
          >
            📸 Envoyer un rapport
          </button>
        )}
      </div>

      <div className="bg-[#FAF8F3] p-5">
        {showReportForm && (
          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-500">Rapport d'avancement (photos/vidéos + notes)</p>
            <FileInputButton name="media" accept="image/*,video/*" multiple label="Ajouter des photos/vidéos" compress />
            <textarea
              name="notes"
              placeholder="Notes sur l'avancement..."
              rows={3}
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
            <button
              type="submit"
              disabled={uploading}
              className="w-fit rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {uploading ? "Envoi en cours..." : "Envoyer le rapport"}
            </button>
          </form>
        )}

        {progressReports?.length > 0 ? (
          <div className={showReportForm ? "mt-4 flex flex-col gap-3" : "flex flex-col gap-3"}>
            {progressReports.map((r) => (
              <div key={r.id} className="rounded-lg bg-white p-3 shadow-card">
                <p className="text-xs font-semibold text-gray-500">
                  Rapport de {r.technician?.full_name} — {formatDate(r.created_at)}
                </p>
                {r.notes && <p className="mt-1 text-sm text-gray-700">{r.notes}</p>}
                {r.technician_report_media?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.technician_report_media.map((m, i) => (
                      m.signedUrl ? (
                        <a key={i} href={m.signedUrl} target="_blank" rel="noreferrer" className="text-xs text-brand underline">
                          {m.media_type === "video" ? "🎥 Vidéo" : "📷 Photo"} {i + 1}
                        </a>
                      ) : (
                        <span key={i} className="text-xs text-gray-400">
                          {m.media_type === "video" ? "🎥 Vidéo" : "📷 Photo"} {i + 1} (indisponible)
                        </span>
                      )
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !showReportForm && <p className="text-sm text-gray-500">Aucun rapport pour le moment.</p>
        )}
      </div>
    </div>
  );
}
