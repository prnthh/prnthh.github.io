import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignore the inner server project in client-side builds
      config.watchOptions = {
        ignored: ['**/server/**'],
      };
    }
    return config;
  },};

export default nextConfig;
