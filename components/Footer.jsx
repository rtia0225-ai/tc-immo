export default function Footer() {
  return (
    <footer className="relative bg-ink px-4 pb-10 pt-16 text-gray-300">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand via-gold to-forest" />

      <div className="mx-auto grid max-w-6xl gap-12 sm:grid-cols-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-footer.png" alt="TC-Immo" className="h-10 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
            La marketplace de confiance pour construire en Côte d'Ivoire, où que vous soyez.
          </p>
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

      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-2 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 TC-Immo. Tous droits réservés.</p>
        <p>Construit pour la diaspora ivoirienne et tous ceux qui bâtissent à distance.</p>
      </div>
    </footer>
  );
}
