import type { AuthorityPostData } from '../components/posts/AuthorityPost';
import type { ServicePostData } from '../components/posts/ServicePost';
import type { OfferPostData } from '../components/posts/OfferPost';
import type { QuotePostData } from '../components/posts/QuotePost';
import type { CarouselSlideData } from '../components/posts/CarouselSlide';

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

// Active slide index (0-based) - change this to preview different slides
export const activeSlideIndex = 0;
