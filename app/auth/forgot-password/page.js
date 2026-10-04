import { requestPasswordReset } from "../actions";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage({ searchParams }) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-heading text-2xl font-bold text-ink">Mot de passe oublié</h1>
      <p className="mt-2 text-sm text-gray-600">
        Indiquez l'email ou le numéro de téléphone utilisé à l'inscription.
      </p>

      {searchParams?.sent && (
        <p className="mt-4 rounded-lg bg-forest-light p-3 text-sm text-forest">
          Un lien de réinitialisation a été envoyé à cette adresse. Vérifiez aussi vos spams.
        </p>
      )}
      {searchParams?.phone && (
        <p className="mt-4 rounded-lg bg-brand-light p-3 text-sm text-brand-dark">
          Les comptes créés par numéro de téléphone ne peuvent pas encore être réinitialisés automatiquement.{" "}
          <a href="/contact" className="underline">Contactez-nous</a> pour être aidé directement.
        </p>
      )}
      {searchParams?.error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{searchParams.error}</p>
      )}

      {!searchParams?.sent && !searchParams?.phone && (
        <form action={requestPasswordReset} className="mt-6 flex flex-col gap-3">
          <input
            name="identifier"
            placeholder="Email ou numéro de téléphone"
            required
            className="w-full rounded-lg border border-gray-300 p-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand py-3 font-heading font-bold text-white hover:bg-brand-dark"
          >
            Envoyer le lien de réinitialisation
          </button>
        </form>
      )}

      <a href="/auth/login" className="mt-5 block text-center text-sm text-gray-500 hover:text-brand">
        Retour à la connexion
      </a>
    </div>
  );
}
