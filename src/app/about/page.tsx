import type { Metadata } from "next";
import AboutEditorial from "@/components/home-v3/about-editorial";
import { staticOgImage } from "@/lib/static-og";

export const metadata: Metadata = {
  title: "About: Controlled AI Work",
  description: "Learn why Auterim is building an AI workforce that understands how companies operate, works across existing systems and keeps important actions under clear human control.",
  alternates: { canonical: "https://auterim.com/about" },
  openGraph: {
    url: "https://auterim.com/about",
    title: "About Auterim | Building Controlled AI Work",
    description: "Learn why Auterim is building an AI workforce that understands how companies operate, works across existing systems and keeps important actions under clear human control.",
    type: "website",
    siteName: "Auterim",
    images: [staticOgImage("/about")],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Auterim | Building Controlled AI Work",
    description: "Learn why Auterim is building an AI workforce that understands how companies operate, works across existing systems and keeps important actions under clear human control.",
    images: [staticOgImage("/about")],
  },
};

export default function AboutPage() {
  return <AboutEditorial />;
}
