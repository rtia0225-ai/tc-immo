import Link from "next/link";

// Page d'atterrissage pensée pour un lien unique partagé sur LinkedIn
// (post ou bio) : s'adresse en priorité à la diaspora qui veut
// construire/rénover en Côte d'Ivoire à distance. Un seul message,
// court, qui mène vers le site plutôt que de tout expliquer ici.
export const metadata = {
  title: "Construire en Côte d'Ivoire, depuis l'étranger",
  description:
    "TCHolding-Immo connecte la diaspora ivoirienne à des artisans vérifiés en Côte d'Ivoire : paiement sécurisé par étapes, suivi de chantier à distance.",
};

const POINTS = [
  {
    title: "Des professionnels vérifiés",
    text: "Architectes, ingénieurs, géomètres, chefs de chantier — chaque profil est contrôlé avant d'apparaître sur la plateforme.",
  },
  {
    title: "Un paiement jamais versé d'un coup",
    text: "Chaque professionnel est payé étape par étape, uniquement une fois le travail réellement validé. Rien n'est débloqué à l'avance.",
  },
  {
    title: "Un suivi à distance, où que vous soyez",
    text: "Avancement, documents, rendez-vous de validation : tout est visible depuis votre espace, sans avoir à être sur place.",
  },
];

export default function LinkedInLandingPage() {
  return (
    <div className="bg-[#FAF8F3]">
      {/* Hero — un seul message, un seul bouton */}
      <section
        className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden px-4 py-14 text-center text-white sm:min-h-[440px]"
        style={{ background: "radial-gradient(circle at center, #4a2c18 0%, #241307 65%, #140a04 100%)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-elephants.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />

        <div className="relative z-10 flex max-w-xl flex-col items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-footer.png" alt="TCHolding-Immo" className="h-10 w-auto" />
          <h1 className="font-heading text-3xl font-extrabold leading-[1.15] sm:text-4xl">
            Construisez chez vous, en toute sécurité, depuis n'importe où
          </h1>
          <p className="max-w-md text-base text-white/90">
            TCHolding-Immo connecte la diaspora ivoirienne à des artisans vérifiés en Côte d'Ivoire — pour construire ou rénover sans être sur place.
          </p>
          <Link
            href="/"
            className="mt-2 rounded-lg bg-brand px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-dark"
          >
            Découvrir TCHolding-Immo →
          </Link>
        </div>
      </section>

      {/* Pourquoi TCHolding-Immo — 3 points, pas plus */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-center font-heading text-xl font-bold text-ink sm:text-2xl">
          Construire à distance n'est plus un pari
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {POINTS.map((p, i) => (
            <div key={i} className="text-center sm:text-left">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white sm:mx-0">
                {i + 1}
              </div>
              <p className="mt-3 font-heading font-bold text-ink">{p.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dernier appel, même CTA */}
      <section className="px-4 pb-16 text-center">
        <Link
          href="/"
          className="inline-block rounded-lg bg-brand px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-dark"
        >
          Visiter le site →
        </Link>
      </section>
    </div>
  );
}
