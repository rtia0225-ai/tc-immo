import { createClient } from "@/lib/supabase/server";

// Convertit **gras** en <strong>, et découpe le texte en paragraphes
// (une ligne vide sépare deux paragraphes) — pas de vraie librairie
// markdown, juste ce qu'il faut pour un contenu admin simple.
function renderBody(body) {
  const paragraphs = body.split(/\n\s*\n/);
  return paragraphs.map((para, i) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return (
      <p key={i} className="mt-3 text-sm leading-relaxed text-gray-600 first:mt-0">
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="text-ink">{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

export default async function CommentCaMarchePage() {
  const supabase = createClient();
  const { data: sections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page", "comment-ca-marche")
    .order("order_index", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="font-heading text-3xl font-bold text-ink">Comment ça marche</h1>

      <div className="mt-8 flex flex-col gap-10">
        {(sections || []).map((s) => (
          <div key={s.id}>
            <h2 className="font-heading text-xl font-bold text-brand-dark">{s.title}</h2>
            <div className="mt-3">{renderBody(s.body)}</div>
          </div>
        ))}
        {(!sections || sections.length === 0) && (
          <p className="text-sm text-gray-500">Contenu à venir.</p>
        )}
      </div>
    </div>
  );
}
