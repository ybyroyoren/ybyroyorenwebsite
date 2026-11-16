import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The self-hosted fonts never change under the same name: let browsers and the CDN keep them for a year.
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
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
