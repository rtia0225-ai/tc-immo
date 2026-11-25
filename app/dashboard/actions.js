"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Marque le petit tutoriel de première connexion comme vu (bouton "C'est
// parti" ou "Passer le tutoriel") : il ne s'affiche plus ensuite. Cf.
// consigne Rose du 2026-11-25.
export async function completeOnboarding() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("profiles").update({ has_seen_onboarding: true }).eq("id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteAccount() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase.rpc("delete_own_account");

  if (error) {
    redirect(`/dashboard/delete-account?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/");
}
