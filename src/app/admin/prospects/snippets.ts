export type ProspectSnippetLanguage = "en" | "nl";
export type ProspectSnippetLane = "all" | "build" | "systems" | "growth";
export type ProspectSnippetCategory =
  | "website_opener"
  | "systems_opener"
  | "growth_opener"
  | "follow_up_1"
  | "follow_up_2"
  | "soft_bump"
  | "referral_ask"
  | "not_now_follow_up";

export type ProspectSnippet = {
  id: string;
  language: ProspectSnippetLanguage;
  lane: ProspectSnippetLane;
  category: ProspectSnippetCategory;
  label: string;
  body: string;
};

export const PROSPECT_SNIPPET_CATEGORY_LABELS: Record<
  ProspectSnippetCategory,
  string
> = {
  website_opener: "Website opener",
  systems_opener: "Systems opener",
  growth_opener: "Growth opener",
  follow_up_1: "Follow-up 1",
  follow_up_2: "Follow-up 2",
  soft_bump: "Soft bump",
  referral_ask: "Referral ask",
  not_now_follow_up: '"Not now" follow-up',
};

export const PROSPECT_SNIPPETS: ProspectSnippet[] = [
  {
    id: "en-website-opener-1",
    language: "en",
    lane: "build",
    category: "website_opener",
    label: "Build opener",
    body:
      "Hi {first_name}, quick note from Inovense. I reviewed {company} and saw clear potential to tighten conversion flow and trust structure on the site. If useful, I can send a short 3-point breakdown with the highest-impact fixes.",
  },
  {
    id: "en-systems-opener-1",
    language: "en",
    lane: "systems",
    category: "systems_opener",
    label: "Systems opener",
    body:
      "Hi {first_name}, we help teams remove manual drag from lead and proposal workflows. If {company} is currently juggling follow-up by hand, I can send a concise systems outline with practical next steps.",
  },
  {
    id: "en-growth-opener-1",
    language: "en",
    lane: "growth",
    category: "growth_opener",
    label: "Growth opener",
    body:
      "Hi {first_name}, I looked at {company}'s funnel and saw room to improve handoff from traffic to qualified calls. If helpful, I can share a short growth systems angle tailored to your current setup.",
  },
  {
    id: "en-follow-up-1",
    language: "en",
    lane: "all",
    category: "follow_up_1",
    label: "Follow-up 1",
    body:
      "Quick follow-up in case this got buried. Happy to send the concise breakdown for {company} if timing is right.",
  },
  {
    id: "en-follow-up-2",
    language: "en",
    lane: "all",
    category: "follow_up_2",
    label: "Follow-up 2",
    body:
      "Second follow-up from my side. If now is not ideal, no problem. I can circle back next month with one sharper recommendation based on your current priorities.",
  },
  {
    id: "en-soft-bump",
    language: "en",
    lane: "all",
    category: "soft_bump",
    label: "Soft bump",
    body:
      "Just bumping this once in case relevant. If you'd like, I can keep it lightweight and send only one practical angle for {company}.",
  },
  {
    id: "en-referral-ask",
    language: "en",
    lane: "all",
    category: "referral_ask",
    label: "Referral ask",
    body:
      "If this is not a fit for you right now, totally fair. Is there someone on your team or in your network who handles website/systems execution and might find this useful?",
  },
  {
    id: "en-not-now",
    language: "en",
    lane: "all",
    category: "not_now_follow_up",
    label: '"Not now" response',
    body:
      "Understood, thanks for the clear response. I will pause outreach and check back in {time_window}. If priorities shift earlier, feel free to reply and I will send a focused angle.",
  },
  {
    id: "nl-website-opener-1",
    language: "nl",
    lane: "build",
    category: "website_opener",
    label: "Build opener",
    body:
      "Hi {first_name}, korte intro vanuit Inovense. Ik heb {company} bekeken en zie duidelijke kansen om de site strakker te maken voor vertrouwen en conversie. Als je wilt, stuur ik een korte 3-punts analyse.",
  },
  {
    id: "nl-systems-opener-1",
    language: "nl",
    lane: "systems",
    category: "systems_opener",
    label: "Systems opener",
    body:
      "Hi {first_name}, wij helpen teams om handmatige workflow-ruis weg te halen in lead- en opvolgprocessen. Als {company} dit nu vooral handmatig doet, kan ik een korte systems-richting delen.",
  },
  {
    id: "nl-growth-opener-1",
    language: "nl",
    lane: "growth",
    category: "growth_opener",
    label: "Growth opener",
    body:
      "Hi {first_name}, ik zie bij {company} waarschijnlijk ruimte om traffic beter door te zetten naar gekwalificeerde gesprekken. Als je wilt stuur ik een compacte groeiaanpak op maat.",
  },
  {
    id: "nl-follow-up-1",
    language: "nl",
    lane: "all",
    category: "follow_up_1",
    label: "Follow-up 1",
    body:
      "Korte follow-up voor het geval dit ondergesneeuwd is. Als timing goed is, stuur ik direct de compacte analyse.",
  },
  {
    id: "nl-follow-up-2",
    language: "nl",
    lane: "all",
    category: "follow_up_2",
    label: "Follow-up 2",
    body:
      "Nog een follow-up van mijn kant. Als nu niet het juiste moment is, helemaal prima. Dan plan ik een nieuwe check-in over {time_window}.",
  },
  {
    id: "nl-soft-bump",
    language: "nl",
    lane: "all",
    category: "soft_bump",
    label: "Soft bump",
    body:
      "Kleine bump, puur omdat het mogelijk relevant is. Als je wilt houd ik het heel kort met een concrete aanbeveling voor {company}.",
  },
  {
    id: "nl-referral-ask",
    language: "nl",
    lane: "all",
    category: "referral_ask",
    label: "Referral ask",
    body:
      "Als dit nu niet past, geen probleem. Is er iemand in je team of netwerk die website/systems-executie oppakt en voor wie dit wel relevant kan zijn?",
  },
  {
    id: "nl-not-now",
    language: "nl",
    lane: "all",
    category: "not_now_follow_up",
    label: '"Niet nu" response',
    body:
      "Helder, dank voor je reactie. Ik zet het op pauze en kom over {time_window} nog een keer terug. Als het eerder speelt, laat het weten.",
  },
];
