import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://tcholding-immo.com";

export default async function sitemap() {
  const supabase = createClient();

  const { data: artisans } = await supabase
    .from("artisan_profiles")
    .select("id")
    .eq("is_suspended", false);

  const staticPages = [
    { url: `${BASE_URL}/`, priority: 1 },
    { url: `${BASE_URL}/artisans`, priority: 0.9 },
    { url: `${BASE_URL}/comment-ca-marche`, priority: 0.8 },
    { url: `${BASE_URL}/ressources`, priority: 0.7 },
    { url: `${BASE_URL}/a-propos`, priority: 0.5 },
    { url: `${BASE_URL}/faq`, priority: 0.5 },
    { url: `${BASE_URL}/contact`, priority: 0.5 },
  ].map((p) => ({ ...p, lastModified: new Date() }));

  const artisanPages = (artisans || []).map((a) => ({
    url: `${BASE_URL}/artisans/${a.id}`,
    lastModified: new Date(),
    priority: 0.6,
  }));

  return [...staticPages, ...artisanPages];
}
