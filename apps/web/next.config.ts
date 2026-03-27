import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@triageai/shared"],
  // pnpm monorepo: trace dependencies from repo root (fixes wrong lockfile inference + Vercel packaging)
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
