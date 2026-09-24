import { sendContactMessage } from "./actions";

export const metadata = {
  title: "Nous contacter",
  description: "Une question ? Écris-nous directement via le formulaire ci-dessous.",
};

const EMAIL = "contact@tcholding-immo.com";

export default function ContactPage({ searchParams }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink">Nous contacter</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Une question, un blocage, ou besoin d'aide ? Écris-nous, on te répond directement.
      </p>

      <a
        href={`mailto:${EMAIL}`}
        className="mt-6 flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-brand hover:bg-brand-light"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</p>
          <p className="font-heading font-bold text-ink">{EMAIL}</p>
        </div>
      </a>

      <div className="mt-8 border-t border-gray-100 pt-8">
        <p className="mb-4 text-sm font-bold text-ink">Ou écris-nous directement ici</p>

        {searchParams?.success && (
          <p className="mb-4 rounded-lg bg-forest-light p-3 text-sm text-forest">
            Message envoyé, merci ! On te répond au plus vite.
          </p>
        )}
        {searchParams?.error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{searchParams.error}</p>
        )}

        <form action={sendContactMessage} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              name="firstName"
              placeholder="Prénom"
              required
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
            <input
              name="lastName"
              placeholder="Nom"
              required
              className="rounded-lg border border-gray-300 p-2 text-sm"
            />
          </div>
          <input
            type="email"
            name="email"
            placeholder="Ton email"
            required
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
          <textarea
            name="message"
            placeholder="Ton message"
            required
            rows={5}
            className="rounded-lg border border-gray-300 p-2 text-sm"
          />
          <button
            type="submit"
            className="mt-1 rounded-lg bg-brand py-3 font-heading font-bold text-white hover:bg-brand-dark"
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
