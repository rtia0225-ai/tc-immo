const ITEMS = [
  {
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="10" rx="1" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Paiement 100% sécurisé",
    text: "Vos paiements restent séquestrés sur la plateforme et ne sont libérés qu'à validation de chaque étape.",
  },
  {
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="2" />
        <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
      </svg>
    ),
    title: "Suivi en temps réel",
    text: "Consultez l'avancement de votre chantier depuis votre espace, où que vous soyez dans le monde.",
  },
  {
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    title: "Artisans vérifiés",
    text: "Chaque prestataire est audité (dont vérification RCCM) avant d'être référencé sur la plateforme.",
  },
  {
    icon: (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
    title: "Trouvez facilement",
    text: "Filtrez par métier et par ville parmi des professionnels vérifiés partout en Côte d'Ivoire.",
  },
];

export default function TrustBanner() {
  return (
    <div className="bg-[#FAF8F3] px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 text-center sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => {
            const isForest = i % 2 === 1;
            return (
              <div key={item.title} className="flex flex-col items-center">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full text-white"
                  style={{
                    background: isForest
                      ? "radial-gradient(circle at 35% 30%, #117A47, #07401F 70%)"
                      : "radial-gradient(circle at 35% 30%, #C21138, #7A0B23 70%)",
                    boxShadow: isForest
                      ? "0 10px 20px -6px rgba(7,64,31,0.45), inset 0 -4px 8px rgba(0,0,0,0.15)"
                      : "0 10px 20px -6px rgba(122,11,35,0.45), inset 0 -4px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  {item.icon}
                </div>
                <p className={`font-heading mt-5 text-base font-bold ${isForest ? "text-forest" : "text-brand"}`}>
                  {item.title}
                </p>
                <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-gray-700">{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
