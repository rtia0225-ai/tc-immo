"use client";

import { useState } from "react";
import Link from "next/link";
import { STEPS, FIRST_STEP, buildRoadmap } from "@/lib/constructionRoadmap";

// Formulaire de demande du rapport détaillé par e-mail, affiché sous la
// feuille de route (étape "result"). Volontaire : la personne n'est
// jamais obligée de laisser son adresse pour voir sa feuille de route.
function ReportRequestForm({ answers }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/wizard-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data?.error || "Le rapport n'a pas pu être envoyé. Merci de réessayer.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setError("Le rapport n'a pas pu être envoyé. Merci de réessayer.");
    }
  };

  if (status === "sent") {
    return (
      <div className="mt-6 rounded-lg border border-white/30 bg-white/10 p-4">
        <p className="text-sm font-semibold text-white">Rapport envoyé !</p>
        <p className="mt-1 text-xs text-white/80">
          Vous allez recevoir à {email} un rapport détaillé sur ce que fait chaque professionnel et pourquoi chaque étape compte, du point de vue de la réglementation ivoirienne.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-white/30 bg-white/10 p-4">
      <p className="text-sm font-semibold text-white">Aller plus loin (facultatif)</p>
      <p className="mt-1 text-xs leading-relaxed text-white/80">
        Recevez par e-mail un rapport bien plus détaillé : ce que fait chaque acteur, et pourquoi chaque étape est nécessaire au regard de la réglementation ivoirienne.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="flex-1 rounded-lg border border-white/30 bg-white/90 px-3 py-2 text-sm text-ink placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="shrink-0 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {status === "sending" ? "Envoi..." : "Recevoir le rapport"}
        </button>
      </form>
      {status === "error" && <p className="mt-2 text-xs text-red-200">{error}</p>}
    </div>
  );
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

            <ReportRequestForm answers={answers} />

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
