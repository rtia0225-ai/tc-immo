"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Navbar({ user, isAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const handler = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      await installPromptEvent.userChoice;
      setInstallPromptEvent(null);
    } else if (isIos) {
      alert("Pour installer l'application : appuie sur le bouton \"Partager\" de ton navigateur, puis \"Sur l'écran d'accueil\".");
    }
  };

  const showInstallButton = !isStandalone && (installPromptEvent || isIos);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Ouvrir le menu"
            className="flex h-9 w-9 items-center justify-center text-ink hover:text-brand"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-navbar.png" alt="TC-Immo" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {showInstallButton && (
            <button
              type="button"
              onClick={handleInstall}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-forest px-2.5 py-2 text-xs font-bold text-forest hover:bg-forest-light"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              <span className="hidden sm:inline">Télécharger l'app</span>
              <span className="sm:hidden">App</span>
            </button>
          )}
          <a href="tel:+2250000000000" aria-label="Appeler" className="flex h-9 w-9 items-center justify-center text-ink hover:text-brand">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </a>
          {isAdmin && (
            <Link
              href="/admin/artisans"
              className="rounded-md border border-ink px-3 py-2 text-xs font-bold text-ink hover:bg-gray-50"
            >
              Admin
            </Link>
          )}
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Mon espace
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="whitespace-nowrap rounded-md bg-brand px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-dark sm:text-sm"
            >
              Connexion / Inscription
            </Link>
          )}
        </div>
      </nav>

      {menuOpen && (
        <>
          {/* Zone invisible : toucher n'importe où ailleurs referme le menu */}
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-20 cursor-default"
          />
          <div className="relative z-30 border-t border-gray-100 bg-white px-4 py-3">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 text-sm font-medium text-ink">
              <Link href="/a-propos" className="rounded px-2 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                À propos
              </Link>
              <Link href="/comment-ca-marche" className="rounded px-2 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Comment ça marche
              </Link>
              <Link href="/ressources" className="rounded px-2 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                Ressources
              </Link>
              <Link href="/faq" className="rounded px-2 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                FAQ
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
