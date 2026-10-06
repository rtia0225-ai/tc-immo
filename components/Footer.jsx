import ManageCookiesLink from "./ManageCookiesLink";

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/share/1E42mHuWeb/",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/tcholding-immo/",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="relative bg-ink px-4 pb-10 pt-16 text-gray-300">

      <div className="mx-auto grid max-w-6xl gap-12 sm:grid-cols-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-footer.png" alt="TCHolding-Immo" className="h-10 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
            La marketplace de confiance pour construire en Côte d'Ivoire, où que vous soyez.
          </p>
          <div className="mt-5 flex gap-3">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                aria-label={s.name}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-brand hover:text-brand"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="font-heading text-xs font-bold uppercase tracking-wider text-white/90">Plateforme</p>
          <ul className="mt-4 space-y-2.5 text-sm text-gray-400">
            <li><a href="/artisans" className="transition-colors hover:text-brand">Trouver un prestataire</a></li>
            <li><a href="/comment-ca-marche" className="transition-colors hover:text-brand">Comment ça marche</a></li>
            <li><a href="/ressources" className="transition-colors hover:text-brand">Ressources</a></li>
            <li><a href="/a-propos" className="transition-colors hover:text-brand">À propos</a></li>
            <li><a href="/faq" className="transition-colors hover:text-brand">FAQ</a></li>
          </ul>
        </div>

        <div>
          <p className="font-heading text-xs font-bold uppercase tracking-wider text-white/90">Contact</p>
          <ul className="mt-4 space-y-2.5 text-sm text-gray-400">
            <li><a href="/contact" className="transition-colors hover:text-brand">Nous écrire</a></li>
            <li><a href="mailto:contact@tcholding-immo.com" className="transition-colors hover:text-brand">contact@tcholding-immo.com</a></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-3 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 TCHolding-Immo. Tous droits réservés.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <a href="/cgu" className="transition-colors hover:text-brand">Conditions Générales d'Utilisation</a>
          <a href="/confidentialite" className="transition-colors hover:text-brand">Confidentialité</a>
          <ManageCookiesLink className="transition-colors hover:text-brand" />
        </div>
      </div>
    </footer>
  );
}
