import { buildRoadmap } from "@/lib/constructionRoadmap";

// Contenu du rapport détaillé envoyé par e-mail depuis le simulateur
// "Trouver ma démarche" (ConstructionWizard, page d'accueil).
//
// Contrairement à la feuille de route affichée dans le simulateur (qui ne
// montre que les étapes concernant la situation de la personne), ce
// rapport couvre l'ensemble du parcours réglementaire ivoirien et tous
// les acteurs, pour que la personne comprenne pourquoi chaque étape
// existe. Les étapes qui la concernent directement, d'après ses réponses,
// sont mises en avant en tête du rapport.
//
// Bases légales citées (vérifiées, à ne pas modifier sans re-vérifier) :
// - Loi n°2020-624 du 14 août 2020 instituant le Code de l'Urbanisme et
//   du Domaine foncier urbain (lotissement, Certificat d'Urbanisme, ACD).
// - Loi n°2019-576 du 26 juin 2019 instituant le Code de la Construction
//   et de l'Habitat (permis de construire, rôle de l'architecte).

const ACTOR_SECTIONS = [
  {
    title: "Le géomètre-topographe : sécuriser le terrain",
    body: `
      <p>Avant même de penser à construire, il faut que le terrain lui-même soit en règle. C'est le rôle du géomètre-topographe, et c'est la première raison pour laquelle on recommande de ne jamais sauter cette étape : un terrain mal sécurisé peut être contesté ou repris, même après des années de construction.</p>
      <p><strong>Transformer un titre provisoire en titre permanent (ACD).</strong> Une attestation villageoise ou une lettre d'attribution n'est qu'une étape intermédiaire. Le titre permanent — l'Arrêté de Concession Définitive (ACD), ou à défaut un Titre Foncier — est ce qui protège réellement la propriété sur la durée. La loi n°2020-624 du 14 août 2020 (Code de l'Urbanisme et du Domaine foncier urbain) encadre cette conversion : le géomètre borne le terrain, monte le dossier technique et le dépose auprès de l'État en votre nom.</p>
      <p><strong>Obtenir le Certificat d'Urbanisme (CU).</strong> Ce document officiel fixe les règles d'urbanisme qui s'appliquent précisément à votre parcelle : hauteur maximale autorisée, reculs à respecter, usage du sol. Sans lui, impossible de savoir avec certitude ce que le terrain permet réellement de construire — et le Permis de Construire ne pourra pas être déposé sans cette référence.</p>
    `,
  },
  {
    title: "L'architecte : donner une forme légale au projet",
    body: `
      <p>En Côte d'Ivoire, le recours à un architecte agréé, inscrit à l'Ordre des Architectes de Côte d'Ivoire, est une obligation légale pour la plupart des projets (la loi n°2019-576 du 26 juin 2019, Code de la Construction et de l'Habitat, prévoit une dispense uniquement pour les constructions de très petite taille et de faible coût). Ce n'est pas une simple formalité : c'est l'architecte qui transforme votre projet en dossier conforme aux règles de construction, et qui le dépose en votre nom auprès des autorités.</p>
      <p>Concrètement, l'architecte s'appuie sur le Certificat d'Urbanisme obtenu précédemment, ainsi que sur les visas techniques des concessionnaires de réseaux (CIE pour l'électricité, SODECI pour l'eau, et la Direction de l'Assainissement et du Drainage), qui confirment que les raccordements nécessaires sont possibles. Il conçoit les plans, dépose le dossier de Permis de Construire, et vous le remet une fois obtenu — le terrain et le permis restent intégralement les vôtres.</p>
    `,
  },
  {
    title: "L'ingénieur génie civil : garantir la solidité, pour les bâtiments plus importants",
    body: `
      <p>Pour un immeuble de plusieurs étages, un sous-sol ou un local commercial, les plans de l'architecte ne suffisent pas : il faut aussi la signature d'un ingénieur en génie civil, qui calcule la résistance du sol et la solidité de la structure (béton, ferraillage). Cette étude technique conditionne elle aussi l'acceptation du dossier par les autorités, car elle engage la sécurité des futurs occupants — c'est une responsabilité que la réglementation ne laisse pas à l'appréciation du maître d'ouvrage.</p>
      <p>Pour une maison d'habitation simple (villa basse ou duplex R+1), cette étude n'est généralement pas exigée, et l'architecte peut porter seul le dossier.</p>
    `,
  },
  {
    title: "Le technicien BTP : exécuter, dans le respect du permis obtenu",
    body: `
      <p>Une fois le Permis de Construire délivré, la construction elle-même doit rester conforme à ce qui a été autorisé — toute modification substantielle (hauteur, emprise, destination du bâtiment) expose à des sanctions, y compris une démolition. Le technicien BTP recrute et coordonne les corps de métier nécessaires (maçons, électriciens, plombiers...) et supervise le chantier jusqu'à la livraison, en restant dans le cadre fixé par le permis.</p>
      <p>C'est aussi à cette étape que le suivi à distance devient précieux pour la diaspora : chaque avancée peut être vérifiée avant chaque paiement, plutôt que de devoir faire confiance à l'aveugle.</p>
    `,
  },
  {
    title: "Pourquoi on ne peut pas sauter d'étape",
    body: `
      <p>Chacune de ces étapes correspond à une vérification que l'État ivoirien impose avant de laisser construire : la légalité du terrain (Code de l'Urbanisme et du Domaine foncier urbain), puis la conformité et la sécurité du bâtiment (Code de la Construction et de l'Habitat). Construire sans ces autorisations expose à un risque réel : arrêt de chantier, amende, voire démolition de ce qui a déjà été construit — une perte qui est presque toujours plus coûteuse que le temps pris pour sécuriser chaque étape en amont.</p>
      <p>C'est pour cette raison que TCHolding-Immo structure l'ensemble du parcours autour de professionnels vérifiés à chaque étape, et d'un paiement découpé en plusieurs échéances, liées chacune à une étape réellement validée.</p>
    `,
  },
];

function highlightsFromAnswers(answers = {}) {
  const roadmap = buildRoadmap(answers);
  if (!roadmap.length) return null;
  const items = roadmap
    .map((s) => `<li><strong>${s.title}</strong> — ${s.text}</li>`)
    .join("");
  return `
    <div style="background:#FBF2EC;border-radius:10px;padding:18px 20px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:700;color:#1A1A1A;">D'après vos réponses dans le simulateur, voici ce qui vous concerne directement :</p>
      <ul style="margin:0;padding-left:18px;color:#1A1A1A;">${items}</ul>
    </div>
  `;
}

export function buildWizardReportHtml(answers) {
  const highlights = highlightsFromAnswers(answers);
  const sections = ACTOR_SECTIONS.map(
    (s) => `
      <h2 style="font-size:17px;color:#9F0F2E;margin:28px 0 8px;">${s.title}</h2>
      <div style="font-size:14px;line-height:1.6;color:#333;">${s.body}</div>
    `
  ).join("");

  return `
    <div style="font-family:Georgia,'Times New Roman',serif;max-width:620px;margin:0 auto;padding:28px 24px;color:#1A1A1A;">
      <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#777;margin:0 0 4px;">TCHolding-Immo</p>
      <h1 style="font-size:22px;margin:0 0 6px;">Votre rapport détaillé : construire en Côte d'Ivoire, étape par étape</h1>
      <p style="font-size:14px;color:#555;margin:0 0 20px;">Qui fait quoi, et pourquoi chaque étape compte du point de vue de la réglementation ivoirienne.</p>

      ${highlights || ""}

      <p style="font-size:14px;line-height:1.6;color:#333;">Construire à distance, depuis l'étranger, suppose de comprendre précisément qui intervient à chaque étape et pourquoi la réglementation ivoirienne l'exige. Ce rapport reprend, acteur par acteur, l'ensemble du parcours — du terrain jusqu'à la livraison du chantier.</p>

      ${sections}

      <div style="margin-top:32px;padding:18px 20px;background:#F3F7F1;border-radius:10px;">
        <p style="margin:0 0 10px;font-size:14px;color:#1A1A1A;"><strong>Avancer avec des professionnels déjà vérifiés</strong></p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#333;">Sur TCHolding-Immo, chacun de ces professionnels (géomètre-topographe, architecte, ingénieur génie civil, technicien BTP) est vérifié avant d'apparaître sur la plateforme, et chaque paiement correspond à une étape réellement validée.</p>
        <p style="margin:14px 0 0;">
          <a href="https://www.tcholding-immo.com/artisans" style="display:inline-block;background:#9F0F2E;color:#fff;text-decoration:none;font-weight:bold;font-size:13px;padding:10px 18px;border-radius:6px;">Voir les professionnels vérifiés</a>
        </p>
      </div>

      <p style="margin-top:28px;font-size:11px;color:#999;line-height:1.5;">
        Sources : Loi n°2020-624 du 14 août 2020 instituant le Code de l'Urbanisme et du Domaine foncier urbain ; Loi n°2019-576 du 26 juin 2019 instituant le Code de la Construction et de l'Habitat. Ce rapport est fourni à titre informatif et ne remplace pas l'avis d'un professionnel du droit ou de la construction sur votre situation précise.
      </p>
    </div>
  `;
}
