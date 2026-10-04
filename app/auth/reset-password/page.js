"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-heading text-2xl font-bold text-ink">Nouveau mot de passe</h1>
      <p className="mt-2 text-sm text-gray-600">Choisissez un nouveau mot de passe pour votre compte.</p>

      {done ? (
        <p className="mt-6 rounded-lg bg-forest-light p-3 text-sm text-forest">
          Mot de passe mis à jour, redirection en cours...
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-300 p-2 pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-brand"
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="rounded-lg bg-brand py-3 font-heading font-bold text-white hover:bg-brand-dark"
          >
            Mettre à jour le mot de passe
          </button>
        </form>
      )}
    </div>
  );
}
