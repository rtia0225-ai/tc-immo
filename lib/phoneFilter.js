// Détecte la présence d'un numéro de téléphone dans un texte, sous ses
// formes courantes : avec ou sans espaces/points/tirets, avec ou sans
// indicatif international (+225...). Volontairement large pour bloquer
// aussi les numéros "espacés" ou "cassés" avec des caractères quelconques
// pour tenter de contourner le filtre (ex: "07 01 02 03 04",
// "07.01.02.03.04", "0701020304", "07*01_02-03/04", "07⁠01⁠02⁠03⁠04").
export function containsPhoneNumber(text) {
  if (!text) return false;

  // Au moins 8 chiffres au total, séparés ou non par n'importe quel(s)
  // caractère(s) non-alphabétique(s) (espace, ponctuation, symbole,
  // emoji...) — jusqu'à 3 d'affilée entre deux chiffres, pour ne pas
  // accrocher un numéro de téléphone noyé dans une vraie phrase.
  const digitGroup = /(?:\+?\d[^\p{L}\d]{0,3}){8,}\d?/gu;
  const matches = text.match(digitGroup) || [];

  return matches.some((m) => (m.match(/\d/g) || []).length >= 8);
}

// Détecte une adresse e-mail, y compris "épelée" pour contourner la
// détection habituelle : "arobase"/"at"/"[at]"/"(at)" à la place de "@",
// "point"/"dot"/"[point]"/"(point)" à la place de ".". On normalise le
// texte (on remet les vrais caractères à la place de ces mots), puis on
// cherche un motif e-mail classique dans le résultat.
const AT_PATTERN = /\s*[\[(]?\s*(?:arobase|@|\bat\b)\s*[\])]?\s*/gi;
const DOT_PATTERN = /\s*[\[(]?\s*(?:point|dot)\s*[\])]?\s*/gi;
const EMAIL_PATTERN = /[a-z0-9._%+-]{2,}@[a-z0-9-]{2,}\.[a-z]{2,}/i;

export function containsEmailAddress(text) {
  if (!text) return false;

  // Repère déjà une adresse e-mail "normale" écrite telle quelle.
  if (EMAIL_PATTERN.test(text)) return true;

  // Puis une version épelée : on reconstitue les vrais caractères et on
  // retente la détection.
  const normalized = text
    .replace(AT_PATTERN, "@")
    .replace(DOT_PATTERN, ".")
    .replace(/\s+/g, "");

  return EMAIL_PATTERN.test(normalized);
}

// Détecte une mention d'un réseau social ou d'une appli de messagerie
// externe (Facebook, WhatsApp, Instagram...) — quasi toujours utilisée
// pour rediriger l'échange en dehors de la plateforme.
const EXTERNAL_PLATFORMS = [
  "facebook", "fb\\.com", "whatsapp", "whats app", "wathsapp", "instagram",
  "insta", "telegram", "messenger", "snapchat", "tiktok", "twitter", "\\bx\\.com\\b",
  "réseau social", "réseaux sociaux",
  "cabinet", "\\bentreprise\\b", "\\bsociété\\b", "\\bsarl\\b", "\\bets\\b",
];
const EXTERNAL_PLATFORM_REGEX = new RegExp(EXTERNAL_PLATFORMS.join("|"), "i");

export function containsExternalPlatformMention(text) {
  if (!text) return false;
  return EXTERNAL_PLATFORM_REGEX.test(text);
}

// Détecte si le texte contient le nom complet de la personne (utilisé
// pour empêcher "cherchez [Mon Nom] sur Facebook" par exemple).
export function containsFullName(text, fullName) {
  if (!text || !fullName) return false;
  const cleanName = fullName.trim().toLowerCase();
  if (cleanName.length < 4) return false; // évite les faux positifs sur un prénom très court
  return text.toLowerCase().includes(cleanName);
}
