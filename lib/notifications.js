// NOTE IMPORTANTE :
// Ce fichier ne fait qu'écrire les événements en base pour l'instant.
// Pour envoyer de vrais SMS (rappel de RDV avec lien, notification de
// nouveau message), il faut brancher un prestataire comme Twilio,
// Vonage, ou un fournisseur local (ex: Orange SMS API, MTN).
//
// Exemple d'intégration Twilio (à décommenter une fois le compte créé
// et les variables TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM
// ajoutées dans .env.local et sur Vercel) :
//
// import twilio from "twilio";
// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// await client.messages.create({
//   to: phoneNumber,
//   from: process.env.TWILIO_FROM,
//   body: message,
// });

import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:contact@tc-immo.local",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Envoie une vraie notification push (comme WhatsApp) à tous les
// appareils sur lesquels la personne a activé les notifications.
// Gratuit — technologie native des navigateurs, aucun prestataire tiers.
async function sendPush(userId, title, body, url = "/") {
  if (!userId || !process.env.VAPID_PRIVATE_KEY) return;
  const supabase = createClient();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body, url })
        );
      } catch (err) {
        // Abonnement expiré/révoqué : on le supprime silencieusement.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}

async function sendSms(phoneNumber, message) {
  if (!phoneNumber) return;
  // TODO : remplacer ce console.log par un vrai appel à un prestataire
  // SMS (Twilio, Orange...) quand ce partenariat sera en place.
  console.log(`[SMS à ${phoneNumber}] ${message}`);
}

export async function notifyNewAppointment(appointmentId) {
  const supabase = createClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      `scheduled_at, meeting_link,
       artisan_id, profiles:artisan_id ( phone, full_name )`
    )
    .eq("id", appointmentId)
    .single();

  if (!appointment) return;

  const date = new Date(appointment.scheduled_at).toLocaleString("fr-FR");
  await sendSms(
    appointment.profiles?.phone,
    `TC-Immo : nouveau rendez-vous demandé le ${date}. Connectez-vous pour confirmer.`
  );
  await sendPush(
    appointment.artisan_id,
    "Nouveau rendez-vous",
    `Un rendez-vous est proposé pour le ${date}.`,
    "/appointments"
  );
}

export async function notifyAppointmentReminder(appointmentId) {
  const supabase = createClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      `scheduled_at, meeting_link, client_id, artisan_id,
       client:client_id ( phone ),
       artisan:artisan_id ( profiles:id ( phone ) )`
    )
    .eq("id", appointmentId)
    .single();

  if (!appointment) return;

  const link = appointment.meeting_link
    ? ` Lien : ${appointment.meeting_link}`
    : "";
  const message = `TC-Immo : rappel de votre rendez-vous.${link}`;

  await sendSms(appointment.client?.phone, message);
  await sendSms(appointment.artisan?.profiles?.phone, message);
  await sendPush(appointment.client_id, "Rappel de rendez-vous", message, "/appointments");
  await sendPush(appointment.artisan_id, "Rappel de rendez-vous", message, "/appointments");
}

export async function notifyNewMessage(recipientProfileId) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", recipientProfileId)
    .single();

  if (!profile) return;

  await sendSms(profile.phone, "TC-Immo : vous avez reçu un nouveau message.");
  await sendPush(recipientProfileId, "Nouveau message", "Vous avez reçu un nouveau message sur TC-Immo.", "/messages");
}
