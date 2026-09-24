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
    "Soyez maître de vos travaux : trouvez votre artisan vérifié, suivez vos travaux en temps réel, payez à votre rythme.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "TC-Immo",
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
