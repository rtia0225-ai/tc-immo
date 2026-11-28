"use client";

import { useState } from "react";

// Barème provisoire des honoraires d'architecte, à valider par les
// architectes partenaires. Gardé ici dans des constantes faciles à
// modifier : un index par nombre d'étages (0 = plain-pied ... 4 = R+4 et
// plus). Coûts de construction (FCFA/m²) : milieu des repères 2026 publiés
// pour la Côte d'Ivoire (éco 160 000-220 000, moyen 250 000-350 000, haut
// 400 000-550 000 — babi.immo, asahci.com, voyager-en-cote-divoire.com).
// Le coefficient d'étages, l'estimation de surface par chambre et les
// minimums ne viennent pas d'une source publiée.
const CONSTRUCTION_COST_PER_M2 = { eco: 190000, std: 300000, haut: 475000 };
const FEE_RATE = [0.08, 0.1]; // taux bas / haut, mission complète
const FLOOR_COEFFICIENT = [1, 1.1, 1.15, 1.2, 1.25];
const MISSION_SHARE = { pc: 0.5, co: 1 };
const MINIMUM_FEE = { pc: 300000, co: 600000 };
const EUR_TO_FCFA = 655.957;

const FLOOR_OPTIONS = [
  { value: 0, label: "Plain-pied" },
  { value: 1, label: "R+1" },
  { value: 2, label: "R+2" },
  { value: 3, label: "R+3" },
  { value: 4, label: "R+4 et plus" },
];
const ROOM_OPTIONS = [1, 2, 3, 4, 5, 6, 8].map((n) => ({
  value: n,
  label: n === 8 ? "7 et plus" : String(n),
}));
const FINISH_OPTIONS = [
  { value: "eco", label: "Économique" },
  { value: "std", label: "Standard" },
  { value: "haut", label: "Haut standing" },
];
const MISSION_OPTIONS = [
  { value: "pc", label: "Plans + permis" },
  { value: "co", label: "Mission complète avec suivi de chantier" },
];
const MISSION_INCLUDES = {
  pc: "Comprend la conception des plans et le dossier de permis de construire.",
  co: "Comprend les plans, le dossier de permis, le choix des entreprises et le suivi du chantier.",
};
const MISSION_LABEL = { pc: "Plans + permis", co: "Mission complète" };

function formatFcfa(n) {
  return Math.round(n).toLocaleString("fr-FR");
}
function roundTo10k(n) {
  return Math.round(n / 10000) * 10000;
}

// Petit encart "ordre de prix" affiché uniquement sur le profil public d'un
// architecte (jamais les autres métiers) : 5 questions, un bouton, une
// seule fourchette affichée (pas de détail par prestation).
export default function ArchitectFeeSimulator() {
  const [floors, setFloors] = useState(1);
  const [rooms, setRooms] = useState(3);
  const [finish, setFinish] = useState("std");
  const [mission, setMission] = useState("pc");
  const [surface, setSurface] = useState("");
  const [result, setResult] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();

    const levels = floors + 1;
    const surfaceValue = Number(surface);
    // Surface totale : surface d'un niveau × niveaux si renseignée, sinon
    // estimée à partir du nombre de chambres (×1,25 en haut standing).
    const totalSurface =
      surfaceValue >= 20 ? surfaceValue * levels : (40 + rooms * 30) * (finish === "haut" ? 1.25 : 1);

    const base = totalSurface * CONSTRUCTION_COST_PER_M2[finish] * FLOOR_COEFFICIENT[floors] * MISSION_SHARE[mission];
    const low = roundTo10k(Math.max(base * FEE_RATE[0], MINIMUM_FEE[mission]));
    const high = roundTo10k(Math.max(base * FEE_RATE[1], MINIMUM_FEE[mission] * 1.25));

    setResult({ low, high, mission });
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-600">Nombre d&apos;étages</p>
          <div className="mt-1 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Nombre d'étages">
            {FLOOR_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-center justify-center rounded-md border px-1 py-2 text-center text-[11px] font-semibold leading-tight ${
                  floors === o.value ? "border-brand bg-brand-light text-brand-dark" : "border-gray-200 text-gray-500"
                }`}
              >
                <input
                  type="radio"
                  name="sim-floors"
                  value={o.value}
                  checked={floors === o.value}
                  onChange={() => setFloors(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="sim-rooms" className="text-xs font-semibold text-gray-600">
            Nombre de chambres
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
                  finish === o.value ? "border-brand bg-brand-light text-brand-dark" : "border-gray-200 text-gray-500"
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
          <p className="text-xs font-semibold text-gray-600">Mission de l&apos;architecte</p>
          <div className="mt-1 grid grid-cols-1 gap-1.5" role="radiogroup" aria-label="Mission de l'architecte">
            {MISSION_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-center rounded-md border px-2.5 py-2 text-left text-[12px] font-semibold leading-tight ${
                  mission === o.value ? "border-brand bg-brand-light text-brand-dark" : "border-gray-200 text-gray-500"
                }`}
              >
                <input
                  type="radio"
                  name="sim-mission"
                  value={o.value}
                  checked={mission === o.value}
                  onChange={() => setMission(o.value)}
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
          className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          Simuler
        </button>
      </form>

      {result && (
        <div className="mt-4 overflow-hidden rounded-lg border border-brand">
          <div className="flex items-center justify-between gap-2 bg-brand px-3 py-1.5 text-xs font-bold text-white">
            <span>Honoraires estimés de l&apos;architecte</span>
            <span>{MISSION_LABEL[result.mission]}</span>
          </div>
          <div className="bg-brand-light p-3.5">
            <p className="font-heading text-2xl font-bold leading-tight text-brand">
              {formatFcfa(result.low)} à {formatFcfa(result.high)} FCFA
            </p>
            <p className="text-xs text-gray-500">
              soit environ {formatFcfa(result.low / EUR_TO_FCFA)} à {formatFcfa(result.high / EUR_TO_FCFA)} €
            </p>
            <p className="mt-2.5 border-t border-dashed border-brand/30 pt-2.5 text-xs text-gray-600">
              {MISSION_INCLUDES[result.mission]}
            </p>
            <p className="mt-2 text-[11px] text-gray-400">
              Estimation indicative. Le prix exact est fixé par l&apos;architecte après étude de votre projet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
