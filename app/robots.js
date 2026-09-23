export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/auth", "/interet"],
    },
    sitemap: "https://tcholding-immo.com/sitemap.xml",
  };
}
