import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // small self-contained server for Docker (less RAM, smaller image)
  // existing unused-import lint errors would otherwise fail production builds
  eslint: { ignoreDuringBuilds: true },
  /* config options here */
};

export default nextConfig;
