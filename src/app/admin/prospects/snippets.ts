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
    useCase: "Use when the site looks professional but has little proof near the contact or enquiry point.",
    body:
      "Hi {first_name},\n\nI looked through the {company} website this week and had one observation worth sharing.\n\nThe site reads well and the work looks credible, but right near the main contact point there is not much that helps someone who is on the fence make a decision. No short testimonial, no recent project signal, nothing that closes the hesitation gap before they reach out.\n\nI am with Inovense. We help businesses improve websites, systems, and lead generation.\n\nIf it is useful, I can send three small things you could test without touching the rest of the site.",
  },
  {
    id: "en-conversion-next-step-opener",
    language: "en",
    lane: "build",
    category: "conversion_next_step_opener",
    label: "Next-step clarity intro",
    useCase: "Use when the offer is clear but the path to contact is easy to drift past.",
    body:
      "Hi {first_name},\n\nI had a look at the {company} website this week and noticed one thing.\n\nWhat you offer is easy to understand, but the path from interested to actually reaching out is not as obvious as it could be. On a few pages the interest lands and then there is no clear nudge to take a next step.\n\nI am with Inovense. We help businesses improve websites, systems, and lead generation.\n\nIf helpful, I can send a short outside-in note on where that step falls away and what to try first.",
  },
  {
    id: "en-systems-follow-up-opener",
    language: "en",
    lane: "systems",
    category: "systems_follow_up_opener",
    label: "Manual follow-up intro",
    useCase: "Use when the contact path exists but response and follow-up likely run on manual timing.",
    body:
      "Hi {first_name},\n\nI looked at {company} from the outside and had one practical observation.\n\nThere is a contact form and it works, but there is no visible sign of what happens after someone submits it. From outside it looks like replies may be handled manually, which makes response time depend on what else is going on that day.\n\nI am with Inovense. We help businesses improve websites, systems, and lead generation.\n\nIf useful, I can share a simple follow-up structure that keeps replies going out consistently without adding a lot of new process.",
  },
  {
    id: "en-growth-demand-capture-opener",
    language: "en",
    lane: "growth",
    category: "growth_demand_capture_opener",
    label: "Demand-capture intro",
    useCase: "Use when the site gets people to the right place but does not pull them toward action.",
    body:
      "Hi {first_name},\n\nI spent some time on the {company} website this week and wanted to share one observation.\n\nThe site brings people to the right place, but once someone is interested there is not much that holds them or pushes them toward taking a step. The content is there, but the pull toward action is light.\n\nI am with Inovense. We help businesses improve websites, systems, and lead generation.\n\nIf it is useful, I can share one concrete thing to test that addresses the gap between someone being interested and actually getting in touch.",
  },
  {
    id: "en-local-service-opener",
    language: "en",
    lane: "growth",
    category: "local_service_opener",
    label: "Local credibility intro",
    useCase: "Use for local service businesses where the site does not build enough trust before the enquiry step.",
    body:
      "Hi {first_name},\n\nI came across {company} this week and had one note.\n\nFor someone who does not know you yet, the site reads fine, but it does not do much to close the gap between looks okay and I will call them. There is no strong local proof near the contact section, and the enquiry path is easy to skip past.\n\nI am with Inovense. We help service businesses turn more website visitors into real enquiries.\n\nIf useful, I can send a short three-step pass to strengthen that first-impression trust and make the enquiry path harder to miss.",
  },
  {
    id: "en-agency-peer-opener",
    language: "en",
    lane: "all",
    category: "agency_peer_opener",
    label: "Peer-to-peer intro",
    useCase: "Use when speaking to another operator or agency who understands delivery and does not need a pitch.",
    body:
      "Hi {first_name},\n\nOne operator to another after looking at {company} this week.\n\nThe offer is solid and the positioning is clear. Where I think there is room is in the gap between someone showing interest and actually getting in touch. A couple of small things on the site and in follow-up could tighten that loop.\n\nI am with Inovense. We work with businesses on websites, systems, and lead generation.\n\nIf useful, I can share a short breakdown of what I would look at first. No pitch deck, just a direct note.",
  },
  {
    id: "en-follow-up-1",
    language: "en",
    lane: "all",
    category: "follow_up_1",
    label: "Follow-up after opener",
    useCase: "Use 2 to 4 days after first touch. Keep it short and no-pressure.",
    body:
      "Hi {first_name},\n\nQuick follow-up in case my earlier message got lost.\n\nI can still send the outside-in notes for {company} if useful. Happy to keep it short and practical.",
  },
  {
    id: "en-follow-up-2",
    language: "en",
    lane: "all",
    category: "follow_up_2",
    label: "Final light follow-up",
    useCase: "Use as a respectful last message before pausing outreach.",
    body:
      "Hi {first_name},\n\nI will leave it here after this one.\n\nIf the timing is not right, that is completely fine. I can check back in {time_window} with one specific idea relevant to where you are at that point.",
  },
  {
    id: "en-soft-bump",
    language: "en",
    lane: "all",
    category: "soft_bump",
    label: "One-line bump",
    useCase: "Use for a short nudge when a thread has gone quiet.",
    body:
      "Hi {first_name},\n\nBumping this in case it is still relevant.\n\nHappy to keep it brief and send one practical note for {company}.",
  },
  {
    id: "en-referral-ask",
    language: "en",
    lane: "all",
    category: "referral_ask",
    label: "Warm referral ask",
    useCase: "Use when the contact is not the decision-maker for website or growth.",
    body:
      "Hi {first_name},\n\nIf this is not something you deal with directly, no problem at all.\n\nIs there someone on your team who looks after the website, conversion, or follow-up side of things that I should speak with instead?",
  },
  {
    id: "en-not-now",
    language: "en",
    lane: "all",
    category: "not_now_follow_up",
    label: '"Not now" reply',
    useCase: "Use after they explicitly say the timing is not right.",
    body:
      "Understood, thanks for letting me know.\n\nI will pause and circle back in {time_window}.\n\nIf anything shifts before then, just reply here and I will send something specific.",
  },
  {
    id: "nl-website-trust-opener",
    language: "nl",
    lane: "build",
    category: "website_trust_opener",
    label: "Trust-first intro",
    useCase: "Gebruik als de site professioneel oogt maar bewijs of vertrouwen vlak bij het contactpunt dun blijft.",
    body:
      "Hi {first_name},\n\nIk ben deze week door de website van {company} gegaan en had één observatie die ik wilde delen.\n\nDe site oogt professioneel en het werk ziet er sterk uit, maar vlak bij het contactpunt is er weinig dat iemand over de streep haalt die nog twijfelt. Geen korte klantreactie, geen recent projectsignaal, niets dat die aarzeling wegneemt net voordat iemand beslist om contact op te nemen.\n\nIk ben van Inovense. Wij helpen bedrijven hun website, systemen en leadgeneratie verbeteren.\n\nAls je wilt, stuur ik drie kleine verbeteringen die je kunt testen zonder de rest van de site aan te raken.",
  },
  {
    id: "nl-conversion-next-step-opener",
    language: "nl",
    lane: "build",
    category: "conversion_next_step_opener",
    label: "Next-step duidelijkheid",
    useCase: "Gebruik als het aanbod duidelijk is maar de stap naar contact makkelijk wordt overgeslagen.",
    body:
      "Hi {first_name},\n\nIk heb deze week de website van {company} bekeken en één ding viel op.\n\nWat jullie aanbieden is goed te begrijpen, maar de stap van geinteresseerd naar daadwerkelijk contact opnemen is niet zo helder als hij zou kunnen zijn. Op een paar pagina's landt de interesse, maar er is geen duidelijke aanleiding om verder te gaan.\n\nIk ben van Inovense. Wij helpen bedrijven hun website, systemen en leadgeneratie verbeteren.\n\nAls het helpt, stuur ik een korte notitie over waar die stap wegvalt en wat je als eerste kunt proberen.",
  },
  {
    id: "nl-systems-follow-up-opener",
    language: "nl",
    lane: "systems",
    category: "systems_follow_up_opener",
    label: "Follow-up systeem intro",
    useCase: "Gebruik als het contactpad er is maar reacties en opvolging waarschijnlijk handmatig lopen.",
    body:
      "Hi {first_name},\n\nIk heb {company} van buitenaf bekeken en had één praktische observatie.\n\nEr is een contactmogelijkheid en die werkt, maar er is geen zichtbaar teken van wat er daarna gebeurt. Van buiten ziet het eruit alsof reacties handmatig worden opgepakt, waardoor timing afhankelijk is van wat er op dat moment verder speelt.\n\nIk ben van Inovense. Wij helpen bedrijven hun website, systemen en leadgeneratie verbeteren.\n\nAls je wilt, stuur ik een eenvoudig opvolgmodel dat zorgt dat reacties op tijd uitgaan zonder veel extra proces.",
  },
  {
    id: "nl-growth-demand-capture-opener",
    language: "nl",
    lane: "growth",
    category: "growth_demand_capture_opener",
    label: "Demand-capture intro",
    useCase: "Gebruik als de site mensen op de juiste plek brengt maar niet naar een actie trekt.",
    body:
      "Hi {first_name},\n\nIk heb deze week wat tijd op de website van {company} doorgebracht en wilde één observatie delen.\n\nDe site brengt mensen op de goede plek, maar als iemand eenmaal interesse heeft is er weinig dat hen vasthoudt of naar een volgende stap trekt. De inhoud is er, maar de pull richting actie is licht.\n\nIk ben van Inovense. Wij helpen bedrijven hun website, systemen en leadgeneratie verbeteren.\n\nAls het nuttig is, stuur ik één concreet idee om te testen dat de kloof tussen interesse en actie kleiner maakt.",
  },
  {
    id: "nl-local-service-opener",
    language: "nl",
    lane: "growth",
    category: "local_service_opener",
    label: "Lokale service intro",
    useCase: "Gebruik voor lokale servicebedrijven waar de site onvoldoende vertrouwen opbouwt voor de aanvraagstap.",
    body:
      "Hi {first_name},\n\nIk ben deze week op de website van {company} terechtgekomen en had één observatie.\n\nVoor iemand die jullie nog niet kent, leest de site prima, maar er is niet veel dat de stap van ziet er goed uit naar ik bel ze even makkelijker maakt. Sterk lokaal bewijs ontbreekt vlak bij het contactgedeelte, en het aanvraagpad is makkelijk te missen.\n\nIk ben van Inovense. Wij helpen servicebedrijven meer serieuze aanvragen halen uit bestaande websitebezoekers.\n\nAls je wilt, stuur ik een korte drie-stappen aanpak om dat eerste vertrouwen te versterken en het aanvraagpad duidelijker te maken.",
  },
  {
    id: "nl-agency-peer-opener",
    language: "nl",
    lane: "all",
    category: "agency_peer_opener",
    label: "Peer-to-peer intro",
    useCase: "Gebruik bij teams die delivery kennen en geen verkooppitch nodig hebben.",
    body:
      "Hi {first_name},\n\nOperator-bericht na een korte blik op {company} deze week.\n\nHet aanbod staat sterk en de positionering is helder. Waar ik ruimte zie is in de overgang tussen interesse tonen en daadwerkelijk contact opnemen. Een paar kleine dingen op de site en in de opvolging kunnen die stap korter maken.\n\nIk ben van Inovense. Wij werken met bedrijven aan websites, systemen en leadgeneratie.\n\nAls je wilt, stuur ik een korte breakdown van wat ik als eerste zou bekijken. Geen verkooppraatje, gewoon een directe notitie.",
  },
  {
    id: "nl-follow-up-1",
    language: "nl",
    lane: "all",
    category: "follow_up_1",
    label: "Follow-up na opener",
    useCase: "Gebruik 2 tot 4 dagen na eerste bericht. Kort en laagdrempelig.",
    body:
      "Hi {first_name},\n\nKorte follow-up voor het geval mijn eerdere bericht kwijt is geraakt.\n\nIk kan de outside-in notities voor {company} alsnog sturen als dat nuttig is. Ik houd het kort en praktisch.",
  },
  {
    id: "nl-follow-up-2",
    language: "nl",
    lane: "all",
    category: "follow_up_2",
    label: "Laatste lichte follow-up",
    useCase: "Gebruik als laatste bericht voordat je pauzeert.",
    body:
      "Hi {first_name},\n\nIk laat het hierna rusten.\n\nAls timing nu niet goed is, helemaal geen probleem. Ik kom over {time_window} terug met één specifiek idee dat aansluit bij waar jullie dan staan.",
  },
  {
    id: "nl-soft-bump",
    language: "nl",
    lane: "all",
    category: "soft_bump",
    label: "Korte bump",
    useCase: "Gebruik als korte nudge in een stille thread.",
    body:
      "Hi {first_name},\n\nKleine bump voor het geval dit nog relevant is.\n\nIk houd het heel kort en stuur graag één praktische observatie voor {company}.",
  },
  {
    id: "nl-referral-ask",
    language: "nl",
    lane: "all",
    category: "referral_ask",
    label: "Warme doorverwijzing",
    useCase: "Gebruik als de contactpersoon niet beslist over website of growth.",
    body:
      "Hi {first_name},\n\nAls dit niet op jouw bord ligt, helemaal geen probleem.\n\nIs er iemand in het team die website, conversie of follow-up beheert met wie ik beter kan schakelen?",
  },
  {
    id: "nl-not-now",
    language: "nl",
    lane: "all",
    category: "not_now_follow_up",
    label: '"Niet nu" reply',
    useCase: "Gebruik nadat ze duidelijk aangeven dat de timing niet past.",
    body:
      "Helder, dank voor je reactie.\n\nIk zet het op pauze en kom over {time_window} terug.\n\nAls er eerder iets verandert, reageer dan hier en ik stuur iets gericht.",
  },
];
