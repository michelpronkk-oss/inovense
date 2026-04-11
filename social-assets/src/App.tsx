import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FacebookPageCoverBanner,
  LinkedInCompanyBanner,
  type BrandBannerData,
} from './components/banners/BrandBanners';
import { AuthorityPost, type AuthorityPostData } from './components/posts/AuthorityPost';
import { BuildFlowExplainer } from './components/posts/BuildFlowExplainer';
import { CarouselSlide, type CarouselSlideData } from './components/posts/CarouselSlide';
import { OfferPost, type OfferPostData } from './components/posts/OfferPost';
import { ProcessCarousel } from './components/posts/ProcessCarousel';
import { QuotePost, type QuotePostData } from './components/posts/QuotePost';
import { ServicePost, type ServicePostData } from './components/posts/ServicePost';
import { SystemsExplainer } from './components/posts/SystemsExplainer';
import type {
  BuildFlowExplainerData,
  ProcessCarouselSlideData,
  SystemsExplainerData,
} from './components/posts/explainer-types';
import {
  SAVED_POSTS,
  SOCIAL_PLATFORMS,
  WEEKLY_POST_SETS,
  type SavedPost,
  type SocialPlatform,
  type TemplateKey,
} from './data/content-library';
import {
  activeSlideIndex,
  buildFlowExplainerSample,
  authorityPostSample,
  carouselSlides,
  facebookCoverBannerSample,
  linkedInCompanyBannerSample,
  offerPostSample,
  processCarouselSlidesSample,
  quotePostSample,
  servicePostSample,
  systemsExplainerSample,
} from './data/samples';
import { exportPost } from './utils/export';
import { FORMATS, FORMAT_LIST, type FormatKey } from './utils/formats';
import './App.css';

type ParseResult<T> = {
  data: T;
  error: string | null;
};

type PlatformFilter = 'all' | SocialPlatform;
type UsageField = 'exported' | 'posted';
type PlatformUsageState = {
  exported: boolean;
  posted: boolean;
};
type PostUsageMap = Record<string, Partial<Record<SocialPlatform, PlatformUsageState>>>;

const POST_USAGE_STORAGE_KEY = 'inovense-social-assets-post-usage-v1';

const templateOptions: Array<{ key: TemplateKey; label: string; description: string }> = [
  {
    key: 'authority',
    label: 'Authority Post',
    description: 'Operator positioning and strategic point of view.',
  },
  {
    key: 'service',
    label: 'Service Post',
    description: 'Service breakdown with premium structure and feature hierarchy.',
  },
  {
    key: 'offer',
    label: 'Offer Post',
    description: 'Offer-led creative with structured inclusions and CTA signal.',
  },
  {
    key: 'quote',
    label: 'Quote Post',
    description: 'Editorial quote layout for founder and authority moments.',
  },
  {
    key: 'carousel',
    label: 'Carousel Slide',
    description: 'Step-based educational carousel with sequence progress.',
  },
  {
    key: 'process_carousel',
    label: 'Process Carousel',
    description: 'Icon-led process carousel for service and workflow explainers.',
  },
  {
    key: 'systems_explainer',
    label: 'Systems Explainer',
    description: 'Single-slide systems logic explainer with icon-led process blocks.',
  },
  {
    key: 'build_flow_explainer',
    label: 'Build Flow Explainer',
    description: 'Icon-led build process template for website and delivery flows.',
  },
  {
    key: 'facebook_banner',
    label: 'Facebook Cover Banner',
    description: 'Safe-area-aware Facebook page cover asset.',
  },
  {
    key: 'linkedin_banner',
    label: 'LinkedIn Company Banner',
    description: 'Safe-area-aware LinkedIn company header asset.',
  },
];

const defaultJsonByTemplate: Record<TemplateKey, string> = {
  authority: JSON.stringify(authorityPostSample, null, 2),
  service: JSON.stringify(servicePostSample, null, 2),
  offer: JSON.stringify(offerPostSample, null, 2),
  quote: JSON.stringify(quotePostSample, null, 2),
  carousel: JSON.stringify(carouselSlides, null, 2),
  process_carousel: JSON.stringify(processCarouselSlidesSample, null, 2),
  systems_explainer: JSON.stringify(systemsExplainerSample, null, 2),
  build_flow_explainer: JSON.stringify(buildFlowExplainerSample, null, 2),
  facebook_banner: JSON.stringify(facebookCoverBannerSample, null, 2),
  linkedin_banner: JSON.stringify(linkedInCompanyBannerSample, null, 2),
};

const TEMPLATE_ALLOWED_FORMATS: Record<TemplateKey, FormatKey[]> = {
  authority: ['portrait', 'square', 'story'],
  service: ['portrait', 'square', 'story'],
  offer: ['portrait', 'square', 'story'],
  quote: ['portrait', 'square', 'story'],
  carousel: ['portrait', 'square', 'story'],
  process_carousel: ['portrait', 'square', 'story'],
  systems_explainer: ['portrait', 'square', 'story'],
  build_flow_explainer: ['portrait', 'square', 'story'],
  facebook_banner: ['facebook_cover'],
  linkedin_banner: ['linkedin_banner'],
};

const BANNER_TEMPLATE_KEYS: TemplateKey[] = ['facebook_banner', 'linkedin_banner'];

const weekFilterOptions = [
  {
    id: 'all',
    label: 'All saved posts',
    focus: 'All weeks',
  },
  ...WEEKLY_POST_SETS,
];

const platformFilterOptions: Array<{ key: PlatformFilter; label: string }> = [
  { key: 'all', label: 'All platforms' },
  { key: 'Instagram', label: 'Instagram' },
  { key: 'Facebook', label: 'Facebook' },
  { key: 'LinkedIn', label: 'LinkedIn' },
];

const parseObjectData = <T extends object>(raw: string, fallback: T): ParseResult<T> => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        data: fallback,
        error: 'JSON must be a single object for this template.',
      };
    }

    return { data: parsed as T, error: null };
  } catch {
    return {
      data: fallback,
      error: 'JSON is invalid. Fix syntax to apply edits.',
    };
  }
};

const parseArrayData = <T,>(
  raw: string,
  fallback: T[],
  templateLabel = 'Carousel'
): ParseResult<T[]> => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        data: fallback,
        error: `${templateLabel} JSON must be an array.`,
      };
    }

    return { data: parsed as T[], error: null };
  } catch {
    return {
      data: fallback,
      error: 'JSON is invalid. Fix syntax to apply edits.',
    };
  }
};

const getUsageState = (
  usageByPost: PostUsageMap,
  postId: string,
  platform: SocialPlatform
): PlatformUsageState => {
  return usageByPost[postId]?.[platform] ?? { exported: false, posted: false };
};

const getSavedPostStatus = (
  usageByPost: PostUsageMap,
  postId: string,
  platformFilter: PlatformFilter
): string => {
  if (platformFilter !== 'all') {
    const usage = getUsageState(usageByPost, postId, platformFilter);
    if (usage.posted) {
      return `${platformFilter}: Posted`;
    }
    if (usage.exported) {
      return `${platformFilter}: Exported`;
    }
    return `${platformFilter}: Ready`;
  }

  const postedCount = SOCIAL_PLATFORMS.filter(
    (platform) => usageByPost[postId]?.[platform]?.posted
  ).length;
  const exportedCount = SOCIAL_PLATFORMS.filter(
    (platform) => usageByPost[postId]?.[platform]?.exported
  ).length;

  if (!postedCount && !exportedCount) {
    return 'Usage: Ready';
  }

  return `Usage: ${postedCount} posted, ${exportedCount} exported`;
};

function App() {
  const [templateKey, setTemplateKey] = useState<TemplateKey>('authority');
  const [formatKey, setFormatKey] = useState<FormatKey>('portrait');
  const [selectedWeekId, setSelectedWeekId] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>('all');
  const [activeSavedPostId, setActiveSavedPostId] = useState<string | null>(null);
  const [usageByPost, setUsageByPost] = useState<PostUsageMap>({});
  const [jsonByTemplate, setJsonByTemplate] = useState<Record<TemplateKey, string>>(
    defaultJsonByTemplate
  );
  const [carouselIndex, setCarouselIndex] = useState(activeSlideIndex);
  const [showSafeGuides, setShowSafeGuides] = useState(true);
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const currentFormat = FORMATS[formatKey];
  const activeTemplateMeta = templateOptions.find((template) => template.key === templateKey);
  const allowedFormatsForTemplate = TEMPLATE_ALLOWED_FORMATS[templateKey];
  const isBannerTemplate = BANNER_TEMPLATE_KEYS.includes(templateKey);
  const activeJson = jsonByTemplate[templateKey];
  const activeWeekMeta = weekFilterOptions.find((week) => week.id === selectedWeekId);
  const weekScopedPosts = useMemo(() => {
    if (selectedWeekId === 'all') {
      return SAVED_POSTS;
    }
    const selectedSet = WEEKLY_POST_SETS.find((set) => set.id === selectedWeekId);
    if (!selectedSet) {
      return [];
    }
    const orderedPosts = selectedSet.postIds
      .map((postId) => SAVED_POSTS.find((post) => post.id === postId))
      .filter((post): post is SavedPost => !!post);
    return orderedPosts;
  }, [selectedWeekId]);
  const visiblePosts = useMemo(() => {
    if (selectedPlatform === 'all') {
      return weekScopedPosts;
    }
    return weekScopedPosts.filter((post) => post.platforms.includes(selectedPlatform));
  }, [selectedPlatform, weekScopedPosts]);
  const activeSavedPost = useMemo(
    () => SAVED_POSTS.find((post) => post.id === activeSavedPostId) ?? null,
    [activeSavedPostId]
  );
  const activeSavedPostForTemplate =
    activeSavedPost && activeSavedPost.template === templateKey ? activeSavedPost : null;

  const authorityParsed = useMemo(
    () => parseObjectData<AuthorityPostData>(jsonByTemplate.authority, authorityPostSample),
    [jsonByTemplate.authority]
  );
  const serviceParsed = useMemo(
    () => parseObjectData<ServicePostData>(jsonByTemplate.service, servicePostSample),
    [jsonByTemplate.service]
  );
  const offerParsed = useMemo(
    () => parseObjectData<OfferPostData>(jsonByTemplate.offer, offerPostSample),
    [jsonByTemplate.offer]
  );
  const quoteParsed = useMemo(
    () => parseObjectData<QuotePostData>(jsonByTemplate.quote, quotePostSample),
    [jsonByTemplate.quote]
  );
  const carouselParsed = useMemo(
    () => parseArrayData<CarouselSlideData>(jsonByTemplate.carousel, carouselSlides, 'Carousel'),
    [jsonByTemplate.carousel]
  );
  const processCarouselParsed = useMemo(
    () =>
      parseArrayData<ProcessCarouselSlideData>(
        jsonByTemplate.process_carousel,
        processCarouselSlidesSample,
        'Process carousel'
      ),
    [jsonByTemplate.process_carousel]
  );
  const systemsExplainerParsed = useMemo(
    () =>
      parseObjectData<SystemsExplainerData>(
        jsonByTemplate.systems_explainer,
        systemsExplainerSample
      ),
    [jsonByTemplate.systems_explainer]
  );
  const buildFlowExplainerParsed = useMemo(
    () =>
      parseObjectData<BuildFlowExplainerData>(
        jsonByTemplate.build_flow_explainer,
        buildFlowExplainerSample
      ),
    [jsonByTemplate.build_flow_explainer]
  );
  const facebookBannerParsed = useMemo(
    () =>
      parseObjectData<BrandBannerData>(
        jsonByTemplate.facebook_banner,
        facebookCoverBannerSample
      ),
    [jsonByTemplate.facebook_banner]
  );
  const linkedInBannerParsed = useMemo(
    () =>
      parseObjectData<BrandBannerData>(
        jsonByTemplate.linkedin_banner,
        linkedInCompanyBannerSample
      ),
    [jsonByTemplate.linkedin_banner]
  );

  const sequenceMaxIndex =
    templateKey === 'process_carousel'
      ? Math.max(0, processCarouselParsed.data.length - 1)
      : Math.max(0, carouselParsed.data.length - 1);
  const clampedCarouselIndex = Math.min(carouselIndex, sequenceMaxIndex);
  const activeCarouselSlide =
    carouselParsed.data[clampedCarouselIndex] ?? carouselSlides[Math.min(activeSlideIndex, carouselSlides.length - 1)];
  const activeProcessCarouselSlide =
    processCarouselParsed.data[clampedCarouselIndex] ??
    processCarouselSlidesSample[Math.min(activeSlideIndex, processCarouselSlidesSample.length - 1)];

  useEffect(() => {
    if (
      (templateKey === 'carousel' || templateKey === 'process_carousel') &&
      carouselIndex > sequenceMaxIndex
    ) {
      setCarouselIndex(sequenceMaxIndex);
    }
  }, [templateKey, carouselIndex, sequenceMaxIndex]);

  useEffect(() => {
    if (!allowedFormatsForTemplate.includes(formatKey)) {
      setFormatKey(allowedFormatsForTemplate[0]);
    }
  }, [allowedFormatsForTemplate, formatKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(POST_USAGE_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') {
        setUsageByPost(parsed as PostUsageMap);
      }
    } catch {
      setUsageByPost({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(POST_USAGE_STORAGE_KEY, JSON.stringify(usageByPost));
  }, [usageByPost]);

  useEffect(() => {
    if (!activeSavedPostId) {
      return;
    }
    const isVisible = visiblePosts.some((post) => post.id === activeSavedPostId);
    if (!isVisible) {
      setActiveSavedPostId(null);
    }
  }, [activeSavedPostId, visiblePosts]);

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport) {
      return;
    }

    const updateScale = () => {
      const bounds = viewport.getBoundingClientRect();
      const horizontalScale = (bounds.width - 24) / currentFormat.width;
      const verticalScale = (bounds.height - 24) / currentFormat.height;
      const nextScale = Math.min(1, horizontalScale, verticalScale);
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 0.1);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [currentFormat.height, currentFormat.width]);

  const activeError = (() => {
    switch (templateKey) {
      case 'authority':
        return authorityParsed.error;
      case 'service':
        return serviceParsed.error;
      case 'offer':
        return offerParsed.error;
      case 'quote':
        return quoteParsed.error;
      case 'carousel':
        return carouselParsed.error;
      case 'process_carousel':
        return processCarouselParsed.error;
      case 'systems_explainer':
        return systemsExplainerParsed.error;
      case 'build_flow_explainer':
        return buildFlowExplainerParsed.error;
      case 'facebook_banner':
        return facebookBannerParsed.error;
      case 'linkedin_banner':
        return linkedInBannerParsed.error;
      default:
        return null;
    }
  })();
  const activePostVariantFormat =
    activeSavedPostForTemplate && activeSavedPostForTemplate.formatVariants.includes(formatKey)
      ? formatKey
      : activeSavedPostForTemplate?.recommendedFormat ?? formatKey;

  const handleJsonChange = (value: string) => {
    setJsonByTemplate((previous) => ({
      ...previous,
      [templateKey]: value,
    }));
    setActiveSavedPostId(null);
  };

  const resetActiveTemplate = () => {
    setJsonByTemplate((previous) => ({
      ...previous,
      [templateKey]: defaultJsonByTemplate[templateKey],
    }));
    setActiveSavedPostId(null);
    if (templateKey === 'carousel' || templateKey === 'process_carousel') {
      setCarouselIndex(activeSlideIndex);
    }
  };

  const loadSavedPost = (post: SavedPost) => {
    setJsonByTemplate((previous) => ({
      ...previous,
      [post.template]: JSON.stringify(post.content, null, 2),
    }));
    setTemplateKey(post.template);
    setFormatKey(post.recommendedFormat);
    setActiveSavedPostId(post.id);
    if (post.template === 'carousel' || post.template === 'process_carousel') {
      setCarouselIndex(post.slideIndex ?? 0);
    }
  };

  const setPostUsageFlag = (
    postId: string,
    platform: SocialPlatform,
    field: UsageField,
    checked: boolean
  ) => {
    setUsageByPost((previous) => {
      const postUsage = previous[postId] ?? {};
      const currentPlatformUsage = postUsage[platform] ?? { exported: false, posted: false };
      const nextPlatformUsage: PlatformUsageState = {
        ...currentPlatformUsage,
        [field]: checked,
      };

      if (field === 'posted' && checked) {
        nextPlatformUsage.exported = true;
      }
      if (field === 'exported' && !checked) {
        nextPlatformUsage.posted = false;
      }

      return {
        ...previous,
        [postId]: {
          ...postUsage,
          [platform]: nextPlatformUsage,
        },
      };
    });
  };

  const handleExport = async () => {
    if (!canvasRef.current || activeError) {
      return;
    }

    setExporting(true);
    const shouldHideGuidesForExport = isBannerTemplate && showSafeGuides;
    try {
      if (shouldHideGuidesForExport) {
        setShowSafeGuides(false);
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      }
      const exportPixelRatio = isBannerTemplate
        ? 3.4
        : formatKey === 'story'
          ? 3.3
          : 3.5;
      await exportPost(
        canvasRef.current,
        `inovense-${templateKey}-${formatKey}`,
        exportPixelRatio
      );
      if (activeSavedPostId && selectedPlatform !== 'all') {
        setPostUsageFlag(activeSavedPostId, selectedPlatform, 'exported', true);
      }
    } finally {
      if (shouldHideGuidesForExport) {
        setShowSafeGuides(true);
      }
      setExporting(false);
    }
  };

  return (
    <div className="social-app">
      <aside className="control-panel">
        <div className="control-header">
          <p className="eyebrow">Inovense Social Assets</p>
          <h1>Static Post Studio</h1>
          <p>{activeTemplateMeta?.description}</p>
        </div>

        <div className="control-group">
          <label htmlFor="template-select">Template</label>
          <select
            id="template-select"
            className="select-field"
            value={templateKey}
            onChange={(event) => {
              setTemplateKey(event.target.value as TemplateKey);
              setActiveSavedPostId(null);
            }}
          >
            {templateOptions.map((template) => (
              <option key={template.key} value={template.key}>
                {template.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <div className="group-head">
            <label htmlFor="week-select">Weekly post sets</label>
            <span className="helper-chip">
              {visiblePosts.length}/{weekScopedPosts.length} visible
            </span>
          </div>
          <select
            id="week-select"
            className="select-field"
            value={selectedWeekId}
            onChange={(event) => setSelectedWeekId(event.target.value)}
          >
            {weekFilterOptions.map((week) => (
              <option key={week.id} value={week.id}>
                {week.label}
              </option>
            ))}
          </select>
          <label htmlFor="platform-filter-select">Platform filter</label>
          <select
            id="platform-filter-select"
            className="select-field"
            value={selectedPlatform}
            onChange={(event) => setSelectedPlatform(event.target.value as PlatformFilter)}
          >
            {platformFilterOptions.map((platform) => (
              <option key={platform.key} value={platform.key}>
                {platform.label}
              </option>
            ))}
          </select>
          <p className="helper-text">
            {activeWeekMeta?.focus ?? 'Load saved post content into the current editor.'}
            {selectedPlatform === 'all' ? '' : ` Filtered for ${selectedPlatform}.`}
          </p>
          <div className="saved-post-list">
            {visiblePosts.length ? (
              visiblePosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className={`saved-post-item ${activeSavedPostId === post.id ? 'is-active' : ''}`}
                  onClick={() => loadSavedPost(post)}
                >
                  <span className="saved-post-title">{post.title}</span>
                  <span className="saved-post-meta">
                    {templateOptions.find((template) => template.key === post.template)?.label} |{' '}
                    {FORMATS[post.format].label}
                  </span>
                  <span className="saved-post-guidance">
                    Best for {post.bestFor} | Recommended {FORMATS[post.recommendedFormat].label}
                  </span>
                  <span className="saved-post-status">
                    {getSavedPostStatus(usageByPost, post.id, selectedPlatform)}
                  </span>
                </button>
              ))
            ) : (
              <p className="helper-text">No posts match this week and platform filter.</p>
            )}
          </div>
        </div>

        {activeSavedPostForTemplate ? (
          <div className="control-group">
            <div className="group-head">
              <span>Post operations</span>
              <span className="helper-chip">{activeSavedPostForTemplate.bestFor}</span>
            </div>
            <p className="helper-text">
              Recommended format: {FORMATS[activeSavedPostForTemplate.recommendedFormat].label}
            </p>
            <label htmlFor="variant-select">Format variant</label>
            <select
              id="variant-select"
              className="select-field"
              value={activePostVariantFormat}
              onChange={(event) => setFormatKey(event.target.value as FormatKey)}
            >
              {activeSavedPostForTemplate.formatVariants.map((variant) => (
                <option key={variant} value={variant}>
                  {FORMATS[variant].label}
                </option>
              ))}
            </select>
            <div className="usage-grid">
              {SOCIAL_PLATFORMS.map((platform) => {
                const platformUsage = getUsageState(
                  usageByPost,
                  activeSavedPostForTemplate.id,
                  platform
                );
                return (
                  <div key={platform} className="usage-row">
                    <span className="usage-platform">{platform}</span>
                    <label className="usage-check">
                      <input
                        type="checkbox"
                        checked={platformUsage.exported}
                        onChange={(event) =>
                          setPostUsageFlag(
                            activeSavedPostForTemplate.id,
                            platform,
                            'exported',
                            event.target.checked
                          )
                        }
                      />
                      <span>Exported</span>
                    </label>
                    <label className="usage-check">
                      <input
                        type="checkbox"
                        checked={platformUsage.posted}
                        onChange={(event) =>
                          setPostUsageFlag(
                            activeSavedPostForTemplate.id,
                            platform,
                            'posted',
                            event.target.checked
                          )
                        }
                      />
                      <span>Posted</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="control-group">
          <span>Format</span>
          <div className="chip-row">
            {FORMAT_LIST.map((format) => {
              const isAllowedForTemplate = allowedFormatsForTemplate.includes(format.key);
              const isAllowedForPost =
                !activeSavedPostForTemplate ||
                activeSavedPostForTemplate.formatVariants.includes(format.key);
              const isAllowed = isAllowedForTemplate && isAllowedForPost;
              return (
                <button
                  key={format.key}
                  type="button"
                  className={`chip ${format.key === formatKey ? 'is-active' : ''} ${
                    isAllowed ? '' : 'is-disabled'
                  }`}
                  onClick={() => setFormatKey(format.key)}
                  disabled={!isAllowed}
                >
                  {format.label}
                </button>
              );
            })}
          </div>
          {activeSavedPostForTemplate ? (
            <p className="helper-text">
              Variants for this post:{' '}
              {activeSavedPostForTemplate.formatVariants
                .map((key) => FORMATS[key].label)
                .join(', ')}
            </p>
          ) : null}
        </div>

        {isBannerTemplate ? (
          <div className="control-group">
            <span>Banner safe guides</span>
            <label className="usage-check">
              <input
                type="checkbox"
                checked={showSafeGuides}
                onChange={(event) => setShowSafeGuides(event.target.checked)}
              />
              <span>Show safe areas in preview only</span>
            </label>
            <p className="helper-text">
              Guides are hidden automatically during export.
            </p>
          </div>
        ) : null}

        {templateKey === 'carousel' || templateKey === 'process_carousel' ? (
          <div className="control-group">
            <label htmlFor="carousel-index">Slide</label>
            <div className="range-row">
              <input
                id="carousel-index"
                type="range"
                min={0}
                max={sequenceMaxIndex}
                value={clampedCarouselIndex}
                onChange={(event) => setCarouselIndex(Number(event.target.value))}
              />
              <span>
                {clampedCarouselIndex + 1} / {sequenceMaxIndex + 1}
              </span>
            </div>
          </div>
        ) : null}

        <div className="control-group">
          <div className="group-head">
            <label htmlFor="json-editor">Content JSON</label>
            <button type="button" className="text-link" onClick={resetActiveTemplate}>
              Reset
            </button>
          </div>
          <textarea
            id="json-editor"
            className={`json-editor ${activeError ? 'is-error' : ''}`}
            value={activeJson}
            onChange={(event) => handleJsonChange(event.target.value)}
            spellCheck={false}
          />
          <p className={`helper-text ${activeError ? 'is-error' : ''}`}>
            {activeError ?? 'Edit JSON to change copy, tags, proof points, and post structure.'}
          </p>
        </div>

        <div className="control-group">
          <button type="button" className="export-button" onClick={handleExport} disabled={!!activeError || exporting}>
            {exporting ? 'Exporting...' : 'Export PNG'}
          </button>
        </div>
      </aside>

      <main className="preview-panel">
        <div className="preview-header">
          <p>
            {currentFormat.width} x {currentFormat.height}
          </p>
        </div>
        <div className="preview-stage" ref={stageViewportRef}>
          <div
            className="preview-canvas"
            style={{
              width: currentFormat.width,
              height: currentFormat.height,
              transform: `scale(${scale})`,
            }}
          >
            {templateKey === 'authority' ? (
              <AuthorityPost ref={canvasRef} data={authorityParsed.data} format={currentFormat} />
            ) : null}
            {templateKey === 'service' ? (
              <ServicePost ref={canvasRef} data={serviceParsed.data} format={currentFormat} />
            ) : null}
            {templateKey === 'offer' ? (
              <OfferPost ref={canvasRef} data={offerParsed.data} format={currentFormat} />
            ) : null}
            {templateKey === 'quote' ? (
              <QuotePost ref={canvasRef} data={quoteParsed.data} format={currentFormat} />
            ) : null}
            {templateKey === 'carousel' ? (
              <CarouselSlide ref={canvasRef} data={activeCarouselSlide} format={currentFormat} />
            ) : null}
            {templateKey === 'process_carousel' ? (
              <ProcessCarousel ref={canvasRef} data={activeProcessCarouselSlide} format={currentFormat} />
            ) : null}
            {templateKey === 'systems_explainer' ? (
              <SystemsExplainer
                ref={canvasRef}
                data={systemsExplainerParsed.data}
                format={currentFormat}
              />
            ) : null}
            {templateKey === 'build_flow_explainer' ? (
              <BuildFlowExplainer
                ref={canvasRef}
                data={buildFlowExplainerParsed.data}
                format={currentFormat}
              />
            ) : null}
            {templateKey === 'facebook_banner' ? (
              <FacebookPageCoverBanner
                ref={canvasRef}
                data={facebookBannerParsed.data}
                format={currentFormat}
                showSafeGuides={showSafeGuides}
              />
            ) : null}
            {templateKey === 'linkedin_banner' ? (
              <LinkedInCompanyBanner
                ref={canvasRef}
                data={linkedInBannerParsed.data}
                format={currentFormat}
                showSafeGuides={showSafeGuides}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
