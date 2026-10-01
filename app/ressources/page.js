import { createClient } from "@/lib/supabase/server";
import { IconFolder } from "@/components/HowItWorksIcons";
import Link from "next/link";

export const metadata = {
  title: "Ressources — Guide des démarches foncières et de construction",
  description: "Terrain loti, ACD, Certificat d'Urbanisme, Permis de Construire : tout comprendre sur les démarches administratives pour construire en Côte d'Ivoire.",
};

// Court aperçu du premier paragraphe, pour la vignette.
function excerpt(body, length = 110) {
  const firstParagraph = body.split(/\n\s*\n/)[0] || "";
  const clean = firstParagraph.replace(/\*\*/g, "");
  return clean.length > length ? clean.slice(0, length).trim() + "…" : clean;
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
      <div className="border-b border-ink/10 px-4 pb-10 pt-14">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-heading text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Ressources
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-gray-600">
            Le foncier et la construction en Côte d'Ivoire, expliqués simplement — avec des liens vers les administrations officielles pour aller plus loin.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-14">
        {sections.length === 0 && <p className="text-sm text-gray-500">Contenu à venir.</p>}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Vignette vedette, plus grande, sur 2 colonnes */}
          {featured && (
            <Link href={`/ressources/${featured.id}`} className="group block h-full sm:col-span-2 lg:col-span-2 lg:row-span-2">
              <article className="relative h-full min-h-[22rem] overflow-hidden rounded-2xl border border-ink/15">
                {featured.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featured.image_url}
                    alt={featured.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="rounded bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
                    Article {String(featured.order_index).padStart(2, "0")}
                  </span>
                  <h2 className="font-heading mt-2 text-xl font-bold leading-snug text-white sm:text-2xl">
                    {featured.title}
                  </h2>
                </div>
              </article>
            </Link>
          )}

          {/* Les autres articles, en vignettes */}
          {rest.map((s) => (
            <Link key={s.id} href={`/ressources/${s.id}`} className="group block h-full">
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink/15">
                {s.image_url && (
                  <div className="relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.image_url}
                      alt={s.title}
                      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                      Article {String(s.order_index).padStart(2, "0")}
                    </span>
                  </div>
                )}
                <div className="flex-1 p-4">
                  <h2 className="font-heading text-base font-bold leading-snug text-ink group-hover:text-forest">
                    {s.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-gray-500">{excerpt(s.body)}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>

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
