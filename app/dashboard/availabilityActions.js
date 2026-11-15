"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logClientActivity } from "@/lib/activityLog";

// L'artisan ajoute un créneau disponible (date + heure de début/fin).
export async function addAvailabilitySlot(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const date = formData.get("date");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");

  if (!date || !startTime || !endTime) {
    redirect("/dashboard/availability?error=Merci+de+remplir+la+date+et+les+heures");
  }
  if (startTime >= endTime) {
    redirect("/dashboard/availability?error=L'heure+de+fin+doit+être+après+l'heure+de+début");
  }

  await supabase.from("availability_slots").insert({
    artisan_id: user.id,
    date,
    start_time: startTime,
    end_time: endTime,
  });

  redirect("/dashboard/availability?success=1");
}

// L'artisan retire un créneau qu'il avait ajouté (uniquement s'il n'est
// pas déjà réservé par un client).
export async function removeAvailabilitySlot(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const slotId = formData.get("slotId");

  await supabase
    .from("availability_slots")
    .delete()
    .eq("id", slotId)
    .eq("artisan_id", user.id)
    .eq("is_booked", false);

  redirect("/dashboard/availability?success=1");
}

// Le client réserve un créneau libre : confirmation immédiate, pas de
// négociation à cette étape (l'artisan a déjà déclaré être disponible).
export async function bookAvailabilitySlot(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const slotId = formData.get("slotId");
  const artisanId = formData.get("artisanId");
  const projectId = formData.get("projectId") || null;
  const regardingArtisanId = formData.get("regardingArtisanId") || null;
  const milestoneId = formData.get("milestoneId") || null;
  const isRequired = formData.get("isRequired") === "true";

  // Tant qu'un appel pour cette étape n'est pas annulé, pas de doublon
  // possible — et un double-clic rapide sur le même créneau ne crée pas
  // deux rendez-vous (même logique que pour "démarrer un projet").
  if (milestoneId) {
    const { data: existingCall } = await supabase
      .from("appointments")
      .select("id")
      .eq("milestone_id", milestoneId)
      .neq("status", "cancelled")
      .limit(1)
      .maybeSingle();
    if (existingCall) {
      redirect(projectId ? `/projects/${projectId}` : "/appointments");
    }
  } else {
    const { data: recentDuplicate } = await supabase
      .from("appointments")
      .select("id")
      .eq("client_id", user.id)
      .eq("artisan_id", artisanId)
      .eq("availability_slot_id", slotId)
      .gte("created_at", new Date(Date.now() - 30000).toISOString())
      .limit(1)
      .maybeSingle();
    if (recentDuplicate) {
      redirect("/appointments");
    }
  }

  const { data: slot } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("id", slotId)
    .eq("is_booked", false)
    .single();

  if (!slot) {
    redirect(
      `/appointments/new?artisan=${artisanId}&error=${encodeURIComponent(
        "Ce créneau n'est plus disponible, quelqu'un vient de le réserver. Choisis-en un autre."
      )}`
    );
  }

  const scheduledAt = new Date(`${slot.date}T${slot.start_time}`).toISOString();

  const { error } = await supabase.from("appointments").insert({
    client_id: user.id,
    artisan_id: artisanId,
    project_id: projectId,
    regarding_artisan_id: regardingArtisanId,
    milestone_id: milestoneId,
    is_required: isRequired,
    scheduled_at: scheduledAt,
    status: "confirmed",
    proposed_by: user.id,
    availability_slot_id: slot.id,
  });

  if (error) {
    redirect(`/appointments/new?artisan=${artisanId}&error=${encodeURIComponent(error.message)}`);
  }

  await supabase
    .from("availability_slots")
    .update({ is_booked: true })
    .eq("id", slot.id);

  await logClientActivity(user.id, "appointment_booked", artisanId, {
    regarding_artisan_id: regardingArtisanId,
    scheduled_at: scheduledAt,
  });

  redirect("/appointments");
}
