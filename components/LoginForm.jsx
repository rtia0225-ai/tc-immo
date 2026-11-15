"use client";

import Link from "next/link";
import PasswordField from "@/components/PasswordField";

// Empêche la validation automatique du formulaire : avec l'autocomplétion du
// navigateur, remplir l'identifiant déclenchait une soumission immédiate dès
// la touche "Entrée" (ou l'auto-remplissage), avant que la personne ait pu
// vérifier ou corriger les champs. Désormais, seul un clic explicite sur
// "Se connecter" envoie le formulaire.
export default function LoginForm({ login, redirectTo }) {
  function blockEnterSubmit(e) {
    if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
    }
  }

  return (
    <form action={login} onKeyDown={blockEnterSubmit} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo} />
      <div>
        <label className="mb-1 block text-sm font-medium">Email ou numéro de téléphone</label>
        <input
          type="text"
          name="identifier"
          required
          placeholder="email@exemple.com ou 07 00 00 00 00"
          className="w-full rounded-lg border border-gray-300 p-2"
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium">Mot de passe</label>
          <Link href="/auth/forgot-password" className="text-xs text-brand hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <PasswordField />
      </div>
      <button type="submit" className="mt-2 rounded-lg bg-brand py-3 font-heading font-bold text-white hover:bg-brand-dark">
        Se connecter
      </button>
    </form>
  );
}
