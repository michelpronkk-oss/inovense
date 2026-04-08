import type { Metadata } from "next";
import { CreativeStudio } from "./creative-studio";

export const metadata: Metadata = {
  title: "Creative Studio | Inovense CRM",
};

export default function CreativePage() {
  return <CreativeStudio />;
}
