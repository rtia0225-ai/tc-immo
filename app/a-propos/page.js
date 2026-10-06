export const metadata = {
  title: "À propos",
  description: "TCHolding-Immo, la plateforme qui connecte la diaspora ivoirienne à des artisans vérifiés pour construire en toute confiance en Côte d'Ivoire.",
};

export default function AProposPage() {
  return (
    <div>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/headers/a-propos.jpg"
          alt="Ingénieur sur un chantier"
          className="h-72 w-full object-cover sm:h-96"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <p className="absolute bottom-1.5 right-2 text-[9px] text-white/70">
          fabrikasimf / Freepik
        </p>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-6">
          <div className="mx-auto max-w-5xl">
            <h1 className="font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
              À propos de TCHolding-Immo
            </h1>
            <p className="mt-3 text-justify text-sm leading-relaxed text-white/90 sm:text-base">
              TCHolding-Immo est la marketplace de confiance qui connecte la diaspora ivoirienne
              à des artisans vérifiés en Côte d'Ivoire, pour construire ou rénover en
              toute sécurité, où que l'on vive.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-14 pt-8">
        <h2 className="font-heading text-xl font-bold text-ink">Le constat de départ</h2>
        <p className="mt-3 text-justify text-gray-600 leading-relaxed">
          Construire une maison en Côte d'Ivoire quand on vit à l'étranger est un pari risqué. On ne peut pas vérifier le sérieux d'un artisan avant de lui confier un chantier, on ne peut pas se déplacer chaque semaine pour constater l'avancement des travaux, et on entend trop souvent la même histoire : un proche chargé de surveiller le chantier, un artisan payé d'avance qui disparaît, un projet qui prend deux fois plus de temps et deux fois plus cher que prévu. Ce n'est pas un problème de volonté, c'est un problème d'outils.
        </p>

        <h2 className="font-heading mt-10 text-xl font-bold text-ink">Notre mission</h2>
        <p className="mt-3 text-justify text-gray-600 leading-relaxed">
          Donner à chacun la possibilité de superviser ses travaux à distance, avec la même tranquillité d'esprit que s'il était sur place. Concrètement, cela veut dire remplacer la confiance aveugle par des garanties concrètes : des professionnels vérifiés avant d'être référencés, un paiement qui ne quitte la plateforme qu'une fois une étape du chantier réellement validée, et un suivi d'avancement consultable depuis son téléphone, où que l'on se trouve dans le monde.
        </p>

        <h2 className="font-heading mt-10 text-xl font-bold text-ink">Pour qui</h2>
        <p className="mt-3 text-justify text-gray-600 leading-relaxed">
          TCHolding-Immo s'adresse en priorité à la diaspora ivoirienne, celles et ceux qui construisent, rénovent ou investissent dans l'immobilier en Côte d'Ivoire depuis la France, l'Europe, l'Amérique du Nord ou ailleurs. La plateforme reste cependant ouverte à toute personne vivant en Côte d'Ivoire qui préfère, elle aussi, confier son projet à des professionnels vérifiés plutôt qu'à des relations de bouche-à-oreille sans garantie.
        </p>

        <h2 className="font-heading mt-10 text-xl font-bold text-ink">Notre façon de faire</h2>
        <p className="mt-3 text-justify text-gray-600 leading-relaxed">
          Nous ne vendons pas une prestation unique : nous organisons la collaboration entre plusieurs professionnels indépendants autour d'un même projet, du géomètre qui sécurise le terrain jusqu'au technicien qui supervise le chantier, en passant par l'architecte et les artisans. Chacun reste responsable de son propre travail, mais tout transite par la même plateforme : les échanges, les documents, l'échéancier de paiement. C'est cette centralisation qui rend le suivi à distance réellement possible.
        </p>

        <h2 className="font-heading mt-10 text-xl font-bold text-ink">Notre ambition</h2>
        <p className="mt-3 text-justify text-gray-600 leading-relaxed">
          Au-delà d'un simple outil de mise en relation, nous voulons bâtir un véritable repère de confiance pour l'immobilier en Afrique, celui vers lequel on se tourne naturellement avant de poser la première pierre. Un projet de construction représente souvent l'investissement d'une vie, parfois celui de toute une famille, transmis d'une génération à l'autre. Nous voulons que cet investissement soit protégé du premier coup de pioche jusqu'à la remise des clés.
        </p>
        <p className="mt-3 text-justify text-gray-600 leading-relaxed">
          TCHolding-Immo opère aujourd'hui en Côte d'Ivoire, et s'apprête à s'implanter au Cameroun, au Congo et au Togo. Notre ambition est de poursuivre cette expansion vers d'autres pays du continent, pour que chaque membre de la diaspora africaine, où qu'il vive, puisse construire chez lui en toute confiance.
        </p>
      </div>
    </div>
  );
}
