import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Questions fréquentes",
  description: "Sécurité des paiements, vérification des artisans, suivi de chantier à distance : les réponses aux questions les plus posées sur TC-Immo.",
};

export default async function FaqPage() {
  const supabase = createClient();
  const { data: sections } = await supabase
    .from("page_sections")
    .select("title, body")
    .eq("page", "faq")
    .order("order_index", { ascending: true });

  const faqs = (sections || []).map((s) => ({ q: s.title, a: s.body }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="font-heading text-3xl font-bold text-ink">Questions fréquentes</h1>
      <div className="mt-8 flex flex-col divide-y divide-gray-200 border-y border-gray-200">
        {faqs.map((item, i) => (
          <details key={item.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <span className="flex gap-3">
                <span className="font-heading shrink-0 text-sm font-bold text-brand">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-heading font-bold text-ink">{item.q}</span>
              </span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className="mt-1 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-45"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </summary>
            <p className="mt-3 pl-8 text-sm leading-relaxed text-gray-700">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
