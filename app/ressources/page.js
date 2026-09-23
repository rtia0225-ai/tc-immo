import { createClient } from "@/lib/supabase/server";
import RevealSection from "@/components/RevealSection";
import { IconFolder } from "@/components/HowItWorksIcons";

function IconExternalLink(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

function renderBody(body) {
  const paragraphs = body.split(/\n\s*\n/);
  return paragraphs.map((para, i) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return (
      <p key={i} className="mt-4 text-[15px] leading-relaxed text-gray-700 first:mt-0">
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

export const metadata = {
  title: "Ressources — Guide des démarches foncières et de construction",
  description: "Terrain loti, ACD, Certificat d'Urbanisme, Permis de Construire : tout comprendre sur les démarches administratives pour construire en Côte d'Ivoire.",
};

export default async function RessourcesPage() {
  const supabase = createClient();
  const { data: sections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page", "ressources")
    .order("order_index", { ascending: true });

  return (
    <div>
      <div className="border-b border-gray-100 bg-[#FAF8F3] px-4 py-14">
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-forest/30 bg-white px-3 py-1 text-xs font-medium text-forest">
            <span className="h-1.5 w-1.5 rounded-full bg-forest" />
            Guide des démarches
          </div>
          <h1 className="font-heading mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Ressources
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-gray-600">
            Le foncier et la construction en Côte d'Ivoire, expliqués simplement — avec des liens vers les administrations officielles pour aller plus loin.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="flex flex-col">
          {(sections || []).map((s, i) => (
            <RevealSection key={s.id}>
              <article className={`py-10 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                <p className="font-heading text-xs font-bold text-forest">
                  Article {String(s.order_index).padStart(2, "0")}
                </p>
                <h2 className="font-heading mt-2 text-2xl font-bold leading-snug text-ink">
                  {s.title}
                </h2>

                <div className="mt-4 max-w-xl">{renderBody(s.body)}</div>

                {s.links && s.links.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {s.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-ink hover:border-forest hover:text-forest"
                      >
                        <IconExternalLink />
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            </RevealSection>
          ))}

          {(!sections || sections.length === 0) && (
            <p className="text-sm text-gray-500">Contenu à venir.</p>
          )}
        </div>

        <a
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          <IconFolder />
          Trouver ma démarche exacte
        </a>
      </div>
    </div>
  );
}
