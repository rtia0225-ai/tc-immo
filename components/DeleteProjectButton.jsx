"use client";

import { deleteProject } from "@/app/projects/actions";

// Bouton de suppression définitive d'un projet — réservé à l'admin,
// pour nettoyer les projets créés pendant les tests. Confirmation
// obligatoire avant d'envoyer, pour éviter un clic malheureux.
export default function DeleteProjectButton({ projectId, projectTitle }) {
  return (
    <form
      action={deleteProject}
      onSubmit={(e) => {
        if (!confirm(`Supprimer définitivement "${projectTitle || "ce projet"}" ? Cette action est irréversible.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <button
        type="submit"
        title="Supprimer ce projet (admin, test)"
        className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-gray-400 hover:bg-red-50 hover:text-red-600"
      >
        🗑️
      </button>
    </form>
  );
}
