export const metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "Conditions Générales d'Utilisation du site TCHolding-Immo, en phase de pré-ouverture.",
};

export default function CguPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold text-ink">Conditions Générales d'Utilisation</h1>
      <p className="mt-2 text-sm italic text-gray-500">
        Site tcholding-immo.com — Phase de pré-ouverture — Version en vigueur au 06/10/2026
      </p>

      <div className="mt-8 flex flex-col gap-7 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="font-heading text-lg font-bold text-ink">Article 1 — Objet et éditeur</h2>
          <p className="mt-2 text-justify">
            Le site tcholding-immo.com (le « Site ») présente la plateforme TCHolding-Immo, un projet de marketplace destiné à mettre en relation des personnes qui souhaitent construire ou rénover en Afrique, notamment depuis l'étranger, avec des professionnels indépendants du bâtiment.
          </p>
          <p className="mt-2 text-justify">
            Le Site est édité par Tia Carelle, porteuse du projet TCHolding-Immo, dont la société TC HOLDING IMMO est en cours de constitution (l'« Éditeur »). Contact : contact@tcholding-immo.com.
          </p>
          <p className="mt-2 text-justify">
            Les présentes conditions encadrent l'utilisation du Site pendant sa phase de pré-ouverture.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">Article 2 — Phase de pré-ouverture</h2>
          <p className="mt-2 text-justify">2.1. Le Site est en phase de pré-ouverture. Les fonctionnalités de mise en relation, de discussion avec les professionnels, de conclusion de contrats, de paiement et de suivi de chantier ne sont pas encore disponibles.</p>
          <p className="mt-2 text-justify">2.2. Aucun paiement n'est demandé et aucun contrat de prestation ne peut être conclu via le Site pendant cette phase.</p>
          <p className="mt-2 text-justify">2.3. Les contenus présentés (profils, descriptions, fonctionnalités) illustrent la plateforme à venir. Ils n'ont pas valeur d'offre et peuvent évoluer avant l'ouverture.</p>
          <p className="mt-2 text-justify">2.4. La date d'ouverture n'est pas garantie. L'Éditeur peut modifier, suspendre ou arrêter le projet.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">Article 3 — Accès et compte</h2>
          <p className="mt-2 text-justify">3.1. Le Site est réservé aux personnes majeures.</p>
          <p className="mt-2 text-justify">3.2. L'utilisateur peut créer un compte en renseignant son nom, son prénom et son adresse e-mail. Il fournit des informations exactes et garde ses identifiants confidentiels.</p>
          <p className="mt-2 text-justify">3.3. La création d'un compte est gratuite. Elle ne crée aucune obligation d'achat ni d'utilisation du service. Les personnes qui l'ont accepté sont prévenues de l'ouverture de la plateforme.</p>
          <p className="mt-2 text-justify">3.4. L'utilisateur peut supprimer son compte à tout moment en écrivant à contact@tcholding-immo.com.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">Article 4 — Utilisation du Site</h2>
          <p className="mt-2 text-justify">
            L'utilisateur utilise le Site de manière loyale. Sont interdits : l'usurpation d'identité, la fourniture d'informations fausses, toute tentative d'accès non autorisé, la collecte automatisée des contenus du Site et tout usage illicite. L'Éditeur peut suspendre ou supprimer un compte en cas de manquement.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">Article 5 — Informations et responsabilité</h2>
          <p className="mt-2 text-justify">5.1. Les informations du Site sont données à titre indicatif. Elles ne constituent ni un conseil juridique, technique ou financier, ni une promesse de résultat.</p>
          <p className="mt-2 text-justify">5.2. Le Site est fourni en l'état. L'Éditeur s'efforce d'en assurer l'accès mais ne garantit pas une disponibilité continue.</p>
          <p className="mt-2 text-justify">5.3. Aucune stipulation n'exclut la responsabilité de l'Éditeur en cas de dol, de faute lourde ou de dommage corporel, ni les droits impératifs reconnus aux consommateurs.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">Article 6 — Données personnelles</h2>
          <p className="mt-2 text-justify">
            Les données personnelles de l'utilisateur sont traitées conformément à la{" "}
            <a href="/confidentialite" className="text-brand underline">Politique de confidentialité</a>, qui fait partie des présentes conditions.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">Article 7 — Propriété intellectuelle</h2>
          <p className="mt-2 text-justify">
            La marque TCHolding-Immo, les logos, textes, vidéos et éléments graphiques du Site appartiennent à l'Éditeur. Toute reproduction ou utilisation sans autorisation écrite préalable est interdite.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">Article 8 — Évolution des conditions</h2>
          <p className="mt-2 text-justify">
            Des conditions générales complètes seront publiées à l'ouverture de la plateforme. Les utilisateurs inscrits en seront informés par e-mail et pourront supprimer leur compte s'ils ne les acceptent pas.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">Article 9 — Droit applicable</h2>
          <p className="mt-2 text-justify">
            Les présentes conditions sont soumises au droit ivoirien, sans préjudice des dispositions impératives de protection des consommateurs du pays de résidence de l'utilisateur. En cas de difficulté, l'utilisateur est invité à écrire d'abord à contact@tcholding-immo.com pour rechercher une solution amiable.
          </p>
        </section>
      </div>
    </div>
  );
}
