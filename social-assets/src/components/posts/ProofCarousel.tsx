import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { Tag } from '../primitives/Tag';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';
import type { ProofCarouselSlideData } from './proof-types';

interface ProofCarouselProps {
  data: ProofCarouselSlideData;
  format: Format;
}

export const ProofCarousel = forwardRef<HTMLDivElement, ProofCarouselProps>(
  ({ data, format }, ref) => {
    const pad = 72;
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';
    const slideLabel = String(data.slideNumber).padStart(2, '0');
    const totalLabel = String(data.totalSlides).padStart(2, '0');
    const progress = data.totalSlides > 0 ? data.slideNumber / data.totalSlides : 0;
    const points = data.whatChanged.slice(0, 4);

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.07} spacing={46} />
        <GlowAccent x="84%" y="10%" size={isStory ? 980 : 820} opacity={0.11} />
        <GlowAccent x="16%" y="96%" size={isStory ? 760 : 640} opacity={0.08} />

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
                fontSize: isSquare ? 50 : isStory ? 68 : 58,
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
                  margin: '16px 0 0',
                  fontFamily: brand.sans,
                  fontSize: isStory ? 21 : 18,
                  lineHeight: 1.55,
                  color: brand.secondary,
                  maxWidth: 780,
                }}
              >
                {data.subtitle}
              </p>
            ) : null}
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              border: `1px solid ${brand.borderMid}`,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.018)',
              padding: '16px 20px',
              marginBottom: 16,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: brand.mono,
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: brand.teal,
              }}
            >
              {data.outcomeLabel ?? 'Outcome'}
            </p>
            <p
              style={{
                margin: '6px 0 0',
                fontFamily: brand.sans,
                fontSize: isSquare ? 34 : 40,
                fontWeight: 650,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: brand.white,
              }}
            >
              {data.outcome}
            </p>
            <p
              style={{
                margin: '6px 0 0',
                fontFamily: brand.sans,
                fontSize: 13,
                lineHeight: 1.45,
                color: brand.secondary,
              }}
            >
              {data.context}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${brand.borderMid}`,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            {points.map((item, index) => (
              <div
                key={`${item}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px minmax(0,1fr)',
                  gap: 14,
                  alignItems: 'start',
                  padding: isStory ? '14px 18px' : '13px 16px',
                  borderBottom:
                    index < points.length - 1 ? `1px solid ${brand.border}` : 'none',
                  background: index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontFamily: brand.mono,
                    fontSize: 10,
                    color: brand.teal,
                    letterSpacing: '0.1em',
                    marginTop: 2,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontFamily: brand.sans,
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: brand.white,
                  }}
                >
                  {item}
                </p>
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

ProofCarousel.displayName = 'ProofCarousel';

