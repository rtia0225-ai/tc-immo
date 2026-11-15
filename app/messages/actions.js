"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { notifyNewMessage } from "@/lib/notifications";
import { containsPhoneNumber, containsEmailAddress, containsExternalPlatformMention, containsFullName } from "@/lib/phoneFilter";

export async function startConversation(formData) {
  const supabase = createClient();
  const artisanId = formData.get("artisanId");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Cherche une conversation existante (hors projet) entre ce client et cet artisan
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", user.id)
    .eq("artisan_id", artisanId)
    .is("project_id", null)
    .maybeSingle();

  if (existing) {
    redirect(`/messages/${existing.id}`);
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ client_id: user.id, artisan_id: artisanId })
    .select("id")
    .single();

  if (error) {
    return redirect(`/artisans?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/messages/${created.id}`);
}

export async function sendMessage(formData) {
  const supabase = createClient();
  const conversationId = formData.get("conversationId");
  const content = formData.get("content")?.trim() || null;
  const documentUrl = formData.get("documentUrl") || null;
  const documentType = formData.get("documentType") || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (!content && !documentUrl)) return;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("project_id")
    .eq("id", conversationId)
    .single();

  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("user_id, profile:user_id ( role )")
    .eq("conversation_id", conversationId);
  const participants = participantRows || [];

  // Le filtre anti-coordonnées ne s'applique qu'entre un client et un
  // professionnel : entre professionnels d'un même projet, ils ont le
  // droit de s'échanger leurs contacts si ça les arrange (cf. demande du
  // 2026-11). On ne lève cette interdiction que si AUCUN participant
  // n'est un client (tous sont artisans).
  const isBetweenProfessionals =
    !!conversation?.project_id &&
    participants.length > 0 &&
    participants.every((p) => p.profile?.role === "artisan");

  // Interdiction d'échanger des coordonnées dans les messages : numéro de
  // téléphone, réseau social externe (Facebook, WhatsApp...), ou son
  // propre nom complet (souvent utilisé pour être retrouvé ailleurs).
  // Les échanges doivent rester sur la plateforme — sauf entre
  // professionnels d'un même projet (voir plus haut).
  if (content && !isBetweenProfessionals) {
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (containsPhoneNumber(content)) {
      redirect(
        `/messages/${conversationId}?error=${encodeURIComponent(
          "Ton message contient un numéro de téléphone. Les échanges de coordonnées ne sont pas autorisés ici, utilise la messagerie ou les rendez-vous de la plateforme."
        )}`
      );
    }

    if (containsEmailAddress(content)) {
      redirect(
        `/messages/${conversationId}?error=${encodeURIComponent(
          "Ton message contient une adresse e-mail. Les échanges de coordonnées ne sont pas autorisés ici, utilise la messagerie ou les rendez-vous de la plateforme."
        )}`
      );
    }

    if (containsExternalPlatformMention(content)) {
      redirect(
        `/messages/${conversationId}?error=${encodeURIComponent(
          "Ton message mentionne un réseau social, une appli externe, ou le nom d'une entreprise/cabinet. Les échanges doivent rester sur la plateforme."
        )}`
      );
    }

    if (containsFullName(content, senderProfile?.full_name)) {
      redirect(
        `/messages/${conversationId}?error=${encodeURIComponent(
          "Merci de ne pas indiquer votre nom complet dans le message, les échanges doivent rester sur la plateforme."
        )}`
      );
    }
  }

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content,
    document_url: documentUrl,
    document_type: documentType,
  });

  // Notifie tous les autres participants (plus seulement "l'autre partie" :
  // une conversation peut désormais en compter plus de deux).
  for (const p of participants) {
    if (p.user_id !== user.id) await notifyNewMessage(p.user_id);
  }

  redirect(`/messages/${conversationId}`);
}

// Ajoute quelqu'un à une conversation en cours — uniquement entre
// professionnels d'un même projet (cf. demande du 2026-11) : celui qui
// ajoute doit déjà être dans la conversation, et la personne ajoutée doit
// réellement intervenir sur ce projet. Elle voit alors tout l'historique,
// la RLS n'étant plus limitée aux deux participants d'origine.
export async function addConversationParticipant(formData) {
  const supabase = createClient();
  const conversationId = formData.get("conversationId");
  const newUserId = formData.get("userId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (!newUserId) redirect(`/messages/${conversationId}`);

  const { data: conversation } = await supabase
    .from("conversations")
    .select("project_id")
    .eq("id", conversationId)
    .single();

  if (!conversation?.project_id) {
    redirect(`/messages/${conversationId}?error=${encodeURIComponent("On ne peut ajouter quelqu'un que dans une discussion liée à un projet.")}`);
  }

  // La personne ajoutée doit être un professionnel de ce projet (principal
  // ou participant) — jamais le client, qui ne doit pas se retrouver dans
  // une discussion entre professionnels sans l'avoir demandé.
  const { data: project } = await supabase.from("projects").select("artisan_id").eq("id", conversation.project_id).single();
  const { data: projectParticipants } = await supabase
    .from("project_participants")
    .select("artisan_id")
    .eq("project_id", conversation.project_id);
  const professionalIds = new Set([project?.artisan_id, ...(projectParticipants || []).map((p) => p.artisan_id)]);

  if (!professionalIds.has(newUserId)) {
    redirect(`/messages/${conversationId}?error=${encodeURIComponent("Cette personne n'intervient pas sur ce projet.")}`);
  }

  const { error } = await supabase.from("conversation_participants").insert({
    conversation_id: conversationId,
    user_id: newUserId,
    added_by: user.id,
  });

  if (error && error.code !== "23505") {
    redirect(`/messages/${conversationId}?error=${encodeURIComponent(error.message)}`);
  }

  const { data: addedProfile } = await supabase.from("profiles").select("full_name").eq("id", newUserId).single();
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: `${addedProfile?.full_name || "Un participant"} a été ajouté à la discussion.`,
  });

  await notifyNewMessage(newUserId);

  redirect(`/messages/${conversationId}`);
}

// Appel vidéo entre tous les participants de l'espace : aucun prestataire
// branché côté plateforme — c'est la personne qui lance l'appel qui crée
// elle-même son lien (Google Meet, ou autre) et le colle ici. On se
// contente de le partager comme un message spécial : tout le monde dans
// la conversation le voit et est notifié, grâce à la RLS déjà basée sur
// conversation_participants.
export async function startVideoCall(formData) {
  const supabase = createClient();
  const conversationId = formData.get("conversationId");
  const videoLink = formData.get("videoLink")?.trim();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (!videoLink) redirect(`/messages/${conversationId}`);

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    video_link: videoLink,
  });

  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);
  for (const p of participantRows || []) {
    if (p.user_id !== user.id) await notifyNewMessage(p.user_id);
  }

  redirect(`/messages/${conversationId}`);
}

export async function scheduleVideoMeeting(formData) {
  const supabase = createClient();
  const conversationId = formData.get("conversationId");
  const scheduledAt = formData.get("scheduledAt");
  const videoLink = formData.get("videoLink")?.trim();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (!scheduledAt || !videoLink) redirect(`/messages/${conversationId}`);

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    video_link: videoLink,
    video_scheduled_at: new Date(scheduledAt).toISOString(),
  });

  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);
  for (const p of participantRows || []) {
    if (p.user_id !== user.id) await notifyNewMessage(p.user_id);
  }

  redirect(`/messages/${conversationId}`);
}

// Envoi d'une note vocale : reçoit l'audio enregistré depuis le micro du
// téléphone (voir components/VoiceRecorder.jsx), le stocke dans le bucket
// "voice-notes", puis crée le message correspondant.
// NOTE IMPORTANTE : le filtre anti-numéro de téléphone ne s'applique
// qu'aux messages texte, il ne peut pas "écouter" l'audio pour vérifier
// si un numéro y est dit à l'oral.
export async function sendVoiceMessage(formData) {
  const supabase = createClient();
  const conversationId = formData.get("conversationId");
  const file = formData.get("audio");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !file || typeof file === "string" || file.size === 0) {
    return { error: "Échec de l'enregistrement." };
  }

  const path = `${user.id}/${Date.now()}.webm`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("voice-notes")
    .upload(path, arrayBuffer, { contentType: file.type || "audio/webm" });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: publicUrlData } = supabase.storage.from("voice-notes").getPublicUrl(path);

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    audio_url: publicUrlData.publicUrl,
  });

  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);

  for (const p of participantRows || []) {
    if (p.user_id !== user.id) await notifyNewMessage(p.user_id);
  }

  return { success: true };
}
