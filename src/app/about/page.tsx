import type { Metadata } from "next";
import AboutEditorial from "@/components/home-v3/about-editorial";

export const metadata: Metadata = {
  title: "About Auterim | Building Controlled AI Work",
  description: "Learn why Auterim is building an AI workforce that understands how companies operate, works across existing systems and keeps important actions under clear human control.",
  alternates: { canonical: "https://auterim.com/about" },
  openGraph: {
    url: "https://auterim.com/about",
    title: "About Auterim | Building Controlled AI Work",
    description: "Learn why Auterim is building an AI workforce that understands how companies operate, works across existing systems and keeps important actions under clear human control.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Auterim | Building Controlled AI Work",
    description: "Learn why Auterim is building an AI workforce that understands how companies operate, works across existing systems and keeps important actions under clear human control.",
  },
};

export default function AboutPage() {
  return <AboutEditorial />;
}
