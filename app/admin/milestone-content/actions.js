"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Met à jour le contenu pédagogique (vidéo, PDF, questions à poser)
// d'une phase générique (Fondations, Dalle...), appliqué automatiquement
// à tous les projets qui ont une étape de ce nom.
export async function updateMilestoneEducationContent(formData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!myProfile?.is_admin) redirect("/dashboard");

  const phaseTitle = formData.get("phaseTitle");
  const summary = formData.get("summary");
  const videoUrl = formData.get("videoUrl");
  const pdfUrl = formData.get("pdfUrl");
  const questionsToAsk = formData.get("questionsToAsk");

  await supabase
    .from("milestone_education_content")
    .update({
      summary: summary || null,
      video_url: videoUrl || null,
      pdf_url: pdfUrl || null,
      questions_to_ask: questionsToAsk || null,
      updated_at: new Date().toISOString(),
    })
    .eq("phase_title", phaseTitle);

  redirect("/admin/milestone-content?success=1");
}
