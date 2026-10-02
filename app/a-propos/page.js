export const metadata = {
  title: "À propos",
  description: "TC-Immo, la plateforme qui connecte la diaspora ivoirienne à des artisans vérifiés pour construire en toute confiance en Côte d'Ivoire.",
};

export default function AProposPage() {
  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/headers/a-propos.jpg"
        alt="Ingénieur sur un chantier"
        className="h-56 w-full object-cover sm:h-72"
      />
      <p className="px-4 pt-1.5 text-right text-[11px] text-gray-400">
        Photo : fabrikasimf sur Freepik
      </p>

      <div className="mx-auto max-w-2xl px-4 pb-14 pt-6">
      <h1 className="font-heading text-3xl font-bold text-ink">À propos de TC-Immo</h1>
      <p className="mt-4 text-gray-600 leading-relaxed">
        TC-Immo est la marketplace de confiance qui connecte la diaspora ivoirienne
        à des artisans vérifiés en Côte d'Ivoire, pour construire ou rénover en
        toute sécurité, où que l'on vive.
      </p>
      <p className="mt-4 text-gray-600 leading-relaxed">
        Notre mission : donner à chacun la possibilité de superviser ses travaux
        à distance, avec un paiement séquestré et un suivi de chantier en temps réel.
      </p>
      </div>
    </div>
  );
}
