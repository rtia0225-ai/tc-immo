"use client";

import { useFormStatus } from "react-dom";

// Désactive le bouton pendant l'envoi : sans ça, un clic répété (réseau
// lent, personne qui doute d'avoir bien cliqué) renvoyait le formulaire
// plusieurs fois et créait des doublons (ex: plusieurs copies du même
// projet). À utiliser à la place d'un <button type="submit"> simple sur
// tout formulaire qui crée ou modifie quelque chose.
export default function SubmitButton({ children, pendingLabel, className }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingLabel || "Envoi en cours…" : children}
    </button>
  );
}
