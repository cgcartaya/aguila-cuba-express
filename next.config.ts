import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,

  images: {
    // Evita que Vercel procese las imágenes mediante /_next/image.
    // Las imágenes se cargan directamente desde Supabase Storage.
    unoptimized: true,

    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/**",
      },
    ],

    formats: ["image/avif", "image/webp"],
  },

  async rewrites() {
    return [
      {
        // Alias con extensión .csv: es la URL exacta que se le mostró
        // al dueño de la tienda al configurar el catálogo en Meta.
        source: "/api/meta-catalog.csv",
        destination: "/api/meta-catalog",
      },
    ];
  },
};

export default nextConfig;
