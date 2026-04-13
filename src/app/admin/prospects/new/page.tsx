import type { Metadata } from "next";
import NewProspectForm from "./new-prospect-form";

export const metadata: Metadata = {
  title: "New prospect | Inovense CRM",
};

export default function NewProspectPage() {
  return <NewProspectForm />;
}
