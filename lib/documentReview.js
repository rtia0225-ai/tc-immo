// Vérification automatique (IA) d'un document livré, avant de le rendre
// visible au client et de débloquer le paiement.
//
// Ne vérifie pas le contenu technique du document (ce n'est pas un
// architecte ni un ingénieur) — juste un contrôle de surface : est-ce
// que le fichier déposé ressemble plausiblement au bon type de document
// pour cette prestation ? Si l'IA n'est pas sûre (fichier vide, mauvais
// format, contenu sans rapport, ou appel API qui échoue), le document
// n'est PAS débloqué automatiquement : il reste "en attente de
// vérification manuelle" pour un admin, plutôt que publié par défaut.
//
// Nécessite la variable d'environnement ANTHROPIC_API_KEY (la même que
// pour le chatbot, app/api/chat/route.js).

const MODEL = "claude-haiku-4-5-20251001";

function mediaTypeFor(contentType, fileName) {
  if (contentType?.startsWith("image/")) return contentType;
  if (contentType === "application/pdf") return "application/pdf";
  const ext = (fileName || "").split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

/**
 * @param {Object} params
 * @param {ArrayBuffer} params.fileBuffer
 * @param {string} params.contentType
 * @param {string} params.fileName
 * @param {string} params.trade - métier du prestataire (ex: "Architecture")
 * @param {string} params.documentLabel - document attendu (ex: "Permis de Construire", "ACD")
 * @returns {Promise<{status: "approved"|"needs_manual_review", note: string}>}
 */
export async function reviewDeliverableDocument({ fileBuffer, contentType, fileName, trade, documentLabel }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const mediaType = mediaTypeFor(contentType, fileName);

  if (!apiKey) {
    return {
      status: "needs_manual_review",
      note: "Vérification automatique indisponible (clé API non configurée) : document mis en attente d'une vérification manuelle.",
    };
  }
  if (!mediaType) {
    return {
      status: "needs_manual_review",
      note: `Format de fichier non reconnu pour une vérification automatique (${contentType || fileName}).`,
    };
  }

  const base64 = Buffer.from(fileBuffer).toString("base64");
  const blockType = mediaType === "application/pdf" ? "document" : "image";

  const prompt = `Tu vérifies un document déposé sur TCHolding-Immo, une marketplace qui connecte des clients à des prestataires indépendants en Côte d'Ivoire (BTP, construction).

Le prestataire est de métier "${trade}". Le document attendu à cette étape est : "${documentLabel}".

Regarde le fichier joint et réponds uniquement par un objet JSON, sans texte autour, au format exact :
{"plausible": true|false, "raison": "une phrase courte en français"}

"plausible" = true seulement si le fichier ressemble clairement à ce type de document professionnel (mise en page, en-têtes, contenu technique visible, cachets/signatures le cas échéant). Mets false si : le fichier est vide ou illisible, c'est manifestement un autre type de document (photo sans rapport, texte générique), ou tu as un doute raisonnable. En cas de doute, réponds false — ce n'est qu'un premier filtre, un humain vérifiera ensuite les cas incertains.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        ...(blockType === "document" ? { "anthropic-beta": "pdfs-2024-09-25" } : {}),
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              { type: blockType, source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur API Anthropic (vérification document) :", errText);
      return {
        status: "needs_manual_review",
        note: "La vérification automatique a échoué (erreur technique) : document mis en attente d'une vérification manuelle.",
      };
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "";
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        status: "needs_manual_review",
        note: "Réponse de vérification automatique illisible : document mis en attente d'une vérification manuelle.",
      };
    }

    const parsed = JSON.parse(match[0]);
    if (parsed.plausible === true) {
      return { status: "approved", note: parsed.raison || "Document validé automatiquement." };
    }
    return {
      status: "needs_manual_review",
      note: parsed.raison || "La vérification automatique n'est pas certaine que ce document corresponde à l'étape.",
    };
  } catch (err) {
    console.error("Erreur vérification document (IA) :", err);
    return {
      status: "needs_manual_review",
      note: "La vérification automatique a échoué (erreur technique) : document mis en attente d'une vérification manuelle.",
    };
  }
}
