import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  // Keep the app-like mobile navigation unobstructed during development.
  devIndicators: false,
};

export default nextConfig;
