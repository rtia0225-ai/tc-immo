"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SINGLE_INSTALLMENT_TRADES, FINAL_DOCUMENT_TRADES, MIN_INSTALLMENTS_OTHER_TRADES } from "@/lib/constants";
import { logClientActivity } from "@/lib/activityLog";
import { logTimelineEvent } from "@/lib/projectTimeline";
import { sendPush } from "@/lib/notifications";
import { firstNameOnly } from "@/lib/displayName";

// Vérifie que l'échéancier respecte la règle du métier : une seule
// échéance (100%) pour le Topographe ; pas de minimum imposé pour
// Architecte/Ingénieur (plusieurs étapes réelles, mais le nombre de
// versements se négocie avec le professionnel) ; au moins 5 pour tous
// les autres métiers (maçonnerie en tête). Retourne un message d'erreur
// en français si la règle n'est pas respectée, sinon null.
function validateInstallmentRule(trade, milestoneTitles) {
  const requiredDoc = SINGLE_INSTALLMENT_TRADES[trade];
  if (requiredDoc) {
    if (milestoneTitles.length !== 1) {
      return `Pour ce métier, l'échéancier doit contenir une seule étape, payée à la livraison du ${requiredDoc}.`;
    }
  } else if (FINAL_DOCUMENT_TRADES[trade]) {
    if (milestoneTitles.length < 1) {
      return `Pour ce métier, l'échéancier doit contenir au moins une étape, la dernière étant la livraison du ${FINAL_DOCUMENT_TRADES[trade]}.`;
    }
  } else if (milestoneTitles.length < MIN_INSTALLMENTS_OTHER_TRADES) {
    return `Pour ce métier, l'échéancier doit contenir au moins ${MIN_INSTALLMENTS_OTHER_TRADES} étapes, le paiement ne peut pas se faire en une seule fois.`;
  }
  return null;
}

// Une étape peut attendre plusieurs livrables (le professionnel les
// sépare par une virgule dans le formulaire) : on éclate ça en plusieurs
// lignes dans milestone_deliverables, une par livrable attendu.
async function insertMilestoneDeliverables(supabase, insertedMilestones, rawDeliverablesByIndex) {
  const rows = (insertedMilestones || []).flatMap((milestone, i) => {
    const labels = (rawDeliverablesByIndex[i] || "")
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    return labels.map((label, labelIndex) => ({
      milestone_id: milestone.id,
      label,
      order_index: labelIndex + 1,
    }));
  });

  if (rows.length > 0) {
    await supabase.from("milestone_deliverables").insert(rows);
  }
}

// Génère le texte d'un contrat de prestation pour UN artisan précis
// (principal ou participant), avec son propre échéancier de paiement.
function buildContractContent({ clientName, artisanName, trade, title, description, amount, currency, milestoneRows }) {
  const scheduleText = milestoneRows
    .map((m) => `  - ${m.title} : ${m.payment_percentage}% (${m.amount} ${currency})`)
    .join("\n");

  return `CONTRAT DE PRESTATION, TCHOLDING-IMMO

Entre le client ${clientName || ""} et le prestataire ${artisanName || ""} (${trade || ""}).

Objet : ${title}
Description : ${description || "Non précisée"}
Montant convenu : ${amount} ${currency}

Échéancier de paiement convenu :
${scheduleText || "  (aucune étape définie)"}

Le paiement du client est séquestré sur la plateforme TCHolding-Immo. Chaque montant listé ci-dessus n'est libéré au prestataire qu'après validation, par le professionnel, de l'étape correspondante.

Chaque prestataire du projet est indépendant : ce contrat ne concerne que sa propre prestation, à ses propres conditions.

En signant ce contrat, les deux parties reconnaissent avoir convenu de ces termes et acceptent de débuter les travaux dans ce cadre.`;
}

// Étape "Sécurisez vos travaux" : le client envoie une DEMANDE à l'artisan
// principal — ça ne crée pas encore un projet actif. C'est l'artisan qui
// remplit ensuite l'échéancier (submitMilestoneSchedule, ci-dessous), que
// le client valide ou renvoie pour correction (validateMilestoneSchedule /
// requestMilestoneChanges), avant que le contrat ne soit généré et signé.
// Seul le client peut initier cette action (vérifié aussi au niveau de la
// page /projects/new).
export async function createProject(formData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();
  // L'admin peut démarrer un projet pour tester les fonctionnalités,
  // même si son propre compte n'est pas un compte client.
  if (requesterProfile?.role === "artisan" && !requesterProfile?.is_admin) {
    redirect("/dashboard");
  }

  const artisanId = formData.get("artisanId");
  const title = formData.get("title");
  const description = formData.get("description");
  const currency = formData.get("currency") || "XOF";

  const terrainLocation = formData.get("terrainLocation");
  const terrainLatitude = formData.get("terrainLatitude") || null;
  const terrainLongitude = formData.get("terrainLongitude") || null;
  const terrainDocumentType = formData.get("terrainDocumentType");
  const terrainReferenceNumber = formData.get("terrainReferenceNumber");
  const terrainArea = formData.get("terrainArea");
  const terrainNotes = formData.get("terrainNotes");

  // Garde-fou anti-doublon : un double clic ou un renvoi réseau du même
  // formulaire ne doit pas créer une deuxième demande identique. Si une
  // demande avec le même client, le même artisan et le même titre vient
  // d'être créée (quelques secondes), on y renvoie directement au lieu
  // d'en recréer une.
  const dedupeSince = new Date(Date.now() - 30_000).toISOString();
  const { data: recentDuplicate } = await supabase
    .from("projects")
    .select("id")
    .eq("client_id", user.id)
    .eq("artisan_id", artisanId)
    .eq("title", title)
    .gte("created_at", dedupeSince)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentDuplicate) {
    redirect(`/projects/${recentDuplicate.id}`);
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      client_id: user.id,
      artisan_id: artisanId,
      title,
      description,
      amount: 0,
      currency,
      status: "pending_schedule",
      terrain_location: terrainLocation || null,
      terrain_latitude: terrainLatitude,
      terrain_longitude: terrainLongitude,
      terrain_document_type: terrainDocumentType || null,
      terrain_reference_number: terrainReferenceNumber || null,
      terrain_area: terrainArea || null,
      terrain_notes: terrainNotes || null,
    })
    .select("id")
    .single();

  if (error) {
    return redirect(
      `/projects/new?artisan=${artisanId}&error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase
    .from("conversations")
    .update({ project_id: project.id })
    .eq("client_id", user.id)
    .eq("artisan_id", artisanId)
    .is("project_id", null);

  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  await logClientActivity(user.id, "project_started", artisanId, {
    project_id: project.id,
  });

  await logTimelineEvent(supabase, {
    projectId: project.id,
    eventType: "addition_requested",
    title: `Demande envoyée : ${title}`,
    description: `${clientProfile?.full_name || "Le client"} attend que tu remplisses l'échéancier de paiement.`,
    actorId: user.id,
  });

  await sendPush(
    artisanId,
    "Nouvelle demande de projet",
    `${clientProfile?.full_name || "Un client"} souhaite démarrer "${title}". Remplis l'échéancier de paiement pour continuer.`,
    `/projects/${project.id}/schedule`
  );

  redirect(`/projects/${project.id}`);
}

// L'artisan remplit (ou corrige, après une demande de modification du
// client) l'échéancier de paiement : étapes, pourcentages, montant total.
// Remplace entièrement les étapes déjà proposées pour ce projet/cet
// artisan (une resoumission écrase la précédente), puis envoie au client
// pour validation.
export async function submitMilestoneSchedule(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const amount = formData.get("amount");
  const milestoneTitles = formData.getAll("milestoneTitle");
  const milestonePercentages = formData.getAll("milestonePercentage");
  const milestoneDeliverables = formData.getAll("milestoneDeliverable");
  const milestoneTeamPhones = formData.getAll("milestoneTeamPhones");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, artisan_id, title")
    .eq("id", projectId)
    .single();

  if (!project || project.artisan_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }

  const { data: artisanForRule } = await supabase
    .from("artisan_profiles")
    .select("trade")
    .eq("id", user.id)
    .single();

  const ruleError = validateInstallmentRule(artisanForRule?.trade, milestoneTitles);
  if (ruleError) {
    redirect(`/projects/${projectId}/schedule?error=${encodeURIComponent(ruleError)}`);
  }

  // Resoumission : on repart propre, pas d'accumulation des anciennes lignes.
  await supabase.from("project_milestones").delete().eq("project_id", projectId).eq("artisan_id", user.id);

  const totalAmount = Number(amount) || 0;
  const milestoneRows = milestoneTitles.map((t, i) => {
    const pct = Number(milestonePercentages[i]) || 0;
    // Les téléphones déclarés ici ne sont qu'une annonce (pas encore de
    // montant) : l'attribution réelle de leur part se fait une fois
    // l'échéancier validé, directement sur l'étape (cf. ProjectJourney).
    const teamPhones = (milestoneTeamPhones[i] || "")
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    return {
      project_id: projectId,
      artisan_id: user.id,
      title: t,
      order_index: i + 1,
      payment_percentage: pct,
      amount: Math.round((totalAmount * pct) / 100),
      team_phones: teamPhones,
    };
  });

  if (milestoneRows.length > 0) {
    const { data: insertedMilestones, error: milestonesError } = await supabase
      .from("project_milestones")
      .insert(milestoneRows)
      .select("id, order_index");
    if (milestonesError) {
      redirect(`/projects/${projectId}/schedule?error=${encodeURIComponent(milestonesError.message)}`);
    }
    const sortedInserted = (insertedMilestones || []).sort((a, b) => a.order_index - b.order_index);
    await insertMilestoneDeliverables(supabase, sortedInserted, milestoneDeliverables);
  }

  await supabase
    .from("projects")
    .update({ amount: totalAmount, status: "pending_client_review", milestone_feedback_note: null })
    .eq("id", projectId);

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "addition_requested",
    title: "Échéancier envoyé pour validation",
    actorId: user.id,
  });

  await sendPush(
    project.client_id,
    "Échéancier à valider",
    `L'échéancier de paiement pour "${project.title}" est prêt. Vérifie qu'il correspond bien à ce que vous avez convenu.`,
    `/projects/${projectId}`
  );

  redirect(`/projects/${projectId}`);
}

// Le client valide l'échéancier proposé : le contrat est généré à partir
// des étapes déjà enregistrées, prêt à être signé (client d'abord, puis
// artisan — cf. signContract).
export async function validateMilestoneSchedule(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, artisan_id, title, description, amount, currency")
    .eq("id", projectId)
    .single();

  if (!project || project.client_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }

  const { data: milestoneRows } = await supabase
    .from("project_milestones")
    .select("title, payment_percentage, amount")
    .eq("project_id", projectId)
    .eq("artisan_id", project.artisan_id)
    .order("order_index", { ascending: true });

  const { data: clientProfile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { data: artisanData } = await supabase
    .from("artisan_profiles")
    .select("trade, profiles ( full_name )")
    .eq("id", project.artisan_id)
    .single();

  const contractContent = buildContractContent({
    clientName: clientProfile?.full_name,
    artisanName: artisanData?.profiles?.full_name,
    trade: artisanData?.trade,
    title: project.title,
    description: project.description,
    amount: project.amount,
    currency: project.currency,
    milestoneRows: milestoneRows || [],
  });

  await supabase.from("contracts").insert({
    project_id: projectId,
    artisan_id: project.artisan_id,
    content: contractContent,
  });

  await supabase.from("projects").update({ status: "pending_contract_signature" }).eq("id", projectId);

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "addition_approved",
    title: "Échéancier validé par le client",
    actorId: user.id,
  });

  await sendPush(
    project.artisan_id,
    "Échéancier validé",
    `${clientProfile?.full_name || "Le client"} a validé l'échéancier. Le contrat est prêt à être signé.`,
    `/projects/${projectId}/contract/${project.artisan_id}`
  );

  redirect(`/projects/${projectId}/contract/${project.artisan_id}`);
}

// Le client renvoie l'échéancier à l'artisan avec une note explicative —
// n'empêche pas de discuter par message en parallèle pour s'entendre sur
// la bonne version.
export async function requestMilestoneChanges(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const note = formData.get("note");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, artisan_id, title")
    .eq("id", projectId)
    .single();

  if (!project || project.client_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }

  if (!note?.trim()) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Merci de préciser ce qui doit être corrigé.")}`);
  }

  await supabase
    .from("projects")
    .update({ status: "pending_schedule", milestone_feedback_note: note.trim() })
    .eq("id", projectId);

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "addition_rejected",
    title: "Modification demandée sur l'échéancier",
    description: note.trim(),
    actorId: user.id,
  });

  await sendPush(
    project.artisan_id,
    "Modification demandée",
    `Le client a demandé une correction sur l'échéancier de "${project.title}".`,
    `/projects/${projectId}/schedule`
  );

  redirect(`/projects/${projectId}`);
}

// Signature de consentement (horodatée), pas une signature électronique
// légale certifiée, juste une trace de l'accord de chaque partie. Ordre
// imposé : le client signe d'abord, l'artisan ne peut signer qu'une fois
// que c'est fait (cf. demande du 2026-11) — vérifié ici en plus de
// l'affichage côté page (qui ne montre déjà pas le bouton à l'artisan).
export async function signContract(formData) {
  const supabase = createClient();
  const contractId = formData.get("contractId");
  const projectId = formData.get("projectId");
  const artisanId = formData.get("artisanId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, artisan_id")
    .eq("id", projectId)
    .single();

  const { data: contract } = await supabase
    .from("contracts")
    .select("client_signed_at, artisan_signed_at")
    .eq("id", contractId)
    .single();

  const updates = {};
  if (project?.client_id === user.id) updates.client_signed_at = new Date().toISOString();
  if (artisanId === user.id) {
    if (!contract?.client_signed_at) {
      redirect(
        `/projects/${projectId}/contract/${artisanId}?error=${encodeURIComponent("Le client doit signer en premier.")}`
      );
    }
    updates.artisan_signed_at = new Date().toISOString();
  }

  const { data: updatedContract } = await supabase
    .from("contracts")
    .update(updates)
    .eq("id", contractId)
    .select("client_signed_at, artisan_signed_at")
    .single();

  // Une fois les deux signatures réunies, le vrai parcours (étapes,
  // paiements, rendez-vous) remplace l'échéancier indicatif — pour
  // l'artisan PRINCIPAL, c'est le statut du projet lui-même qui avance ;
  // pour un PARTICIPANT (ajouté après coup), c'est son propre statut dans
  // project_participants qu'il faut faire sortir de "en attente", sinon
  // il reste bloqué sur "signer le contrat" indéfiniment même signé.
  if (updatedContract?.client_signed_at && updatedContract?.artisan_signed_at) {
    if (artisanId === project?.artisan_id) {
      await supabase.from("projects").update({ status: "awaiting_payment" }).eq("id", projectId);
    } else {
      await supabase
        .from("project_participants")
        .update({ status: "active" })
        .eq("project_id", projectId)
        .eq("artisan_id", artisanId);
    }
  }

  redirect(`/projects/${projectId}/contract/${artisanId}`);
}

// Le statut global du projet (utilisé par la page Revenus) avance
// entièrement seul à partir des vrais paiements — voir
// advanceProjectStatusFromPayment dans milestones-actions.js, appelé
// depuis releasePayment. Aucun bouton, nulle part : le client ne clique
// jamais pour "payer" ou "terminer" quoi que ce soit.

// Le client envoie une DEMANDE à un autre artisan (n'importe quel métier)
// pour rejoindre un projet déjà démarré — exactement comme "Démarrer un
// projet" pour l'artisan principal : c'est le PROFESSIONNEL qui remplit
// ensuite sa propre prestation, son propre montant et son propre
// échéancier (submitParticipantMilestoneSchedule), que le client valide
// avant signature du contrat. Le client ne remplit plus rien lui-même ici.
export async function addParticipant(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const artisanId = formData.get("artisanId");
  const description = formData.get("description");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id, title, currency")
    .eq("id", projectId)
    .single();

  if (project?.client_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }

  // Garde-fou anti-doublon, comme pour createProject.
  const dedupeSince = new Date(Date.now() - 30_000).toISOString();
  const { data: recentDuplicate } = await supabase
    .from("project_participants")
    .select("id")
    .eq("project_id", projectId)
    .eq("artisan_id", artisanId)
    .gte("added_at", dedupeSince)
    .limit(1)
    .maybeSingle();

  if (recentDuplicate) {
    redirect(`/projects/${projectId}`);
  }

  const { data: participant, error } = await supabase
    .from("project_participants")
    .insert({
      project_id: projectId,
      artisan_id: artisanId,
      description,
      currency: project.currency || "XOF",
      status: "pending_schedule",
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/projects/${projectId}/add-participant?error=${encodeURIComponent(error.message)}`);
  }

  const { data: clientProfile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { data: artisanData } = await supabase
    .from("artisan_profiles")
    .select("trade, profiles ( full_name )")
    .eq("id", artisanId)
    .single();

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "addition_requested",
    title: `Demande envoyée à ${artisanData?.profiles?.full_name || "un professionnel"}`,
    description: `${clientProfile?.full_name || "Le client"} attend que tu remplisses l'échéancier de ta prestation.`,
    actorId: user.id,
  });

  await sendPush(
    artisanId,
    "Nouvelle demande de projet",
    `${clientProfile?.full_name || "Un client"} souhaite t'ajouter au projet "${project.title}". Remplis l'échéancier de ta prestation pour continuer.`,
    `/projects/${projectId}/participant/${artisanId}/schedule`
  );

  await logClientActivity(user.id, "participant_requested", artisanId, {
    project_id: projectId,
  });

  redirect(`/projects/${projectId}`);
}

// L'artisan participant remplit (ou corrige) l'échéancier de SA propre
// prestation — pendant exact de submitMilestoneSchedule pour l'artisan
// principal, mais la ligne pivot est project_participants, pas projects.
export async function submitParticipantMilestoneSchedule(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const participantId = formData.get("participantId");
  const amount = formData.get("amount");
  const milestoneTitles = formData.getAll("milestoneTitle");
  const milestonePercentages = formData.getAll("milestonePercentage");
  const milestoneDeliverables = formData.getAll("milestoneDeliverable");
  const milestoneTeamPhones = formData.getAll("milestoneTeamPhones");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: participant } = await supabase
    .from("project_participants")
    .select("id, artisan_id, project:project_id ( id, client_id, title )")
    .eq("id", participantId)
    .single();

  if (!participant || participant.artisan_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }

  const { data: artisanForRule } = await supabase
    .from("artisan_profiles")
    .select("trade, profiles ( full_name )")
    .eq("id", user.id)
    .single();

  const ruleError = validateInstallmentRule(artisanForRule?.trade, milestoneTitles);
  if (ruleError) {
    redirect(`/projects/${projectId}/participant/${user.id}/schedule?error=${encodeURIComponent(ruleError)}`);
  }

  await supabase.from("project_milestones").delete().eq("project_id", projectId).eq("artisan_id", user.id);

  const totalAmount = Number(amount) || 0;
  const milestoneRows = milestoneTitles.map((t, i) => {
    const pct = Number(milestonePercentages[i]) || 0;
    const teamPhones = (milestoneTeamPhones[i] || "")
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean);
    return {
      project_id: projectId,
      artisan_id: user.id,
      title: t,
      order_index: i + 1,
      payment_percentage: pct,
      amount: Math.round((totalAmount * pct) / 100),
      team_phones: teamPhones,
    };
  });

  if (milestoneRows.length > 0) {
    const { data: insertedMilestones, error: milestonesError } = await supabase
      .from("project_milestones")
      .insert(milestoneRows)
      .select("id, order_index");
    if (milestonesError) {
      redirect(`/projects/${projectId}/participant/${user.id}/schedule?error=${encodeURIComponent(milestonesError.message)}`);
    }
    const sortedInserted = (insertedMilestones || []).sort((a, b) => a.order_index - b.order_index);
    await insertMilestoneDeliverables(supabase, sortedInserted, milestoneDeliverables);
  }

  await supabase
    .from("project_participants")
    .update({ amount: totalAmount, status: "pending_client_review", milestone_feedback_note: null })
    .eq("id", participantId);

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "addition_requested",
    title: `Échéancier envoyé pour validation (${artisanForRule?.profiles?.full_name || "prestation complémentaire"})`,
    actorId: user.id,
  });

  await sendPush(
    participant.project.client_id,
    "Échéancier à valider",
    `L'échéancier de ${artisanForRule?.profiles?.full_name ? firstNameOnly(artisanForRule.profiles.full_name) : "ce professionnel"} pour "${participant.project.title}" est prêt à être vérifié.`,
    `/projects/${projectId}`
  );

  redirect(`/projects/${projectId}`);
}

// Le client valide l'échéancier d'un participant : pendant de
// validateMilestoneSchedule, génère le contrat de ce participant.
export async function validateParticipantMilestoneSchedule(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const participantId = formData.get("participantId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: participant } = await supabase
    .from("project_participants")
    .select("id, artisan_id, amount, currency, description, project:project_id ( client_id, title, description )")
    .eq("id", participantId)
    .single();

  if (!participant || participant.project.client_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }

  const { data: milestoneRows } = await supabase
    .from("project_milestones")
    .select("title, payment_percentage, amount")
    .eq("project_id", projectId)
    .eq("artisan_id", participant.artisan_id)
    .order("order_index", { ascending: true });

  const { data: clientProfile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { data: artisanData } = await supabase
    .from("artisan_profiles")
    .select("trade, profiles ( full_name )")
    .eq("id", participant.artisan_id)
    .single();

  const contractContent = buildContractContent({
    clientName: clientProfile?.full_name,
    artisanName: artisanData?.profiles?.full_name,
    trade: artisanData?.trade,
    title: `${participant.project.title}, ${artisanData?.trade || "prestation complémentaire"}`,
    description: participant.description,
    amount: participant.amount,
    currency: participant.currency,
    milestoneRows: milestoneRows || [],
  });

  await supabase.from("contracts").insert({
    project_id: projectId,
    artisan_id: participant.artisan_id,
    content: contractContent,
  });

  await supabase.from("project_participants").update({ status: "pending_contract_signature" }).eq("id", participantId);

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "addition_approved",
    title: `Échéancier validé (${artisanData?.profiles?.full_name || "prestation complémentaire"})`,
    actorId: user.id,
  });

  await sendPush(
    participant.artisan_id,
    "Échéancier validé",
    `${clientProfile?.full_name || "Le client"} a validé ton échéancier. Le contrat est prêt à être signé.`,
    `/projects/${projectId}/contract/${participant.artisan_id}`
  );

  redirect(`/projects/${projectId}/contract/${participant.artisan_id}`);
}

// Le client renvoie l'échéancier d'un participant pour correction —
// pendant de requestMilestoneChanges.
export async function requestParticipantMilestoneChanges(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const participantId = formData.get("participantId");
  const note = formData.get("note");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: participant } = await supabase
    .from("project_participants")
    .select("id, artisan_id, project:project_id ( client_id, title )")
    .eq("id", participantId)
    .single();

  if (!participant || participant.project.client_id !== user.id) {
    redirect(`/projects/${projectId}`);
  }

  if (!note?.trim()) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Merci de préciser ce qui doit être corrigé.")}`);
  }

  await supabase
    .from("project_participants")
    .update({ status: "pending_schedule", milestone_feedback_note: note.trim() })
    .eq("id", participantId);

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "addition_rejected",
    title: "Modification demandée sur l'échéancier",
    description: note.trim(),
    actorId: user.id,
  });

  await sendPush(
    participant.artisan_id,
    "Modification demandée",
    `Le client a demandé une correction sur l'échéancier de "${participant.project.title}".`,
    `/projects/${projectId}/participant/${participant.artisan_id}/schedule`
  );

  redirect(`/projects/${projectId}`);
}

// Suppression complète d'un projet — réservée à l'admin (phase de test,
// pour nettoyer les projets créés pendant les essais). La plupart des
// tables liées (étapes, contrats, participants, journal, rapports...)
// sont déjà en CASCADE côté base ; seuls les rendez-vous et conversations
// restent (juste détachés du projet, pas supprimés, pour ne rien casser
// côté historique de messagerie/calendrier).
export async function deleteProject(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect(`/projects/${projectId}`);

  await supabase.from("projects").delete().eq("id", projectId);

  redirect("/dashboard");
}

// Le client retire un participant ajouté (pas l'artisan principal). Un
// admin peut aussi le faire, sur n'importe quel projet, sans restriction
// (même si des paiements ne sont pas finalisés) — son espace sert à
// tester les fonctionnalités, les règles normales ne s'y appliquent pas.
// Dans ce cas, le contrat et les étapes de ce prestataire sont aussi
// supprimés (vraie remise à zéro), contrairement au client qui ne fait
// que retirer le participant sans toucher à l'historique.
export async function removeParticipant(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const participantId = formData.get("participantId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .single();

  const isAdmin = !!profile?.is_admin;
  if (project?.client_id !== user.id && !isAdmin) {
    redirect(`/projects/${projectId}`);
  }

  const { data: participant } = await supabase
    .from("project_participants")
    .select("artisan_id")
    .eq("id", participantId)
    .single();

  await supabase.from("project_participants").delete().eq("id", participantId);

  if (isAdmin && participant?.artisan_id) {
    await supabase.from("contracts").delete().eq("project_id", projectId).eq("artisan_id", participant.artisan_id);
    await supabase.from("project_milestones").delete().eq("project_id", projectId).eq("artisan_id", participant.artisan_id);
    await supabase.from("appointments").delete().eq("project_id", projectId).eq("artisan_id", participant.artisan_id);
  }

  redirect(`/projects/${projectId}`);
}
