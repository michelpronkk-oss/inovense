import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthorityPost, type AuthorityPostData } from './components/posts/AuthorityPost';
import { CarouselSlide, type CarouselSlideData } from './components/posts/CarouselSlide';
import { OfferPost, type OfferPostData } from './components/posts/OfferPost';
import { QuotePost, type QuotePostData } from './components/posts/QuotePost';
import { ServicePost, type ServicePostData } from './components/posts/ServicePost';
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
  authorityPostSample,
  carouselSlides,
  offerPostSample,
  quotePostSample,
  servicePostSample,
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
];

const defaultJsonByTemplate: Record<TemplateKey, string> = {
  authority: JSON.stringify(authorityPostSample, null, 2),
  service: JSON.stringify(servicePostSample, null, 2),
  offer: JSON.stringify(offerPostSample, null, 2),
  quote: JSON.stringify(quotePostSample, null, 2),
  carousel: JSON.stringify(carouselSlides, null, 2),
};

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

const parseArrayData = <T,>(raw: string, fallback: T[]): ParseResult<T[]> => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        data: fallback,
        error: 'Carousel JSON must be an array of slides.',
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
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const currentFormat = FORMATS[formatKey];
  const activeTemplateMeta = templateOptions.find((template) => template.key === templateKey);
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
    () => parseArrayData<CarouselSlideData>(jsonByTemplate.carousel, carouselSlides),
    [jsonByTemplate.carousel]
  );

  const carouselMaxIndex = Math.max(0, carouselParsed.data.length - 1);
  const clampedCarouselIndex = Math.min(carouselIndex, carouselMaxIndex);
  const activeCarouselSlide =
    carouselParsed.data[clampedCarouselIndex] ?? carouselSlides[Math.min(activeSlideIndex, carouselSlides.length - 1)];

  useEffect(() => {
    if (templateKey === 'carousel' && carouselIndex > carouselMaxIndex) {
      setCarouselIndex(carouselMaxIndex);
    }
  }, [templateKey, carouselIndex, carouselMaxIndex]);

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
      default:
        return null;
    }
  })();
  const activePostVariantFormat =
    activeSavedPost && activeSavedPost.formatVariants.includes(formatKey)
      ? formatKey
      : activeSavedPost?.recommendedFormat ?? formatKey;

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
    if (templateKey === 'carousel') {
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
    if (post.template === 'carousel') {
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
    try {
      await exportPost(
        canvasRef.current,
        `inovense-${templateKey}-${formatKey}`,
        formatKey === 'story' ? 2 : 2.4
      );
      if (activeSavedPostId && selectedPlatform !== 'all') {
        setPostUsageFlag(activeSavedPostId, selectedPlatform, 'exported', true);
      }
    } finally {
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
            onChange={(event) => setTemplateKey(event.target.value as TemplateKey)}
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

        {activeSavedPost ? (
          <div className="control-group">
            <div className="group-head">
              <span>Post operations</span>
              <span className="helper-chip">{activeSavedPost.bestFor}</span>
            </div>
            <p className="helper-text">
              Recommended format: {FORMATS[activeSavedPost.recommendedFormat].label}
            </p>
            <label htmlFor="variant-select">Format variant</label>
            <select
              id="variant-select"
              className="select-field"
              value={activePostVariantFormat}
              onChange={(event) => setFormatKey(event.target.value as FormatKey)}
            >
              {activeSavedPost.formatVariants.map((variant) => (
                <option key={variant} value={variant}>
                  {FORMATS[variant].label}
                </option>
              ))}
            </select>
            <div className="usage-grid">
              {SOCIAL_PLATFORMS.map((platform) => {
                const platformUsage = getUsageState(usageByPost, activeSavedPost.id, platform);
                return (
                  <div key={platform} className="usage-row">
                    <span className="usage-platform">{platform}</span>
                    <label className="usage-check">
                      <input
                        type="checkbox"
                        checked={platformUsage.exported}
                        onChange={(event) =>
                          setPostUsageFlag(
                            activeSavedPost.id,
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
                            activeSavedPost.id,
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
              const isAllowedForPost =
                !activeSavedPost || activeSavedPost.formatVariants.includes(format.key);
              return (
                <button
                  key={format.key}
                  type="button"
                  className={`chip ${format.key === formatKey ? 'is-active' : ''} ${
                    isAllowedForPost ? '' : 'is-disabled'
                  }`}
                  onClick={() => setFormatKey(format.key)}
                  disabled={!isAllowedForPost}
                >
                  {format.label}
                </button>
              );
            })}
          </div>
          {activeSavedPost ? (
            <p className="helper-text">
              Variants for this post: {activeSavedPost.formatVariants.map((key) => FORMATS[key].label).join(', ')}
            </p>
          ) : null}
        </div>

        {templateKey === 'carousel' ? (
          <div className="control-group">
            <label htmlFor="carousel-index">Slide</label>
            <div className="range-row">
              <input
                id="carousel-index"
                type="range"
                min={0}
                max={carouselMaxIndex}
                value={clampedCarouselIndex}
                onChange={(event) => setCarouselIndex(Number(event.target.value))}
              />
              <span>
                {clampedCarouselIndex + 1} / {carouselMaxIndex + 1}
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
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
