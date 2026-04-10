import { z } from "zod";

const typographyBeatSchema = z.object({
  kicker: z.string().min(1),
  headline: z.string().min(1),
  subline: z.string().optional(),
  accentText: z.string().optional(),
});

const serviceItemSchema = z.object({
  name: z.string().min(1),
  detail: z.string().min(1),
  metric: z.string().optional(),
});

const outroSchema = z.object({
  headline: z.string().min(1),
  subline: z.string().min(1),
  action: z.string().min(1),
});

export const inovenseTrailerSchema = z.object({
  opener: typographyBeatSchema,
  statement: typographyBeatSchema,
  services: z.array(serviceItemSchema).min(3).max(5),
  outro: outroSchema,
});

export type InovenseTrailerProps = z.infer<typeof inovenseTrailerSchema>;

export const inovenseServicesTeaserSchema = z.object({
  opener: typographyBeatSchema,
  services: z.array(serviceItemSchema).min(3).max(6),
  outro: outroSchema,
});

export type InovenseServicesTeaserProps = z.infer<typeof inovenseServicesTeaserSchema>;

export const inovenseLaunchFilmSchema = z.object({
  opener: typographyBeatSchema,
  statement: typographyBeatSchema,
  caseBeat: typographyBeatSchema,
  services: z.array(serviceItemSchema).min(3).max(6),
  outro: outroSchema,
});

export type InovenseLaunchFilmProps = z.infer<typeof inovenseLaunchFilmSchema>;

export const inovenseTrailerSample: InovenseTrailerProps = {
  opener: {
    kicker: "Inovense",
    headline: "Digital infrastructure with cinematic execution.",
    subline: "Built for brands and operators that value precision.",
    accentText: "cinematic",
  },
  statement: {
    kicker: "Motion system",
    headline: "From strategy to launch, every frame carries intent.",
    subline:
      "No generic content templates. Just premium typography, system rhythm, and controlled motion.",
    accentText: "intent",
  },
  services: [
    {
      name: "Build",
      detail: "Premium web systems and conversion architecture.",
      metric: "01",
    },
    {
      name: "Systems",
      detail: "Operator-grade internal tooling and intelligence workflows.",
      metric: "02",
    },
    {
      name: "Growth",
      detail: "Commercial engines with stronger tracking and better handoff.",
      metric: "03",
    },
  ],
  outro: {
    headline: "Ready for your next launch film.",
    subline: "Inovense designs and ships premium digital systems.",
    action: "inovense.com/intake",
  },
};

export const inovenseServicesTeaserSample: InovenseServicesTeaserProps = {
  opener: {
    kicker: "Service teaser",
    headline: "Three lanes. One execution standard.",
    subline: "Built for teams that need clarity, speed, and quality.",
    accentText: "execution",
  },
  services: [
    {
      name: "Build",
      detail: "SaaS and Shopify experiences engineered for trust.",
      metric: "01",
    },
    {
      name: "Systems",
      detail: "Internal software and AI workflows teams use every day.",
      metric: "02",
    },
    {
      name: "Growth",
      detail: "Lead generation systems with clean routing and follow-up.",
      metric: "03",
    },
  ],
  outro: {
    headline: "Choose your lane. Keep one standard.",
    subline: "Inovense keeps strategy, design, and execution in one system.",
    action: "Book intake",
  },
};

export const inovenseLaunchFilmSample: InovenseLaunchFilmProps = {
  opener: {
    kicker: "Launch film",
    headline: "Premium digital products need premium motion systems.",
    subline: "Inovense creates campaigns that feel as strong as the product itself.",
    accentText: "premium",
  },
  statement: {
    kicker: "Quality benchmark",
    headline: "Design language, product logic, and storytelling in sync.",
    subline: "One direction from landing page to paid creative.",
    accentText: "sync",
  },
  caseBeat: {
    kicker: "Case signal",
    headline: "SilentSpend. Global monetization intelligence.",
    subline:
      "A high-trust decision layer for pricing movement, packaging shifts, and paywall change signals.",
    accentText: "SilentSpend",
  },
  services: [
    {
      name: "Poster scenes",
      detail: "Image-led compositions with oversized type and cleaner hierarchy.",
      metric: "A1",
    },
    {
      name: "Campaign CTA",
      detail: "Hard offer frames for paid creative and direct response moments.",
      metric: "A2",
    },
    {
      name: "Proof visuals",
      detail: "Result-first layouts that turn outcomes into premium trust assets.",
      metric: "A3",
    },
  ],
  outro: {
    headline: "Ship your next flagship campaign with Inovense.",
    subline: "From concept to launch film. One premium execution layer.",
    action: "Start at inovense.com/intake",
  },
};

