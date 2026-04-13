import type { BrandBannerData } from '../components/banners/BrandBanners';
import type { AuthorityPostData } from '../components/posts/AuthorityPost';
import type { CarouselSlideData } from '../components/posts/CarouselSlide';
import type { HumanEditorialPostData } from '../components/posts/human-editorial-types';
import type { MotionStatementPostData } from '../components/posts/motion-types';
import type { OfferPostData } from '../components/posts/OfferPost';
import type {
  CaseSnapshotPostData,
  ProofCarouselSlideData,
  ProofSnippetPostData,
} from '../components/posts/proof-types';
import type { QuotePostData } from '../components/posts/QuotePost';
import type { ServicePostData } from '../components/posts/ServicePost';
import type {
  BuildFlowExplainerData,
  ProcessCarouselSlideData,
  SystemsExplainerData,
} from '../components/posts/explainer-types';
import { MOTION_SCENE_PRESETS } from '../motion/scene-presets';

export type LocalePreset = 'en' | 'nl';

export const authorityPostSample: AuthorityPostData = {
  tag: 'AI Systems',
  headline: "Operators\ndon't need\nmore tools.",
  sub: 'They need fewer decisions. We build the systems that remove them.',
  proofPoints: [
    '3-5x faster execution on repetitive workflows',
    'Systems that run without you in the loop',
    'Built in weeks, not quarters',
  ],
};

export const authorityPostNlSample: AuthorityPostData = {
  tag: 'Systems',
  headline: 'Teams hebben\ngeen extra tools\nnodig.',
  sub: 'Ze hebben minder ruis en strakkere beslisflows nodig.',
  proofPoints: [
    'Snellere uitvoering op terugkerende taken',
    'Minder handmatige overdrachten tussen teams',
    'Meer voorspelbaarheid in delivery en groei',
  ],
};

export const servicePostSample: ServicePostData = {
  tag: 'Build',
  service: 'Production\nWebsites',
  description:
    'We build websites that perform under real load, in real business conditions. No templates. No compromises.',
  features: [
    'Custom design and architecture',
    'Conversion-optimized from day one',
    'CMS, integrations, and handoff included',
    'Launched production-ready, not good enough',
  ],
  cta: 'Start a project',
};

export const servicePostNlSample: ServicePostData = {
  tag: 'Build',
  service: 'Websites\ndie converteren',
  description:
    'Geen standaard templatewerk. We bouwen premium websites die commerciële output leveren.',
  features: [
    'Maatwerk design en architectuur',
    'Conversiegericht vanaf de eerste fold',
    'CMS, integraties en duidelijke handoff',
    'Production-ready oplevering',
  ],
  cta: 'Project starten',
};

export const offerPostSample: OfferPostData = {
  tag: 'Limited',
  headline: 'AI Automation\nAudit',
  included: [
    'Full workflow analysis across your operations',
    'Identified automation opportunities with ROI estimate',
    'Custom system architecture recommendation',
    'Priority project slot if you move forward',
  ],
  price: 'From EUR 1,200',
  note: 'Available for 3 operators this quarter.',
};

export const offerPostNlSample: OfferPostData = {
  tag: 'Limited',
  headline: 'Systems Sprint\nIntake',
  included: [
    'Analyse van huidige operationele flow',
    'Concrete automatiseringskansen met prioriteit',
    'Kernarchitectuur voor implementatie',
    'Versnelde projectstart bij doorgang',
  ],
  price: 'Vanaf EUR 1.200',
  note: 'Beschikbaar voor 3 teams dit kwartaal.',
};

export const quotePostSample: QuotePostData = {
  tag: 'Inovense',
  quote:
    "Most businesses don't have an execution problem. They have a systems problem disguised as one.",
  author: 'Inovense',
  title: 'Build. Systems. Growth.',
};

export const quotePostNlSample: QuotePostData = {
  tag: 'Inovense',
  quote:
    'De meeste teams missen geen capaciteit. Ze missen een systeem dat capaciteit omzet in resultaat.',
  author: 'Inovense',
  title: 'Build. Systems. Growth.',
};

export const humanEditorialSample: HumanEditorialPostData = {
  tag: 'Founder Memo',
  headline: 'Execution wins\nwhen leadership\nstays close to ops.',
  sub: 'People trust systems more when they can see the operator behind the standard.',
  personName: 'Founder, Inovense',
  personRole: 'Build. Systems. Growth.',
  imageSrc: '/editorial/founder-operator.jpg',
  imageAlt: 'Founder portrait in studio environment',
  cta: 'Start a project',
  layout: 'founder_portrait',
};

export const humanEditorialNlSample: HumanEditorialPostData = {
  tag: 'Operator Memo',
  headline: 'Sterke uitvoering\nbegint bij\noperationele rust.',
  sub: 'Gebruik deze editorial template voor founder of team posts met meer menselijk signaal.',
  personName: 'Inovense Operator',
  personRole: 'Build. Systems. Growth.',
  imageSrc: '/editorial/operator-portrait.jpg',
  imageAlt: 'Operator portrait in premium work environment',
  cta: 'Project starten',
  layout: 'walking_hook',
};

export const motionStatementSample: MotionStatementPostData = {
  tag: 'Motion Statement',
  headline: 'The brand is not\nwhat you say.\nIt is how you execute.',
  sub: 'Scene-ready structure for short-form hooks, overlays, and sequence-based voiceovers.',
  beats: [
    'Hook: execution quality is a growth multiplier.',
    'Shift: remove handoff leakage across the lifecycle.',
    'Proof: show process and movement, not vague promises.',
    'CTA: start a project.',
  ],
  activeBeat: 0,
  timeline: MOTION_SCENE_PRESETS.statement,
  cta: 'Start a project',
};

export const motionStatementNlSample: MotionStatementPostData = {
  tag: 'Motion Hook',
  headline: 'Groei zonder\nsysteem is\nfrictie op schaal.',
  sub: 'Motion-ready poststructuur voor reels en korte explainers.',
  beats: [
    'Hook: de bottleneck zit meestal in de workflow.',
    'Shift: minder handoff-ruis, meer eigenaarschap.',
    'Proof: laat proces en resultaat samen zien.',
    'CTA: bekijk onze aanpak.',
  ],
  activeBeat: 1,
  timeline: MOTION_SCENE_PRESETS.process_hook,
  cta: 'Hoe wij werken',
};

export const carouselSlides: CarouselSlideData[] = [
  {
    slideNumber: 1,
    totalSlides: 4,
    title: "Why your\nwebsite isn't\nconverting.",
    body: 'Most websites are brochures, not business tools. Here is the four-part framework we use to fix that.',
  },
  {
    slideNumber: 2,
    totalSlides: 4,
    title: 'Problem 1:\nWeak first\nimpression.',
    body: 'You have 6 seconds. If your headline does not speak to a specific operator with a specific problem, intent drops.',
  },
  {
    slideNumber: 3,
    totalSlides: 4,
    title: 'Problem 2:\nNo system\nbehind CTA.',
    body: 'A contact button is not a conversion system. We build intake flows that qualify, inform, and convert.',
  },
  {
    slideNumber: 4,
    totalSlides: 4,
    title: 'The fix\nis simpler\nthan you think.',
    body: 'Clear positioning. A real intake flow. Proof that matches the buyer.',
    isLast: true,
  },
];

export const carouselSlidesNlSample: CarouselSlideData[] = [
  {
    slideNumber: 1,
    totalSlides: 3,
    title: 'Waarom veel\nsites te weinig\nopleveren.',
    body: 'Mooie visuals zonder commerciële structuur leveren zelden consistente groei op.',
  },
  {
    slideNumber: 2,
    totalSlides: 3,
    title: 'Stap 1:\nHeldere\npositionering.',
    body: 'Zonder scherpe boodschap op de eerste fold verlies je intent voordat die ontstaat.',
  },
  {
    slideNumber: 3,
    totalSlides: 3,
    title: 'Stap 2 + 3:\nProof en\nstrakke intake.',
    body: 'Toon bewijs op beslismomenten en stuur bezoekers naar een intakeflow die echt kwalificeert.',
    isLast: true,
  },
];

export const processCarouselSlidesSample: ProcessCarouselSlideData[] = [
  {
    slideNumber: 1,
    totalSlides: 3,
    tag: 'Website Process',
    title: 'From strategy to launch,\nwithout chaos.',
    subtitle: 'A clean five-step execution flow for premium website delivery.',
    steps: [
      { icon: 'strategy', title: 'Strategy', detail: 'Positioning and offer clarity' },
      { icon: 'structure', title: 'Structure', detail: 'Information architecture and flow' },
      { icon: 'design', title: 'Design', detail: 'Interface system and visual direction' },
      { icon: 'build', title: 'Build', detail: 'Production implementation and QA' },
      { icon: 'launch', title: 'Launch', detail: 'Go-live, tracking, and handoff' },
    ],
    cta: 'Start a project',
  },
  {
    slideNumber: 2,
    totalSlides: 3,
    tag: 'Systems Automation',
    title: 'Automation should\nreduce decisions,\nnot add tools.',
    subtitle: 'A practical systems flow for internal commercial operations.',
    steps: [
      { icon: 'capture', title: 'Capture', detail: 'Intake and lead signal collection' },
      { icon: 'route', title: 'Route', detail: 'Owner assignment and lane logic' },
      { icon: 'automate', title: 'Automate', detail: 'Trigger-based operational actions' },
      { icon: 'notify', title: 'Notify', detail: 'Critical visibility at decision points' },
      { icon: 'review', title: 'Review', detail: 'Weekly optimization loop' },
    ],
    cta: 'Build your system',
  },
  {
    slideNumber: 3,
    totalSlides: 3,
    tag: 'Growth System',
    title: 'Traffic only matters\nwhen the system\nconverts.',
    subtitle: 'A growth loop that connects acquisition to CRM follow-through.',
    steps: [
      { icon: 'traffic', title: 'Traffic', detail: 'Qualified acquisition inputs' },
      { icon: 'landing', title: 'Landing', detail: 'Clear conversion architecture' },
      { icon: 'crm', title: 'CRM', detail: 'Pipeline and lifecycle mapping' },
      { icon: 'follow_up', title: 'Follow-up', detail: 'Automated but contextual outreach' },
      { icon: 'report', title: 'Report', detail: 'Operator-grade performance review' },
    ],
    cta: 'inovense.com',
    isLast: true,
  },
];

export const processCarouselSlidesNlSample: ProcessCarouselSlideData[] = [
  {
    slideNumber: 1,
    totalSlides: 2,
    tag: 'Proces',
    title: 'Van strategie\nnaar oplevering,\nzonder ruis.',
    subtitle: 'Een strakke flow voor premium delivery.',
    steps: [
      { icon: 'strategy', title: 'Strategie', detail: 'Positionering en aanbod' },
      { icon: 'structure', title: 'Structuur', detail: 'Informatie en flow' },
      { icon: 'design', title: 'Design', detail: 'Interface en merkconsistentie' },
      { icon: 'build', title: 'Build', detail: 'Implementatie en QA' },
      { icon: 'launch', title: 'Livegang', detail: 'Deploy en handoff' },
    ],
    cta: 'Project starten',
  },
  {
    slideNumber: 2,
    totalSlides: 2,
    tag: 'Operationeel',
    title: 'Elke fase heeft\neen eigenaar\nen output.',
    subtitle: 'Systeemkwaliteit maakt productie voorspelbaar.',
    steps: [
      { icon: 'capture', title: 'Capture', detail: 'Heldere intake' },
      { icon: 'route', title: 'Route', detail: 'Eigenaarschap per stap' },
      { icon: 'automate', title: 'Automate', detail: 'Triggers op beslispunten' },
      { icon: 'notify', title: 'Notify', detail: 'Live zichtbaarheid' },
      { icon: 'review', title: 'Review', detail: 'Wekelijkse optimalisatie' },
    ],
    cta: 'inovense.com',
    isLast: true,
  },
];

export const systemsExplainerSample: SystemsExplainerData = {
  tag: 'Systems Explainer',
  title: 'How the\nsystems layer\nactually works.',
  subtitle:
    'We connect capture, routing, automation, and reporting into one coherent operating rhythm.',
  steps: [
    { icon: 'capture', title: 'Capture', detail: 'Forms, channels, and inbound events' },
    { icon: 'route', title: 'Route', detail: 'Lead ownership and priority logic' },
    { icon: 'automate', title: 'Automate', detail: 'Status, reminders, and handoff triggers' },
    { icon: 'notify', title: 'Notify', detail: 'Real-time visibility for key actions' },
    { icon: 'review', title: 'Review', detail: 'Weekly KPI loop and workflow tuning' },
  ],
  cta: 'Discuss your systems',
};

export const systemsExplainerNlSample: SystemsExplainerData = {
  tag: 'Systems Uitleg',
  title: 'Hoe de\nsystems-laag\nwerkelijk draait.',
  subtitle:
    'We koppelen intake, routering, automatisering en rapportage tot één operationele ritmiek.',
  steps: [
    { icon: 'capture', title: 'Capture', detail: 'Intake en signalen' },
    { icon: 'route', title: 'Route', detail: 'Eigenaarschap en prioriteit' },
    { icon: 'automate', title: 'Automate', detail: 'Status- en handoff-triggers' },
    { icon: 'notify', title: 'Notify', detail: 'Realtime zichtbaarheid' },
    { icon: 'review', title: 'Review', detail: 'Wekelijkse bijsturing' },
  ],
  cta: 'Bouw je systeem',
};

export const buildFlowExplainerSample: BuildFlowExplainerData = {
  tag: 'Build Explainer',
  title: 'The website build\nflow we run\nin production.',
  subtitle:
    'A structured build process that keeps strategy, design, and engineering aligned from kickoff to launch.',
  steps: [
    { icon: 'strategy', title: 'Strategy', detail: 'Goals, audience, and conversion intent' },
    { icon: 'structure', title: 'Structure', detail: 'Page system and information layout' },
    { icon: 'design', title: 'Design', detail: 'Interface direction and brand consistency' },
    { icon: 'build', title: 'Build', detail: 'Implementation, integrations, and QA' },
    { icon: 'launch', title: 'Launch', detail: 'Deployment, analytics, and handoff' },
  ],
  cta: 'Start a build project',
};

export const buildFlowExplainerNlSample: BuildFlowExplainerData = {
  tag: 'Build Flow',
  title: 'De build-flow\ndie we in\nproductie draaien.',
  subtitle:
    'Een gestructureerde aanpak die strategie, design en ontwikkeling strak verbindt.',
  steps: [
    { icon: 'strategy', title: 'Strategie', detail: 'Doelgroep, aanbod en richting' },
    { icon: 'structure', title: 'Structuur', detail: 'Pagina-opbouw en flow' },
    { icon: 'design', title: 'Design', detail: 'Interface en merkconsistentie' },
    { icon: 'build', title: 'Build', detail: 'Implementatie en QA' },
    { icon: 'launch', title: 'Launch', detail: 'Livegang en handoff' },
  ],
  cta: 'Start een build project',
};

export const caseSnapshotSample: CaseSnapshotPostData = {
  tag: 'Proof Snapshot',
  headline: 'A compact case\nsurface that\nshows movement.',
  summary: 'Use this format when one card must show context, shift, and practical execution.',
  context: 'B2B service pipeline with strong demand but weak decision-point follow-through.',
  beforeLabel: 'Before',
  beforeValue: '14% call-book rate',
  afterLabel: 'After',
  afterValue: '27% call-book rate',
  interventions: [
    'Offer hierarchy and first-fold conversion structure rebuilt',
    'Lead routing ownership clarified across sales and ops',
    'Proposal and payment events tied to follow-up actions',
  ],
  timeframe: '8-week change window',
  cta: 'Build your systems',
};

export const caseSnapshotNlSample: CaseSnapshotPostData = {
  tag: 'Proof Snapshot',
  headline: 'Compact bewijs\ndat beweging\nzichtbaar maakt.',
  summary: 'Gebruik dit format om context, interventie en resultaat in een post te laten landen.',
  context: 'Dienstverlener met genoeg vraag maar te veel ruis in opvolging en handoff.',
  beforeLabel: 'Voor',
  beforeValue: '12% call-book rate',
  afterLabel: 'Na',
  afterValue: '24% call-book rate',
  interventions: [
    'Intake en eigenaarschap per lane strakgezet',
    'Beslispunt-automatisering op voorstel en betaling',
    'Wekelijkse review op bron, snelheid en conversie',
  ],
  timeframe: '7-week transitie',
  cta: 'Bouw je systeem',
};

export const proofSnippetSample: ProofSnippetPostData = {
  tag: 'Case Snippet',
  headline: 'Stop scaling\nmanual workflows.',
  sub: 'When intake, routing, and follow-up stay manual, growth slows before demand does.',
  outcomeLabel: 'Result in 6 weeks',
  outcome: '+38% qualified calls',
  context: 'B2B service operator with strong demand but weak handoff consistency.',
  whatChanged: [
    'Unified lead routing and owner assignment in one CRM flow',
    'Added event-driven follow-up at proposal and payment moments',
    'Introduced weekly source-to-close review cadence',
  ],
  cta: 'Build your systems',
};

export const proofSnippetNlSample: ProofSnippetPostData = {
  tag: 'Case Snippet',
  headline: 'Stop met schalen\nop handwerk.',
  sub: 'Zonder strakke intake en opvolging groeit complexiteit sneller dan output.',
  outcomeLabel: 'Resultaat in 6 weken',
  outcome: '+33% gekwalificeerde calls',
  context: 'Dienstverlener met genoeg vraag, maar te veel handoff-frictie.',
  whatChanged: [
    'Lead-routering en eigenaarschap gecentraliseerd in CRM',
    'Automatisering toegevoegd op voorstel- en betaalmomenten',
    'Wekelijkse bron-tot-close review loop ingevoerd',
  ],
  cta: 'Bouw je systeem',
};

export const proofCarouselSlidesSample: ProofCarouselSlideData[] = [
  {
    slideNumber: 1,
    totalSlides: 3,
    tag: 'Proof Loop',
    title: 'Proof beats\npromise in\nserious feeds.',
    subtitle: 'A compact case sequence for authority and trust.',
    outcomeLabel: 'Result',
    outcome: '+41% lead-to-call',
    context: '8-week improvement window on a B2B service pipeline.',
    whatChanged: [
      'Offer-first landing architecture',
      'CRM lifecycle and owner cleanup',
      'Signal-led follow-up automation',
    ],
  },
  {
    slideNumber: 2,
    totalSlides: 3,
    tag: 'What Changed',
    title: 'Fix structure,\nthen scale\ndemand.',
    subtitle: 'Most uplift came from operational discipline, not channel expansion.',
    outcomeLabel: 'Delta',
    outcome: '-29% response lag',
    context: 'Shorter delay from inbound intent to contextual outreach.',
    whatChanged: [
      'Lead-source segmentation',
      'Proposal/payment trigger events',
      'Weekly operating QA',
    ],
  },
  {
    slideNumber: 3,
    totalSlides: 3,
    tag: 'Operator Note',
    title: 'System quality\nis a growth\nmultiplier.',
    subtitle: 'Repeatable loops create durable commercial confidence.',
    outcomeLabel: 'Net impact',
    outcome: 'Higher intent pipeline',
    context: 'More consistent close quality without adding tool sprawl.',
    whatChanged: [
      'Baseline and goals defined upfront',
      'Execution loop documented and enforced',
      'Decisions tied to weekly signals',
    ],
    cta: 'inovense.com',
    isLast: true,
  },
];

export const proofCarouselSlidesNlSample: ProofCarouselSlideData[] = [
  {
    slideNumber: 1,
    totalSlides: 2,
    tag: 'Proof Loop',
    title: 'Laat resultaat\nzien, niet alleen\nbeloftes.',
    subtitle: 'Compacte caseflow voor trust in de feed.',
    outcomeLabel: 'Resultaat',
    outcome: '+34% lead-to-call',
    context: 'Verbetering binnen 7 weken in een dienstverlenende pipeline.',
    whatChanged: [
      'Intakeflow aangescherpt',
      'Lifecycle-owners duidelijk vastgezet',
      'Follow-up op signalen geautomatiseerd',
    ],
  },
  {
    slideNumber: 2,
    totalSlides: 2,
    tag: 'Operator Notitie',
    title: 'Sterke systemen\nmaken groei\nvoorspelbaar.',
    subtitle: 'Consistentie in uitvoering levert betrouwbaardere omzet op.',
    outcomeLabel: 'Impact',
    outcome: 'Hogere kwaliteitsleads',
    context: 'Meer commerciële rust met minder operationele ruis.',
    whatChanged: [
      'Wekelijkse review op KPI-signalen',
      'Heldere beslismomenten in CRM',
      'Beter ritme in opvolging',
    ],
    cta: 'inovense.com',
    isLast: true,
  },
];

export const activeSlideIndex = 0;

export const facebookCoverBannerSample: BrandBannerData = {
  strapline: 'Web. Systems. Growth.',
  headline: 'Premium digital execution for modern businesses.',
  subline: 'Built for clarity, trust, and operational performance.',
};

export const facebookCoverBannerNlSample: BrandBannerData = {
  strapline: 'Web. Systems. Growth.',
  headline: 'Premium digitale uitvoering voor moderne bedrijven.',
  subline: 'Gebouwd voor helderheid, vertrouwen en operationele performance.',
};

export const linkedInCompanyBannerSample: BrandBannerData = {
  strapline: 'Web. Systems. Growth.',
  headline: 'Premium digital execution for modern businesses.',
  subline: 'Inovense builds website, systems, and growth layers that move brands forward.',
};

export const linkedInCompanyBannerNlSample: BrandBannerData = {
  strapline: 'Web. Systems. Growth.',
  headline: 'Premium digitale uitvoering voor moderne bedrijven.',
  subline: 'Inovense bouwt web-, systems- en growth-lagen die merken vooruithelpen.',
};

export const localePresetsByTemplate = {
  authority: { en: authorityPostSample, nl: authorityPostNlSample },
  service: { en: servicePostSample, nl: servicePostNlSample },
  offer: { en: offerPostSample, nl: offerPostNlSample },
  quote: { en: quotePostSample, nl: quotePostNlSample },
  human_editorial: { en: humanEditorialSample, nl: humanEditorialNlSample },
  motion_statement: { en: motionStatementSample, nl: motionStatementNlSample },
  carousel: { en: carouselSlides, nl: carouselSlidesNlSample },
  process_carousel: { en: processCarouselSlidesSample, nl: processCarouselSlidesNlSample },
  systems_explainer: { en: systemsExplainerSample, nl: systemsExplainerNlSample },
  build_flow_explainer: { en: buildFlowExplainerSample, nl: buildFlowExplainerNlSample },
  case_snapshot: { en: caseSnapshotSample, nl: caseSnapshotNlSample },
  proof_snippet: { en: proofSnippetSample, nl: proofSnippetNlSample },
  proof_carousel: { en: proofCarouselSlidesSample, nl: proofCarouselSlidesNlSample },
  facebook_banner: { en: facebookCoverBannerSample, nl: facebookCoverBannerNlSample },
  linkedin_banner: { en: linkedInCompanyBannerSample, nl: linkedInCompanyBannerNlSample },
} as const;
