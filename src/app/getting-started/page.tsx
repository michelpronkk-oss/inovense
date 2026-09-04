import type { Metadata } from "next";
import { appHref } from "@/lib/urls";
import { StrategicPage } from "@/components/home-v3/strategic-page";

export const metadata: Metadata = {
  title: "Getting Started with Auterim | AI Workforce Preview",
  description: "Start with your company context, preview the right Auterim operators and connect systems when you are ready.",
  alternates: { canonical: "https://auterim.com/getting-started" },
  openGraph: { url: "https://auterim.com/getting-started", siteName: "Auterim", title: "Getting Started with Auterim", description: "Start with company context. Connect systems when you are ready.", type: "website", images: [{ url: "/og/og-getting-started.png", width: 1200, height: 630, alt: "Getting started with Auterim" }] },
  twitter: { card: "summary_large_image", title: "Getting Started with Auterim", description: "Start with company context. Connect systems when you are ready.", images: [{ url: "/og/og-getting-started.png", width: 1200, height: 630, alt: "Getting started with Auterim" }] },
};

export default function GettingStartedPage() { return <StrategicPage eyebrow="Start with your company" title="Start with context. Connect systems when you are ready." intro="Preview builds a practical company profile and recommends a first workforce before any external action is enabled. When the fit is clear, connect the systems your team already uses." cta={{ label: "Start preview", href: appHref("/app/onboarding"), secondaryLabel: "See the platform", secondaryHref: "/#platform" }} sections={[
  { label: "01 / Connect", title: "Bring the starting point you already have.", body: "Begin with your website and operating context. Add Gmail, HubSpot, Google Calendar, Slack or other supported systems only when they are useful to the first operator.", links: [{ label: "Integrations", href: "/integrations" }] },
  { label: "02 / Understand", title: "See what Auterim can work from.", body: "Your profile makes company facts, tools, goals and approval owners explicit. Missing information stays visible instead of becoming a guess.", links: [{ label: "Company memory", href: "/memory" }] },
  { label: "03 / Recommend", title: "Choose the work before choosing the workforce.", body: "Auterim points to delayed, repeated or high-leverage work and explains which operator is a fit, so deployment starts with a job rather than a blank canvas.", links: [{ label: "Use cases", href: "/use-cases" }, { label: "Operator registry", href: "/operators" }] },
  { label: "04 / Deploy", title: "Let the operator prepare the next move.", body: "Deploy a defined role into a controlled workflow. It uses the context and connectors you authorize, while sensitive actions remain behind your policy boundary.", links: [{ label: "Workflows", href: "/workflows" }, { label: "Approvals", href: "/approvals" }] },
]} />; }
