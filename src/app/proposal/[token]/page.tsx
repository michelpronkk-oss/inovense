import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposal | Inovense",
  robots: { index: false, follow: false },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ProposalPage({
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
    proposal_body: string | null;
    proposal_sent_at: string | null;
  } | null = null;

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("leads")
      .select(
        "id, full_name, company_name, service_lane, proposal_body, proposal_sent_at"
      )
      .eq("proposal_token", token)
      .single();

    lead = data ?? null;
  } catch {
    lead = null;
  }

  if (!lead) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-sm text-zinc-600">
            This proposal link is invalid or has expired.
          </p>
          <p className="mt-2 text-xs text-zinc-700">
            If you believe this is a mistake, contact us at{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
            >
              hello@inovense.com
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const firstName = lead.full_name.split(" ")[0];

  return (
    <div className="px-4 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-2xl">

        {/* Header */}
        <div className="mb-12">
          <p className="mb-6 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
            Inovense
          </p>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-brand">
            Proposal
          </p>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-3xl">
            {lead.company_name}
          </h1>
          {lead.proposal_sent_at && (
            <p className="mt-2 text-sm text-zinc-600">
              Prepared {formatDate(lead.proposal_sent_at)}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="mb-10 h-px bg-zinc-800/60" />

        {/* Proposal content */}
        {lead.proposal_body ? (
          <div className="space-y-5">
            {lead.proposal_body
              .split(/\n{2,}/)
              .filter((p) => p.trim())
              .map((paragraph, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed text-zinc-400 sm:text-base"
                >
                  {paragraph.trim()}
                </p>
              ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">
            Proposal content is being prepared. Check back shortly.
          </p>
        )}

        {/* Footer */}
        <div className="mt-16 border-t border-zinc-800/60 pt-8">
          <p className="text-xs text-zinc-700">
            Questions? Reply to the email from us or reach out at{" "}
            <a
              href="mailto:hello@inovense.com"
              className="text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
            >
              hello@inovense.com
            </a>
            .
          </p>
          <p className="mt-2 text-xs text-zinc-800">
            This proposal is private and intended only for {firstName} at {lead.company_name}.
          </p>
        </div>

      </div>
    </div>
  );
}
