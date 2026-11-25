"use client";

import { useEffect, useState } from "react";
import { completeOnboarding } from "@/app/dashboard/actions";

// Vrai tutoriel guidé (type "product tour") : chaque étape pointe un
// encadré lumineux directement sur l'élément réel de la page (le lien
// "Mes infos", le lien "Mon profil", les onglets...), avec une bulle de
// texte qui suit, au lieu d'un simple pavé de texte au milieu de l'écran.
// Cf. consigne Rose du 2026-11-25 : "ça doit montrer sur la page, pas
// juste un cadre qu'on lit au début."
const STEPS = [
  {
    target: "welcome",
    title: "Bienvenue sur TCHolding-Immo",
    body: "Vous êtes inscrit comme professionnel. Ce petit tour vous montre où trouver ce dont vous avez besoin pour démarrer.",
  },
  {
    target: "mes-infos",
    title: "Mes infos",
    body: "Ici : votre identité, téléphone, adresse, pièce d'identité, et le moyen de paiement sur lequel vous recevrez l'argent des clients. Rien de tout cela n'est jamais visible par un client.",
  },
  {
    target: "mon-profil",
    title: "Mon profil",
    body: "Ici, à l'inverse : ce que voit un client qui consulte votre fiche — votre métier, votre présentation, votre zone d'intervention, vos photos de réalisations. C'est votre vitrine.",
  },
  {
    target: "tabs",
    title: "Vos projets et rendez-vous",
    body: "Une fois contacté par un client, retrouvez tout ici : messages, rendez-vous, projets en cours et vos paiements à chaque étape terminée.",
  },
];

const PADDING = 6;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_ESTIMATED_HEIGHT = 170;
const MARGIN = 12;

export default function OnboardingTutorial() {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  useEffect(() => {
    let frame = null;

    function recalc() {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    }

    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Laisse le temps au scroll fluide de se terminer avant de mesurer
      // la position finale de l'élément.
      frame = setTimeout(recalc, 350);
    } else {
      setRect(null);
    }

    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      if (frame) clearTimeout(frame);
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [current.target]);

  async function finish() {
    await completeOnboarding();
  }

  // Position de la bulle : sous l'élément si la place le permet, sinon
  // au-dessus ; toujours gardée dans les limites de l'écran.
  let tooltipStyle = {};
  if (rect && typeof window !== "undefined") {
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow > TOOLTIP_ESTIMATED_HEIGHT + MARGIN;
    const top = placeBelow ? rect.bottom + MARGIN : rect.top - TOOLTIP_ESTIMATED_HEIGHT - MARGIN;
    const left = Math.min(
      Math.max(rect.left, MARGIN),
      window.innerWidth - TOOLTIP_WIDTH - MARGIN
    );
    tooltipStyle = { top: Math.max(top, MARGIN), left };
  }

  return (
    <>
      {/* Bloque les clics sur le reste de la page pendant le tutoriel. */}
      <div className="fixed inset-0 z-40" onClick={(e) => e.preventDefault()} />

      {/* Halo lumineux sur l'élément ciblé : tout le reste de l'écran est
          assombri grâce à un box-shadow géant, l'élément reste visible. */}
      {rect && (
        <div
          className="fixed z-40 rounded-lg transition-all duration-300"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            outline: "2px solid #9F0F2E",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Sans élément ciblé (étape d'accueil si introuvable) : fond assombri simple. */}
      {!rect && <div className="fixed inset-0 z-40 bg-black/60" />}

      {/* Bulle de texte, positionnée près de l'élément surligné (ou centrée
          à défaut). */}
      <div
        className={`fixed z-50 w-[90vw] max-w-[320px] rounded-lg bg-white p-4 shadow-xl ${
          rect ? "" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
        style={rect ? tooltipStyle : undefined}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
          Étape {step + 1}/{STEPS.length}
        </p>
        <h2 className="mt-1 font-heading text-base font-bold text-ink">{current.title}</h2>
        <p className="mt-1.5 text-sm text-gray-600">{current.body}</p>

        <div className="mt-3 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`text-sm font-medium text-gray-400 hover:text-ink ${step === 0 ? "invisible" : ""}`}
          >
            Précédent
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={finish}
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              C'est parti
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Suivant
            </button>
          )}
        </div>

        {!isLast && (
          <button
            type="button"
            onClick={finish}
            className="mt-2 w-full text-center text-xs text-gray-400 underline hover:text-gray-600"
          >
            Passer le tutoriel
          </button>
        )}
      </div>
    </>
  );
}
