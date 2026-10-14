import { createClient } from "@/lib/supabase/server";
import { buildWizardReportHtml } from "@/lib/wizardReportEmail";

const EMAIL_PATTERN = /^[a-z0-9._%+-]{2,}@[a-z0-9-]{2,}\.[a-z]{2,}$/i;

// Envoie, sur demande volontaire depuis le simulateur "Trouver ma
// démarche" (ConstructionWizard, page d'accueil), un rapport détaillé par
// e-mail sur les démarches de construction en Côte d'Ivoire. L'e-mail est
// aussi enregistré (table wizard_report_leads) pour que Rose puisse
// recontacter les personnes intéressées.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const email = (body?.email || "").trim();
  const answers = body?.answers && typeof body.answers === "object" ? body.answers : {};

  if (!EMAIL_PATTERN.test(email)) {
    return Response.json(
      { ok: false, error: "Merci d'indiquer une adresse e-mail valide." },
      { status: 400 }
    );
  }

  try {
    const supabase = createClient();
    // Best-effort : si l'enregistrement du lead échoue, on envoie
    // quand même le rapport, la personne ne doit pas en subir les
    // conséquences.
    await supabase.from("wizard_report_leads").insert({ email, answers });

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TCHolding-Immo <contact@tcholding-immo.com>",
        to: email,
        subject: "Votre rapport détaillé : construire en Côte d'Ivoire, étape par étape",
        html: buildWizardReportHtml(answers),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur d'envoi Resend (rapport simulateur) :", errorText);
      return Response.json(
        {
          ok: false,
          error: "Le rapport n'a pas pu être envoyé. Merci de réessayer dans quelques instants.",
        },
        { status: 502 }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Erreur lors de l'envoi du rapport du simulateur :", err);
    return Response.json(
      {
        ok: false,
        error: "Le rapport n'a pas pu être envoyé. Merci de réessayer dans quelques instants.",
      },
      { status: 500 }
    );
  }
}
