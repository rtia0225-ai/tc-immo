import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

function line(char = "-") {
  return char.repeat(60);
}

// Exporte toutes les données liées au compte connecté : profil, projets,
// échéanciers, rendez-vous, conversations et messages. Répond au droit de
// portabilité promis dans la politique de confidentialité (section 7).
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, city, country, role, created_at")
    .eq("id", user.id)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      `id, title, description, amount, currency, status, terrain_location, terrain_reference_number, created_at,
       artisan:artisan_id ( full_name ),
       project_milestones ( title, description, is_completed, completed_at, payment_percentage, amount, paid_at, deliverable_document_url, order_index ),
       contracts ( content, client_signed_at, artisan_signed_at, created_at )`
    )
    .eq("client_id", user.id)
    .order("created_at", { ascending: true });

  const { data: appointments } = await supabase
    .from("appointments")
    .select("scheduled_at, duration_minutes, status, notes, meeting_link, artisan:artisan_id ( full_name )")
    .eq("client_id", user.id)
    .order("scheduled_at", { ascending: true });

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, created_at, artisan:artisan_id ( full_name ), messages ( content, audio_url, created_at, sender_id )")
    .eq("client_id", user.id)
    .order("created_at", { ascending: true });

  const parts = [];
  parts.push("DOSSIER TCHOLDING-IMMO");
  parts.push(`Exporté le ${formatDate(new Date())}`);
  parts.push(line("="));
  parts.push("");

  parts.push("INFORMATIONS DU COMPTE");
  parts.push(line());
  parts.push(`Nom : ${profile?.full_name || ""}`);
  parts.push(`Téléphone : ${profile?.phone || ""}`);
  parts.push(`Ville : ${profile?.city || ""}${profile?.country ? ", " + profile.country : ""}`);
  parts.push(`Compte créé le : ${formatDate(profile?.created_at)}`);
  parts.push("");

  parts.push("PROJETS");
  parts.push(line());
  if (!projects || projects.length === 0) {
    parts.push("Aucun projet démarré pour le moment.");
  }
  for (const p of projects || []) {
    parts.push(`• ${p.title} — avec ${p.artisan?.full_name || "professionnel"}`);
    parts.push(`  Statut : ${p.status} | Montant : ${p.amount} ${p.currency || ""}`);
    parts.push(`  Créé le ${formatDate(p.created_at)}`);
    if (p.terrain_location) parts.push(`  Terrain : ${p.terrain_location}${p.terrain_reference_number ? " (réf. " + p.terrain_reference_number + ")" : ""}`);
    if (p.description) parts.push(`  Description : ${p.description}`);

    if (p.project_milestones?.length) {
      parts.push("  Échéancier :");
      const sorted = [...p.project_milestones].sort((a, b) => a.order_index - b.order_index);
      for (const m of sorted) {
        parts.push(`   - [${m.is_completed ? "Validée" : "En attente"}] ${m.title} (${m.payment_percentage}% — ${m.amount})`);
        if (m.completed_at) parts.push(`     Validée le ${formatDate(m.completed_at)}`);
        if (m.deliverable_document_url) parts.push(`     Document/photo/vidéo : ${m.deliverable_document_url}`);
      }
    }

    if (p.contracts?.length) {
      parts.push("  Contrat(s) :");
      for (const c of p.contracts) {
        parts.push(`   - Créé le ${formatDate(c.created_at)}, signé client le ${formatDate(c.client_signed_at) || "(non signé)"}, signé artisan le ${formatDate(c.artisan_signed_at) || "(non signé)"}`);
      }
    }
    parts.push("");
  }

  parts.push("RENDEZ-VOUS");
  parts.push(line());
  if (!appointments || appointments.length === 0) {
    parts.push("Aucun rendez-vous pour le moment.");
  }
  for (const a of appointments || []) {
    parts.push(`• ${formatDate(a.scheduled_at)} (${a.duration_minutes} min) avec ${a.artisan?.full_name || "professionnel"} — ${a.status}`);
    if (a.notes) parts.push(`  Notes : ${a.notes}`);
  }
  parts.push("");

  parts.push("CONVERSATIONS ET MESSAGES");
  parts.push(line());
  if (!conversations || conversations.length === 0) {
    parts.push("Aucune conversation pour le moment.");
  }
  for (const c of conversations || []) {
    parts.push(`• Conversation avec ${c.artisan?.full_name || "professionnel"} (ouverte le ${formatDate(c.created_at)})`);
    const msgs = [...(c.messages || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (const m of msgs) {
      const author = m.sender_id === user.id ? "Vous" : c.artisan?.full_name || "Professionnel";
      parts.push(`   [${formatDate(m.created_at)}] ${author} : ${m.content || ""}${m.audio_url ? " (note vocale : " + m.audio_url + ")" : ""}`);
    }
    parts.push("");
  }

  parts.push(line("="));
  parts.push("Les appels vidéo (rendez-vous) ne sont pas enregistrés ni transcrits par la plateforme : seule leur planification (date, heure, statut) apparaît ci-dessus.");

  const content = parts.join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="mon-dossier-tcholding-immo.txt"`,
    },
  });
}
