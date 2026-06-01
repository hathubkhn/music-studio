import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "*.kie.ai" },
      { protocol: "https", hostname: "*.soundhelix.com" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
}

export default nextConfig
