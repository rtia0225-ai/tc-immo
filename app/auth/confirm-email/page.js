import Link from "next/link";

export default function ConfirmEmailPage({ searchParams }) {
  const role = searchParams?.role || "";
  const viaEmail = searchParams?.viaEmail === "1";
  const redirectTo = searchParams?.redirect || (role === "artisan" ? "/dashboard/profile" : "");
  const loginHref = redirectTo
    ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}`
    : "/auth/login";

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-heading mb-4 text-2xl font-bold">Compte créé !</h1>
      {viaEmail ? (
        <p className="text-gray-600">
          Un lien de confirmation vient de vous être envoyé par email. Cliquez dessus pour activer votre compte, puis connectez-vous.
        </p>
      ) : (
        <p className="text-gray-600">
          Votre profil est déjà complet. Connectez-vous pour ajouter votre photo et votre pièce d'identité — c'est la dernière étape.
        </p>
      )}
      <Link
        href={loginHref}
        className="mt-6 inline-block rounded-lg bg-brand px-6 py-3 font-heading font-bold text-white hover:bg-brand-dark"
      >
        Se connecter
      </Link>
    </div>
  );
}
