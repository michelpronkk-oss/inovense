export const INOVENSE_URL = "https://inovense.com";
export const INOVENSE_NAME = "Inovense";
export const INOVENSE_ORGANIZATION_ID = `${INOVENSE_URL}/#organization`;
export const INOVENSE_WEBSITE_ID = `${INOVENSE_URL}/#website`;

export const INOVENSE_DESCRIPTION =
  "Inovense builds high-performance websites, AI automation workflows, and growth systems for operators and ambitious brands.";

export const INOVENSE_LANES = [
  {
    name: "Build",
    path: "/build",
    description:
      "Custom websites and digital products focused on conversion, performance, and brand trust.",
  },
  {
    name: "Systems",
    path: "/systems",
    description:
      "Business systems, AI automation, and internal tooling for teams that need operational leverage.",
  },
  {
    name: "Growth",
    path: "/growth",
    description:
      "SEO, content, and growth execution systems designed to compound over time.",
  },
] as const;

export const INOVENSE_HOME_FAQS = [
  {
    question: "What does Inovense do?",
    answer:
      "Inovense builds digital infrastructure across three lanes: Build for websites and digital products, Systems for automation and operations, and Growth for SEO, content, and demand systems.",
  },
  {
    question: "What is the difference between Build, Systems, and Growth?",
    answer:
      "Build solves trust and conversion at the experience layer, Systems fixes operational bottlenecks and handoff failures, and Growth builds compounding acquisition and demand capture systems.",
  },
  {
    question: "Who is Inovense for?",
    answer:
      "Inovense works best with founders and operators who already have momentum and need stronger execution systems rather than generic agency output.",
  },
  {
    question: "When should a company invest in systems or automation?",
    answer:
      "When important work depends on manual coordination, response times are inconsistent, or leads and operations leak between tools, systems and automation usually create immediate leverage.",
  },
  {
    question:
      "When is a website problem actually a trust or conversion problem?",
    answer:
      "If traffic exists but qualified actions stay low, the issue is usually message clarity, conversion flow, or trust signals instead of pure traffic volume.",
  },
  {
    question: "When does growth fail because the system leaks?",
    answer:
      "Growth stalls when capture, routing, follow-up, and reporting are disconnected. In that state more traffic often magnifies waste instead of increasing pipeline quality.",
  },
  {
    question: "What kind of clients are the best fit for Inovense?",
    answer:
      "Best-fit clients value high standards, clear scope, and durable systems. They want outcomes they can own after handoff, not ongoing dependency.",
  },
] as const;

export function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
