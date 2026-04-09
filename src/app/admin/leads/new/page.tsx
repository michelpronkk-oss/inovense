import type { Metadata } from "next";
import NewLeadForm from "./new-lead-form";

export const metadata: Metadata = { title: "Add Lead | Inovense CRM" };

export default function NewLeadPage() {
  return <NewLeadForm />;
}
