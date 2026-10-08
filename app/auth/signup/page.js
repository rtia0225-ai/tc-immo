import { signup } from "../actions";
import Link from "next/link";
import { CI_CITIES, CONSTRUCTION_SERVICES, MOBILE_MONEY_OPERATORS } from "@/lib/constants";
import ArtisanRegistrationExtras from "@/components/ArtisanRegistrationExtras";
import CitySelect from "@/components/CitySelect";
import RecruiterSelect from "@/components/RecruiterSelect";
import CountryAndCitySelect from "@/components/CountryAndCitySelect";
import PasswordField from "@/components/PasswordField";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage({ searchParams }) {
  const role = searchParams?.role; // 'client' ou 'artisan', choisi à l'étape précédente
  const redirectTo = searchParams?.redirect || "";
  const qs = redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : "";

  let technicians = [];
  let interviewSlots = [];
  if (role === "artisan") {
    const supabase = createClient();
    const { data } = await supabase
      .from("artisan_profiles")
      .select("id, profiles ( full_name )")
      .eq("trade", "Technicien BTP");
    technicians = (data || [])
      .filter((t) => t.profiles?.full_name)
      .map((t) => ({ id: t.id, name: t.profiles.full_name }));

    const today = new Date().toISOString().slice(0, 10);
    const { data: slots } = await supabase
      .from("interview_slots")
      .select("*")
      .eq("is_booked", false)
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
    interviewSlots = slots || [];
  }

  if (!role) {
    // Étape 1 : choix du rôle
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-gray-50 px-4 py-16 text-center">
        <h1 className="font-heading text-3xl font-extrabold">Créez un compte</h1>

        <div className="mt-4 flex w-full max-w-sm flex-col gap-4">
          <Link
            href={`/auth/signup?role=client${qs}`}
            className="rounded-lg bg-forest py-4 font-heading font-bold text-white hover:bg-forest-dark"
          >
            Je veux construire une maison
          </Link>
          <Link
            href={`/auth/signup?role=artisan${qs}`}
            className="rounded-lg bg-brand py-4 font-heading font-bold text-white hover:bg-brand-dark"
          >
            Je suis un artisan
          </Link>
          <p className="text-sm text-gray-500">Ou</p>
          <Link
            href={redirectTo ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}` : "/auth/login"}
            className="rounded-lg bg-brand-light py-3 font-heading font-semibold text-brand-dark hover:brightness-95"
          >
            Connexion
          </Link>
        </div>
      </div>
    );
  }

  // Étape 2 : un seul formulaire complet, plus rien à faire après
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-heading text-2xl font-bold">
        {role === "artisan" ? "Inscription, Artisan" : "Inscription, Client"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        <Link href={`/auth/signup${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="underline">
          ← Changer de profil
        </Link>
      </p>
      {role === "artisan" && (
        <p className="mt-2 text-sm text-gray-500">
          Renseignez tout en une fois, votre profil sera complet dès la création du compte.
        </p>
      )}

      {searchParams?.error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <p>{searchParams.error}</p>
          {searchParams?.existing === "1" && (
            <p className="mt-1">
              <Link href="/auth/login" className="underline">Se connecter</Link> ou{" "}
              <Link href="/auth/forgot-password" className="underline">mot de passe oublié</Link> ?
            </p>
          )}
        </div>
      )}

      <form action={signup} className="mt-6 flex flex-col gap-8">
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="redirect" value={redirectTo} />

        {/* --- Compte --- */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom complet</label>
            <input name="fullName" required className="w-full rounded-lg border border-gray-300 p-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email ou numéro de téléphone</label>
            <input
              type="text"
              name="identifier"
              required
              placeholder="email@exemple.com ou 07 00 00 00 00"
              className="w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mot de passe</label>
            <PasswordField minLength={6} />
          </div>
          {role === "artisan" ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Ville de base</label>
              <CitySelect cities={CI_CITIES} name="city" required />
            </div>
          ) : (
            <CountryAndCitySelect />
          )}
        </div>

        {role === "artisan" && (
          <>
            {/* --- Informations personnelles privées --- */}
            <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Informations privées (jamais visibles des clients)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Contact d'un proche</label>
                  <input name="emergencyContactName" placeholder="Nom" className="w-full rounded-lg border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Téléphone du proche</label>
                  <input name="emergencyContactPhone" placeholder="Téléphone" className="w-full rounded-lg border border-gray-300 p-2" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Comment recevoir vos paiements</label>
                <div className="grid grid-cols-2 gap-2">
                  <select name="mobileMoneyOperator" defaultValue="" className="rounded-lg border border-gray-300 p-2">
                    <option value="" disabled>Choisir</option>
                    {MOBILE_MONEY_OPERATORS.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input name="mobileMoneyNumber" placeholder="Numéro" className="rounded-lg border border-gray-300 p-2" />
                </div>
              </div>

              {technicians.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Technicien qui vous a recommandé (si applicable)
                  </label>
                  <RecruiterSelect technicians={technicians} />
                  <p className="mt-1 text-xs text-gray-500">
                    C'est lui qui reçoit les demandes de contact des clients pour vous.
                  </p>
                </div>
              )}
            </div>

            {/* --- Profil visible par les clients --- */}
            <div className="flex flex-col gap-4 border-t border-gray-100 pt-6">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Profil visible par les clients
              </p>

              <ArtisanRegistrationExtras interviewSlots={interviewSlots} />

              <div>
                <label className="mb-2 block text-sm font-medium">Mobilité</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="mobilityScope" value="all" defaultChecked />
                    Disponible partout en Côte d'Ivoire
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="mobilityScope" value="selected" />
                    Villes spécifiques uniquement
                  </label>
                </div>
                <div className="mt-2">
                  <CitySelect cities={CI_CITIES} name="mobilityCities" multiple placeholder="Ajouter une ville..." />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea name="bio" rows={3} placeholder="Qui êtes-vous, votre expérience, ce qui vous distingue..." className="w-full rounded-lg border border-gray-300 p-2" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Années d'expérience</label>
                <input type="number" name="yearsExperience" min="0" defaultValue="0" className="w-full rounded-lg border border-gray-300 p-2" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Tarification</label>
                <textarea name="pricingInfo" rows={2} placeholder="ex: 25 000 XOF / jour, ou sur devis par contrat" className="w-full rounded-lg border border-gray-300 p-2" />
              </div>
            </div>
          </>
        )}

        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" name="confirmAdult" required className="mt-0.5 accent-brand" />
          <span>Je confirme être majeur(e).</span>
        </label>

        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 accent-brand" />
          <span>
            J'ai lu et j'accepte les{" "}
            <a href="/cgu" target="_blank" className="text-brand underline">Conditions Générales d'Utilisation</a>
            {" "}et la{" "}
            <a href="/confidentialite" target="_blank" className="text-brand underline">Politique de confidentialité</a>.
          </span>
        </label>

        <button
          type="submit"
          className={`rounded-lg py-3 font-heading font-bold text-white ${
            role === "artisan" ? "bg-brand hover:bg-brand-dark" : "bg-forest hover:bg-forest-dark"
          }`}
        >
          Créer mon compte
        </button>

        <p className="text-xs text-gray-500">
          TCHolding-Immo, projet en cours de création, collecte votre nom, prénom et adresse e-mail pour créer votre compte et vous prévenir de l'ouverture de la plateforme. Ces données sont conservées 3 ans au maximum et ne sont jamais vendues. Pour les consulter, les corriger ou les supprimer : contact@tcholding-immo.com.
        </p>

        {role === "artisan" && (
          <p className="text-center text-xs text-gray-400">
            Dernière étape après l'inscription : ajouter votre photo et votre pièce d'identité (impossible avant que le compte existe).
          </p>
        )}
      </form>
    </div>
  );
}
