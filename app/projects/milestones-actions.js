"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logTimelineEvent } from "@/lib/projectTimeline";
import { reviewDeliverableDocument } from "@/lib/documentReview";
import { sendPush } from "@/lib/notifications";
import { MANDATORY_CALL_TRADES } from "@/lib/constants";

// Une étape ne peut être validée que si son appel de validation (quand le
// métier du professionnel l'exige — Technicien BTP, Chef de chantier) a
// bien eu lieu. Pour les autres métiers, l'appel reste facultatif et ne
// bloque jamais. L'appel se fait toujours via la plateforme (jamais en
// échangeant les coordonnées directement), en audio ou en vidéo selon ce
// que choisissent client et professionnel — ce n'est jamais imposé par
// métier. Renvoie un message d'erreur si ce n'est pas le cas, sinon null.
async function checkRequiredAppointments(supabase, milestoneId) {
  const { data: milestone } = await supabase
    .from("project_milestones")
    .select("artisan:artisan_id ( trade )")
    .eq("id", milestoneId)
    .single();

  const isMandatory = MANDATORY_CALL_TRADES.includes(milestone?.artisan?.trade);
  if (!isMandatory) return null; // métier sans appel obligatoire

  const { data: completedCall } = await supabase
    .from("appointments")
    .select("id")
    .eq("milestone_id", milestoneId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (!completedCall) {
    return "Un appel (audio ou vidéo, au choix) terminé avec le client est obligatoire pour ce métier avant de valider cette étape.";
  }
  return null;
}

// Le client partage le DOSSIER COMPLET d'un professionnel (tous ses
// livrables, tous fichiers approuvés confondus, toutes étapes confondues)
// vers le parcours d'un autre professionnel — pas un document à la fois.
// Chaque document apparaît ensuite chez le destinataire à sa date
// d'origine (document_date), pas à la date du partage.
export async function shareDossier(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const sourceArtisanId = formData.get("sourceArtisanId");
  const recipientArtisanId = formData.get("recipientArtisanId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (recipientArtisanId === sourceArtisanId) {
    redirect(`/projects/${projectId}`);
  }

  const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single();
  if (project?.client_id !== user.id) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        "Seul le client du projet peut partager un dossier. Vérifie que tu es connecté sur le bon compte."
      )}`
    );
  }

  const { data: milestones } = await supabase
    .from("project_milestones")
    .select(
      "id, milestone_deliverables ( id, label, deliverable_files ( document_url, review_status, reviewed_at, created_at ) )"
    )
    .eq("project_id", projectId)
    .eq("artisan_id", sourceArtisanId);

  const filesToShare = (milestones || []).flatMap((m) =>
    (m.milestone_deliverables || []).flatMap((d) =>
      (d.deliverable_files || [])
        .filter((f) => f.review_status === "approved")
        .map((f) => ({
          project_id: projectId,
          source_deliverable_id: d.id,
          source_artisan_id: sourceArtisanId,
          recipient_artisan_id: recipientArtisanId,
          shared_by: user.id,
          label: d.label,
          document_url: f.document_url,
          document_date: f.reviewed_at || f.created_at,
        }))
    )
  );

  if (filesToShare.length === 0) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Ce dossier ne peut pas être partagé.")}`);
  }

  // Pas de doublon si on repartage un dossier déjà envoyé à ce même
  // professionnel (ou double-clic rapide sur un nom).
  const { data: alreadyShared } = await supabase
    .from("shared_deliverables")
    .select("document_url")
    .eq("project_id", projectId)
    .eq("recipient_artisan_id", recipientArtisanId);
  const alreadySharedUrls = new Set((alreadyShared || []).map((s) => s.document_url));
  const newFiles = filesToShare.filter((f) => !alreadySharedUrls.has(f.document_url));

  if (newFiles.length > 0) {
    await supabase.from("shared_deliverables").insert(newFiles);
    await sendPush(
      recipientArtisanId,
      "Dossier partagé",
      "Le client a partagé le dossier d'un autre professionnel avec toi sur ce projet.",
      `/projects/${projectId}`
    );
  }

  redirect(`/projects/${projectId}`);
}

export async function addMilestone(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const title = formData.get("title");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !title?.trim()) return;

  // Seul l'artisan du projet peut ajouter une étape (contrôlé aussi par la RLS)
  await supabase.from("project_milestones").insert({
    project_id: projectId,
    title: title.trim(),
  });

  redirect(`/projects/${projectId}`);
}

// Une étape peut attendre plusieurs livrables : vrai seulement si TOUS
// ont un fichier déposé (pas juste le premier).
async function checkAllDeliverablesUploaded(supabase, milestoneId) {
  const { data: deliverables } = await supabase
    .from("milestone_deliverables")
    .select("deliverable_files ( id )")
    .eq("milestone_id", milestoneId);
  if (!deliverables || deliverables.length === 0) return true; // aucun livrable défini pour cette étape
  return deliverables.every((d) => (d.deliverable_files || []).length > 0);
}

// L'artisan clique sur "Valider l'étape" (ou la décoche, cas rare).
// Pour VALIDER (passer à terminé), deux conditions sont obligatoires,
// vérifiées ici côté serveur (pas seulement cachées côté UI) :
//   1. tous les livrables attendus ont été déposés
//   2. le client a confirmé avoir payé (paid_at rempli)
// + l'éventuel rendez-vous obligatoire du métier (déjà vérifié avant).
// Sans ça, le bouton ne doit même pas apparaître côté client, mais on
// bloque aussi ici au cas où.
export async function toggleMilestone(formData) {
  const supabase = createClient();
  const milestoneId = formData.get("milestoneId");
  const projectId = formData.get("projectId");
  const isCompleted = formData.get("isCompleted") === "true";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: milestoneOwner } = await supabase
    .from("project_milestones")
    .select("artisan_id")
    .eq("id", milestoneId)
    .single();
  if (milestoneOwner?.artisan_id !== user.id) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        "Seul le professionnel de cette étape peut la valider. Vérifie que tu es connecté sur le bon compte."
      )}`
    );
  }

  if (!isCompleted) {
    const blockReason = await checkRequiredAppointments(supabase, milestoneId);
    if (blockReason) {
      redirect(`/projects/${projectId}?error=${encodeURIComponent(blockReason)}`);
    }

    const allDeliverablesUploaded = await checkAllDeliverablesUploaded(supabase, milestoneId);
    if (!allDeliverablesUploaded) {
      redirect(
        `/projects/${projectId}?error=${encodeURIComponent("Dépose d'abord tous les livrables attendus pour cette étape avant de la valider.")}`
      );
    }

    const { data: milestoneToValidate } = await supabase
      .from("project_milestones")
      .select("paid_at")
      .eq("id", milestoneId)
      .single();

    if (!milestoneToValidate?.paid_at) {
      redirect(
        `/projects/${projectId}?error=${encodeURIComponent("Le client doit d'abord confirmer le virement avant que tu puisses valider cette étape.")}`
      );
    }
  }

  const { data: milestone } = await supabase
    .from("project_milestones")
    .update({
      is_completed: !isCompleted,
      completed_at: !isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId)
    .select("title")
    .single();

  // Si cette étape a été répartie avec d'autres professionnels (ex: un
  // chef de chantier avec ses maçons), leur part suit exactement le même
  // statut que l'étape principale — ils ne valident rien séparément.
  await supabase
    .from("project_milestones")
    .update({
      is_completed: !isCompleted,
      completed_at: !isCompleted ? new Date().toISOString() : null,
    })
    .eq("parent_milestone_id", milestoneId);

  if (!isCompleted && milestone) {
    await logTimelineEvent(supabase, {
      projectId,
      eventType: "milestone_completed",
      title: `Étape validée : ${milestone.title}`,
      actorId: user.id,
    });
  }

  redirect(`/projects/${projectId}`);
}

// Le client confirme avoir effectué le virement pour une étape validée par
// l'artisan. Manuel pour l'instant (pas de prestataire de paiement branché
// encore), enregistre juste la date à laquelle le paiement a été fait.
export async function releasePayment(formData) {
  const supabase = createClient();
  const milestoneId = formData.get("milestoneId");
  const projectId = formData.get("projectId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .single();

  // Seul le client du projet peut confirmer avoir payé, et uniquement une
  // fois que le professionnel a déposé TOUS les livrables attendus pour
  // cette étape — c'est ce paiement qui débloque ensuite, pour lui, le
  // droit de cliquer sur "Valider l'étape" (voir toggleMilestone), pas
  // l'inverse.
  if (project?.client_id !== user.id) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        "Seul le client du projet peut confirmer un virement. Vérifie que tu es connecté sur le bon compte."
      )}`
    );
  }

  const allDeliverablesUploaded = await checkAllDeliverablesUploaded(supabase, milestoneId);
  if (!allDeliverablesUploaded) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Le professionnel n'a pas encore déposé tous les livrables de cette étape.")}`);
  }

  const { data: paidMilestone } = await supabase
    .from("project_milestones")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", milestoneId)
    .select("title, amount")
    .single();

  if (!paidMilestone) {
    // Ne devrait plus arriver (droit client sur la table corrigé), mais
    // on affiche une erreur au lieu de rediriger silencieusement comme
    // avant, au cas où.
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        "La confirmation du virement n'a pas pu être enregistrée. Réessaie, et contacte-nous si ça persiste."
      )}`
    );
  }

  // Le virement du client ne part que vers le professionnel principal de
  // l'étape (ex: le chef de chantier) : si celui-ci a réparti son
  // montant avec d'autres (ex: ses maçons), leur part est débloquée au
  // même instant, avant même que l'argent n'atteigne le compte du
  // professionnel principal.
  await supabase
    .from("project_milestones")
    .update({ paid_at: new Date().toISOString() })
    .eq("parent_milestone_id", milestoneId);

  await logTimelineEvent(supabase, {
    projectId,
    eventType: "payment_made",
    title: `Paiement effectué : ${paidMilestone.title}`,
    description: paidMilestone.amount ? `${paidMilestone.amount}` : null,
    actorId: user.id,
  });

  await advanceProjectStatusFromPayment(supabase, projectId);

  redirect(`/projects/${projectId}`);
}

// Fait avancer le statut global du projet (utilisé par la page Revenus)
// entièrement seul, à partir des vrais paiements — aucun bouton, nulle
// part : "awaiting_payment" → "funded" dès le premier paiement confirmé,
// puis → "released" dès que toutes les étapes de tous les intervenants
// sont payées (l'argent est alors bien chez les professionnels, il n'y a
// rien d'autre à décider).
async function advanceProjectStatusFromPayment(supabase, projectId) {
  const { data: project } = await supabase.from("projects").select("status").eq("id", projectId).single();
  if (!project || project.status === "released") return;

  const { data: allMilestones } = await supabase
    .from("project_milestones")
    .select("paid_at")
    .eq("project_id", projectId);

  const allPaid = (allMilestones || []).length > 0 && allMilestones.every((m) => !!m.paid_at);

  let nextStatus = null;
  if (allPaid) {
    nextStatus = "released";
  } else if (project.status === "awaiting_payment" || project.status === "draft") {
    nextStatus = "funded";
  }

  if (nextStatus && nextStatus !== project.status) {
    await supabase
      .from("projects")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    await supabase.from("escrow_events").insert({
      project_id: projectId,
      event_type: nextStatus,
      metadata: { triggered_by: "auto_payment" },
    });
  }
}


// L'artisan envoie un ou plusieurs fichiers pour UN livrable précis d'une
// étape (une étape peut avoir plusieurs livrables, et un livrable peut
// désormais contenir plusieurs fichiers — ex : une "esquisse" en
// plusieurs planches). Chaque fichier est vérifié séparément par l'IA
// (lib/documentReview.js) ; si elle n'est pas sûre pour l'un d'eux, celui-ci
// reste en attente d'une vérification manuelle par un admin plutôt que
// d'être débloqué automatiquement — les autres fichiers ne sont pas
// bloqués pour autant.
export async function uploadDeliverable(formData) {
  const supabase = createClient();
  const deliverableId = formData.get("deliverableId");
  const milestoneId = formData.get("milestoneId");
  const projectId = formData.get("projectId");
  const files = formData.getAll("document").filter((f) => f && typeof f !== "string" && f.size > 0);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (files.length === 0) {
    redirect(`/projects/${projectId}?error=Aucun+fichier+sélectionné`);
  }

  const blockReason = await checkRequiredAppointments(supabase, milestoneId);
  if (blockReason) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent(blockReason)}`);
  }

  // Le métier du prestataire, pour donner le bon contexte à la
  // vérification automatique.
  const { data: milestoneBefore } = await supabase
    .from("project_milestones")
    .select("title, artisan_id, artisan:artisan_id ( trade )")
    .eq("id", milestoneId)
    .single();
  const { data: deliverableBefore } = await supabase
    .from("milestone_deliverables")
    .select("label")
    .eq("id", deliverableId)
    .single();

  const trade = milestoneBefore?.artisan?.trade;
  const documentLabel = deliverableBefore?.label || "livrable";
  const milestoneTitle = milestoneBefore?.title || "";

  let approvedCount = 0;
  let pendingCount = 0;

  for (const file of files) {
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${projectId}/${user.id}/${deliverableId}-${crypto.randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("project-deliverables")
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      redirect(`/projects/${projectId}?error=${encodeURIComponent(uploadError.message)}`);
    }

    const review = await reviewDeliverableDocument({
      fileBuffer: arrayBuffer,
      contentType: file.type,
      fileName: file.name,
      trade,
      documentLabel,
    });

    const approved = review.status === "approved";

    // L'upload ne valide plus l'étape automatiquement : il rend seulement
    // le fichier visible au client (s'il est approuvé) pour qu'il puisse
    // payer. L'étape n'est marquée "terminée" qu'au clic explicite de
    // l'artisan sur "Valider l'étape", une fois tous les livrables déposés
    // ET le virement confirmé (cf. toggleMilestone / releasePayment).
    await supabase.from("deliverable_files").insert({
      deliverable_id: deliverableId,
      document_url: path,
      review_status: review.status,
      review_note: review.note,
      reviewed_at: new Date().toISOString(),
      reviewed_by: null, // null = vérification automatique
    });

    if (approved) {
      approvedCount += 1;
      await logTimelineEvent(supabase, {
        projectId,
        eventType: "document_added",
        title: `Document livré : ${documentLabel} (${milestoneTitle})`,
        mediaUrl: path,
        actorId: user.id,
      });
    } else {
      pendingCount += 1;
      await logTimelineEvent(supabase, {
        projectId,
        eventType: "document_pending_review",
        title: `Document déposé, en attente de vérification : ${documentLabel} (${milestoneTitle})`,
        description: review.note,
        mediaUrl: path,
        actorId: user.id,
      });
    }
  }

  if (pendingCount > 0) {
    // Notifie les admins (pas le client) : le(s) document(s) ne sont pas
    // encore visibles pour lui, inutile de l'avertir avant que ce soit
    // tranché.
    const { data: admins } = await supabase.from("profiles").select("id").eq("is_admin", true);
    await Promise.all(
      (admins || []).map((a) =>
        sendPush(
          a.id,
          "Document à vérifier",
          `${documentLabel} (${milestoneTitle}) : vérification automatique incertaine, à vérifier manuellement.`,
          "/admin/documents"
        )
      )
    );
  }

  redirect(`/projects/${projectId}`);
}

// ---------------------------------------------------------
// RÉPARTITION INTERNE D'UNE ÉTAPE (ex: chef de chantier → ses maçons)
// Un professionnel peut répartir une partie du montant d'une de ses
// propres étapes avec d'autres professionnels déjà inscrits sur la
// plateforme, qu'il rattache lui-même au fur et à mesure (pas une
// équipe permanente). Ceux-ci ne deviennent jamais des participants du
// projet : ils restent invisibles du client, et c'est le professionnel
// propriétaire de l'étape qui décide seul de la répartition, sans
// validation du client. La ligne créée est une project_milestones
// normale (avec parent_milestone_id renseigné), donc elle apparaît
// directement dans la page Revenus du bénéficiaire.
export async function addMilestoneSplit(formData) {
  const supabase = createClient();
  const parentMilestoneId = formData.get("parentMilestoneId");
  const projectId = formData.get("projectId");
  const recipientPhone = (formData.get("recipientPhone") || "").trim();
  const amount = parseFloat(formData.get("amount"));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: parent } = await supabase
    .from("project_milestones")
    .select("id, title, amount, artisan_id, is_completed, completed_at, paid_at, order_index, project_id")
    .eq("id", parentMilestoneId)
    .single();

  if (!parent || parent.artisan_id !== user.id) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        "Seul le professionnel propriétaire de cette étape peut la répartir. Vérifie que tu es connecté sur le bon compte."
      )}`
    );
  }

  if (!recipientPhone || !amount || amount <= 0) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Indique un numéro de téléphone et un montant valides.")}`);
  }

  const { data: recipientProfile } = await supabase
    .from("profiles")
    .select("id, full_name, role, artisan_profiles ( id, trade )")
    .eq("phone", recipientPhone)
    .eq("role", "artisan")
    .maybeSingle();

  if (!recipientProfile?.artisan_profiles) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        "Aucun professionnel inscrit sur la plateforme avec ce numéro. Il doit d'abord créer son compte."
      )}`
    );
  }

  if (recipientProfile.id === user.id) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Tu ne peux pas te répartir une part à toi-même.")}`);
  }

  const { data: existingSplits } = await supabase
    .from("project_milestones")
    .select("amount")
    .eq("parent_milestone_id", parentMilestoneId);

  const alreadySplit = (existingSplits || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  if (alreadySplit + amount > Number(parent.amount || 0)) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        `La répartition dépasse le montant de l'étape (${Number(parent.amount || 0).toLocaleString("fr-FR")} au total, ${alreadySplit.toLocaleString("fr-FR")} déjà réparti).`
      )}`
    );
  }

  await supabase.from("project_milestones").insert({
    project_id: parent.project_id,
    parent_milestone_id: parent.id,
    artisan_id: recipientProfile.id,
    title: `Part sur « ${parent.title} »`,
    amount,
    order_index: parent.order_index,
    is_completed: parent.is_completed,
    completed_at: parent.completed_at,
    paid_at: parent.paid_at,
  });

  await sendPush(
    recipientProfile.id,
    "Nouvelle part sur un chantier",
    `Tu as été ajouté sur l'étape « ${parent.title} » pour ${amount.toLocaleString("fr-FR")} : suis le paiement depuis Mes revenus.`,
    "/revenus"
  );

  redirect(`/projects/${projectId}`);
}

// ---------------------------------------------------------
// PRESTATAIRE EXTERNE (ex: technicien → menuisier, ferrailleur, carreleur…)
// Contrairement à addMilestoneSplit ci-dessus (répartition interne d'une
// étape déjà payée au professionnel), ici le CLIENT paie DIRECTEMENT ce
// prestataire : on crée une étape à part entière (pas un enfant), rattachée
// au prestataire, mais déclarée par un autre professionnel déjà sur le
// projet (ex: le technicien). Le client ne voit jamais l'identité du
// prestataire — seulement l'intitulé du métier qu'on lui donne ici en
// titre. Cf. consigne Rose du 2026-11-25 : "il n'y a que l'argent des
// maçons qui passe par le technicien" — tout le reste (prestataires
// occasionnels) est payé en direct.
export async function addExternalProvider(formData) {
  const supabase = createClient();
  const projectId = formData.get("projectId");
  const label = (formData.get("label") || "").trim();
  const providerPhone = (formData.get("providerPhone") || "").trim();
  const amount = parseFloat(formData.get("amount"));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  if (!label || !providerPhone || !amount || amount <= 0) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Indique l'intitulé du métier, un téléphone et un montant valides.")}`);
  }

  const { data: providerProfile } = await supabase
    .from("profiles")
    .select("id, role, artisan_profiles ( id )")
    .eq("phone", providerPhone)
    .eq("role", "artisan")
    .maybeSingle();

  if (!providerProfile?.artisan_profiles) {
    redirect(
      `/projects/${projectId}?error=${encodeURIComponent(
        "Aucun professionnel inscrit sur la plateforme avec ce numéro. Il doit d'abord créer son compte."
      )}`
    );
  }

  if (providerProfile.id === user.id) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Tu ne peux pas te déclarer toi-même comme prestataire externe.")}`);
  }

  const { error } = await supabase.from("project_milestones").insert({
    project_id: projectId,
    artisan_id: providerProfile.id,
    declared_by_id: user.id,
    hide_identity: true,
    title: label,
    order_index: 1,
    amount,
  });

  if (error) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Impossible d'ajouter ce prestataire : " + error.message)}`);
  }

  await sendPush(
    providerProfile.id,
    "Nouvelle étape sur un chantier",
    `Tu as été ajouté sur un projet pour « ${label} », ${amount.toLocaleString("fr-FR")} : suis le paiement depuis le projet.`,
    `/projects/${projectId}`
  );

  redirect(`/projects/${projectId}`);
}

export async function removeExternalProvider(formData) {
  const supabase = createClient();
  const milestoneId = formData.get("milestoneId");
  const projectId = formData.get("projectId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: milestone } = await supabase
    .from("project_milestones")
    .select("id, declared_by_id, paid_at")
    .eq("id", milestoneId)
    .single();

  if (!milestone || milestone.declared_by_id !== user.id) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Tu ne peux retirer que les prestataires que tu as toi-même ajoutés.")}`);
  }

  if (milestone.paid_at) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Cette étape a déjà été payée, elle ne peut plus être retirée.")}`);
  }

  await supabase.from("project_milestones").delete().eq("id", milestoneId);

  redirect(`/projects/${projectId}`);
}

export async function removeMilestoneSplit(formData) {
  const supabase = createClient();
  const splitId = formData.get("splitId");
  const projectId = formData.get("projectId");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: split } = await supabase
    .from("project_milestones")
    .select("id, paid_at, parent:parent_milestone_id ( artisan_id )")
    .eq("id", splitId)
    .single();

  if (!split || split.parent?.artisan_id !== user.id) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Tu ne peux retirer que les parts que tu as toi-même attribuées.")}`);
  }

  if (split.paid_at) {
    redirect(`/projects/${projectId}?error=${encodeURIComponent("Cette part a déjà été payée, elle ne peut plus être retirée.")}`);
  }

  await supabase.from("project_milestones").delete().eq("id", splitId);

  redirect(`/projects/${projectId}`);
}
