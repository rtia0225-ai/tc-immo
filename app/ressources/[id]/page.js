import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

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

export async function generateMetadata({ params }) {
  const supabase = createClient();
  const { data: section } = await supabase
    .from("page_sections")
    .select("title, body")
    .eq("id", params.id)
    .single();

  if (!section) return { title: "Article" };

  return {
    title: section.title,
    description: section.body.split(/\n\s*\n/)[0]?.replace(/\*\*/g, "").slice(0, 155),
  };
}

export default async function RessourceArticlePage({ params }) {
  const supabase = createClient();
  const { data: section } = await supabase
    .from("page_sections")
    .select("*")
    .eq("id", params.id)
    .eq("page", "ressources")
    .single();

  if (!section) notFound();

  return (
    <div>
      {section.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={section.image_url} alt={section.title} className="h-64 w-full object-cover sm:h-80" />
      )}

      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/ressources" className="text-sm text-brand hover:underline">
          ← Toutes les ressources
        </Link>

        <span className="mt-4 inline-block rounded-full bg-forest px-3 py-1 text-xs font-bold text-white">
          Article {String(section.order_index).padStart(2, "0")}
        </span>
        <h1 className="font-heading mt-3 text-2xl font-bold leading-snug text-ink sm:text-3xl">
          {section.title}
        </h1>

        <div className="mt-5">{renderBody(section.body)}</div>

        {section.links && section.links.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {section.links.map((link) => (
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
      </div>
    </div>
  );
}
