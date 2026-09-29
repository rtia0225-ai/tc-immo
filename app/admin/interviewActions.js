"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// L'admin ajoute un créneau d'entretien disponible.
export async function addInterviewSlot(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/dashboard");

  const date = formData.get("date");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");

  if (!date || !startTime || !endTime || startTime >= endTime) {
    redirect("/admin/interview-availability?error=Merci+de+verifier+les+horaires");
  }

  await supabase.from("interview_slots").insert({
    date,
    start_time: startTime,
    end_time: endTime,
  });

  redirect("/admin/interview-availability?success=1");
}

export async function removeInterviewSlot(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/dashboard");

  const slotId = formData.get("slotId");

  await supabase.from("interview_slots").delete().eq("id", slotId).eq("is_booked", false);

  redirect("/admin/interview-availability?success=1");
}

// Le professionnel en attente réserve un créneau d'entretien.
export async function bookInterviewSlot(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const slotId = formData.get("slotId");

  const { data: slot } = await supabase
    .from("interview_slots")
    .select("*")
    .eq("id", slotId)
    .eq("is_booked", false)
    .single();

  if (!slot) {
    redirect("/dashboard?error=Ce+creneau+n'est+plus+disponible,+choisis-en+un+autre");
  }

  await supabase.from("interview_bookings").insert({
    applicant_id: user.id,
    slot_id: slotId,
  });

  await supabase.from("interview_slots").update({ is_booked: true }).eq("id", slotId);

  redirect("/dashboard");
}
