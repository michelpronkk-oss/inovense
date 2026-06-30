import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Auterim",
    short_name: "Auterim",
    description:
      "Auterim connects to your tools, monitors what matters, and lets agents execute safely across your business.",
    start_url: "/",
    display: "browser",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
