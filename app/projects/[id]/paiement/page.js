import { redirect } from "next/navigation";

// Le paiement et l'échéancier sont désormais intégrés directement dans
// le parcours du projet (ProjectJourney, sur la page du projet) : plus
// besoin d'une page séparée qui dupliquait la même information.
export default function ProjectPaymentPage({ params }) {
  redirect(`/projects/${params.id}`);
}
