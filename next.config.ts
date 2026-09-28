import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  experimental: {
    serverActions: {
      // Room for the signature image upload (the action itself caps the file at 1 MB).
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
