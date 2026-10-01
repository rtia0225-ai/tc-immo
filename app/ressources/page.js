import { createClient } from "@/lib/supabase/server";
import RevealSection from "@/components/RevealSection";
import { IconFolder } from "@/components/HowItWorksIcons";

export const metadata = {
  title: "Ressources — Guide des démarches foncières et de construction",
  description: "Terrain loti, ACD, Certificat d'Urbanisme, Permis de Construire : tout comprendre sur les démarches administratives pour construire en Côte d'Ivoire.",
};

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

function LinksRow({ links }) {
  if (!links || links.length === 0) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {links.map((link) => (
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
  );
}

export default async function RessourcesPage() {
  const supabase = createClient();
  const { data: allSections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page", "ressources")
    .order("order_index", { ascending: true });

  const sections = allSections || [];
  const [featured, ...rest] = sections;

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

      <div className="mx-auto max-w-5xl px-4 py-14">
        {sections.length === 0 && <p className="text-sm text-gray-500">Contenu à venir.</p>}

        {/* Article vedette — mise en avant façon magazine */}
        {featured && (
          <RevealSection>
            <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:grid sm:grid-cols-2">
              {featured.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.image_url} alt={featured.title} className="h-56 w-full object-cover sm:h-full" />
              )}
              <div className="p-6 sm:p-8">
                <span className="inline-block rounded-full bg-forest px-3 py-1 text-xs font-bold text-white">
                  Article 01
                </span>
                <h2 className="font-heading mt-3 text-2xl font-bold leading-snug text-ink">
                  {featured.title}
                </h2>
                <div className="mt-3 max-w-md">{renderBody(featured.body)}</div>
                <LinksRow links={featured.links} />
              </div>
            </article>
          </RevealSection>
        )}

        {/* Les autres articles, en cartes */}
        {rest.length > 0 && (
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {rest.map((s) => (
              <RevealSection key={s.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  {s.image_url && (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.image_url} alt={s.title} className="h-44 w-full object-cover" />
                      <span className="absolute left-3 top-3 rounded-full bg-forest px-3 py-1 text-xs font-bold text-white">
                        Article {String(s.order_index).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 p-5">
                    <h2 className="font-heading text-lg font-bold leading-snug text-ink">
                      {s.title}
                    </h2>
                    <div className="mt-2">{renderBody(s.body)}</div>
                    <LinksRow links={s.links} />
                  </div>
                </article>
              </RevealSection>
            ))}
          </div>
        )}

        <a
          href="/"
          className="mt-10 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          <IconFolder />
          Trouver ma démarche exacte
        </a>
      </div>
    </div>
  );
}
