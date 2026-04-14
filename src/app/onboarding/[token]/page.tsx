import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getClientLocaleForLeadSource, type ClientLocale } from "@/lib/client-locale";
import OnboardingForm from "./onboarding-form";

export const dynamic = "force-dynamic";

type OnboardingPageCopy = {
  pageTitle: string;
  invalidLinkMessage: string;
  invalidLinkHelp: string;
  completedTitle: string;
  completedMessage: string;
  portalButton: string;
};

const ONBOARDING_PAGE_COPY: Record<ClientLocale, OnboardingPageCopy> = {
  en: {
    pageTitle: "Onboarding",
    invalidLinkMessage: "This link is invalid or has expired.",
    invalidLinkHelp: "If you believe this is a mistake, contact us at hello@inovense.com.",
    completedTitle: "Already submitted.",
    completedMessage: "This onboarding brief has already been completed. We are on it.",
    portalButton: "Open Client Workspace",
  },
  nl: {
    pageTitle: "Onboarding",
    invalidLinkMessage: "Deze link is ongeldig of verlopen.",
    invalidLinkHelp: "Als je denkt dat dit een fout is, neem contact op via hello@inovense.com.",
    completedTitle: "Al verstuurd.",
    completedMessage: "Deze onboarding is al afgerond. Wij pakken het direct op.",
    portalButton: "Open Client Workspace",
  },
};

async function getOnboardingLeadByToken(token: string): Promise<{
  id: string;
  full_name: string;
  company_name: string;
  service_lane: string;
  lead_source: string | null;
  onboarding_status: string;
} | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("leads")
    .select("id, full_name, company_name, service_lane, lead_source, onboarding_status")
    .eq("onboarding_token", token)
    .single();

  return data ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  try {
    const lead = await getOnboardingLeadByToken(token);
    const locale = getClientLocaleForLeadSource(lead?.lead_source);
    return {
      title: `${ONBOARDING_PAGE_COPY[locale].pageTitle} | Inovense`,
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: "Onboarding | Inovense",
      robots: { index: false, follow: false },
    };
  }
}

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
    lead_source: string | null;
    onboarding_status: string;
  } | null = null;

  try {
    lead = await getOnboardingLeadByToken(token);
  } catch {
    lead = null;
  }

  const locale = getClientLocaleForLeadSource(lead?.lead_source);
  const copy = ONBOARDING_PAGE_COPY[locale];

  if (!lead) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-zinc-600">{copy.invalidLinkMessage}</p>
        <p className="mt-2 text-xs text-zinc-700">{copy.invalidLinkHelp}</p>
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
          {copy.completedTitle}
        </h2>
        <p className="text-sm text-zinc-500">
          {copy.completedMessage}
        </p>
        <Link
          href={`/client/${token}`}
          className="mt-5 inline-flex items-center rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:border-brand/60 hover:bg-brand/15"
        >
          {copy.portalButton}
        </Link>
      </div>
    );
  }

  return (
    <OnboardingForm
      token={token}
      companyName={lead.company_name}
      fullName={lead.full_name}
      serviceLane={lead.service_lane}
      locale={locale}
    />
  );
}
