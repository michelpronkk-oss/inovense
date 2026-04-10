import type { Metadata } from "next";
import PlannerForm from "../planner-form";

export const metadata: Metadata = {
  title: "New Planner Item | Inovense CRM",
};

export default function PlannerNewPage() {
  return <PlannerForm mode="create" />;
}
