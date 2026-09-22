"use client";

import { useState } from "react";
import CitySelect from "@/components/CitySelect";
import { COUNTRIES, CI_CITIES } from "@/lib/constants";

// Pays d'abord, puis la ville : liste précise et recherchable pour la
// Côte d'Ivoire (197 communes), saisie libre pour les autres pays — une
// vraie base mondiale de villes par pays n'existe pas gratuitement.
export default function CountryAndCitySelect({ initialCountry = "", initialCity = "" }) {
  const [country, setCountry] = useState(initialCountry);
  const isCI = country === "Côte d'Ivoire";

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium">Pays de résidence</label>
        <select
          name="country"
          required
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2"
        >
          <option value="" disabled>Choisir un pays</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Ville de résidence</label>
        {isCI ? (
          <CitySelect cities={CI_CITIES} name="city" defaultValue={initialCity} required />
        ) : (
          <input
            name="city"
            defaultValue={initialCity}
            required
            placeholder="Tape le nom de ta ville"
            className="w-full rounded-lg border border-gray-300 p-2 text-sm"
          />
        )}
      </div>
    </>
  );
}
