import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient, type PlannerPost } from "@/lib/supabase-server";
import PlannerForm from "../planner-form";

export const metadata: Metadata = {
  title: "Edit Planner Item | Inovense CRM",
};

export const dynamic = "force-dynamic";

export default async function PlannerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("planner_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  return <PlannerForm mode="edit" initialPost={data as PlannerPost} />;
}
