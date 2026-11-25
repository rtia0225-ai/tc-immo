"use client";

import { useRouter, usePathname } from "next/navigation";

// Bouton "Retour" présent sur toutes les pages du site (ajouté dans
// app/layout.js, juste sous la barre de navigation) : la personne peut
// toujours revenir à la page précédente, quelle que soit la page où elle
// se trouve, sans avoir à utiliser le bouton retour du navigateur.
// Cf. consigne Rose du 2026-11-25.
export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Sur l'accueil, il n'y a pas de "page précédente" du site vers laquelle
  // revenir : on masque le bouton uniquement là.
  if (pathname === "/") return null;

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Arrivée directe sur la page (lien externe, nouvel onglet) : pas
      // d'historique à dérouler, on ramène à l'accueil plutôt que de ne
      // rien faire.
      router.push("/");
    }
  }

  return (
    <div className="border-b border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 py-2 text-sm font-medium text-gray-500 hover:text-ink"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.56l4.22 4.22a.75.75 0 11-1.06 1.06l-5.5-5.5a.75.75 0 010-1.06l5.5-5.5a.75.75 0 111.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Retour
        </button>
      </div>
    </div>
  );
}
