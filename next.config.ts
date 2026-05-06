import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep prefetched/visited dashboard pages in the client cache so navigating
    // back to them feels instant. Defaults are dynamic: 0, static: 300.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
