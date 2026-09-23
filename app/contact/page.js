const PHONE = "+225 01 61 08 73 06";
const PHONE_TEL = "+2250161087306";
const EMAIL = "contact@tcholding-immo.com";

export const metadata = {
  title: "Nous contacter",
  description: "Contactez l'équipe TC-Immo par téléphone ou par email.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink">Nous contacter</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Une question, un blocage, ou besoin d'aide ? Nous sommes joignables directement.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <a
          href={`tel:${PHONE_TEL}`}
          className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-brand hover:bg-brand-light"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Téléphone</p>
            <p className="font-heading font-bold text-ink">{PHONE}</p>
          </div>
        </a>

        <a
          href={`mailto:${EMAIL}`}
          className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-brand hover:bg-brand-light"
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
      </div>
    </div>
  );
}
