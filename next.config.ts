import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, which real photos (especially straight off a phone
      // camera) routinely exceed — every image upload in the admin panel
      // (products, site media) goes through a Server Action.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
