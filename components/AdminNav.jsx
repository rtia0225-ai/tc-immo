import Link from "next/link";

const LINKS = [
  { href: "/admin/artisans", label: "Artisans" },
  { href: "/admin/pending", label: "En attente" },
  { href: "/admin/activity", label: "Parcours des clients" },
  { href: "/admin/content", label: "Contenu du site" },
  { href: "/admin/interview-availability", label: "Créneaux d'entretien" },
];

export default function AdminNav({ current }) {
  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              current === l.href ? "bg-ink text-white" : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
