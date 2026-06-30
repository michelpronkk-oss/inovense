export const INOVENSE_URL = "https://inovense.com";
export const INOVENSE_NAME = "Auterim";
export const INOVENSE_ORGANIZATION_ID = `${INOVENSE_URL}/#organization`;
export const INOVENSE_WEBSITE_ID = `${INOVENSE_URL}/#website`;

export const INOVENSE_OS_DESCRIPTION =
  "The operating layer for autonomous AI agents. Structured agents, policy enforcement, persistent memory, and human approval gates. Built for serious operators.";

export const INOVENSE_DESCRIPTION =
  "Auterim connects to your tools, monitors what matters, and lets agents execute safely across your business.";

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
    question: "What does Auterim do?",
    answer:
      "Auterim connects to your tools, monitors what matters, and lets agents execute safely across your business.",
  },
  {
    question: "What is the difference between Build, Systems, and Growth?",
    answer:
      "Build fixes websites that don't convert. Systems removes manual bottlenecks. Growth builds SEO, content, and paid media that compound.",
  },
  {
    question: "Who is Auterim for?",
    answer:
      "Operators and teams that want AI agents to prepare and run real work under clear policy and approval controls.",
  },
  {
    question: "When should a company invest in systems or automation?",
    answer:
      "When manual coordination is slowing you down, leads are leaking, or your tools aren't connected.",
  },
  {
    question:
      "When is a website problem actually a trust or conversion problem?",
    answer:
      "When traffic exists but conversions are low, the issue is usually trust, clarity, or conversion flow.",
  },
  {
    question: "When does growth fail because the system leaks?",
    answer:
      "When capture, routing, and follow-up are disconnected, more traffic just magnifies the leaks.",
  },
  {
    question: "What kind of teams are the best fit for Auterim?",
    answer:
      "Teams that value autonomous execution, serious controls, connected workstreams, and a clean audit trail.",
  },
] as const;

export function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
