// Cette fonction répare le cas où le profil n'a pas pu être créé au moment
// de l'inscription (ex: confirmation d'email requise, donc pas encore de
// session active pour passer les règles de sécurité de la base de données).
// On garde le nom/rôle/métier dans les métadonnées du compte à l'inscription,
// puis on les utilise ici pour créer le profil dès que l'utilisateur est
// vraiment connecté.

export async function ensureProfile(supabase, user) {
  if (!user) return;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) return; // le profil existe déjà, rien à faire

  const fullName = user.user_metadata?.full_name || "Utilisateur";
  const role = user.user_metadata?.role || "client";
  const trade = user.user_metadata?.trade;
  const phone = user.user_metadata?.phone;
  const city = user.user_metadata?.city;
  const country = user.user_metadata?.country;
  const bio = user.user_metadata?.bio;
  const yearsExperience = user.user_metadata?.years_experience;
  const pricingInfo = user.user_metadata?.pricing_info;
  const mobilityScope = user.user_metadata?.mobility_scope;
  const mobilityCities = user.user_metadata?.mobility_cities;
  const services = user.user_metadata?.services;
  const emergencyContactName = user.user_metadata?.emergency_contact_name;
  const emergencyContactPhone = user.user_metadata?.emergency_contact_phone;
  const mobileMoneyOperator = user.user_metadata?.mobile_money_operator;
  const mobileMoneyNumber = user.user_metadata?.mobile_money_number;
  const recruitedByTechnicianId = user.user_metadata?.recruited_by_technician_id;
  const interviewSlotId = user.user_metadata?.interview_slot_id;

  await supabase.from("profiles").insert({
    id: user.id,
    full_name: fullName,
    role,
    phone,
    city,
    country,
    emergency_contact_name: emergencyContactName,
    emergency_contact_phone: emergencyContactPhone,
    approval_status: role === "artisan" ? "pending" : "approved",
  });

  if (role === "artisan") {
    await supabase.from("artisan_profiles").insert({
      id: user.id,
      trade: trade || "Non spécifié",
      bio,
      years_experience: yearsExperience ? Number(yearsExperience) : 0,
      pricing_info: pricingInfo,
      mobility_scope: mobilityScope || "selected",
      mobility_cities: mobilityCities || [],
      services: services || [],
      mobile_money_operator: mobileMoneyOperator || null,
      mobile_money_number: mobileMoneyNumber || null,
      recruited_by_technician_id: recruitedByTechnicianId || null,
    });
  }

  // Réservation de l'entretien, si elle n'a pas déjà pu se faire au
  // moment de l'inscription (session pas encore active à ce moment-là).
  if (interviewSlotId) {
    const { data: existingBooking } = await supabase
      .from("interview_bookings")
      .select("id")
      .eq("applicant_id", user.id)
      .maybeSingle();

    if (!existingBooking) {
      const { error: bookingError } = await supabase.from("interview_bookings").insert({
        applicant_id: user.id,
        slot_id: interviewSlotId,
      });
      if (!bookingError) {
        await supabase.from("interview_slots").update({ is_booked: true }).eq("id", interviewSlotId);
      }
    }
  }
}
