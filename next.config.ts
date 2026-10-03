import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Prepare for future features
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

// The service worker must always be fetched fresh so a new version reaches the installed app.
nextConfig.headers = async () => [
  { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
];

export default nextConfig;
