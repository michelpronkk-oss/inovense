import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthorityPost, type AuthorityPostData } from './components/posts/AuthorityPost';
import { CarouselSlide, type CarouselSlideData } from './components/posts/CarouselSlide';
import { OfferPost, type OfferPostData } from './components/posts/OfferPost';
import { QuotePost, type QuotePostData } from './components/posts/QuotePost';
import { ServicePost, type ServicePostData } from './components/posts/ServicePost';
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

type TemplateKey = 'authority' | 'service' | 'offer' | 'quote' | 'carousel';

type ParseResult<T> = {
  data: T;
  error: string | null;
};

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

function App() {
  const [templateKey, setTemplateKey] = useState<TemplateKey>('authority');
  const [formatKey, setFormatKey] = useState<FormatKey>('portrait');
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

  const handleJsonChange = (value: string) => {
    setJsonByTemplate((previous) => ({
      ...previous,
      [templateKey]: value,
    }));
  };

  const resetActiveTemplate = () => {
    setJsonByTemplate((previous) => ({
      ...previous,
      [templateKey]: defaultJsonByTemplate[templateKey],
    }));
    if (templateKey === 'carousel') {
      setCarouselIndex(activeSlideIndex);
    }
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
          <span>Format</span>
          <div className="chip-row">
            {FORMAT_LIST.map((format) => (
              <button
                key={format.key}
                type="button"
                className={`chip ${format.key === formatKey ? 'is-active' : ''}`}
                onClick={() => setFormatKey(format.key)}
              >
                {format.label}
              </button>
            ))}
          </div>
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
