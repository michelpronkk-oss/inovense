import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';

export interface CarouselSlideData {
  slideNumber: number;
  totalSlides: number;
  title: string;
  body: string;
  isLast?: boolean;
}

interface CarouselSlideProps {
  data: CarouselSlideData;
  format: Format;
}

export const CarouselSlide = forwardRef<HTMLDivElement, CarouselSlideProps>(
  ({ data, format }, ref) => {
    const pad = 72;
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';
    const slideLabel = String(data.slideNumber).padStart(2, '0');
    const totalLabel = String(data.totalSlides).padStart(2, '0');
    const progress = data.slideNumber / data.totalSlides;

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.06} spacing={48} />
        <GlowAccent x="80%" y="20%" size={700} opacity={0.09} />

        {/* Slide number watermark - very dim background element */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: -40,
            right: 40,
            fontFamily: brand.sans,
            fontSize: isStory ? 500 : 380,
            fontWeight: 800,
            lineHeight: 1,
            color: brand.teal,
            opacity: 0.04,
            letterSpacing: '-0.06em',
            userSelect: 'none',
          }}
        >
          {slideLabel}
        </div>

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
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Logo size="sm" />
            {/* Slide counter */}
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
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 1,
              background: brand.border,
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
                width: `${progress * 100}%`,
                background: brand.teal,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div style={{ flex: isSquare ? 1 : isStory ? 2 : 1.6 }} />

          {/* Content */}
          <div>
            <h1
              style={{
                fontFamily: brand.sans,
                fontSize: isSquare ? 52 : isStory ? 76 : 64,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1.08,
                color: brand.white,
                margin: '0 0 28px',
                whiteSpace: 'pre-line',
              }}
            >
              {data.title}
            </h1>

            <p
              style={{
                fontFamily: brand.sans,
                fontSize: 19,
                fontWeight: 300,
                lineHeight: 1.6,
                color: brand.secondary,
                margin: 0,
                maxWidth: 780,
              }}
            >
              {data.body}
            </p>
          </div>

          <div style={{ flex: 1 }} />

          {/* Next indicator */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
            {data.isLast ? (
              <span
                style={{
                  fontFamily: brand.sans,
                  fontSize: 14,
                  fontWeight: 500,
                  color: brand.teal,
                  letterSpacing: '-0.01em',
                }}
              >
                inovense.com
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontFamily: brand.sans,
                    fontSize: 13,
                    fontWeight: 400,
                    color: brand.secondary,
                  }}
                >
                  Next
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: `1px solid ${brand.tealBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9"
                      stroke={brand.teal}
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ height: 1, background: brand.border, marginBottom: 22 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: brand.mono, fontSize: 11, color: brand.muted, letterSpacing: '0.1em' }}>
              inovense.com
            </span>
          </div>
        </div>
      </PostFrame>
    );
  }
);

CarouselSlide.displayName = 'CarouselSlide';
