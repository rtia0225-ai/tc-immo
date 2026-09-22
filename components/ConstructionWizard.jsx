"use client";

import { useState } from "react";
import Link from "next/link";

// Chaque étape connaît sa question et calcule elle-même la prochaine
// étape à afficher, selon la réponse donnée — permet de vraiment sauter
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
    // d'Urbanisme — inutile de poser la question, on saute directement
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
      text: "Un titre provisoire ne suffit pas pour la suite des démarches — il faut d'abord le faire transformer en titre permanent.",
      professional: {
        trade: "Topographe",
        note: "Le topographe borne officiellement le terrain et monte le dossier technique pour obtenir l'ACD auprès de l'État.",
      },
    });
  }

  if (answers.titre === "provisoire" || answers.cu === "non") {
    steps.push({
      title: "Obtenir le Certificat d'Urbanisme (CU)",
      text: "Ce document confirme officiellement ce qu'il est permis de construire sur ce terrain précis.",
      professional: {
        trade: "Topographe",
        note: "Il prépare et imprime les plans topographiques officiels nécessaires à la demande du CU.",
      },
    });
  }

  if (answers.construction === "simple") {
    steps.push({
      title: "Concevoir les plans et déposer le Permis de Construire",
      text: "L'architecte mène cette démarche en votre nom — le terrain et le permis restent bien à toi. Une fois obtenu, il livre le Permis de Construire directement sur la plateforme.",
      professional: {
        trade: "Architecture",
        note: "L'architecte dessine les plans réglementaires de la maison, dépose le dossier en votre nom, et remet le Permis de Construire obtenu sur TC-Immo.",
      },
    });
  } else if (answers.construction === "grand") {
    steps.push({
      title: "Étudier le sol, concevoir les plans et déposer le Permis de Construire",
      text: "Un bâtiment de plusieurs étages demande en plus une étude technique de solidité avant le dépôt du dossier. L'architecte mène cette démarche en votre nom et livre le Permis de Construire directement sur la plateforme une fois obtenu.",
      professional: [
        {
          trade: "Architecture",
          note: "L'architecte dessine les plans réglementaires, dépose le dossier en votre nom, et remet le Permis de Construire obtenu sur TC-Immo.",
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
    text: "Une fois le Permis de Construire obtenu, c'est lui qui prend en charge la construction de ta maison de bout en bout.",
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
      <section className="border-b border-gray-100 bg-forest-light px-4 py-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-xl font-bold text-forest-dark">
            Vous ne savez pas par où commencer ?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Répondez à quelques questions sur votre terrain et votre projet — on vous montre toute la feuille de route jusqu'au permis de construire, avec le bon professionnel à contacter à chaque étape.
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-5 rounded-lg bg-forest px-6 py-3 font-heading text-sm font-bold text-white hover:bg-forest-dark"
          >
            Trouver ma démarche
          </button>
        </div>
      </section>
    );
  }

  const isDecline = currentStep === "decline";
  const isResult = currentStep === "result";
  const isQuestion = !isDecline && !isResult;
  const step = isQuestion ? STEPS[currentStep] : null;
  const roadmap = isResult ? buildRoadmap(answers) : [];

  return (
    <section className="border-b border-gray-100 bg-forest-light px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
        {isQuestion && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest">
              Étape {history.length + 1}
            </p>
            <h3 className="font-heading mt-2 text-lg font-bold text-ink">
              {step.question}
            </h3>
            <div className="mt-4 flex flex-col gap-2">
              {step.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => choose(opt.value)}
                  className="rounded-lg border border-gray-300 p-3 text-left text-sm hover:border-forest hover:bg-forest-light"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="mt-4 text-xs text-gray-500 hover:text-forest"
              >
                ← Question précédente
              </button>
            )}
          </>
        )}

        {isDecline && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest">
              Merci pour votre réponse
            </p>
            <h3 className="font-heading mt-2 text-lg font-bold text-ink">
              Nous ne pouvons pas encore vous accompagner pour ce terrain
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Un terrain non loti demande d'abord ses propres démarches de lotissement, en dehors de ce que TC-Immo prend en charge pour le moment. Nous te conseillons de contacter ton propre géomètre-topographe pour entamer cette étape.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Une fois ton terrain loti, reviens avec plaisir pour la suite de ton projet — on sera là pour t'accompagner.
            </p>
            <div className="mt-5 flex gap-4">
              <button
                type="button"
                onClick={goBack}
                className="text-xs text-gray-500 hover:text-forest"
              >
                ← Question précédente
              </button>
              <button
                type="button"
                onClick={restart}
                className="text-xs text-gray-500 hover:text-forest"
              >
                Recommencer
              </button>
            </div>
          </>
        )}

        {isResult && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest">
              Votre feuille de route
            </p>
            <h3 className="font-heading mt-2 text-lg font-bold text-ink">
              {roadmap.length === 0
                ? "Vous êtes déjà prêt·e à déposer votre Permis de Construire."
                : `Voici les ${roadmap.length} étape${roadmap.length > 1 ? "s" : ""} qu'il vous reste avant le Permis de Construire`}
            </h3>

            <div className="mt-4 flex flex-col gap-4">
              {roadmap.map((s, i) => {
                const pros = Array.isArray(s.professional) ? s.professional : [s.professional];
                return (
                  <div key={s.title} className="border-l-2 border-forest pl-4">
                    <p className="text-xs font-semibold text-forest">Étape {i + 1}</p>
                    <p className="font-heading font-bold text-ink">{s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">{s.text}</p>
                    {pros.map((p) => (
                      <p key={p.trade} className="mt-2 text-xs text-gray-500">
                        <strong className="text-ink">{p.trade}</strong> — {p.note}
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
                className="text-xs text-gray-500 hover:text-forest"
              >
                ← Question précédente
              </button>
              <button
                type="button"
                onClick={restart}
                className="text-xs text-gray-500 hover:text-forest"
              >
                Recommencer
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
