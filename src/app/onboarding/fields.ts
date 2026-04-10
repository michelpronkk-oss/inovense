export type FieldDef = {
  key: string;
  label: string;
  type: "input" | "textarea";
  required?: boolean;
  placeholder?: string;
};

type OnboardingLocale = "en" | "nl";

export const BUILD_FIELDS: FieldDef[] = [
  {
    key: "businessSummary",
    label: "Business summary",
    type: "textarea",
    required: true,
    placeholder: "Describe your business and what you do.",
  },
  {
    key: "websiteOrSocial",
    label: "Website or social links",
    type: "input",
    placeholder: "https://...",
  },
  {
    key: "projectGoals",
    label: "Project goals",
    type: "textarea",
    required: true,
    placeholder: "What should this project achieve?",
  },
  {
    key: "primaryCta",
    label: "Primary call to action",
    type: "input",
    placeholder: "e.g. Book a call, Buy now, Get a quote",
  },
  {
    key: "targetAudience",
    label: "Target audience",
    type: "textarea",
    placeholder: "Who is this for? Describe them in detail.",
  },
  {
    key: "requestedPagesFeatures",
    label: "Requested pages or features",
    type: "textarea",
    placeholder: "List the pages, sections, or functionality you need.",
  },
  {
    key: "deadline",
    label: "Target deadline",
    type: "input",
    placeholder: "e.g. End of May 2025",
  },
  {
    key: "brandAssets",
    label: "Brand assets and preferences",
    type: "textarea",
    placeholder:
      "Logo, colors, fonts, style references, or mood board links.",
  },
  {
    key: "contentAvailability",
    label: "Content availability",
    type: "input",
    placeholder: "e.g. Copy ready, Need copywriting, Partial",
  },
  {
    key: "requiredAccessTools",
    label: "Required access or tools",
    type: "textarea",
    placeholder: "CMS, hosting, analytics, integrations, accounts...",
  },
  {
    key: "notes",
    label: "Additional notes",
    type: "textarea",
    placeholder: "Anything else we should know before we start.",
  },
];

export const SYSTEMS_FIELDS: FieldDef[] = [
  {
    key: "teamProcessOverview",
    label: "Team and process overview",
    type: "textarea",
    required: true,
    placeholder: "Describe your team and how you currently operate.",
  },
  {
    key: "currentTools",
    label: "Current tools in use",
    type: "textarea",
    placeholder: "List the software and tools your team uses day to day.",
  },
  {
    key: "currentWorkflow",
    label: "Current workflow",
    type: "textarea",
    placeholder: "Walk us through the process step by step as it works today.",
  },
  {
    key: "painPoints",
    label: "Pain points",
    type: "textarea",
    required: true,
    placeholder: "What is breaking, slow, or manual today?",
  },
  {
    key: "manualWork",
    label: "Manual work currently happening",
    type: "textarea",
    placeholder:
      "What tasks does someone do manually that should be automated?",
  },
  {
    key: "desiredOutcome",
    label: "Desired automation outcome",
    type: "textarea",
    required: true,
    placeholder: "Describe what the ideal state looks like when this is done.",
  },
  {
    key: "usersStakeholders",
    label: "Users and stakeholders",
    type: "input",
    placeholder: "Who will use or be affected by this system?",
  },
  {
    key: "logicDataRequirements",
    label: "Logic and data requirements",
    type: "textarea",
    placeholder:
      "Business rules, conditions, data fields, edge cases to handle.",
  },
  {
    key: "requiredAccessTools",
    label: "Required access or tools",
    type: "textarea",
    placeholder: "CRMs, databases, APIs, credentials, accounts...",
  },
  {
    key: "constraintsNotes",
    label: "Constraints, risks, or notes",
    type: "textarea",
    placeholder: "Deadlines, budget limits, compliance requirements, anything else.",
  },
];

export const GROWTH_FIELDS: FieldDef[] = [
  {
    key: "offerSummary",
    label: "Offer summary",
    type: "textarea",
    required: true,
    placeholder: "What are you selling and who is it for?",
  },
  {
    key: "targetMarket",
    label: "Target market",
    type: "textarea",
    required: true,
    placeholder: "Describe your ideal customer in detail.",
  },
  {
    key: "currentTrafficChannels",
    label: "Current traffic and channels",
    type: "textarea",
    placeholder: "Where does your traffic or leads come from today?",
  },
  {
    key: "seoStatus",
    label: "SEO status",
    type: "input",
    placeholder: "e.g. Not started, Actively working on it, Need audit",
  },
  {
    key: "paidStatus",
    label: "Paid ads status",
    type: "input",
    placeholder: "e.g. Running Google Ads, Not active, Budget available",
  },
  {
    key: "contentStatus",
    label: "Content status",
    type: "input",
    placeholder: "e.g. Blogging regularly, No content yet, Need strategy",
  },
  {
    key: "growthGoals",
    label: "Growth goals",
    type: "textarea",
    required: true,
    placeholder: "What does success look like in 90 days?",
  },
  {
    key: "kpiPriorities",
    label: "KPI priorities",
    type: "textarea",
    placeholder: "Revenue, leads, signups, traffic, rankings...",
  },
  {
    key: "currentAssetsPages",
    label: "Current assets and pages",
    type: "textarea",
    placeholder:
      "Landing pages, funnels, lead magnets, existing content.",
  },
  {
    key: "requiredAccessTools",
    label: "Required access or tools",
    type: "textarea",
    placeholder:
      "Analytics, ad accounts, CMS, search console, accounts...",
  },
  {
    key: "budgetContext",
    label: "Budget context",
    type: "input",
    placeholder:
      "Monthly budget for paid, tools, or content (optional)",
  },
  {
    key: "constraintsNotes",
    label: "Constraints or notes",
    type: "textarea",
    placeholder:
      "Anything else that would help us hit the ground running.",
  },
];

const NL_FIELD_LABELS: Record<string, string> = {
  "Build.businessSummary": "Bedrijfssamenvatting",
  "Build.websiteOrSocial": "Website of social links",
  "Build.projectGoals": "Projectdoelen",
  "Build.primaryCta": "Primaire call-to-action",
  "Build.targetAudience": "Doelgroep",
  "Build.requestedPagesFeatures": "Gewenste paginas of features",
  "Build.deadline": "Gewenste deadline",
  "Build.brandAssets": "Merkassets en voorkeuren",
  "Build.contentAvailability": "Beschikbaarheid van content",
  "Build.requiredAccessTools": "Benodigde toegang of tools",
  "Build.notes": "Aanvullende notities",
  "Systems.teamProcessOverview": "Team- en procesoverzicht",
  "Systems.currentTools": "Huidige tools",
  "Systems.currentWorkflow": "Huidige workflow",
  "Systems.painPoints": "Knelpunten",
  "Systems.manualWork": "Handmatig werk dat nu gebeurt",
  "Systems.desiredOutcome": "Gewenste uitkomst van automatisering",
  "Systems.usersStakeholders": "Gebruikers en stakeholders",
  "Systems.logicDataRequirements": "Logica- en data-eisen",
  "Systems.requiredAccessTools": "Benodigde toegang of tools",
  "Systems.constraintsNotes": "Randvoorwaarden, risico's of notities",
  "Growth.offerSummary": "Aanbodsamenvatting",
  "Growth.targetMarket": "Doelmarkt",
  "Growth.currentTrafficChannels": "Huidig verkeer en kanalen",
  "Growth.seoStatus": "SEO-status",
  "Growth.paidStatus": "Status paid ads",
  "Growth.contentStatus": "Contentstatus",
  "Growth.growthGoals": "Groeidoelen",
  "Growth.kpiPriorities": "KPI-prioriteiten",
  "Growth.currentAssetsPages": "Huidige assets en pagina's",
  "Growth.requiredAccessTools": "Benodigde toegang of tools",
  "Growth.budgetContext": "Budgetcontext",
  "Growth.constraintsNotes": "Randvoorwaarden of notities",
};

const NL_FIELD_PLACEHOLDERS: Record<string, string> = {
  "Build.businessSummary": "Beschrijf je bedrijf en wat jullie doen.",
  "Build.websiteOrSocial": "https://...",
  "Build.projectGoals": "Wat moet dit project opleveren?",
  "Build.primaryCta": "Bijv. Plan een call, Koop nu, Vraag een offerte aan",
  "Build.targetAudience": "Voor wie is dit bedoeld? Beschrijf dit zo concreet mogelijk.",
  "Build.requestedPagesFeatures":
    "Noem de paginas, secties of functionaliteiten die je nodig hebt.",
  "Build.deadline": "Bijv. eind mei 2026",
  "Build.brandAssets": "Logo, kleuren, lettertypes, stijlreferenties of moodboard-links.",
  "Build.contentAvailability": "Bijv. Copy klaar, Copywriting nodig, Gedeeltelijk",
  "Build.requiredAccessTools": "CMS, hosting, analytics, integraties, accounts...",
  "Build.notes": "Alles wat we moeten weten voor de start.",
  "Systems.teamProcessOverview": "Beschrijf je team en hoe jullie nu werken.",
  "Systems.currentTools": "Noem de software en tools die je team dagelijks gebruikt.",
  "Systems.currentWorkflow": "Neem ons stap voor stap mee door het huidige proces.",
  "Systems.painPoints": "Wat loopt nu vast, traag of handmatig?",
  "Systems.manualWork":
    "Welke taken worden nu handmatig gedaan die geautomatiseerd moeten worden?",
  "Systems.desiredOutcome": "Hoe ziet de ideale situatie eruit als dit staat?",
  "Systems.usersStakeholders": "Wie gebruikt dit systeem of wordt hierdoor geraakt?",
  "Systems.logicDataRequirements":
    "Businessregels, voorwaarden, datavelden en edge cases.",
  "Systems.requiredAccessTools": "CRM's, databases, API's, inloggegevens, accounts...",
  "Systems.constraintsNotes":
    "Deadlines, budgetgrenzen, compliance-eisen of andere context.",
  "Growth.offerSummary": "Wat verkoop je en voor wie?",
  "Growth.targetMarket": "Beschrijf je ideale klant zo concreet mogelijk.",
  "Growth.currentTrafficChannels": "Waar komen je verkeer of leads nu vandaan?",
  "Growth.seoStatus": "Bijv. Niet gestart, Actief bezig, Audit nodig",
  "Growth.paidStatus": "Bijv. Google Ads actief, Niet actief, Budget beschikbaar",
  "Growth.contentStatus": "Bijv. Regelmatig content, Nog geen content, Strategie nodig",
  "Growth.growthGoals": "Hoe ziet succes eruit over 90 dagen?",
  "Growth.kpiPriorities": "Omzet, leads, aanmeldingen, verkeer, rankings...",
  "Growth.currentAssetsPages":
    "Landingspagina's, funnels, lead magnets, bestaande content.",
  "Growth.requiredAccessTools":
    "Analytics, advertentie-accounts, CMS, Search Console, accounts...",
  "Growth.budgetContext": "Maandelijks budget voor ads, tools of content (optioneel)",
  "Growth.constraintsNotes": "Alles wat ons helpt om snel en scherp te starten.",
};

function getBaseFieldsForLane(lane: string): FieldDef[] {
  if (lane === "Build") return BUILD_FIELDS;
  if (lane === "Systems") return SYSTEMS_FIELDS;
  if (lane === "Growth") return GROWTH_FIELDS;
  return BUILD_FIELDS;
}

function localizeField(field: FieldDef, lane: string, locale: OnboardingLocale): FieldDef {
  if (locale !== "nl") {
    return field;
  }

  const key = `${lane}.${field.key}`;
  return {
    ...field,
    label: NL_FIELD_LABELS[key] ?? field.label,
    placeholder: NL_FIELD_PLACEHOLDERS[key] ?? field.placeholder,
  };
}

export function getFieldsForLane(lane: string, locale: OnboardingLocale = "en"): FieldDef[] {
  const baseFields = getBaseFieldsForLane(lane);
  return baseFields.map((field) => localizeField(field, lane, locale));
}
