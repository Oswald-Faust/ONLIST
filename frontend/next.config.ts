import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN || "https://api.onlist.club";

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
