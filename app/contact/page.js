export const metadata = {
  title: "Nous contacter",
  description: "Une question ? Écrivez-nous directement par email.",
};

const EMAIL = "contact@tcholding-immo.com";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink">Nous contacter</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Une question, un blocage, ou besoin d'aide ? Écrivez-nous, nous vous répondons directement.
      </p>

      <a
        href={`mailto:${EMAIL}`}
        className="mt-6 flex items-center gap-4 rounded-lg bg-white p-4 shadow-card hover:shadow-md"
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

      <p className="mt-8 text-xs text-gray-500">
        Les informations que vous nous envoyez sont utilisées uniquement pour répondre à votre message. En savoir plus :{" "}
        <a href="/confidentialite" className="text-brand underline">Politique de confidentialité</a>.
      </p>
    </div>
  );
}
