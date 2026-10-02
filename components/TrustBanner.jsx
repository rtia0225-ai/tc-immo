const ITEMS = [
  {
    image: "/icons-trust/lock.png",
    title: "Paiement 100% sécurisé",
    text: "Vos paiements restent séquestrés sur la plateforme et ne sont libérés qu'à validation de chaque étape.",
  },
  {
    image: "/icons-trust/timetable.png",
    title: "Suivi en temps réel",
    text: "Consultez l'avancement de votre chantier depuis votre espace, où que vous soyez dans le monde.",
  },
  {
    image: "/icons-trust/award.png",
    title: "Artisans vérifiés",
    text: "Chaque prestataire est audité (dont vérification RCCM) avant d'être référencé sur la plateforme.",
  },
  {
    image: "/icons-trust/folder.png",
    title: "Traçabilité totale",
    text: "Contrats, permis, rapports de suivi et paiements restent tous enregistrés sur la plateforme.",
  },
];

export default function TrustBanner() {
  return (
    <div className="bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 text-center sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div key={item.title} className="flex flex-col items-center">
              <div className="relative">
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-full"
                  style={{
                    background: "radial-gradient(circle at 35% 28%, #ffffff, #e2e2e2 55%, #c9c9c9 100%)",
                    boxShadow: "inset 0 -6px 10px rgba(0,0,0,0.12), inset 0 3px 6px rgba(255,255,255,0.9), 0 6px 14px rgba(0,0,0,0.12)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" className="h-16 w-16 object-contain" />
                </div>
                <div
                  className="absolute -bottom-2 left-1/2 h-3 w-14 -translate-x-1/2 rounded-full bg-black/20 blur-[5px]"
                  aria-hidden="true"
                />
              </div>
              <p className="font-heading mt-5 text-base font-bold text-ink">
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
