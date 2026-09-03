import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@react-pdf/renderer"],
  async redirects() {
    return [
      // Retired Inovense marketing architecture. These point directly to
      // canonical Auterim destinations so there are no redirect chains.
      { source: "/ai-automation", destination: "/agents", permanent: true },
      { source: "/process", destination: "/", permanent: true },
      { source: "/intake", destination: "/contact", permanent: true },
      { source: "/answers", destination: "/", permanent: true },
      { source: "/customers", destination: "/", permanent: true },
      { source: "/home-v2", destination: "/", permanent: true },
      { source: "/nl", destination: "/", permanent: true },
      { source: "/nl/ai-automation", destination: "/agents", permanent: true },
      { source: "/nl/process", destination: "/", permanent: true },
      { source: "/nl/intake", destination: "/contact", permanent: true },
      { source: "/ai-automation/:path*", destination: "/agents", permanent: true },
      { source: "/process/:path*", destination: "/", permanent: true },
      { source: "/intake/:path*", destination: "/contact", permanent: true },
      { source: "/answers/:path*", destination: "/", permanent: true },
      { source: "/customers/:path*", destination: "/", permanent: true },
      { source: "/home-v2/:path*", destination: "/", permanent: true },
      { source: "/nl/:path*", destination: "/", permanent: true },
      { source: "/web-design", destination: "/agents", permanent: true },
      { source: "/nl/web-design", destination: "/agents", permanent: true },
      { source: "/work/checkoutleak", destination: "/agents", permanent: true },
      { source: "/work/silentspend", destination: "/agents", permanent: true },
      { source: "/systems", destination: "/", permanent: true },
      { source: "/nl/systems", destination: "/", permanent: true },
      { source: "/build", destination: "/", permanent: true },
      { source: "/nl/build", destination: "/", permanent: true },
      { source: "/growth", destination: "/", permanent: true },
      { source: "/nl/growth", destination: "/", permanent: true },
      { source: "/lead-generation-systems", destination: "/", permanent: true },
      { source: "/saas-design", destination: "/", permanent: true },
      { source: "/shopify-design", destination: "/", permanent: true },
      { source: "/nl/shopify-design", destination: "/", permanent: true },
      { source: "/internal-tools", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
