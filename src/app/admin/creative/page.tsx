import type { Metadata } from "next";
import { CreativeStudio } from "./creative-studio";

export const metadata: Metadata = {
  title: "Creative Studio | Auterim Admin",
};

export default function CreativePage() {
  return <CreativeStudio />;
}
