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
};

export default nextConfig;
