export const metadata = {
  title: "Politique de confidentialité",
  description: "Comment TCHolding-Immo collecte, utilise et protège vos données personnelles pendant la phase de pré-ouverture du site.",
};

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold text-ink">Politique de confidentialité</h1>
      <p className="mt-2 text-sm italic text-gray-500">
        Phase de pré-ouverture — Dernière mise à jour : 06/10/2026
      </p>

      <div className="mt-8 flex flex-col gap-7 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="font-heading text-lg font-bold text-ink">1. Responsable du traitement</h2>
          <p className="mt-2 text-justify">
            Le responsable du traitement est Tia Carelle, porteuse du projet TCHolding-Immo, dont la société TC HOLDING IMMO est en cours de constitution. Contact : contact@tcholding-immo.com.
          </p>
          <p className="mt-2 text-justify">
            Les données sont traitées conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel et, pour les personnes situées dans l'Union européenne, au Règlement (UE) 2016/679 (RGPD).
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">2. Données collectées</h2>
          <ul className="mt-2 flex flex-col gap-1.5 pl-5 text-justify">
            <li className="list-disc">À l'inscription (tous) : nom, prénom, numéro de téléphone ou adresse e-mail, ville, confirmation de majorité, et le cas échéant nom et téléphone d'un contact d'urgence.</li>
            <li className="list-disc">À l'inscription (professionnels uniquement) : métier, services proposés, années d'expérience, description, tarification indicative, ville(s) d'intervention, numéro et opérateur Mobile Money, pièce d'identité, photos ou vidéos de réalisations.</li>
            <li className="list-disc">Une fois connecté : pages et profils consultés, demandes de contact effectuées, associés au compte de l'utilisateur.</li>
            <li className="list-disc">Formulaire de contact : nom, adresse e-mail et message.</li>
            <li className="list-disc">Données techniques : adresse IP, type d'appareil et de navigateur, pages consultées, date et heure de visite.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">3. Finalités et bases légales</h2>
          <ul className="mt-2 flex flex-col gap-1.5 pl-5 text-justify">
            <li className="list-disc">Créer et gérer le compte : exécution des présentes conditions.</li>
            <li className="list-disc">Prévenir l'utilisateur de l'ouverture de la plateforme et le recontacter : consentement, que l'utilisateur peut retirer à tout moment.</li>
            <li className="list-disc">Étudier l'intérêt des utilisateurs pour le service, à partir de leurs actions sur le Site : intérêt légitime de l'Éditeur. L'utilisateur peut s'y opposer à tout moment.</li>
            <li className="list-disc">Répondre aux messages reçus via le formulaire de contact : intérêt légitime.</li>
            <li className="list-disc">Mesurer l'audience du Site (Google Analytics) : consentement, recueilli par le bandeau cookies.</li>
          </ul>
          <p className="mt-3 text-justify">Les données ne sont jamais vendues.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">4. Destinataires et transferts</h2>
          <p className="mt-2 text-justify">
            Les données sont accessibles à l'Éditeur et à ses prestataires techniques : Vercel (hébergement du Site), Resend (envoi d'e-mails), Google (Google Analytics, avec le consentement de l'utilisateur), OVH (nom de domaine et messagerie) et Supabase (hébergement de la base de données). Certains de ces prestataires sont situés hors de l'Union européenne, notamment aux États-Unis. Ces transferts sont encadrés par des garanties appropriées (décision d'adéquation, clauses contractuelles types de la Commission européenne ou mécanisme équivalent).
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">5. Durées de conservation</h2>
          <ul className="mt-2 flex flex-col gap-1.5 pl-5 text-justify">
            <li className="list-disc">Compte et demande de recontact : 3 ans au maximum à compter du dernier contact, ou jusqu'au retrait du consentement ou à la suppression du compte.</li>
            <li className="list-disc">Messages du formulaire de contact : 3 ans.</li>
            <li className="list-disc">Cookies et données de mesure d'audience : 13 mois au maximum.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">6. Cookies</h2>
          <p className="mt-2 text-justify">
            Le Site utilise des cookies strictement nécessaires à son fonctionnement, qui ne demandent pas de consentement, et des cookies de mesure d'audience (Google Analytics), déposés uniquement après acceptation de l'utilisateur. Le bandeau affiché à la première visite permet de les accepter, de les refuser ou de les paramétrer. Le choix peut être modifié à tout moment depuis le lien « Gérer mes cookies » en bas de page.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">7. Droits des personnes</h2>
          <p className="mt-2 text-justify">
            Toute personne dispose des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de ses données, ainsi que du droit de retirer son consentement à tout moment. Ces droits s'exercent en écrivant à contact@tcholding-immo.com. L'Éditeur répond dans un délai d'un mois.
          </p>
          <p className="mt-2 text-justify">
            En cas de difficulté, toute personne peut saisir la CNIL (www.cnil.fr) si elle réside en France, l'ARTCI (www.artci.ci) pour la Côte d'Ivoire, ou l'autorité de protection des données de son pays de résidence.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink">8. Sécurité et mineurs</h2>
          <p className="mt-2 text-justify">
            L'Éditeur met en œuvre des mesures de sécurité adaptées : connexion chiffrée (HTTPS), accès restreint aux données, mots de passe stockés sous forme chiffrée. Le Site est réservé aux personnes majeures et ne collecte pas sciemment de données de mineurs.
          </p>
        </section>
      </div>
    </div>
  );
}
