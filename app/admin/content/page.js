import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { addPageSection, updatePageSection, deletePageSection } from "../actions";

const PAGES = [
  { value: "comment-ca-marche", label: "Comment ça marche" },
  { value: "ressources", label: "Ressources" },
];

export default async function ContentManagementPage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!myProfile?.is_admin) redirect("/dashboard");

  const currentPage = searchParams?.page || "comment-ca-marche";

  const { data: sections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page", currentPage)
    .order("order_index", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-ink">Gestion du contenu</h1>
      <p className="mt-1 text-sm text-gray-500">
        Modifie ce qui s'affiche sur les pages publiques du site, sans avoir besoin de coder.
      </p>

      <div className="mt-4 flex gap-2">
        {PAGES.map((p) => (
          <a
            key={p.value}
            href={`/admin/content?page=${p.value}`}
            className={`rounded-full px-3 py-1 text-xs font-bold ${currentPage === p.value ? "bg-ink text-white" : "bg-gray-100 text-gray-600"}`}
          >
            {p.label}
          </a>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {sections?.map((s) => (
          <details key={s.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer font-heading font-bold text-ink">
              {s.order_index}. {s.title}
            </summary>
            <form action={updatePageSection} className="mt-4 flex flex-col gap-3">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="page" value={currentPage} />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Ordre d'affichage</label>
                <input type="number" name="orderIndex" defaultValue={s.order_index} className="w-24 rounded-lg border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Titre</label>
                <input name="title" defaultValue={s.title} required className="w-full rounded-lg border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Contenu (une ligne vide = nouveau paragraphe, **mot** = en gras)
                </label>
                <textarea name="body" defaultValue={s.body} required rows={10} className="w-full rounded-lg border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Liens "en savoir plus" (un par ligne, format Titre | URL — optionnel)
                </label>
                <textarea
                  name="links"
                  defaultValue={(s.links || []).map((l) => `${l.label} | ${l.url}`).join("\n")}
                  rows={3}
                  placeholder="Guichet Unique du Foncier | https://sigfu.gouv.ci"
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">
                  Enregistrer
                </button>
              </div>
            </form>
            <form action={deletePageSection} className="mt-2">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="page" value={currentPage} />
              <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
                Supprimer cette section
              </button>
            </form>
          </details>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="mb-3 text-sm font-bold text-ink">Ajouter une nouvelle section</p>
        <form action={addPageSection} className="flex flex-col gap-3">
          <input type="hidden" name="page" value={currentPage} />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Ordre d'affichage</label>
            <input type="number" name="orderIndex" defaultValue={(sections?.length || 0) + 1} className="w-24 rounded-lg border border-gray-300 p-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Titre</label>
            <input name="title" required className="w-full rounded-lg border border-gray-300 p-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Contenu (une ligne vide = nouveau paragraphe, **mot** = en gras)
            </label>
            <textarea name="body" required rows={6} className="w-full rounded-lg border border-gray-300 p-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Liens "en savoir plus" (un par ligne, format Titre | URL — optionnel)
            </label>
            <textarea
              name="links"
              rows={3}
              placeholder="Guichet Unique du Foncier | https://sigfu.gouv.ci"
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
            />
          </div>
          <button type="submit" className="w-fit rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest-dark">
            Ajouter la section
          </button>
        </form>
      </div>
    </div>
  );
}
