import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import OnboardingForm from "./onboarding-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Onboarding | Inovense",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let lead: {
    id: string;
    full_name: string;
    company_name: string;
    service_lane: string;
    onboarding_status: string;
  } | null = null;

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("leads")
      .select(
        "id, full_name, company_name, service_lane, onboarding_status"
      )
      .eq("onboarding_token", token)
      .single();

    lead = data ?? null;
  } catch {
    lead = null;
  }

  if (!lead) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-zinc-600">
          This link is invalid or has expired.
        </p>
        <p className="mt-2 text-xs text-zinc-700">
          If you believe this is a mistake, contact us at hello@inovense.com.
        </p>
      </div>
    );
  }

  if (lead.onboarding_status === "completed") {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden
          >
            <path
              d="M3.75 9.75l3.75 3.75 6.75-7.5"
              stroke="#49A0A4"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mb-3 text-xl font-semibold text-zinc-50">
          Already submitted.
        </h2>
        <p className="text-sm text-zinc-500">
          This onboarding brief has already been completed. We are on it.
        </p>
      </div>
    );
  }

  return (
    <OnboardingForm
      token={token}
      companyName={lead.company_name}
      fullName={lead.full_name}
      serviceLane={lead.service_lane}
    />
  );
}
