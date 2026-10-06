"use client";

import { useState } from "react";
import Link from "next/link";

// Chaque étape connaît sa question et calcule elle-même la prochaine
// étape à afficher, selon la réponse donnée, permet de vraiment sauter
// des questions (pas juste les ignorer après coup).
const STEPS = {
  loti: {
    question: "Votre terrain est-il loti ?",
    options: [
      { value: "oui", label: "Oui, il est dans un lotissement reconnu" },
      { value: "non", label: "Non, il n'est pas loti" },
    ],
    next: (value) => (value === "non" ? "decline" : "titre"),
  },
  titre: {
    question: "Quel type de titre avez-vous sur ce terrain ?",
    options: [
      { value: "provisoire", label: "Un titre provisoire (attestation villageoise, lettre d'attribution...)" },
      { value: "permanent", label: "Un titre permanent (ACD ou Titre Foncier)" },
    ],
    // Avec un titre provisoire, impossible d'avoir un Certificat
    // d'Urbanisme, inutile de poser la question, on saute directement
    // à la suite.
    next: (value) => (value === "provisoire" ? "construction" : "cu"),
  },
  cu: {
    question: "Avez-vous déjà le Certificat d'Urbanisme (CU) ?",
    options: [
      { value: "oui", label: "Oui, je l'ai déjà" },
      { value: "non", label: "Non, pas encore" },
    ],
    next: () => "construction",
  },
  construction: {
    question: "Que souhaitez-vous construire ?",
    options: [
      { value: "simple", label: "Une maison d'habitation simple (villa basse ou duplex R+1)" },
      { value: "grand", label: "Un grand bâtiment (immeuble R+2 ou plus, sous-sol, local commercial)" },
    ],
    next: () => "result",
  },
};

const FIRST_STEP = "loti";

// Construit la feuille de route complète, avec une courte explication de
// ce que fait chaque professionnel à chaque étape.
function buildRoadmap(answers) {
  const steps = [];

  if (answers.titre === "provisoire") {
    steps.push({
      title: "Obtenir un titre permanent (ACD)",
      text: "Un titre provisoire ne suffit pas pour la suite des démarches, il faut d'abord le faire transformer en titre permanent.",
      professional: {
        trade: "Topographe",
        note: "Le géomètre-topographe prend en charge toute la procédure ACD : bornage du terrain, montage du dossier technique et dépôt auprès de l'État. Ses honoraires se discutent directement avec lui.",
      },
    });
  }

  if (answers.titre === "provisoire" || answers.cu === "non") {
    steps.push({
      title: "Obtenir le Certificat d'Urbanisme (CU)",
      text: "Ce document confirme officiellement ce qu'il est permis de construire sur ce terrain précis.",
      professional: {
        trade: "Topographe",
        note: "Le géomètre-topographe s'occupe aussi de toute la procédure du Certificat d'Urbanisme : plans topographiques officiels et dépôt du dossier. Ses honoraires se discutent directement avec lui.",
      },
    });
  }

  if (answers.construction === "simple") {
    steps.push({
      title: "Concevoir les plans et déposer le Permis de Construire",
      text: "L'architecte mène cette démarche en votre nom. Le terrain et le permis restent bien à vous, et une fois obtenu, il livre le Permis de Construire directement sur la plateforme.",
      professional: {
        trade: "Architecture",
        note: "L'architecte dessine les plans réglementaires de la maison, dépose le dossier en votre nom, et remet le Permis de Construire obtenu sur TCHolding-Immo.",
      },
    });
  } else if (answers.construction === "grand") {
    steps.push({
      title: "Étudier le sol, concevoir les plans et déposer le Permis de Construire",
      text: "Un bâtiment de plusieurs étages demande en plus une étude technique de solidité avant le dépôt du dossier. L'architecte mène cette démarche en votre nom et livre le Permis de Construire directement sur la plateforme une fois obtenu.",
      professional: [
        {
          trade: "Architecture",
          note: "L'architecte dessine les plans réglementaires, dépose le dossier en votre nom, et remet le Permis de Construire obtenu sur TCHolding-Immo.",
        },
        {
          trade: "Ingénieur génie civil",
          note: "L'ingénieur calcule la résistance du sol et la solidité de la structure (béton, ferraillage).",
        },
      ],
    });
  }

  steps.push({
    title: "Trouver un technicien BTP pour la construction",
    text: "Une fois le Permis de Construire obtenu, c'est lui qui prend en charge la construction de votre maison de bout en bout.",
    professional: {
      trade: "Technicien BTP",
      note: "Le technicien BTP trouve et coordonne les maçons et autres corps de métier nécessaires, et supervise le chantier jusqu'à la livraison.",
    },
  });

  return steps;
}

export default function ConstructionWizard() {
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(FIRST_STEP);
  const [history, setHistory] = useState([]); // pile des étapes précédentes, pour "← Question précédente"
  const [answers, setAnswers] = useState({});

  const choose = (value) => {
    const step = STEPS[currentStep];
    const nextKey = step.next(value);
    setAnswers((a) => ({ ...a, [currentStep]: value }));
    setHistory((h) => [...h, currentStep]);
    setCurrentStep(nextKey);
  };

  const goBack = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrentStep(prev);
  };

  const restart = () => {
    setAnswers({});
    setHistory([]);
    setCurrentStep(FIRST_STEP);
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-white/30 bg-black/30 p-6 text-center shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z" />
          </svg>
        </div>
        <h2 className="font-heading mt-3 text-xl font-bold text-white">
          Vous ne savez pas par où commencer ?
        </h2>
        <p className="mt-2 text-sm text-white/85">
          Répondez à quelques questions sur votre terrain et votre projet. On vous montre toute la feuille de route, du terrain jusqu'à la construction et au suivi de chantier à distance, avec le bon professionnel à contacter à chaque étape.
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="mt-5 rounded-lg bg-forest px-6 py-3 font-heading text-sm font-bold text-white hover:bg-forest-dark"
        >
          Trouver ma démarche
        </button>
      </div>
    );
  }

  const isDecline = currentStep === "decline";
  const isResult = currentStep === "result";
  const isQuestion = !isDecline && !isResult;
  const step = isQuestion ? STEPS[currentStep] : null;
  const roadmap = isResult ? buildRoadmap(answers) : [];

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-white/30 bg-black/30 p-6 text-left shadow-2xl backdrop-blur-md sm:p-8">
      {isQuestion && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Étape {history.length + 1}
            </p>
            <h3 className="font-heading mt-2 text-lg font-bold text-white">
              {step.question}
            </h3>
            <div className="mt-4 flex flex-col gap-2">
              {step.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => choose(opt.value)}
                  className="rounded-lg border border-white/30 bg-white/10 p-3 text-left text-sm text-white hover:border-white hover:bg-white/20"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="mt-4 text-xs text-white/70 hover:text-white"
              >
                ← Question précédente
              </button>
            )}
          </>
        )}

        {isDecline && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Merci pour votre réponse
            </p>
            <h3 className="font-heading mt-2 text-lg font-bold text-white">
              Nous ne pouvons pas encore vous accompagner pour ce terrain
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              Un terrain non loti demande d'abord ses propres démarches de lotissement, en dehors de ce que TCHolding-Immo prend en charge pour le moment. Nous vous conseillons de contacter votre propre géomètre-topographe pour entamer cette étape.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Une fois votre terrain loti, revenez avec plaisir pour la suite de votre projet, on sera là pour vous accompagner.
            </p>
            <div className="mt-5 flex gap-4">
              <button
                type="button"
                onClick={goBack}
                className="text-xs text-white/70 hover:text-white"
              >
                ← Question précédente
              </button>
              <button
                type="button"
                onClick={restart}
                className="text-xs text-white/70 hover:text-white"
              >
                Recommencer
              </button>
            </div>
          </>
        )}

        {isResult && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Votre feuille de route
            </p>
            <h3 className="font-heading mt-2 text-lg font-bold text-white">
              {roadmap.length === 0
                ? "Vous êtes déjà prêt·e à déposer votre Permis de Construire."
                : `Voici les ${roadmap.length} étape${roadmap.length > 1 ? "s" : ""} qu'il vous reste, jusqu'à la construction et au suivi de chantier à distance`}
            </h3>

            <div className="mt-4 flex flex-col gap-4">
              {roadmap.map((s, i) => {
                const pros = Array.isArray(s.professional) ? s.professional : [s.professional];
                return (
                  <div key={s.title} className="border-l-2 border-white/40 pl-4">
                    <p className="text-xs font-semibold text-white/70">Étape {i + 1}</p>
                    <p className="font-heading font-bold text-white">{s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/85">{s.text}</p>
                    {pros.map((p) => (
                      <p key={p.trade} className="mt-2 text-xs text-white/70">
                        <strong className="text-white">{p.trade}</strong> : {p.note}
                      </p>
                    ))}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pros.map((p) => (
                        <Link
                          key={p.trade}
                          href={`/artisans?trade=${encodeURIComponent(p.trade)}`}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
                        >
                          Voir les {p.trade.toLowerCase()}s
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex gap-4">
              <button
                type="button"
                onClick={goBack}
                className="text-xs text-white/70 hover:text-white"
              >
                ← Question précédente
              </button>
              <button
                type="button"
                onClick={restart}
                className="text-xs text-white/70 hover:text-white"
              >
                Recommencer
              </button>
            </div>
          </>
        )}
    </div>
  );
}
