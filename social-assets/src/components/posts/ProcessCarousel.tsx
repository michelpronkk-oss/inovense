import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { Tag } from '../primitives/Tag';
import { ExplainerIcon } from '../primitives/explainer-icons';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';
import type { ProcessCarouselSlideData } from './explainer-types';

interface ProcessCarouselProps {
  data: ProcessCarouselSlideData;
  format: Format;
}

export const ProcessCarousel = forwardRef<HTMLDivElement, ProcessCarouselProps>(
  ({ data, format }, ref) => {
    const pad = 72;
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';
    const progress = data.totalSlides > 0 ? data.slideNumber / data.totalSlides : 0;
    const slideLabel = String(data.slideNumber).padStart(2, '0');
    const totalLabel = String(data.totalSlides).padStart(2, '0');
    const steps = data.steps.slice(0, 5);

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.072} spacing={46} />
        <GlowAccent x="84%" y="14%" size={isStory ? 960 : 820} opacity={0.11} />
        <GlowAccent x="18%" y="98%" size={isStory ? 760 : 650} opacity={0.08} />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: `${pad}px ${pad}px`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Logo size="sm" />
            <Tag label={data.tag} />
          </div>

          <div
            style={{
              height: 1,
              background: brand.borderMid,
              marginTop: 24,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                background: brand.teal,
              }}
            />
          </div>

          <div style={{ marginTop: 30 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: brand.sans,
                fontSize: isSquare ? 52 : isStory ? 66 : 58,
                lineHeight: 1.08,
                letterSpacing: '-0.04em',
                color: brand.white,
                whiteSpace: 'pre-line',
              }}
            >
              {data.title}
            </h1>
            {data.subtitle ? (
              <p
                style={{
                  margin: '18px 0 0',
                  fontFamily: brand.sans,
                  fontSize: isStory ? 22 : 19,
                  lineHeight: 1.55,
                  color: brand.secondary,
                  maxWidth: 790,
                }}
              >
                {data.subtitle}
              </p>
            ) : null}
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${brand.borderMid}`,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.02)',
              overflow: 'hidden',
              marginBottom: 36,
            }}
          >
            {steps.map((step, index) => (
              <div
                key={`${step.title}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 44px minmax(0,1fr)',
                  gap: 16,
                  alignItems: 'center',
                  padding: isStory ? '17px 22px' : '15px 22px',
                  borderBottom: index < steps.length - 1 ? `1px solid ${brand.border}` : 'none',
                  background: index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontFamily: brand.mono,
                    fontSize: 10,
                    color: brand.teal,
                    letterSpacing: '0.1em',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: `1px solid ${brand.tealBorder}`,
                    background: brand.tealFaint,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ExplainerIcon icon={step.icon} size={17} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: brand.sans,
                      fontSize: 16,
                      fontWeight: 500,
                      color: brand.white,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {step.title}
                  </p>
                  {step.detail ? (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontFamily: brand.sans,
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: brand.secondary,
                      }}
                    >
                      {step.detail}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: brand.borderMid, marginBottom: 18 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: brand.mono,
                fontSize: 11,
                color: brand.muted,
                letterSpacing: '0.1em',
              }}
            >
              {slideLabel} / {totalLabel}
            </span>
            <span
              style={{
                fontFamily: brand.sans,
                fontSize: 13,
                fontWeight: 500,
                color: data.cta ? brand.white : brand.secondary,
                letterSpacing: '-0.01em',
              }}
            >
              {data.cta ?? (data.isLast ? 'inovense.com' : 'Next')}
            </span>
          </div>
        </div>
      </PostFrame>
    );
  }
);

ProcessCarousel.displayName = 'ProcessCarousel';
