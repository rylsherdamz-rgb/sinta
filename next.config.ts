import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ["agora-agent-client-toolkit", "@agora/agent-ui-kit"],
  turbopack: {
    rules: {
      "*.lottie": {
        as: "asset/resource",
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.lottie$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
