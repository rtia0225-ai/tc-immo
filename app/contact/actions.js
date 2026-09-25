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

  let errorDetail = null;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TC-Immo <contact@tcholding-immo.com>",
        to: "contact@tcholding-immo.com",
        reply_to: email,
        subject: `Nouveau message de ${firstName} ${lastName} — TC-Immo`,
        text: `Nom : ${firstName} ${lastName}\nEmail : ${email}\n\nMessage :\n${message}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur d'envoi Resend :", errorText);
      errorDetail = errorText.slice(0, 300);
    }
  } catch (err) {
    console.error("Erreur d'envoi du message de contact :", err);
    errorDetail = String(err?.message || err).slice(0, 300);
  }

  if (errorDetail) {
    redirect(`/contact?error=${encodeURIComponent(`Détail technique : ${errorDetail}`)}`);
  }

  redirect("/contact?success=1");
}
