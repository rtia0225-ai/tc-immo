import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallAssistant from "@/components/InstallAssistant";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  metadataBase: new URL("https://tcholding-immo.com"),
  title: {
    default: "TC-Immo — Construire en Côte d'Ivoire, depuis n'importe où",
    template: "%s | TC-Immo",
  },
  description:
    "TC-Immo (TC Holding Immo) connecte la diaspora ivoirienne et tout client à distance à des artisans, géomètres, architectes et techniques BTP vérifiés, pour construire en Côte d'Ivoire en toute confiance — paiement sécurisé, suivi à distance, échéancier en plusieurs étapes.",
  keywords: [
    "construire en Côte d'Ivoire",
    "construire en Côte d'Ivoire depuis l'étranger",
    "artisan vérifié Côte d'Ivoire",
    "géomètre topographe Côte d'Ivoire",
    "architecte Côte d'Ivoire",
    "technicien BTP Côte d'Ivoire",
    "TC Holding Immo",
    "TC-Immo",
  ],
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "TC-Immo",
    title: "TC-Immo — Construire en Côte d'Ivoire, depuis n'importe où",
    description:
      "Trouvez un artisan, un géomètre ou un architecte vérifié pour construire en Côte d'Ivoire, où que vous soyez. Paiement sécurisé, suivi à distance.",
    images: ["/hero-elephants.jpg"],
  },
};

export const viewport = {
  themeColor: "#f22222",
};

export default async function RootLayout({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = !!profile?.is_admin;
  }

  return (
    <html lang="fr">
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-53TV4ZCT7Q" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-53TV4ZCT7Q');
            `,
          }}
        />
        {/* Aide Google à associer "TC-Immo", "TC Holding Immo" et
            "TCHolding-Immo" à la même entité, pour les recherches de marque. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "TC-Immo",
              alternateName: ["TC Holding Immo", "TCHolding-Immo", "TC Holding"],
              url: "https://tcholding-immo.com",
              logo: "https://tcholding-immo.com/logo-navbar.png",
              description:
                "Plateforme qui connecte la diaspora ivoirienne et tout client à distance à des artisans, géomètres et architectes vérifiés, pour construire en Côte d'Ivoire.",
              areaServed: {
                "@type": "Country",
                name: "Côte d'Ivoire",
              },
            }),
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <ServiceWorkerRegister />
        <Navbar user={user} isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
        <Footer />
        <InstallAssistant loggedIn={!!user} />
      </body>
    </html>
  );
}
