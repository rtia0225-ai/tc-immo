"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tc-immo-cookie-consent"; // "accepted" | "refused"
const GA_ID = "G-53TV4ZCT7Q";

function loadAnalytics() {
  if (document.getElementById("ga-script")) return;
  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", GA_ID);
  window.gtag = gtag;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "accepted") {
      loadAnalytics();
    } else if (stored !== "refused") {
      setVisible(true);
    }

    // Permet au lien "Gérer mes cookies" du pied de page de rouvrir ce
    // bandeau, où qu'on soit sur le site.
    const reopen = () => {
      setCustomizing(false);
      setVisible(true);
    };
    window.addEventListener("tc-immo:open-cookie-settings", reopen);
    return () => window.removeEventListener("tc-immo:open-cookie-settings", reopen);
  }, []);

  const acceptAll = () => {
    window.localStorage.setItem(STORAGE_KEY, "accepted");
    loadAnalytics();
    setVisible(false);
  };

  const refuseAll = () => {
    window.localStorage.setItem(STORAGE_KEY, "refused");
    setVisible(false);
  };

  const saveCustom = () => {
    window.localStorage.setItem(STORAGE_KEY, analyticsChoice ? "accepted" : "refused");
    if (analyticsChoice) loadAnalytics();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:px-6">
      <div className="mx-auto max-w-4xl">
        {!customizing ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              Ce site utilise des cookies de mesure d'audience (Google Analytics) pour améliorer la plateforme. Vous pouvez les accepter, les refuser ou les paramétrer. Les cookies strictement nécessaires au fonctionnement du site sont toujours actifs.{" "}
              <a href="/confidentialite" className="text-brand underline">En savoir plus</a>
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setCustomizing(true)}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-ink hover:bg-gray-200"
              >
                Personnaliser
              </button>
              <button
                type="button"
                onClick={refuseAll}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-ink hover:bg-gray-200"
              >
                Tout refuser
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark"
              >
                Tout accepter
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <p className="text-sm font-bold text-ink">Cookies nécessaires</p>
                <p className="text-xs text-gray-500">Indispensables au fonctionnement du site, toujours actifs.</p>
              </div>
              <span className="text-xs font-semibold text-gray-400">Toujours actif</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <p className="text-sm font-bold text-ink">Mesure d'audience</p>
                <p className="text-xs text-gray-500">Google Analytics, pour comprendre l'usage du site.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={analyticsChoice}
                  onChange={(e) => setAnalyticsChoice(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-brand" />
                <div className="absolute left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomizing(false)}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-ink hover:bg-gray-200"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={saveCustom}
                className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark"
              >
                Enregistrer mes choix
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
