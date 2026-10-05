const FAQS = [
  { q: "Puis-je construire en Côte d'Ivoire depuis l'étranger ?", a: "Oui, c'est exactement pour ça que TC-Immo existe. Vous choisissez vos prestataires, validez un échéancier de paiement et suivez l'avancement de votre chantier, où que vous soyez dans le monde." },
  { q: "TC-Immo est-elle une entreprise de construction ?", a: "Non. TC-Immo est une marketplace : une plateforme de mise en relation entre des clients et des artisans ou professionnels du bâtiment indépendants, vérifiés avant d'être référencés. Chaque professionnel reste seul responsable de sa propre prestation. TC-Immo sécurise la mise en relation, le paiement et le suivi du chantier, mais ne réalise elle-même aucun travaux." },
  { q: "Est-ce que je m'engage à quelque chose en créant un compte ?", a: "Non. Créer un compte et consulter les profils des professionnels est entièrement libre et sans engagement. Vous n'êtes engagé(e) qu'à partir du moment où vous démarrez un projet avec un professionnel précis sur la plateforme." },
  { q: "Comment mon argent est-il protégé ?", a: "Chaque paiement est échelonné selon l'avancement réel du chantier, et n'est versé à l'artisan qu'une fois une étape validée, jamais en une seule fois." },
  { q: "Comment les artisans sont-ils vérifiés ?", a: "Chaque artisan est audité (dont vérification RCCM) avant d'être référencé sur la plateforme." },
  { q: "Qui achète les matériaux de construction ?", a: "La personne qui établit le devis n'est jamais la même que celle qui achète les matériaux. Cette séparation limite les risques de majoration ou de détournement sur le coût des matériaux." },
  { q: "Puis-je suivre mon chantier à distance ?", a: "Oui, votre espace personnel affiche l'avancement en temps réel de votre chantier." },
];

export const metadata = {
  title: "Questions fréquentes",
  description: "Sécurité des paiements, vérification des artisans, suivi de chantier à distance : les réponses aux questions les plus posées sur TC-Immo.",
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="font-heading text-3xl font-bold text-ink">Questions fréquentes</h1>
      <div className="mt-8 flex flex-col divide-y divide-gray-200 border-y border-gray-200">
        {FAQS.map((item, i) => (
          <details key={item.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <span className="flex gap-3">
                <span className="font-heading shrink-0 text-sm font-bold text-brand">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-heading font-bold text-ink">{item.q}</span>
              </span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className="mt-1 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-45"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </summary>
            <p className="mt-3 pl-8 text-sm leading-relaxed text-gray-700">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
