import { createClient } from "@/lib/supabase/server";
import RevealSection from "@/components/RevealSection";
import {
  IconSearch, IconChat, IconContract, IconLayers, IconGauge,
  IconCompass, IconBlueprint, IconHelmet, IconTrowel,
  IconShieldCheck, IconFolder, IconMilestones, IconSignal, IconHandshake,
} from "@/components/HowItWorksIcons";

const STEP_ICONS = [IconSearch, IconLayers, IconChat, IconContract, IconLayers, IconGauge];

function matchProfessionalIcon(title) {
  const t = title.toLowerCase();
  if (t.includes("géomètre") || t.includes("topographe")) return { Icon: IconCompass, accent: "forest" };
  if (t.includes("architecte")) return { Icon: IconBlueprint, accent: "brand" };
  if (t.includes("technicien")) return { Icon: IconHelmet, accent: "gold" };
  return { Icon: IconTrowel, accent: "ink" };
}

function matchSecurityIcon(title) {
  const t = title.toLowerCase();
  if (t.includes("vérifi")) return IconShieldCheck;
  if (t.includes("traçabilité") || t.includes("gestion")) return IconFolder;
  if (t.includes("paiement") || t.includes("échelonn")) return IconMilestones;
  if (t.includes("distance") || t.includes("suivi")) return IconSignal;
  if (t.includes("partenaire")) return IconHandshake;
  return IconShieldCheck;
}

// Sépare "1. texte" en (numéro, texte) — sinon renvoie null.
function parseNumberedItem(paragraph) {
  const match = paragraph.match(/^(\d+)\.\s*(.+)$/s);
  if (!match) return null;
  return { number: match[1], text: match[2] };
}

// Sépare "**Titre**\ntexte" en (titre, texte) — sinon renvoie null.
function parseTitledItem(paragraph) {
  const match = paragraph.match(/^\*\*([^*]+)\*\*\s*\n?\s*(.*)$/s);
  if (!match) return null;
  return { title: match[1], text: match[2] };
}

const ACCENT_CLASSES = {
  forest: "bg-forest-light text-forest border-forest/30",
  brand: "bg-brand-light text-brand-dark border-brand/30",
  gold: "bg-amber-50 text-amber-700 border-amber-300",
  ink: "bg-gray-100 text-ink border-gray-300",
};

function TimelineSection({ title, body }) {
  const paragraphs = body.split(/\n\s*\n/);
  const items = paragraphs.map(parseNumberedItem).filter(Boolean);
  const intro = items.length === 0 ? paragraphs : [];

  return (
    <RevealSection>
      <h2 className="font-heading text-2xl font-bold text-ink">{title}</h2>
      {intro.length > 0 && (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-600">{intro[0]}</p>
      )}

      <div className="relative mt-8 pl-2">
        {/* Ligne de cotation verticale, pointillée, façon plan technique */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px border-l border-dashed border-forest/40" />
        <div className="flex flex-col gap-8">
          {items.map((item, i) => {
            const Icon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <div key={item.number} className="relative flex gap-5">
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-forest bg-white font-heading text-sm font-bold text-forest">
                  {item.number}
                </div>
                <div className="flex-1 pt-1.5">
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 shrink-0 text-forest/70" />
                    <p className="text-sm leading-relaxed text-gray-700">{item.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}

function ProfessionalsSection({ title, body }) {
  const paragraphs = body.split(/\n\s*\n/);
  const items = paragraphs.map(parseTitledItem).filter(Boolean);
  const intro = items.length === 0 ? paragraphs : paragraphs.slice(0, paragraphs.length - items.length);

  return (
    <RevealSection>
      <h2 className="font-heading text-2xl font-bold text-ink">{title}</h2>
      {intro.map((p, i) => (
        <p key={i} className="mt-3 max-w-md text-sm leading-relaxed text-gray-600">{p}</p>
      ))}

      <div className="mt-8 flex flex-col">
        {items.map((item, i) => {
          const { Icon, accent } = matchProfessionalIcon(item.title);
          return (
            <div
              key={item.title}
              className={`flex gap-4 border-t border-gray-100 py-5 ${i === items.length - 1 ? "border-b" : ""}`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${ACCENT_CLASSES[accent]}`}>
                <Icon />
              </div>
              <div>
                <p className="font-heading font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </RevealSection>
  );
}

function SecuritySection({ title, body }) {
  const paragraphs = body.split(/\n\s*\n/);
  const items = paragraphs.map(parseTitledItem).filter(Boolean);
  const intro = items.length === 0 ? paragraphs : paragraphs.slice(0, paragraphs.length - items.length);

  return (
    <RevealSection>
      <div className="rounded-2xl bg-forest px-6 py-10 sm:px-10">
        <h2 className="font-heading text-2xl font-bold text-white">{title}</h2>
        {intro.map((p, i) => (
          <p key={i} className="mt-3 max-w-md text-sm leading-relaxed text-white/80">{p}</p>
        ))}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {items.map((item) => {
            const Icon = matchSecurityIcon(item.title);
            return (
              <div key={item.title} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                  <Icon />
                </div>
                <div>
                  <p className="font-heading font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/75">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}

// Sections encore inconnues (ajoutées par l'admin plus tard) : rendu
// simple, cohérent avec le reste, sans mise en forme spécifique.
function GenericSection({ title, body }) {
  const paragraphs = body.split(/\n\s*\n/);
  return (
    <RevealSection>
      <h2 className="font-heading text-2xl font-bold text-ink">{title}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className="mt-3 max-w-md text-sm leading-relaxed text-gray-600">{p}</p>
      ))}
    </RevealSection>
  );
}

// La mise en forme dépend de l'ordre : 1 = parcours (chronologie),
// 2 = professionnels (fiches), 3 = sécurité (bandeau). Au-delà, rendu
// générique pour que toute section ajoutée depuis l'admin reste lisible.
function pickLayout(orderIndex) {
  if (orderIndex === 1) return TimelineSection;
  if (orderIndex === 2) return ProfessionalsSection;
  if (orderIndex === 3) return SecuritySection;
  return GenericSection;
}

export default async function CommentCaMarchePage() {
  const supabase = createClient();
  const { data: sections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page", "comment-ca-marche")
    .order("order_index", { ascending: true });

  return (
    <div>
      {/* En-tête, façon cartouche de plan technique */}
      <div className="border-b border-gray-100 bg-[#FAF8F3] px-4 py-14">
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-white px-3 py-1 text-xs font-medium text-forest">
            <span className="h-1.5 w-1.5 rounded-full bg-forest" />
            De la recherche à la livraison
          </div>
          <h1 className="font-heading mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Comment ça marche
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-gray-600">
            Construire depuis loin n'a rien d'évident. Voici, étape par étape, comment TC-Immo rend ça possible — et pourquoi vous pouvez avoir confiance à chaque instant.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="flex flex-col gap-16">
          {(sections || []).map((s) => {
            const Layout = pickLayout(s.order_index);
            return <Layout key={s.id} title={s.title} body={s.body} />;
          })}
          {(!sections || sections.length === 0) && (
            <p className="text-sm text-gray-500">Contenu à venir.</p>
          )}
        </div>
      </div>
    </div>
  );
}
