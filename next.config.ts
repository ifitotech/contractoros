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

export default nextConfig;
