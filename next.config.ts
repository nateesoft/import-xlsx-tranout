import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 'standalone' bundles a minimal Node.js server for production/Electron distribution.
  // Next dev still works normally with this setting.
  output: "standalone",
};

export default nextConfig;
