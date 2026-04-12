import { z } from "zod";

const stepSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
});

export const statementVideoSchema = z.object({
  tag: z.string().min(1),
  hook: z.string().min(1),
  subline: z.string().optional(),
  beats: z.array(z.string().min(1)).min(1).max(4),
  endHeadline: z.string().min(1),
  endSubline: z.string().min(1),
  cta: z.string().min(1),
});

export type StatementVideoProps = z.infer<typeof statementVideoSchema>;

export const processExplainerVideoSchema = z.object({
  tag: z.string().min(1),
  headline: z.string().min(1),
  subline: z.string().optional(),
  steps: z.array(stepSchema).min(4).max(5),
  endHeadline: z.string().min(1),
  endSubline: z.string().min(1),
  cta: z.string().min(1),
});

export type ProcessExplainerVideoProps = z.infer<
  typeof processExplainerVideoSchema
>;

export const proofResultVideoSchema = z.object({
  tag: z.string().min(1),
  hook: z.string().min(1),
  context: z.string().min(1),
  interventions: z.array(z.string().min(1)).min(2).max(4),
  outcomeLabel: z.string().min(1),
  outcome: z.string().min(1),
  endHeadline: z.string().min(1),
  cta: z.string().min(1),
});

export type ProofResultVideoProps = z.infer<typeof proofResultVideoSchema>;

export const ugcOverlayVideoSchema = z.object({
  tag: z.string().min(1),
  hook: z.string().min(1),
  supportingBeat: z.string().min(1),
  cta: z.string().min(1),
  endNote: z.string().min(1),
  videoSrc: z.string().min(1).optional(),
  overlayStrength: z.number().min(0.2).max(1).optional(),
});

export type UgcOverlayVideoProps = z.infer<typeof ugcOverlayVideoSchema>;

export const statementVideoSample: StatementVideoProps = {
  tag: "Authority",
  hook: "Most companies do not\nneed more tools.",
  subline: "They need cleaner systems and stronger execution rhythm.",
  beats: [
    "Your website should carry trust before it asks for action.",
    "Stop scaling manual workflows.",
    "Execution quality is the growth multiplier.",
  ],
  endHeadline: "Build. Systems. Growth.",
  endSubline: "Premium digital execution for serious operators.",
  cta: "inovense.com/intake",
};

export const processExplainerVideoSample: ProcessExplainerVideoProps = {
  tag: "Process",
  headline: "From strategy to launch,\none clear operating flow.",
  subline: "Built for clean handoff and repeatable quality.",
  steps: [
    { title: "Strategy", detail: "Positioning and offer clarity." },
    { title: "Structure", detail: "Information architecture and flow." },
    { title: "Design", detail: "Interface direction and trust layers." },
    { title: "Build", detail: "Production implementation and QA." },
    { title: "Launch", detail: "Go-live, reporting, and iteration loop." },
  ],
  endHeadline: "Process quality is product quality.",
  endSubline: "No chaos. No guesswork. No loose handoffs.",
  cta: "Start a project",
};

export const proofResultVideoSample: ProofResultVideoProps = {
  tag: "Proof",
  hook: "From weak handoff\nto stronger pipeline control.",
  context:
    "A service operator with enough demand, but too much manual drag in follow-up.",
  interventions: [
    "Lead routing ownership was rebuilt in CRM.",
    "Proposal and payment events triggered clean follow-up steps.",
    "Weekly review loop tied decisions to real signal.",
  ],
  outcomeLabel: "Result in 7 weeks",
  outcome: "+38% qualified calls",
  endHeadline: "Proof over promise.",
  cta: "Discuss your systems",
};

export const ugcOverlayVideoSample: UgcOverlayVideoProps = {
  tag: "UGC Overlay",
  hook: "Stop scaling manual workflows.",
  supportingBeat: "Build a system that keeps moving when your team gets busy.",
  cta: "Start a project",
  endNote: "Inovense | Web. Systems. Growth.",
  overlayStrength: 0.74,
};
