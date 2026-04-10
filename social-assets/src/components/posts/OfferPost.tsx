import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { Tag } from '../primitives/Tag';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';

export interface OfferPostData {
  tag: string;
  headline: string;
  included: string[];
  price?: string;
  note?: string;
}

interface OfferPostProps {
  data: OfferPostData;
  format: Format;
}

export const OfferPost = forwardRef<HTMLDivElement, OfferPostProps>(
  ({ data, format }, ref) => {
    const pad = 72;
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.065} spacing={48} />
        <GlowAccent x="50%" y="50%" size={isStory ? 1200 : 900} opacity={0.09} />

        {/* Teal corner accent - bottom left */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 320,
            height: 320,
            background: `radial-gradient(circle at bottom left, rgba(73,160,164,0.12) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

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
            <Tag label={data.tag} />
          </div>

          <div style={{ flex: isSquare ? 0.8 : isStory ? 1.6 : 1.2 }} />

          {/* Headline */}
          <div>
            <h1
              style={{
                fontFamily: brand.sans,
                fontSize: isSquare ? 66 : isStory ? 92 : 80,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1.06,
                color: brand.white,
                margin: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {data.headline}
            </h1>
          </div>

          <div style={{ flex: isSquare ? 0.8 : isStory ? 1.4 : 1 }} />

          {/* Included panel */}
          <div
            style={{
              border: `1px solid ${brand.borderMid}`,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 36,
            }}
          >
            <div
              style={{
                padding: '12px 24px',
                borderBottom: `1px solid ${brand.border}`,
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <span
                style={{
                  fontFamily: brand.mono,
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: brand.secondary,
                }}
              >
                What is included
              </span>
            </div>
            {data.included.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '18px 24px',
                  borderBottom: i < data.included.length - 1 ? `1px solid ${brand.border}` : 'none',
                  background: 'rgba(255,255,255,0.01)',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M2 7L5.5 10.5L12 3.5"
                    stroke={brand.teal}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: brand.sans,
                    fontSize: 16,
                    fontWeight: 400,
                    color: brand.white,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Price */}
          {data.price && (
            <div style={{ marginBottom: 12 }}>
              <span
                style={{
                  fontFamily: brand.sans,
                  fontSize: 28,
                  fontWeight: 600,
                  color: brand.teal,
                  letterSpacing: '-0.02em',
                }}
              >
                {data.price}
              </span>
            </div>
          )}

          {data.note && (
            <p
              style={{
                fontFamily: brand.sans,
                fontSize: 13,
                fontWeight: 400,
                color: brand.muted,
                margin: '0 0 36px',
                lineHeight: 1.5,
              }}
            >
              {data.note}
            </p>
          )}

          <div style={{ flex: 1 }} />

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

OfferPost.displayName = 'OfferPost';
