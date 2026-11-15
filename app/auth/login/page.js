import { login } from "../actions";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export default function LoginPage({ searchParams }) {
  const redirectTo = searchParams?.redirect || "";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-heading text-2xl font-bold">Connexion</h1>

      {searchParams?.error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{searchParams.error}</p>
      )}

      <LoginForm login={login} redirectTo={redirectTo} />

      <p className="mt-6 text-center text-sm text-gray-500">Pas encore de compte ?</p>
      <Link
        href={redirectTo ? `/auth/signup?redirect=${encodeURIComponent(redirectTo)}` : "/auth/signup"}
        className="mt-2 block rounded-lg bg-forest-light py-3 text-center font-heading font-bold text-forest-dark hover:brightness-95"
      >
        Créer un compte
      </Link>
    </div>
  );
}
