import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN || "http://72.60.212.208";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
