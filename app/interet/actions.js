"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logClientActivity } from "@/lib/activityLog";

// Inscription explicite à la notification d'ouverture du service —
// distincte du simple clic initial, pour repérer qui veut vraiment être
// recontacté.
export async function requestNotification(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const type = formData.get("type");
  const artisanId = formData.get("artisanId");
  const regardingArtisanId = formData.get("regardingArtisanId") || null;
  const urgency = formData.get("urgency") || null;

  await logClientActivity(user.id, `${type}_notify_me`, artisanId, {
    regarding_artisan_id: regardingArtisanId,
    urgency,
  });

  const params = new URLSearchParams({ type, artisan: artisanId, notified: "1" });
  if (regardingArtisanId) params.set("regarding", regardingArtisanId);
  redirect(`/interet?${params.toString()}`);
}
