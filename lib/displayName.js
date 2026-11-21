// Le client ne doit jamais voir le nom de famille d'un professionnel sur
// la plateforme (profil, conversations, projet, paiement...) : seulement
// un prénom, le premier s'il en a plusieurs. Le professionnel voit son
// propre nom complet dans son espace, et l'équipe TC-Immo (admin) voit
// toujours les noms complets — cf. consigne Rose du 2026-11-21.
export function firstNameOnly(fullName, fallback = "Professionnel") {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}
