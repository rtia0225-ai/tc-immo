// Logique du simulateur "Trouver ma démarche" (ConstructionWizard) : les
// questions, l'arbre de décision et la feuille de route qui en résulte.
// Partagée entre le composant client (affichage) et la route d'envoi du
// rapport détaillé par e-mail (lib/wizardReportEmail.js), pour ne jamais
// avoir deux versions de la même logique qui pourraient diverger.

export const STEPS = {
  loti: {
    question: "Votre terrain est-il loti ?",
    options: [
      { value: "oui", label: "Oui, il est dans un lotissement reconnu" },
      { value: "non", label: "Non, il n'est pas loti" },
    ],
    next: (value) => (value === "non" ? "decline" : "titre"),
  },
  titre: {
    question: "Quel type de titre avez-vous sur ce terrain ?",
    options: [
      { value: "provisoire", label: "Un titre provisoire (attestation villageoise, lettre d'attribution...)" },
      { value: "permanent", label: "Un titre permanent (ACD ou Titre Foncier)" },
    ],
    // Avec un titre provisoire, impossible d'avoir un Certificat
    // d'Urbanisme, inutile de poser la question, on saute directement
    // à la suite.
    next: (value) => (value === "provisoire" ? "construction" : "cu"),
  },
  cu: {
    question: "Avez-vous déjà le Certificat d'Urbanisme (CU) ?",
    options: [
      { value: "oui", label: "Oui, je l'ai déjà" },
      { value: "non", label: "Non, pas encore" },
    ],
    next: () => "construction",
  },
  construction: {
    question: "Que souhaitez-vous construire ?",
    options: [
      { value: "simple", label: "Une maison d'habitation simple (villa basse ou duplex R+1)" },
      { value: "grand", label: "Un grand bâtiment (immeuble R+2 ou plus, sous-sol, local commercial)" },
    ],
    next: () => "result",
  },
};

export const FIRST_STEP = "loti";

// Construit la feuille de route complète, avec une courte explication de
// ce que fait chaque professionnel à chaque étape.
export function buildRoadmap(answers) {
  const steps = [];

  if (answers.titre === "provisoire") {
    steps.push({
      title: "Obtenir un titre permanent (ACD)",
      text: "Un titre provisoire ne suffit pas pour la suite des démarches, il faut d'abord le faire transformer en titre permanent.",
      professional: {
        trade: "Topographe",
        note: "Le géomètre-topographe prend en charge toute la procédure ACD : bornage du terrain, montage du dossier technique et dépôt auprès de l'État. Ses honoraires se discutent directement avec lui.",
      },
    });
  }

  if (answers.titre === "provisoire" || answers.cu === "non") {
    steps.push({
      title: "Obtenir le Certificat d'Urbanisme (CU)",
      text: "Ce document confirme officiellement ce qu'il est permis de construire sur ce terrain précis.",
      professional: {
        trade: "Topographe",
        note: "Le géomètre-topographe s'occupe aussi de toute la procédure du Certificat d'Urbanisme : plans topographiques officiels et dépôt du dossier. Ses honoraires se discutent directement avec lui.",
      },
    });
  }

  if (answers.construction === "simple") {
    steps.push({
      title: "Concevoir les plans et déposer le Permis de Construire",
      text: "L'architecte mène cette démarche en votre nom. Le terrain et le permis restent bien à vous, et une fois obtenu, il livre le Permis de Construire directement sur la plateforme.",
      professional: {
        trade: "Architecture",
        note: "L'architecte dessine les plans réglementaires de la maison, dépose le dossier en votre nom, et remet le Permis de Construire obtenu sur TCHolding-Immo.",
      },
    });
  } else if (answers.construction === "grand") {
    steps.push({
      title: "Étudier le sol, concevoir les plans et déposer le Permis de Construire",
      text: "Un bâtiment de plusieurs étages demande en plus une étude technique de solidité avant le dépôt du dossier. L'architecte mène cette démarche en votre nom et livre le Permis de Construire directement sur la plateforme une fois obtenu.",
      professional: [
        {
          trade: "Architecture",
          note: "L'architecte dessine les plans réglementaires, dépose le dossier en votre nom, et remet le Permis de Construire obtenu sur TCHolding-Immo.",
        },
        {
          trade: "Ingénieur génie civil",
          note: "L'ingénieur calcule la résistance du sol et la solidité de la structure (béton, ferraillage).",
        },
      ],
    });
  }

  steps.push({
    title: "Trouver un technicien BTP pour la construction",
    text: "Une fois le Permis de Construire obtenu, c'est lui qui prend en charge la construction de votre maison de bout en bout.",
    professional: {
      trade: "Technicien BTP",
      note: "Le technicien BTP trouve et coordonne les maçons et autres corps de métier nécessaires, et supervise le chantier jusqu'à la livraison.",
    },
  });

  return steps;
}
