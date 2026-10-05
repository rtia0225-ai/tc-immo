/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Les photos envoyées par formulaire (profil, réalisations) peuvent
      // venir de banques d'images et peser plusieurs Mo avant compression
      // côté navigateur : la limite par défaut (1 Mo) les rejetait
      // silencieusement.
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
