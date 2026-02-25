import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.divine-pride.net",
      },
    ],
  },
};

export default nextConfig;
