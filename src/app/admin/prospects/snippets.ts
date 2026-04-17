export type ProspectSnippetLanguage = "en" | "nl";
export type ProspectSnippetLane = "all" | "build" | "systems" | "growth";
export type ProspectSnippetCategory =
  | "website_trust_opener"
  | "conversion_next_step_opener"
  | "systems_follow_up_opener"
  | "growth_demand_capture_opener"
  | "local_service_opener"
  | "agency_peer_opener"
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
  useCase: string;
  body: string;
};

export const PROSPECT_SNIPPET_CATEGORY_LABELS: Record<
  ProspectSnippetCategory,
  string
> = {
  website_trust_opener: "Website / trust opener",
  conversion_next_step_opener: "Conversion / next-step opener",
  systems_follow_up_opener: "Systems / follow-up opener",
  growth_demand_capture_opener: "Growth / demand-capture opener",
  local_service_opener: "Local service opener",
  agency_peer_opener: "Agency / peer opener",
  follow_up_1: "Follow-up 1",
  follow_up_2: "Follow-up 2",
  soft_bump: "Soft bump",
  referral_ask: "Referral ask",
  not_now_follow_up: '"Not now" follow-up',
};

export const PROSPECT_SNIPPETS: ProspectSnippet[] = [
  {
    id: "en-website-trust-opener",
    language: "en",
    lane: "build",
    category: "website_trust_opener",
    label: "Trust-first intro",
    useCase: "Use when the site feels credible but trust proof is light near key actions.",
    body:
      "Hi {first_name}, quick reason for reaching out. From the outside, {company} looks established, but the trust layer around the website's key actions feels thinner than expected. If useful, I can send 3 practical upgrades you can apply without a full rebuild.",
  },
  {
    id: "en-conversion-next-step-opener",
    language: "en",
    lane: "build",
    category: "conversion_next_step_opener",
    label: "Next-step clarity intro",
    useCase: "Use when the offer is clear but the next action is easy to miss.",
    body:
      "Hi {first_name}, I took a quick look at {company}. The offer comes across clearly, but the next step feels easy to miss in a few places. If helpful, I can share a short outside-in teardown focused on smoother handoff from interest to inquiry.",
  },
  {
    id: "en-systems-follow-up-opener",
    language: "en",
    lane: "systems",
    category: "systems_follow_up_opener",
    label: "Manual follow-up intro",
    useCase: "Use when the contact path exists but follow-up likely depends on manual tracking.",
    body:
      "Hi {first_name}, reason for the message: from the outside, {company}'s contact path is present, but it is hard to tell whether follow-up is fully systemized after someone reaches out. If useful, I can send a simple sequence model that keeps responses fast without adding team overhead.",
  },
  {
    id: "en-growth-demand-capture-opener",
    language: "en",
    lane: "growth",
    category: "growth_demand_capture_opener",
    label: "Demand-capture intro",
    useCase: "Use when demand might be present but post-click flow does not convert confidence.",
    body:
      "Hi {first_name}, quick note after reviewing {company}. It does not look like a traffic issue first. The bigger opportunity seems to be what happens after interest lands on site. If helpful, I can send one focused demand-capture angle tailored to your lane.",
  },
  {
    id: "en-local-service-opener",
    language: "en",
    lane: "growth",
    category: "local_service_opener",
    label: "Local credibility intro",
    useCase: "Use for local service brands where online proof does not match offline reputation.",
    body:
      "Hi {first_name}, reaching out because {company} appears well-established, but the website does not fully carry that same confidence from a local buyer point of view. If useful, I can share a quick 3-step credibility pass for local demand capture.",
  },
  {
    id: "en-agency-peer-opener",
    language: "en",
    lane: "all",
    category: "agency_peer_opener",
    label: "Peer-to-peer intro",
    useCase: "Use when speaking with another team that already understands delivery pressure.",
    body:
      "Hi {first_name}, peer note from Inovense. We work with teams that already have a solid offer but want a cleaner conversion and follow-up layer behind it. If useful, I can send a concise breakdown of what we would tighten first on {company} from an operator perspective.",
  },
  {
    id: "en-follow-up-1",
    language: "en",
    lane: "all",
    category: "follow_up_1",
    label: "Follow-up after opener",
    useCase: "Use 2 to 4 days after first touch with low pressure.",
    body:
      "Quick follow-up in case this got buried. Happy to share the short outside-in notes for {company} if that is still useful.",
  },
  {
    id: "en-follow-up-2",
    language: "en",
    lane: "all",
    category: "follow_up_2",
    label: "Final light follow-up",
    useCase: "Use as a respectful final touch before pausing.",
    body:
      "Closing the loop from my side. If timing is off, all good. I can check back in {time_window} with one specific angle based on your current site flow.",
  },
  {
    id: "en-soft-bump",
    language: "en",
    lane: "all",
    category: "soft_bump",
    label: "One-line bump",
    useCase: "Use for short nudges when thread is quiet.",
    body:
      "Small bump in case this is relevant. I can keep it light and send just one practical observation for {company}.",
  },
  {
    id: "en-referral-ask",
    language: "en",
    lane: "all",
    category: "referral_ask",
    label: "Warm referral ask",
    useCase: "Use when contact is not owner of website or growth decisions.",
    body:
      "If this is not on your desk right now, totally fair. Is there someone on your team who owns website, conversion, or follow-up systems that I should speak with?",
  },
  {
    id: "en-not-now",
    language: "en",
    lane: "all",
    category: "not_now_follow_up",
    label: '"Not now" reply',
    useCase: "Use after they explicitly say timing is not right.",
    body:
      "Understood, thanks for the clear reply. I will pause and check back in {time_window}. If priorities shift earlier, reply here and I will send one focused recommendation only.",
  },
  {
    id: "nl-website-trust-opener",
    language: "nl",
    lane: "build",
    category: "website_trust_opener",
    label: "Trust-first intro",
    useCase: "Gebruik als de site professioneel oogt maar vertrouwen rond acties dun blijft.",
    body:
      "Hi {first_name}, korte reden voor mijn bericht. Van buitenaf oogt {company} sterk, maar rond de belangrijkste acties voelt de trust-laag op de site dunner dan je zou verwachten. Als je wilt, stuur ik 3 praktische verbeteringen zonder volledige rebuild.",
  },
  {
    id: "nl-conversion-next-step-opener",
    language: "nl",
    lane: "build",
    category: "conversion_next_step_opener",
    label: "Next-step duidelijkheid",
    useCase: "Gebruik als aanbod duidelijk is maar de volgende stap niet scherp genoeg is.",
    body:
      "Hi {first_name}, ik heb {company} kort bekeken. Het aanbod komt goed over, maar de volgende stap is op een paar plekken makkelijk te missen. Als je wilt, stuur ik een compacte outside-in breakdown om de stap van interesse naar contact strakker te maken.",
  },
  {
    id: "nl-systems-follow-up-opener",
    language: "nl",
    lane: "systems",
    category: "systems_follow_up_opener",
    label: "Follow-up systeem intro",
    useCase: "Gebruik als contactmogelijkheid er is, maar opvolging waarschijnlijk handmatig blijft.",
    body:
      "Hi {first_name}, reden voor mijn bericht: van buitenaf is er bij {company} wel een contactpad zichtbaar, maar niet duidelijk of opvolging daarna echt systematisch loopt. Als je wilt, stuur ik een simpel model voor snelle opvolging zonder extra teamdruk.",
  },
  {
    id: "nl-growth-demand-capture-opener",
    language: "nl",
    lane: "growth",
    category: "growth_demand_capture_opener",
    label: "Demand-capture intro",
    useCase: "Gebruik als verkeer mogelijk niet het probleem is, maar de post-click flow wel.",
    body:
      "Hi {first_name}, korte observatie na het bekijken van {company}. Het lijkt minder een traffic-vraagstuk en meer wat er na interesse gebeurt op de site. Als je wilt, stuur ik een scherpe demand-capture invalshoek voor jullie situatie.",
  },
  {
    id: "nl-local-service-opener",
    language: "nl",
    lane: "growth",
    category: "local_service_opener",
    label: "Lokale service intro",
    useCase: "Gebruik voor lokale servicebedrijven waar online bewijs achterblijft bij reputatie.",
    body:
      "Hi {first_name}, ik stuur dit omdat {company} als lokaal bedrijf sterk overkomt, maar de website diezelfde zekerheid voor nieuwe bezoekers nog niet volledig draagt. Als je wilt, deel ik een korte 3-stappen pass voor lokale geloofwaardigheid en aanvraagflow.",
  },
  {
    id: "nl-agency-peer-opener",
    language: "nl",
    lane: "all",
    category: "agency_peer_opener",
    label: "Peer-to-peer intro",
    useCase: "Gebruik bij teams die al deliverydruk kennen en een scherp operator-gesprek waarderen.",
    body:
      "Hi {first_name}, peer-bericht vanuit Inovense. Wij helpen teams met een sterk aanbod om de conversie- en follow-uplaag strakker neer te zetten. Als je wilt, stuur ik een korte operator-breakdown van wat we als eerste zouden aanscherpen bij {company}.",
  },
  {
    id: "nl-follow-up-1",
    language: "nl",
    lane: "all",
    category: "follow_up_1",
    label: "Follow-up na opener",
    useCase: "Gebruik 2 tot 4 dagen na eerste bericht, laagdrempelig.",
    body:
      "Korte follow-up voor het geval dit ondergesneeuwd is. Ik stuur graag de korte outside-in notities voor {company} als dat nog relevant is.",
  },
  {
    id: "nl-follow-up-2",
    language: "nl",
    lane: "all",
    category: "follow_up_2",
    label: "Laatste lichte follow-up",
    useCase: "Gebruik als laatste check-in voordat je pauzeert.",
    body:
      "Ik rond het vanuit mijn kant even af. Als timing nu niet goed is, helemaal prima. Dan check ik over {time_window} nog een keer in met een gerichte suggestie.",
  },
  {
    id: "nl-soft-bump",
    language: "nl",
    lane: "all",
    category: "soft_bump",
    label: "Korte bump",
    useCase: "Gebruik als korte nudge in een stille thread.",
    body:
      "Kleine bump, puur als dit nog speelt. Ik houd het graag kort met 1 concrete observatie voor {company}.",
  },
  {
    id: "nl-referral-ask",
    language: "nl",
    lane: "all",
    category: "referral_ask",
    label: "Warme doorverwijzing",
    useCase: "Gebruik als je contactpersoon niet over website of growth beslist.",
    body:
      "Als dit niet op jouw bord ligt, geen probleem. Is er iemand in het team die website, conversie of follow-up systemen beheert met wie ik beter kan schakelen?",
  },
  {
    id: "nl-not-now",
    language: "nl",
    lane: "all",
    category: "not_now_follow_up",
    label: '"Niet nu" reply',
    useCase: "Gebruik nadat ze duidelijk aangeven dat timing niet past.",
    body:
      "Helder, dank voor je duidelijke reactie. Ik zet het op pauze en kom over {time_window} nog een keer terug. Als het eerder speelt, laat het hier weten en dan reageer ik gericht.",
  },
];
