"use client";

import { useState } from "react";

// Capture la position GPS et la place dans deux champs cachés du
// formulaire parent (ne sauvegarde rien elle-même — c'est le formulaire
// englobant qui envoie tout ensemble à la soumission).
export default function GpsCaptureButton({ latName = "latitude", lngName = "longitude" }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [coords, setCoords] = useState(null);

  const handleCapture = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("done");
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      {coords && (
        <>
          <input type="hidden" name={latName} value={coords.lat} />
          <input type="hidden" name={lngName} value={coords.lng} />
        </>
      )}
      <button
        type="button"
        onClick={handleCapture}
        disabled={status === "loading"}
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-ink hover:bg-gray-50 disabled:opacity-50"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {status === "loading" && "Localisation en cours..."}
        {status === "idle" && "Marquer ma position actuelle"}
        {status === "done" && "Position enregistrée ✓"}
        {status === "error" && "Réessayer"}
      </button>
      <p className="mt-1 text-xs text-gray-500">
        À faire idéalement en étant physiquement sur le terrain.
      </p>
    </div>
  );
}
