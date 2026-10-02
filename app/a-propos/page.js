export const metadata = {
  title: "À propos",
  description: "TC-Immo, la plateforme qui connecte la diaspora ivoirienne à des artisans vérifiés pour construire en toute confiance en Côte d'Ivoire.",
};

export default function AProposPage() {
  return (
    <div>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/headers/a-propos.jpg"
          alt="Ingénieur sur un chantier"
          className="h-64 w-full object-cover sm:h-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <p className="absolute bottom-1.5 right-2 text-[9px] text-white/70">
          fabrikasimf / Freepik
        </p>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-6">
          <div className="mx-auto max-w-5xl">
            <h1 className="font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
              À propos de TC-Immo
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        <p className="text-justify text-gray-600 leading-relaxed">
          TC-Immo est la marketplace de confiance qui connecte la diaspora ivoirienne
          à des artisans vérifiés en Côte d'Ivoire, pour construire ou rénover en
          toute sécurité, où que l'on vive.
        </p>
        <p className="mt-4 text-justify text-gray-600 leading-relaxed">
          Notre mission : donner à chacun la possibilité de superviser ses travaux
          à distance, avec un paiement séquestré et un suivi de chantier en temps réel.
        </p>
      </div>
    </div>
  );
}
