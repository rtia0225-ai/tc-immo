import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { updatePersonalInfo } from "../profile/actions";
import { uploadIdDocument } from "@/lib/idDocumentActions";
import { CI_CITIES, ID_DOCUMENT_TYPES, MOBILE_MONEY_OPERATORS } from "@/lib/constants";
import ShareLocationButton from "@/components/ShareLocationButton";
import FileInputButton from "@/components/FileInputButton";
import CitySelect from "@/components/CitySelect";

// "Mes infos" : les informations personnelles et privées de l'artisan
// (identité, coordonnées, pièce d'identité, moyen de paiement), jamais
// visibles par un client. Distinct de "Mon profil"
// (/dashboard/profile), qui est la vitrine publique vue par le client.
// Cf. consigne Rose du 2026-11-25.
export default async function PersonalInfoPage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Les clients ont déjà leur propre page "Mes infos" sur /dashboard/profile.
  if (profile?.role !== "artisan") {
    redirect("/dashboard/profile");
  }

  const { data: artisan } = await supabase
    .from("artisan_profiles")
    .select("mobile_money_operator, mobile_money_number")
    .eq("id", user.id)
    .single();

  // URL temporaire (1h) pour afficher la pièce d'identité déjà envoyée —
  // le bucket est privé, jamais d'URL publique permanente.
  let idDocumentSignedUrl = null;
  if (profile?.id_document_url) {
    const { data } = await supabase.storage
      .from("id-documents")
      .createSignedUrl(profile.id_document_url, 3600);
    idDocumentSignedUrl = data?.signedUrl || null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Mes infos</h1>
        <Link href="/dashboard/profile" className="text-sm font-medium text-brand hover:underline">
          Voir mon profil →
        </Link>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Vos informations personnelles, jamais visibles par un client. Ce que voit un client se trouve dans{" "}
        <Link href="/dashboard/profile" className="font-medium text-brand hover:underline">Mon profil</Link>.
      </p>

      {searchParams?.success && (
        <p className="mt-4 rounded-lg bg-forest-light p-3 text-sm text-forest">Enregistré.</p>
      )}
      {searchParams?.error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{searchParams.error}</p>
      )}

      {/* Pièce d'identité, en dehors du formulaire principal (upload indépendant) */}
      <section className="mt-6">
        <h2 className="font-heading text-lg font-bold text-brand">Pièce d'identité</h2>
        {idDocumentSignedUrl && (
          <p className="mt-2 text-sm text-forest">
            ✓ Document déjà envoyé{profile?.id_document_type ? ` (${profile.id_document_type}${profile.id_document_number ? ` n° ${profile.id_document_number}` : ""})` : ""} ,{" "}
            <a href={idDocumentSignedUrl} target="_blank" rel="noreferrer" className="underline">
              voir le fichier
            </a>
          </p>
        )}
        <form action={uploadIdDocument} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="returnTo" value="/dashboard/infos" />
          <select
            name="documentType"
            required
            defaultValue=""
            className="rounded-lg border border-gray-300 p-2 text-sm"
          >
            <option value="" disabled>Type de pièce</option>
            {ID_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            name="documentNumber"
            required
            placeholder="Numéro de la pièce"
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <FileInputButton name="idDocument" accept="image/*,.pdf" required label="Choisir un fichier" />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-forest px-3 py-2 text-xs font-semibold text-white hover:bg-forest-dark"
            >
              Envoyer
            </button>
          </div>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          Carte nationale d'identité, passeport ou équivalent. Jamais visible par les clients.
        </p>
      </section>

      <form action={updatePersonalInfo} className="mt-8 flex flex-col gap-4">
        <h2 className="font-heading text-lg font-bold text-brand">Informations personnelles</h2>
        <p className="-mt-2 text-xs text-gray-500">
          Le téléphone et le contact d'urgence ne sont jamais visibles par les clients, utilisés uniquement pour la vérification de votre profil.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium">Nom complet</label>
          <input
            name="fullName"
            defaultValue={profile?.full_name || ""}
            required
            className="w-full rounded-lg border border-gray-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Téléphone (privé)</label>
          <input
            name="phone"
            defaultValue={profile?.phone || ""}
            placeholder="ex: +225 07 00 00 00 00"
            className="w-full rounded-lg border border-gray-300 p-2"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Contact d'un proche (privé)</label>
            <input
              name="emergencyContactName"
              defaultValue={profile?.emergency_contact_name || ""}
              placeholder="Nom complet"
              className="w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Téléphone du proche (privé)</label>
            <input
              name="emergencyContactPhone"
              defaultValue={profile?.emergency_contact_phone || ""}
              placeholder="Téléphone"
              className="w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Ville de base</label>
          <CitySelect cities={CI_CITIES} name="city" defaultValue={profile?.city || ""} required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Comment recevoir vos paiements</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              name="mobileMoneyOperator"
              defaultValue={artisan?.mobile_money_operator || ""}
              className="rounded-lg border border-gray-300 p-2"
            >
              <option value="" disabled>Choisir</option>
              {MOBILE_MONEY_OPERATORS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <input
              name="mobileMoneyNumber"
              defaultValue={artisan?.mobile_money_number || ""}
              placeholder="Numéro"
              className="rounded-lg border border-gray-300 p-2"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            C'est ici que les clients enverront vos paiements pour chaque étape terminée.
          </p>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="mb-2 block text-sm font-medium">Adresse exacte (position GPS, privée)</label>
          <ShareLocationButton
            latitude={profile?.home_latitude}
            longitude={profile?.home_longitude}
            capturedAt={profile?.home_location_captured_at}
          />
        </div>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-brand py-3 font-heading font-bold text-white hover:bg-brand-dark"
        >
          Enregistrer mes infos
        </button>
      </form>
    </div>
  );
}
