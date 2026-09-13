"use client";

import { useState, useEffect } from "react";
import { saveSubscription } from "@/lib/pushActions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function InstallAssistant({ loggedIn }) {
  const [dismissed, setDismissed] = useState(true);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [notifStatus, setNotifStatus] = useState("idle");

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem("tc-immo-install-dismissed");
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    setDismissed(!!alreadyDismissed || standalone);

    const handler = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || !loggedIn) return null;

  const close = () => {
    localStorage.setItem("tc-immo-install-dismissed", "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      await installPromptEvent.userChoice;
      setInstallPromptEvent(null);
    }
  };

  const handleActivateNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !VAPID_PUBLIC_KEY) {
      setNotifStatus("error");
      return;
    }
    setNotifStatus("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotifStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const result = await saveSubscription(JSON.parse(JSON.stringify(subscription)));
      setNotifStatus(result?.error ? "error" : "done");
    } catch {
      setNotifStatus("error");
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-4 shadow-lg">
      <div className="mx-auto flex max-w-2xl items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <p className="text-sm font-bold text-ink">Installe l'application TC-Immo</p>
            {isIos && !isStandalone ? (
              <p className="mt-0.5 text-xs text-gray-500">
                Appuie sur <strong>Partager</strong> puis <strong>"Sur l'écran d'accueil"</strong> pour l'installer.
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-gray-500">
                Reçois une alerte dès qu'un client t'écrit ou qu'un rendez-vous est proposé — comme WhatsApp.
              </p>
            )}
          </div>
        </div>
        <button onClick={close} aria-label="Fermer" className="shrink-0 text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      <div className="mx-auto mt-3 flex max-w-2xl gap-2">
        {!isIos && installPromptEvent && (
          <button
            onClick={handleInstall}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Installer l'application
          </button>
        )}
        <button
          onClick={handleActivateNotifications}
          disabled={notifStatus === "loading" || notifStatus === "done"}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-ink hover:bg-gray-50 disabled:opacity-50"
        >
          {notifStatus === "done" ? "Notifications activées ✓" : "Activer les notifications"}
        </button>
      </div>
      {notifStatus === "denied" && (
        <p className="mx-auto mt-2 max-w-2xl text-xs text-brand">
          Autorisation refusée — tu peux l'activer plus tard dans les réglages de ton navigateur.
        </p>
      )}
    </div>
  );
}
