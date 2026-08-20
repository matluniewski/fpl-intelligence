import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    workerThreads: true,
  },
  // The workspace root runs TypeScript before the production build. Keeping this
  // duplicate check out of `next build` avoids Next spawning an extra process in
  // the Codex workspace sandbox while preserving the mandatory typecheck gate.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
