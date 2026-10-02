const ITEMS = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="11" width="18" height="10" rx="1" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Paiement 100% sécurisé",
    text: "Vos paiements restent séquestrés sur la plateforme et ne sont libérés qu'à validation de chaque étape.",
    color: "brand",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="12" r="2" />
        <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
      </svg>
    ),
    title: "Suivi en temps réel",
    text: "Consultez l'avancement de votre chantier depuis votre espace, où que vous soyez dans le monde.",
    color: "forest",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Artisans vérifiés",
    text: "Chaque prestataire est audité (dont vérification RCCM) avant d'être référencé sur la plateforme.",
    color: "brand",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
    title: "Trouvez facilement",
    text: "Filtrez par métier et par ville parmi des professionnels vérifiés partout en Côte d'Ivoire.",
    color: "forest",
  },
];

const BUBBLE_CLASSES = {
  brand: "bg-brand-light text-brand",
  forest: "bg-forest-light text-forest",
};

export default function TrustBanner() {
  return (
    <div className="bg-[#FAF8F3] px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 text-center sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div key={item.title} className="flex flex-col items-center">
              <div className="relative">
                <div className={`flex h-20 w-20 items-center justify-center rounded-full ${BUBBLE_CLASSES[item.color]}`}>
                  {item.icon}
                </div>
                <div
                  className="absolute -bottom-1.5 left-1/2 h-3 w-12 -translate-x-1/2 rounded-full bg-black/15 blur-[4px]"
                  aria-hidden="true"
                />
              </div>
              <p className={`font-heading mt-5 text-base font-bold ${item.color === "forest" ? "text-forest" : "text-brand"}`}>
                {item.title}
              </p>
              <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-gray-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
