import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@react-pdf/renderer"],
  async redirects() {
    return [
      { source: "/web-design", destination: "/ai-automation", permanent: true },
      { source: "/nl/web-design", destination: "/nl/ai-automation", permanent: true },
      { source: "/work/checkoutleak", destination: "/ai-automation", permanent: true },
      { source: "/work/silentspend", destination: "/ai-automation", permanent: true },
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
