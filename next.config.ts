import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: 'export',
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
