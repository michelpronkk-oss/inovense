import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { NoiseOverlay } from '../primitives/NoiseOverlay';
import { Logo } from '../primitives/Logo';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';

export interface QuotePostData {
  quote: string;
  author: string;
  title?: string;
  tag?: string;
}

interface QuotePostProps {
  data: QuotePostData;
  format: Format;
}

export const QuotePost = forwardRef<HTMLDivElement, QuotePostProps>(
  ({ data, format }, ref) => {
    const pad = 72;
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.055} spacing={52} />
        <GlowAccent x="50%" y="50%" size={isStory ? 1360 : 1060} opacity={0.072} />
        <GlowAccent x="48%" y="52%" size={isStory ? 1100 : 860} opacity={0.042} />
        <NoiseOverlay
          opacity={0.009}
          mixBlendMode="soft-light"
          backgroundSize="208px 208px, 136px 136px, 312px 312px"
          backgroundPosition="13px 29px, 47px 61px, 91px 23px"
        />

        {/* Decorative large quote mark */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: isStory ? 140 : 80,
            left: 56,
            fontFamily: brand.sans,
            fontSize: isStory ? 360 : 280,
            fontWeight: 700,
            lineHeight: 1,
            color: brand.teal,
            opacity: 0.07,
            userSelect: 'none',
            letterSpacing: '-0.05em',
          }}
        >
          &ldquo;
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
            {data.tag && (
              <span
                style={{
                  fontFamily: brand.mono,
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: brand.muted,
                }}
              >
                {data.tag}
              </span>
            )}
          </div>

          {/* Push quote to vertical center */}
          <div style={{ flex: 1 }} />

          {/* Quote body */}
          <div style={{ maxWidth: 840 }}>
            {/* Teal line */}
            <div style={{ width: 44, height: 2, background: brand.teal, marginBottom: 32 }} />

            <blockquote
              style={{
                fontFamily: brand.sans,
                fontSize: isSquare ? 36 : isStory ? 48 : 42,
                fontWeight: 300,
                letterSpacing: '-0.025em',
                lineHeight: 1.35,
                color: brand.white,
                margin: 0,
              }}
            >
              {data.quote}
            </blockquote>
          </div>

          {/* Push attribution down */}
          <div style={{ flex: 0.6 }} />

          {/* Attribution */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 44 }}>
            <span
              style={{
                fontFamily: brand.sans,
                fontSize: 16,
                fontWeight: 600,
                color: brand.white,
                letterSpacing: '-0.01em',
              }}
            >
              {data.author}
            </span>
            {data.title && (
              <span
                style={{
                  fontFamily: brand.sans,
                  fontSize: 14,
                  fontWeight: 400,
                  color: brand.secondary,
                }}
              >
                {data.title}
              </span>
            )}
          </div>

          <div style={{ flex: 0.4 }} />

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

QuotePost.displayName = 'QuotePost';
