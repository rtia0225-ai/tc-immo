"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/ensureProfile";
import { toAuthIdentity } from "@/lib/authIdentity";
import { containsPhoneNumber, containsExternalPlatformMention } from "@/lib/phoneFilter";

export async function signup(formData) {
  const supabase = createClient();

  const identifier = formData.get("identifier"); // email OU numéro de téléphone
  const password = formData.get("password");
  const fullName = formData.get("fullName");
  const role = formData.get("role"); // 'client' ou 'artisan'
  const city = formData.get("city");
  const country = formData.get("country");
  const redirectTo = formData.get("redirect"); // page à retrouver après connexion

  // Champs supplémentaires, uniquement utilisés si artisan
  const trade = formData.get("trade");
  const bio = formData.get("bio");
  const yearsExperience = formData.get("yearsExperience");
  const pricingInfo = formData.get("pricingInfo");
  const mobilityScope = formData.get("mobilityScope");
  const mobilityCities = formData.getAll("mobilityCities");
  const services = formData.getAll("services");
  const emergencyContactName = formData.get("emergencyContactName");
  const emergencyContactPhone = formData.get("emergencyContactPhone");
  const mobileMoneyOperator = formData.get("mobileMoneyOperator");
  const mobileMoneyNumber = formData.get("mobileMoneyNumber");
  const recruitedByTechnicianId = formData.get("recruitedByTechnicianId") || null;
  const interviewSlotId = formData.get("interviewSlotId") || null;

  // Ce que le client verra (description, tarification) ne doit jamais
  // contenir de numéro de téléphone, même règle que la messagerie.
  if (role === "artisan" && (containsPhoneNumber(bio) || containsPhoneNumber(pricingInfo))) {
    const qs = new URLSearchParams({ role, ...(redirectTo ? { redirect: redirectTo } : {}) });
    redirect(
      `/auth/signup?${qs.toString()}&error=${encodeURIComponent(
        "Votre description ou votre tarification contient un numéro de téléphone. Retirez-le : les échanges de coordonnées ne sont pas autorisés sur la plateforme."
      )}`
    );
  }

  if (role === "artisan" && (containsExternalPlatformMention(bio) || containsExternalPlatformMention(pricingInfo))) {
    const qs = new URLSearchParams({ role, ...(redirectTo ? { redirect: redirectTo } : {}) });
    redirect(
      `/auth/signup?${qs.toString()}&error=${encodeURIComponent(
        "Votre description ou votre tarification mentionne un réseau social, une appli externe, ou le nom d'une entreprise/cabinet. Retirez cette mention : les échanges doivent rester sur la plateforme."
      )}`
    );
  }

  const { email, phone } = toAuthIdentity(identifier);

  // Tout part dans les métadonnées du compte : le déclencheur en base de
  // données crée le profil complet (client ou artisan) automatiquement,
  // même si la confirmation d'email retarde la création d'une session.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
        phone,
        city,
        country,
        trade,
        bio,
        years_experience: yearsExperience,
        pricing_info: pricingInfo,
        mobility_scope: mobilityScope,
        mobility_cities: mobilityCities,
        services,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        mobile_money_operator: mobileMoneyOperator,
        mobile_money_number: mobileMoneyNumber,
        recruited_by_technician_id: recruitedByTechnicianId,
        interview_slot_id: interviewSlotId,
      },
    },
  });

  if (error) {
    const url = redirectTo
      ? `/auth/signup?redirect=${encodeURIComponent(redirectTo)}&error=${encodeURIComponent(error.message)}`
      : `/auth/signup?error=${encodeURIComponent(error.message)}`;
    return redirect(url);
  }

  // Par sécurité (contre l'énumération d'emails), Supabase ne renvoie
  // jamais d'erreur explicite quand l'email/numéro existe déjà : il
  // répond "succès" avec un tableau d'identités vide. C'est le seul
  // signal disponible pour détecter un compte déjà existant.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    const message = "Un compte existe déjà avec ce numéro ou cet email.";
    const url = redirectTo
      ? `/auth/signup?redirect=${encodeURIComponent(redirectTo)}&error=${encodeURIComponent(message)}&existing=1`
      : `/auth/signup?error=${encodeURIComponent(message)}&existing=1`;
    return redirect(url);
  }

  const userId = data.user?.id;
  if (userId) {
    // Tentative immédiate (fonctionne si aucune confirmation d'email
    // n'est requise). Si ça échoue silencieusement, le déclencheur en
    // base de données (ou ensureProfile() à la connexion) rattrape ça.
    await supabase.from("profiles").insert({
      id: userId,
      full_name: fullName,
      role,
      phone,
      city,
      country,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      // Seuls les professionnels passent par une validation manuelle.
      approval_status: role === "artisan" ? "pending" : "approved",
    });

    if (role === "artisan") {
      await supabase.from("artisan_profiles").insert({
        id: userId,
        trade: trade || "Non spécifié",
        bio,
        years_experience: yearsExperience ? Number(yearsExperience) : 0,
        pricing_info: pricingInfo,
        mobility_scope: mobilityScope || "selected",
        mobility_cities: mobilityScope === "selected" ? mobilityCities : [],
        services,
        mobile_money_operator: mobileMoneyOperator || null,
        mobile_money_number: mobileMoneyNumber || null,
        recruited_by_technician_id: recruitedByTechnicianId,
      });
    }

    // Réservation immédiate du créneau d'entretien, si applicable et si
    // une session existe déjà. Filet de sécurité dans ensureProfile()
    // sinon (cas d'une confirmation d'email en attente).
    if (interviewSlotId) {
      const { error: bookingError } = await supabase.from("interview_bookings").insert({
        applicant_id: userId,
        slot_id: interviewSlotId,
      });
      if (!bookingError) {
        await supabase.from("interview_slots").update({ is_booked: true }).eq("id", interviewSlotId);
      }
    }
  }

  const confirmParams = new URLSearchParams();
  if (role) confirmParams.set("role", role);
  if (redirectTo) confirmParams.set("redirect", redirectTo);
  confirmParams.set("viaEmail", phone ? "0" : "1");
  const confirmUrl = `/auth/confirm-email${confirmParams.toString() ? `?${confirmParams.toString()}` : ""}`;
  redirect(confirmUrl);
}

export async function login(formData) {
  const supabase = createClient();

  const identifier = formData.get("identifier"); // email OU numéro de téléphone
  const password = formData.get("password");
  const redirectTo = formData.get("redirect"); // page à retrouver après connexion

  const { email } = toAuthIdentity(identifier);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const errorUrl = redirectTo
      ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}&error=${encodeURIComponent(error.message)}`
      : `/auth/login?error=${encodeURIComponent(error.message)}`;
    return redirect(errorUrl);
  }

  // Rattrapage : si le profil n'existe pas encore (cas de la confirmation
  // d'email qui a retardé sa création), on le crée maintenant.
  await ensureProfile(supabase, data.user);

  // Renvoie la personne exactement là où elle voulait aller
  // (ex: reprendre la prise de RDV sur la fiche d'un artisan).
  redirect(redirectTo || "/dashboard");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Demande de réinitialisation de mot de passe. Fonctionne uniquement
// pour les comptes créés avec un vrai email (Supabase a besoin d'une
// vraie boîte mail pour envoyer le lien) — pas pour les comptes créés
// par numéro de téléphone, tant que les SMS ne sont pas en place.
export async function requestPasswordReset(formData) {
  const supabase = createClient();
  const identifier = formData.get("identifier");
  const { email, phone } = toAuthIdentity(identifier);

  if (phone) {
    redirect("/auth/forgot-password?phone=1");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://tcholding-immo.com"}/auth/reset-password`,
  });

  // Toujours répondre "envoyé", même en cas d'erreur, pour ne pas
  // révéler si un email existe ou non dans la base (sécurité).
  if (error) {
    console.error("Erreur reset password:", error);
  }

  redirect("/auth/forgot-password?sent=1");
}
