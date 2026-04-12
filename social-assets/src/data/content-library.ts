import type { AuthorityPostData } from '../components/posts/AuthorityPost';
import type { CarouselSlideData } from '../components/posts/CarouselSlide';
import type { OfferPostData } from '../components/posts/OfferPost';
import type { ProofCarouselSlideData, ProofSnippetPostData } from '../components/posts/proof-types';
import type { QuotePostData } from '../components/posts/QuotePost';
import type { ServicePostData } from '../components/posts/ServicePost';
import type {
  BuildFlowExplainerData,
  ProcessCarouselSlideData,
  SystemsExplainerData,
} from '../components/posts/explainer-types';
import type { FormatKey } from '../utils/formats';

export type TemplateKey =
  | 'authority'
  | 'service'
  | 'offer'
  | 'quote'
  | 'carousel'
  | 'process_carousel'
  | 'systems_explainer'
  | 'build_flow_explainer'
  | 'proof_snippet'
  | 'proof_carousel'
  | 'facebook_banner'
  | 'linkedin_banner';

export type SocialPlatform = 'Instagram' | 'Facebook' | 'LinkedIn';
export type PostLocale = 'EN' | 'NL';
export type PostFamily =
  | 'Authority'
  | 'Service'
  | 'Explainer'
  | 'Offer'
  | 'Proof'
  | 'Carousel';

export const SOCIAL_PLATFORMS: SocialPlatform[] = ['Instagram', 'Facebook', 'LinkedIn'];

type SavedPostBase = {
  id: string;
  title: string;
  weekId: string;
  family: PostFamily;
  locale: PostLocale;
  format: FormatKey;
  bestFor: SocialPlatform;
  platforms: SocialPlatform[];
  recommendedFormat: FormatKey;
  formatVariants: FormatKey[];
};

export type SavedPost =
  | (SavedPostBase & {
      template: 'authority';
      content: AuthorityPostData;
    })
  | (SavedPostBase & {
      template: 'service';
      content: ServicePostData;
    })
  | (SavedPostBase & {
      template: 'offer';
      content: OfferPostData;
    })
  | (SavedPostBase & {
      template: 'quote';
      content: QuotePostData;
    })
  | (SavedPostBase & {
      template: 'carousel';
      content: CarouselSlideData[];
      slideIndex?: number;
    })
  | (SavedPostBase & {
      template: 'process_carousel';
      content: ProcessCarouselSlideData[];
      slideIndex?: number;
    })
  | (SavedPostBase & {
      template: 'systems_explainer';
      content: SystemsExplainerData;
    })
  | (SavedPostBase & {
      template: 'build_flow_explainer';
      content: BuildFlowExplainerData;
    })
  | (SavedPostBase & {
      template: 'proof_snippet';
      content: ProofSnippetPostData;
    })
  | (SavedPostBase & {
      template: 'proof_carousel';
      content: ProofCarouselSlideData[];
      slideIndex?: number;
    });

export interface WeeklyPostSet {
  id: string;
  label: string;
  focus: string;
  postIds: string[];
}

export const WEEKLY_POST_SETS: WeeklyPostSet[] = [
  {
    id: 'week-17',
    label: 'Week 17',
    focus: 'Execution quality and commercial clarity',
    postIds: ['w17-authority-exec', 'w17-service-build', 'w17-offer-growth', 'w17-carousel-web'],
  },
  {
    id: 'week-18',
    label: 'Week 18',
    focus: 'Systems trust and authority positioning',
    postIds: ['w18-authority-systems', 'w18-quote-operator', 'w18-service-systems', 'w18-offer-shopify'],
  },
  {
    id: 'week-19',
    label: 'Week 19',
    focus: 'Explainer-driven content loops',
    postIds: ['w19-process-website', 'w19-systems-explainer', 'w19-growth-process'],
  },
  {
    id: 'week-20',
    label: 'Week 20',
    focus: 'Proof snippets and bilingual execution',
    postIds: [
      'w20-proof-systems',
      'w20-proof-carousel-growth',
      'w20-authority-nl',
      'w20-service-nl',
      'w20-proof-nl',
    ],
  },
];

export const SAVED_POSTS: SavedPost[] = [
  {
    id: 'w17-authority-exec',
    weekId: 'week-17',
    family: 'Authority',
    locale: 'EN',
    title: 'Execution quality statement',
    template: 'authority',
    format: 'square',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram'],
    recommendedFormat: 'square',
    formatVariants: ['square', 'portrait'],
    content: {
      tag: 'Execution',
      headline: 'Premium output\ncomes from\nsystem quality.',
      sub: 'Fast is easy. Reliable under pressure is what separates serious operators.',
      proofPoints: [
        'Design and development built in one execution loop',
        'Decisions anchored in commercial outcomes',
        'Every deliverable reviewed to production standard',
      ],
    },
  },
  {
    id: 'w17-service-build',
    weekId: 'week-17',
    family: 'Service',
    locale: 'EN',
    title: 'Build lane service post',
    template: 'service',
    format: 'portrait',
    bestFor: 'Instagram',
    platforms: ['Instagram', 'Facebook', 'LinkedIn'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    content: {
      tag: 'Build',
      service: 'Conversion\nWeb Systems',
      description:
        'Web experiences engineered for trust, speed, and measurable business outcomes.',
      features: [
        'Premium brand and interface direction',
        'Developer-grade implementation and QA',
        'Structured handoff with no loose ends',
        'Designed to support campaigns and growth',
      ],
      cta: 'Discuss your build',
    },
  },
  {
    id: 'w17-offer-growth',
    weekId: 'week-17',
    family: 'Offer',
    locale: 'EN',
    title: 'Growth offer post',
    template: 'offer',
    format: 'portrait',
    bestFor: 'Facebook',
    platforms: ['Facebook', 'Instagram'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    content: {
      tag: 'Growth',
      headline: 'Lead Generation\nSystem Sprint',
      included: [
        'Capture and qualification flow design',
        'CRM routing and lifecycle setup',
        'Follow-up sequence framework',
        'Weekly tracking dashboard setup',
      ],
      price: 'From EUR 2,400',
      note: 'For teams that need cleaner demand execution this quarter.',
    },
  },
  {
    id: 'w17-carousel-web',
    weekId: 'week-17',
    family: 'Carousel',
    locale: 'EN',
    title: 'Website conversion carousel',
    template: 'carousel',
    format: 'portrait',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram', 'Facebook'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    slideIndex: 0,
    content: [
      {
        slideNumber: 1,
        totalSlides: 4,
        title: 'Why premium\nwebsites still\nunderperform.',
        body: 'Most sites look polished but lack decision architecture. Here is the framework we use to fix that.',
      },
      {
        slideNumber: 2,
        totalSlides: 4,
        title: 'Step 1:\nPositioning\nclarity.',
        body: 'If your first fold does not define a specific buyer and a specific problem, conversion drops before intent is formed.',
      },
      {
        slideNumber: 3,
        totalSlides: 4,
        title: 'Step 2:\nTrust and\nproof density.',
        body: 'Case evidence, outcome framing, and commercial signals should appear before every major CTA transition.',
      },
      {
        slideNumber: 4,
        totalSlides: 4,
        title: 'Step 3:\nA real intake\nsystem.',
        body: 'A high-converting site routes qualified intent into a clear intake flow, not a vague contact endpoint.',
        isLast: true,
      },
    ],
  },
  {
    id: 'w18-authority-systems',
    weekId: 'week-18',
    family: 'Authority',
    locale: 'EN',
    title: 'Systems authority post',
    template: 'authority',
    format: 'square',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram'],
    recommendedFormat: 'square',
    formatVariants: ['square', 'portrait', 'story'],
    content: {
      tag: 'Systems',
      headline: 'The bottleneck\nis usually\nworkflow design.',
      sub: 'Most teams do not need more tools. They need cleaner handoff logic and better operational rhythm.',
      proofPoints: [
        'Single source CRM routing',
        'Automated follow-up at key decision points',
        'Clear owner per commercial stage',
      ],
    },
  },
  {
    id: 'w18-quote-operator',
    weekId: 'week-18',
    family: 'Authority',
    locale: 'EN',
    title: 'Operator quote',
    template: 'quote',
    format: 'square',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram', 'Facebook'],
    recommendedFormat: 'square',
    formatVariants: ['square', 'portrait'],
    content: {
      tag: 'Operator memo',
      quote:
        'Good systems do not feel flashy. They feel calm, reliable, and impossible to outgrow.',
      author: 'Inovense',
      title: 'Internal systems and growth infrastructure',
    },
  },
  {
    id: 'w18-service-systems',
    weekId: 'week-18',
    family: 'Service',
    locale: 'EN',
    title: 'Systems lane service post',
    template: 'service',
    format: 'square',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram'],
    recommendedFormat: 'square',
    formatVariants: ['square', 'portrait'],
    content: {
      tag: 'Systems',
      service: 'Commercial\nOps Layer',
      description:
        'Internal tooling, routing logic, and automation that support consistent execution across the full client lifecycle.',
      features: [
        'Lead lifecycle architecture',
        'Proposal and payment workflow integration',
        'Onboarding automation and status visibility',
        'Reporting built for operator decisions',
      ],
      cta: 'Build your system',
    },
  },
  {
    id: 'w18-offer-shopify',
    weekId: 'week-18',
    family: 'Offer',
    locale: 'EN',
    title: 'Shopify optimization offer',
    template: 'offer',
    format: 'portrait',
    bestFor: 'Instagram',
    platforms: ['Instagram', 'Facebook'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    content: {
      tag: 'Shopify',
      headline: 'Storefront\nConversion\nReview',
      included: [
        'Homepage and PDP conversion audit',
        'Navigation and trust layer recommendations',
        'Offer hierarchy and pricing clarity review',
        '30-day execution roadmap',
      ],
      price: 'From EUR 1,450',
      note: 'Ideal for brands preparing for a major campaign window.',
    },
  },
  {
    id: 'w19-process-website',
    weekId: 'week-19',
    family: 'Explainer',
    locale: 'EN',
    title: 'Website process carousel',
    template: 'process_carousel',
    format: 'portrait',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram', 'Facebook'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    slideIndex: 0,
    content: [
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
        tag: 'Build Systems',
        title: 'Every step has\nan owner and\nan output.',
        subtitle: 'Execution quality comes from systemized handoffs between phases.',
        steps: [
          { icon: 'strategy', title: 'Brief', detail: 'Business goals and constraints' },
          { icon: 'structure', title: 'Blueprint', detail: 'Page structure and conversion flow' },
          { icon: 'design', title: 'Design', detail: 'Visual direction and UI states' },
          { icon: 'build', title: 'Implementation', detail: 'Code, integrations, QA' },
          { icon: 'launch', title: 'Go-live', detail: 'Release, analytics, and handoff' },
        ],
        cta: 'See our work',
      },
      {
        slideNumber: 3,
        totalSlides: 3,
        tag: 'Build Outcomes',
        title: 'Premium process,\ncleaner outcomes.',
        subtitle: 'Clarity in flow creates better speed, quality, and commercial confidence.',
        steps: [
          { icon: 'strategy', title: 'Clarity', detail: 'Fewer high-risk assumptions' },
          { icon: 'structure', title: 'Consistency', detail: 'Repeatable delivery standards' },
          { icon: 'design', title: 'Trust', detail: 'Sharper brand perception' },
          { icon: 'build', title: 'Performance', detail: 'Faster and more stable output' },
          { icon: 'launch', title: 'Momentum', detail: 'Ready for growth campaigns' },
        ],
        cta: 'inovense.com',
        isLast: true,
      },
    ],
  },
  {
    id: 'w19-systems-explainer',
    weekId: 'week-19',
    family: 'Explainer',
    locale: 'EN',
    title: 'Systems automation explainer',
    template: 'systems_explainer',
    format: 'square',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram'],
    recommendedFormat: 'square',
    formatVariants: ['square', 'portrait'],
    content: {
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
      cta: 'Build your systems',
    },
  },
  {
    id: 'w19-growth-process',
    weekId: 'week-19',
    family: 'Explainer',
    locale: 'EN',
    title: 'Growth system flow explainer',
    template: 'build_flow_explainer',
    format: 'portrait',
    bestFor: 'Instagram',
    platforms: ['Instagram', 'LinkedIn', 'Facebook'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    content: {
      tag: 'Growth Flow',
      title: 'Traffic to CRM,\nwithout handoff\nleakage.',
      subtitle:
        'A practical growth system flow that ties acquisition to follow-up and reporting.',
      steps: [
        { icon: 'traffic', title: 'Traffic', detail: 'Qualified demand channels' },
        { icon: 'landing', title: 'Landing', detail: 'Offer-first conversion surface' },
        { icon: 'crm', title: 'CRM', detail: 'Lifecycle and ownership logic' },
        { icon: 'follow_up', title: 'Follow-up', detail: 'Automated but contextual outreach' },
        { icon: 'report', title: 'Report', detail: 'Weekly visibility and iteration' },
      ],
      cta: 'Discuss growth systems',
    },
  },
  {
    id: 'w20-proof-systems',
    weekId: 'week-20',
    family: 'Proof',
    locale: 'EN',
    title: 'Systems proof snippet',
    template: 'proof_snippet',
    format: 'portrait',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram', 'Facebook'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    content: {
      tag: 'Case Snippet',
      headline: 'Manual follow-up\nto systemized\npipeline control.',
      sub: 'Compact proof format for feed-level trust and commercial authority.',
      outcomeLabel: 'Result in 45 days',
      outcome: '+38% qualified calls',
      context: 'Service business with high inbound demand and inconsistent lead handling.',
      whatChanged: [
        'Rebuilt lead routing and ownership logic in CRM',
        'Introduced proposal/payment event automation at decision points',
        'Added weekly review loop with source and conversion visibility',
      ],
      cta: 'Build your systems',
    },
  },
  {
    id: 'w20-proof-carousel-growth',
    weekId: 'week-20',
    family: 'Carousel',
    locale: 'EN',
    title: 'Growth proof carousel',
    template: 'proof_carousel',
    format: 'portrait',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram', 'Facebook'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    slideIndex: 0,
    content: [
      {
        slideNumber: 1,
        totalSlides: 3,
        tag: 'Proof Loop',
        title: 'Growth system\nproof in\nthree cards.',
        subtitle: 'A compact sequence for feed-native trust and authority.',
        outcomeLabel: 'Result',
        outcome: '+41% lead-to-call',
        context: 'B2B service pipeline over 8 weeks.',
        whatChanged: [
          'Offer-led landing architecture',
          'CRM follow-up logic rebuilt',
          'Weekly conversion review cadence',
        ],
      },
      {
        slideNumber: 2,
        totalSlides: 3,
        tag: 'What Changed',
        title: 'Structure first,\nthen traffic.',
        subtitle: 'Most wins came from fixing handoffs before scaling acquisition.',
        outcomeLabel: 'Delta',
        outcome: '-29% response lag',
        context: 'Lower delay from inbound inquiry to contextual outreach.',
        whatChanged: [
          'Lead source segmentation in CRM',
          'Decision-point automations',
          'Clear lane ownership and QA',
        ],
      },
      {
        slideNumber: 3,
        totalSlides: 3,
        tag: 'Operator Takeaway',
        title: 'Proof beats\npromise in\nserious markets.',
        subtitle: 'Use repeatable systems and show concrete movement.',
        outcomeLabel: 'Net impact',
        outcome: 'Higher intent pipeline',
        context: 'Stable, scalable execution with better commercial confidence.',
        whatChanged: [
          'Measurement baseline agreed upfront',
          'Execution loop documented and repeated',
          'Weekly decisions tied to signal, not intuition',
        ],
        cta: 'inovense.com',
        isLast: true,
      },
    ],
  },
  {
    id: 'w20-authority-nl',
    weekId: 'week-20',
    family: 'Authority',
    locale: 'NL',
    title: 'Authority post NL',
    template: 'authority',
    format: 'square',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram'],
    recommendedFormat: 'square',
    formatVariants: ['square', 'portrait'],
    content: {
      tag: 'Executie',
      headline: 'Groei zonder\nsysteem is\nfrictie op schaal.',
      sub: 'Sterke output komt uit duidelijke operatie, niet uit losse tactieken.',
      proofPoints: [
        'Eén commerciële flow van intake tot handoff',
        'Duidelijke eigenaars per beslismoment',
        'Proceskwaliteit zichtbaar in elke oplevering',
      ],
    },
  },
  {
    id: 'w20-service-nl',
    weekId: 'week-20',
    family: 'Service',
    locale: 'NL',
    title: 'Service post NL',
    template: 'service',
    format: 'portrait',
    bestFor: 'Instagram',
    platforms: ['Instagram', 'LinkedIn', 'Facebook'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    content: {
      tag: 'Systems',
      service: 'Commerciële\nOperatielaag',
      description:
        'Workflow, automatisering en zichtbaarheid die teams rust en snelheid geven.',
      features: [
        'Leadflow en routering per lane',
        'Voorstel- en betaalmomenten gekoppeld',
        'Onboarding en delivery handoff zonder chaos',
        'Rapportage voor operatorbeslissingen',
      ],
      cta: 'Bouw je systeem',
    },
  },
  {
    id: 'w20-proof-nl',
    weekId: 'week-20',
    family: 'Proof',
    locale: 'NL',
    title: 'Proof snippet NL',
    template: 'proof_snippet',
    format: 'portrait',
    bestFor: 'LinkedIn',
    platforms: ['LinkedIn', 'Instagram', 'Facebook'],
    recommendedFormat: 'portrait',
    formatVariants: ['portrait', 'square'],
    content: {
      tag: 'Case Snippet',
      headline: 'Van losse leads\nnaar een\nstrakke flow.',
      sub: 'Proof-format voor snelle geloofwaardigheid in de feed.',
      outcomeLabel: 'Resultaat in 6 weken',
      outcome: '+33% gekwalificeerde calls',
      context: 'Dienstverlener met genoeg vraag, maar te veel handoff-lekkage.',
      whatChanged: [
        'Intake en opvolging in één CRM-flow gezet',
        'Status- en e-mailmomenten op beslispunten vastgezet',
        'Wekelijkse reviewloop met duidelijke KPI-baseline',
      ],
      cta: 'inovense.com',
    },
  },
];

