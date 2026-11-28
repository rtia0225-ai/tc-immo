"use client";

import { useState } from "react";

// Barème provisoire des honoraires d'ingénieur (étude de structure, plans
// et réseaux), à valider par les ingénieurs partenaires. Gardé ici dans des
// constantes faciles à modifier : un index par nombre d'étages (0 = plain-
// pied ... 4 = R+4 et plus).
const RATE_PER_M2 = [
  [1500, 2500], // Plain-pied
  [1800, 3000], // R+1
  [2200, 3500], // R+2
  [2500, 4000], // R+3
  [2800, 4500], // R+4 et plus
];
const MINIMUM_FEE = [
  [150000, 250000],
  [200000, 350000],
  [400000, 650000],
  [500000, 800000],
  [600000, 1000000],
];
// Coefficient [bas, haut] appliqué selon le niveau de finition.
const FINISH_COEFFICIENT = {
  eco: [0.9, 1],
  std: [1, 1],
  haut: [1.15, 1.25],
};
const EUR_TO_FCFA = 655.957;

const FLOOR_OPTIONS = [
  { value: 0, label: "Plain-pied (rez-de-chaussée)" },
  { value: 1, label: "R+1 (1 étage)" },
  { value: 2, label: "R+2 (2 étages)" },
  { value: 3, label: "R+3 (3 étages)" },
  { value: 4, label: "R+4 et plus" },
];
const ROOM_OPTIONS = [
  { value: 2, label: "2 pièces" },
  { value: 3, label: "3 pièces" },
  { value: 4, label: "4 pièces" },
  { value: 5, label: "5 pièces" },
  { value: 6, label: "6 pièces" },
  { value: 8, label: "7 à 8 pièces" },
  { value: 10, label: "9 à 10 pièces" },
  { value: 13, label: "11 à 15 pièces" },
  { value: 18, label: "16 à 20 pièces" },
  { value: 25, label: "Plus de 20 pièces" },
];
const FINISH_OPTIONS = [
  { value: "eco", label: "Économique" },
  { value: "std", label: "Standard" },
  { value: "haut", label: "Haut standing" },
];

function formatFcfa(n) {
  return Math.round(n).toLocaleString("fr-FR");
}
function roundTo10k(n) {
  return Math.round(n / 10000) * 10000;
}

// Petit encart "ordre de prix" affiché uniquement sur le profil public d'un
// ingénieur (jamais les autres métiers) : 4 champs, un bouton, une seule
// fourchette affichée (pas de détail par prestation). Cf. consigne Rose :
// donner un ordre de prix avant que le client ne contacte l'ingénieur.
export default function EngineerFeeSimulator() {
  const [floors, setFloors] = useState(1);
  const [rooms, setRooms] = useState(4);
  const [finish, setFinish] = useState("std");
  const [surface, setSurface] = useState("");
  const [result, setResult] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();

    const levels = floors + 1;
    const surfaceValue = Number(surface);
    // Surface totale : surface d'un niveau × niveaux si renseignée, sinon
    // estimée à partir du nombre de pièces (×1,25 en haut standing, les
    // pièces y étant généralement plus grandes).
    const totalSurface =
      surfaceValue >= 20 ? surfaceValue * levels : rooms * 25 * FINISH_COEFFICIENT[finish][1];

    const [coefLow, coefHigh] = FINISH_COEFFICIENT[finish];
    const low = roundTo10k(Math.max(RATE_PER_M2[floors][0] * totalSurface, MINIMUM_FEE[floors][0]) * coefLow);
    const high = roundTo10k(Math.max(RATE_PER_M2[floors][1] * totalSurface, MINIMUM_FEE[floors][1]) * coefHigh);

    setResult({ low, high });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="sim-floors" className="text-xs font-semibold text-gray-600">
            Nombre d&apos;étages
          </label>
          <select
            id="sim-floors"
            value={floors}
            onChange={(e) => setFloors(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm"
          >
            {FLOOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sim-rooms" className="text-xs font-semibold text-gray-600">
            Nombre de pièces <span className="font-normal text-gray-400">(chambres + salon)</span>
          </label>
          <select
            id="sim-rooms"
            value={rooms}
            onChange={(e) => setRooms(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm"
          >
            {ROOM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-600">Niveau de finition</p>
          <div className="mt-1 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Niveau de finition">
            {FINISH_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-center justify-center rounded-md border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight ${
                  finish === o.value
                    ? "border-forest bg-forest-light text-forest-dark"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                <input
                  type="radio"
                  name="sim-finish"
                  value={o.value}
                  checked={finish === o.value}
                  onChange={() => setFinish(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="sim-surface" className="text-xs font-semibold text-gray-600">
            Surface habitable d&apos;un niveau <span className="font-normal text-gray-400">(facultatif)</span>
          </label>
          <input
            id="sim-surface"
            type="number"
            inputMode="numeric"
            min="20"
            max="5000"
            placeholder="Ex. 150 m²"
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-2.5 py-2 text-sm"
          />
          <p className="mt-0.5 text-[11px] text-gray-400">La surface de la maison, pas celle du terrain.</p>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-forest px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-dark"
        >
          Simuler
        </button>
      </form>

      {result && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Honoraires estimés de l&apos;ingénieur</p>
          <p className="mt-1 font-heading text-2xl font-bold leading-tight text-brand">
            {formatFcfa(result.low)} à {formatFcfa(result.high)} FCFA
          </p>
          <p className="text-xs text-gray-400">
            soit environ {formatFcfa(result.low / EUR_TO_FCFA)} à {formatFcfa(result.high / EUR_TO_FCFA)} €
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Comprend les études techniques : calculs de structure, plans et réseaux (eau, électricité).
          </p>
          <p className="mt-2 text-[11px] text-gray-400">
            Estimation indicative. Le prix exact est fixé par l&apos;ingénieur après étude de votre projet.
          </p>
        </div>
      )}
    </div>
  );
}
