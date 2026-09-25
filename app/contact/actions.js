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
        from: "TC-Immo <contact@tcholding-immo.com>",
        to: "contact@tcholding-immo.com",
        reply_to: email,
        subject: `Nouveau message de ${firstName} ${lastName} — TC-Immo`,
        text: `Nom : ${firstName} ${lastName}\nEmail : ${email}\n\nMessage :\n${message}`,
      }),
    });

    if (!response.ok) {
      // L'envoi échoue en coulisses (clé Resend à corriger), mais on ne
      // montre rien à la personne qui remplit le formulaire — pas
      // d'erreur affichée tant que ce n'est pas réglé.
      const errorText = await response.text();
      console.error("Erreur d'envoi Resend :", errorText);
    }
  } catch (err) {
    console.error("Erreur d'envoi du message de contact :", err);
  }

  redirect("/contact?success=1");
}
