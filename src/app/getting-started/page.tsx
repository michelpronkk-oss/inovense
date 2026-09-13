import type { Metadata } from "next";
import PublicSiteFrame from "@/components/home-v3/public-site-frame";
import { PublicHero, PublicCta } from "@/components/home-v3/public-page-components";
import { DetailGroup, StorySection } from "@/components/home-v3/public-story-components";
import { GettingStartedHeroVisual } from "@/components/home-v3/page-specific-hero-visuals";
import { staticOgImage } from "@/lib/static-og";

const title = "Getting Started with Auterim Early Access";
const description = "A realistic path from an Early Access request to a controlled operator trial, with workspace invitation, connector setup, policies, approvals, and review.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://auterim.com/getting-started" },
  openGraph: { url: "https://auterim.com/getting-started", siteName: "Auterim", title, description, type: "website", images: [staticOgImage("/getting-started")] },
  twitter: { card: "summary_large_image", title, description, images: [staticOgImage("/getting-started")] },
  robots: { index: true, follow: true },
};

const steps = [
  { title: "Request Early Access", body: "Tell us about your team and the work you want an operator to handle. Submitting a request does not create an account or start a trial." },
  { title: "Receive a workspace invitation", body: "If your use case fits the current Early Access program, the team will contact you with next steps and an invitation." },
  { title: "Connect the systems for the first loop", body: "Choose the available connectors the selected role needs. Auterim adds a layer over those systems; they remain the systems of record." },
  { title: "Activate the relevant Operators", body: "Start with the role closest to the delayed work: Revenue, Client Flow, Operations, or Support. Availability depends on connector setup and workspace readiness." },
  { title: "Set policies and approval owners", body: "Define what may run inside policy, what waits for a named decision, and what is blocked. External communication can require approval." },
  { title: "Let Auterim watch approved context", body: "Once connected and activated, the operator looks for relevant work in its defined area and prepares a next step from the available context." },
  { title: "Review the first prepared work", body: "Check the evidence, proposed action, and policy outcome. Approve, edit, reject, or leave the work waiting according to your process." },
  { title: "Start a trial explicitly, when appropriate", body: "An invited workspace can choose to start the three-day trial through the product. It is never started by submitting an Early Access request." },
];

export default function GettingStartedPage() {
  return <PublicSiteFrame>
    <PublicHero label="Early Access path" title="Start with a real operating loop, one deliberate step at a time." description="Early Access begins with a request and an invitation. Setup, connections, operator activation, and any trial start happen later, under your control." secondary={{ label: "See current Operators", href: "/operators" }} visual={<GettingStartedHeroVisual />} />
    <StorySection label="From request to reviewed work" title="Start small. Set the boundary. See the work.">
      <div className="public-onboarding">
        <DetailGroup title="An invitation to begin." description="Tell us about the work. If the use case fits, we will help you take the next step." rows={steps.slice(0, 2)} />
        <DetailGroup title="A workspace under your rules." description="Connect the right systems, activate a role, and set its policies." rows={steps.slice(2, 5)} />
        <DetailGroup title="Your first prepared work." description="Review the evidence and the next move. Start a trial only when you choose." rows={steps.slice(5)} />
      </div>
      <p className="public-note">Trial access begins only after an invited workspace explicitly starts it. A request alone does not start a trial or payment.</p>
    </StorySection>
    <PublicCta title="Bring one workflow into focus." description="Tell us what your team wants to move first." />
  </PublicSiteFrame>;
}
