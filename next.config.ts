import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude server directory from client-side and server-side bundling
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: [/server/], // Exclude the entire server directory
    });
    return config;
  },
  // Optional: Ignore server files during TypeScript type checking
  typescript: {
    ignoreBuildErrors: false, // Set to true if you want to bypass type errors (not recommended)
  },
};

export default nextConfig;
