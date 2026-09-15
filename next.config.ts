import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
