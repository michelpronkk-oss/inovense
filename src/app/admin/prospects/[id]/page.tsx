import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  createSupabaseServerClient,
  type Prospect,
} from "@/lib/supabase-server";
import ProspectEditor from "./prospect-editor";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("prospects")
      .select("company_name")
      .eq("id", id)
      .single();

    if (data?.company_name) {
      return { title: `${data.company_name} | Prospects | Inovense CRM` };
    }
  } catch {
    // no-op fallback below
  }

  return { title: "Prospect | Inovense CRM" };
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return notFound();
  }

  return <ProspectEditor prospect={data as Prospect} />;
}
