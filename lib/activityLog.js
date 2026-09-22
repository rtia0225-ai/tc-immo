"use server";

import { createClient } from "@/lib/supabase/server";

// Enregistre une action clé du client (message envoyé, RDV pris, projet
// démarré...) pour pouvoir suivre son parcours côté admin — utile pour
// l'étude de marché pendant cette phase de test.
export async function logClientActivity(userId, eventType, targetArtisanId = null, metadata = null) {
  const supabase = createClient();
  await supabase.from("client_activity_events").insert({
    user_id: userId,
    event_type: eventType,
    target_artisan_id: targetArtisanId,
    metadata,
  });
}
