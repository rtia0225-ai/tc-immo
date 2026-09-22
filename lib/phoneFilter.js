// Détecte la présence d'un numéro de téléphone dans un texte, sous ses
// formes courantes : avec ou sans espaces/points/tirets, avec ou sans
// indicatif international (+225...). Volontairement large pour bloquer
// aussi les numéros "espacés" pour tenter de contourner le filtre
// (ex: "07 01 02 03 04", "07.01.02.03.04", "0701020304").
export function containsPhoneNumber(text) {
  if (!text) return false;

  // Au moins 8 chiffres au total, séparés ou non par espaces/points/tirets/parenthèses
  const digitGroup = /(?:\+?\d[\s.\-()]?){8,}/g;
  const matches = text.match(digitGroup) || [];

  return matches.some((m) => (m.match(/\d/g) || []).length >= 8);
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
