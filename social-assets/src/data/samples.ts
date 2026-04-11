import type { AuthorityPostData } from '../components/posts/AuthorityPost';
import type { ServicePostData } from '../components/posts/ServicePost';
import type { OfferPostData } from '../components/posts/OfferPost';
import type { QuotePostData } from '../components/posts/QuotePost';
import type { CarouselSlideData } from '../components/posts/CarouselSlide';
import type { BrandBannerData } from '../components/banners/BrandBanners';
import type {
  BuildFlowExplainerData,
  ProcessCarouselSlideData,
  SystemsExplainerData,
} from '../components/posts/explainer-types';

// --- AuthorityPost ---
// Edit: tag, headline, sub, proofPoints (2-4 items)
export const authorityPostSample: AuthorityPostData = {
  tag: 'AI Systems',
  headline: 'Operators\ndon\'t need\nmore tools.',
  sub: 'They need fewer decisions. We build the systems that remove them.',
  proofPoints: [
    '3-5x faster execution on repetitive workflows',
    'Systems that run without you in the loop',
    'Built in weeks, not quarters',
  ],
};

// --- ServicePost ---
// Edit: tag, service name, description, features (3-5 items), cta
export const servicePostSample: ServicePostData = {
  tag: 'Build',
  service: 'Production\nWebsites',
  description:
    'We build websites that perform under real load, in real business conditions. No templates. No compromises.',
  features: [
    'Custom design and architecture',
    'Conversion-optimized from day one',
    'CMS, integrations, and handoff included',
    'Launched production-ready, not "good enough"',
  ],
  cta: 'Start a project',
};

// --- OfferPost ---
// Edit: tag, headline, included (3-5 items), price, note
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

// --- QuotePost ---
// Edit: quote, author, title, tag
export const quotePostSample: QuotePostData = {
  tag: 'Inovense',
  quote:
    'Most businesses don\'t have an execution problem. They have a systems problem disguised as one.',
  author: 'Inovense',
  title: 'Build. Systems. Growth.',
};

// --- CarouselSlide ---
// Edit each slide: slideNumber, totalSlides, title, body, isLast
export const carouselSlides: CarouselSlideData[] = [
  {
    slideNumber: 1,
    totalSlides: 4,
    title: 'Why your\nwebsite isn\'t\nconverting.',
    body: 'Most websites are brochures, not business tools. Here is the four-part framework we use to fix that.',
  },
  {
    slideNumber: 2,
    totalSlides: 4,
    title: 'Problem 1:\nWeak first\nimpression.',
    body: 'You have 6 seconds. If your headline doesn\'t speak to a specific operator with a specific problem, you\'ve already lost them.',
  },
  {
    slideNumber: 3,
    totalSlides: 4,
    title: 'Problem 2:\nNo system\nbehind the CTA.',
    body: 'A button that says "Contact us" is not a conversion system. We build intake flows that qualify, inform, and convert.',
  },
  {
    slideNumber: 4,
    totalSlides: 4,
    title: 'The fix\nis simpler\nthan you think.',
    body: 'Clear positioning. A real intake flow. Proof that matches your buyer. We build this in 4-6 weeks.',
    isLast: true,
  },
];

// --- ProcessCarousel ---
// Edit each slide: slideNumber, totalSlides, tag, title, subtitle, steps (4-5), cta
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

// --- SystemsExplainer ---
// Edit: tag, title, subtitle, steps (4-5), cta
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

// --- BuildFlowExplainer ---
// Edit: tag, title, subtitle, steps (4-5), cta
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

// Active slide index (0-based) - change this to preview different slides
export const activeSlideIndex = 0;

// --- Facebook Cover Banner ---
// Keep critical copy in the center-safe zone. Use safe guides in preview only.
export const facebookCoverBannerSample: BrandBannerData = {
  strapline: 'Websites. Systems. Growth.',
  headline: 'Premium digital execution for modern businesses.',
  subline: 'Built for clarity, trust, and operational performance.',
};

// --- LinkedIn Company Banner ---
// Keep copy concise for the short vertical canvas height.
export const linkedInCompanyBannerSample: BrandBannerData = {
  strapline: 'Websites. Systems. Growth.',
  headline: 'Premium digital execution for modern businesses.',
  subline: 'Inovense builds website, system, and growth layers that move brands forward.',
};
