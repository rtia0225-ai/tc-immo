import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MessagesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      `id, created_at, client_id, artisan_id,
       client:client_id ( full_name ),
       artisan:artisan_id ( trade, profiles ( full_name ) ),
       project:project_id ( title )`
    )
    .or(`client_id.eq.${user.id},artisan_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // client_id/artisan_id ne reflètent pas forcément "le client" et "le
  // prestataire" : entre deux professionnels d'un même projet, les deux
  // peuvent se retrouver du côté "artisan_id" ou "client_id" selon l'ordre
  // des identifiants. On affiche donc toujours l'AUTRE participant, peu
  // importe de quel côté il est rangé.
  function otherPartyName(c) {
    if (c.client_id === user.id) {
      return c.artisan?.profiles?.full_name || c.artisan?.trade || "Professionnel";
    }
    return c.client?.full_name || "Utilisateur";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-dark">Messages</h1>

      {!conversations || conversations.length === 0 ? (
        <p className="text-gray-600">Aucune conversation pour le moment.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="rounded-lg bg-white shadow-card p-4 hover:shadow-sm"
            >
              <p>Conversation avec {otherPartyName(c)}</p>
              {c.project?.title && (
                <p className="mt-0.5 text-xs text-gray-400">Projet : {c.project.title}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
