"use server";

import { redirect } from "next/navigation";

export async function sendContactMessage(formData) {
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const email = formData.get("email");
  const message = formData.get("message");

  if (!firstName || !lastName || !email || !message) {
    redirect("/contact?error=Merci+de+remplir+tous+les+champs");
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TCHolding-Immo <contact@tcholding-immo.com>",
        to: "contact@tcholding-immo.com",
        reply_to: email,
        subject: `Nouveau message de ${firstName} ${lastName} (TCHolding-Immo)`,
        text: `Nom : ${firstName} ${lastName}\nEmail : ${email}\n\nMessage :\n${message}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur d'envoi Resend :", errorText);
      // L'envoi a vraiment échoué : on le dit à la personne plutôt que
      // de prétendre que son message est parti alors que ce n'est pas
      // le cas, elle pourrait sinon attendre une réponse qui ne viendra
      // jamais.
      redirect("/contact?error=" + encodeURIComponent("Votre message n'a pas pu être envoyé. Merci de réessayer dans quelques instants, ou d'écrire directement à contact@tcholding-immo.com."));
    }
  } catch (err) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err; // laisse passer le redirect ci-dessus
    console.error("Erreur d'envoi du message de contact :", err);
    redirect("/contact?error=" + encodeURIComponent("Votre message n'a pas pu être envoyé. Merci de réessayer dans quelques instants, ou d'écrire directement à contact@tcholding-immo.com."));
  }

  redirect("/contact?success=1");
}
