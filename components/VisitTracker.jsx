"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const CONSENT_KEY = "tc-immo-cookie-consent";
const VISITOR_ID_KEY = "tc-immo-visitor-id";

function getOrCreateVisitorId() {
  try {
    let id = window.localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function hasConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

// Enregistre chaque page vue dans notre propre base (table page_views),
// pour le dashboard interne de fréquentation (/admin/analytics) — même
// logique que Google Analytics, mais chez nous, et soumis au même
// consentement cookies.
export default function VisitTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef(null);

  useEffect(() => {
    const track = () => {
      if (!hasConsent()) return;

      const fullPath = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
      if (lastPath.current === fullPath) return;

      const visitorId = getOrCreateVisitorId();
      if (!visitorId) return;

      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const referrer = lastPath.current || document.referrer || null;
      lastPath.current = fullPath;

      try {
        fetch("/api/track-visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: fullPath,
            referrer,
            visitorId,
            deviceType: isMobile ? "mobile" : "desktop",
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // tant pis, le tracking ne doit jamais gêner la navigation
      }
    };

    track();

    // Si le consentement vient juste d'être donné (bandeau cookies), on
    // enregistre immédiatement la page en cours sans attendre une
    // prochaine navigation.
    const onConsentUpdated = () => {
      lastPath.current = null;
      track();
    };
    window.addEventListener("tc-immo:consent-updated", onConsentUpdated);
    return () => window.removeEventListener("tc-immo:consent-updated", onConsentUpdated);
  }, [pathname, searchParams]);

  return null;
}
