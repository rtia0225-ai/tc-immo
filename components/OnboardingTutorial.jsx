"use client";

import { useState } from "react";
import { completeOnboarding } from "@/app/dashboard/actions";

// Petit tutoriel affiché une seule fois à un professionnel, à sa première
// connexion (ou juste après son inscription) : où aller, comment la
// plateforme fonctionne, et surtout la différence entre "Mes infos" (ses
// informations personnelles, jamais visibles du client) et "Mon profil"
// (sa vitrine, ce que voit le client). Cf. consigne Rose du 2026-11-25.
const STEPS = [
  {
    title: "Bienvenue sur TCHolding-Immo",
    body: "Vous êtes inscrit comme professionnel sur la plateforme. Ce petit tour de 4 étapes vous montre où trouver ce dont vous avez besoin pour démarrer.",
  },
  {
    title: "Mes infos",
    body: "C'est ici que vous renseignez votre identité : nom, téléphone, adresse, pièce d'identité, et le moyen de paiement sur lequel vous recevrez l'argent des clients. Rien de tout cela n'est jamais visible par un client.",
  },
  {
    title: "Mon profil",
    body: "C'est ici, à l'inverse, que vous renseignez ce que voit un client qui consulte votre fiche : votre métier, votre présentation, votre zone d'intervention, vos photos de réalisations. C'est votre vitrine sur la plateforme.",
  },
  {
    title: "Vos projets et rendez-vous",
    body: "Une fois contacté par un client, retrouvez tout dans votre tableau de bord : messages, rendez-vous, projets en cours et vos paiements à chaque étape terminée.",
  },
];

export default function OnboardingTutorial() {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">
          Étape {step + 1}/{STEPS.length}
        </p>
        <h2 className="mt-1 font-heading text-lg font-bold text-ink">{current.title}</h2>
        <p className="mt-2 text-sm text-gray-600">{current.body}</p>

        <div className="mt-4 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`text-sm font-medium text-gray-400 hover:text-ink ${step === 0 ? "invisible" : ""}`}
          >
            Précédent
          </button>

          {isLast ? (
            <form action={completeOnboarding}>
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark"
              >
                C'est parti
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Suivant
            </button>
          )}
        </div>

        {!isLast && (
          <form action={completeOnboarding} className="mt-3 text-center">
            <button type="submit" className="text-xs text-gray-400 underline hover:text-gray-600">
              Passer le tutoriel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
