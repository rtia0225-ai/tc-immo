import { createClient } from "@/lib/supabase/server";

// Enregistre une page vue pour le dashboard interne de fréquentation
// (/admin/analytics). Appelé par components/VisitTracker.jsx à chaque
// changement de page, uniquement si le visiteur a accepté les cookies de
// mesure d'audience (même consentement que Google Analytics).
export async function POST(request) {
  try {
    const body = await request.json();
    const { path, referrer, visitorId, deviceType } = body || {};

    if (!path || !visitorId) {
      return new Response(null, { status: 204 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("page_views").insert({
      path: String(path).slice(0, 500),
      referrer: referrer ? String(referrer).slice(0, 500) : null,
      visitor_id: String(visitorId).slice(0, 100),
      device_type: deviceType === "mobile" ? "mobile" : "desktop",
      user_id: user?.id || null,
    });

    return new Response(null, { status: 204 });
  } catch {
    // Le tracking ne doit jamais faire échouer la navigation du visiteur.
    return new Response(null, { status: 204 });
  }
}
