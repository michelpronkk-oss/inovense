import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { Tag } from '../primitives/Tag';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';

export interface AuthorityPostData {
  tag: string;
  headline: string;
  sub?: string;
  proofPoints: string[];
}

interface AuthorityPostProps {
  data: AuthorityPostData;
  format: Format;
}

export const AuthorityPost = forwardRef<HTMLDivElement, AuthorityPostProps>(
  ({ data, format }, ref) => {
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';
    const isPortrait = format.key === 'portrait';

    // Portrait uses tighter padding to reclaim canvas and push visual weight forward
    const pad = isPortrait ? 64 : 72;

    return (
      <PostFrame ref={ref} format={format}>
        {/* Portrait gets slightly denser dot grid for atmospheric depth */}
        <GridOverlay opacity={isPortrait ? 0.09 : 0.07} />

        {/* Primary glow — top center */}
        <GlowAccent
          x="50%"
          y={0}
          size={isStory ? 1100 : isPortrait ? 960 : 900}
          opacity={isPortrait ? 0.13 : 0.10}
        />

        {/* Portrait-only: second glow in lower third for atmospheric depth */}
        {isPortrait && (
          <GlowAccent
            x="38%"
            y="78%"
            size={720}
            opacity={0.065}
          />
        )}

        {/* Portrait-only: edge vignette pulls corners dark, creates center focal depth */}
        {isPortrait && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse 90% 88% at 50% 48%, transparent 42%, rgba(0,0,0,0.38) 100%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}

        {/* Top teal rule — stronger opacity for portrait feed impact */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: pad,
            right: pad,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${brand.teal} 30%, ${brand.teal} 70%, transparent)`,
            opacity: isPortrait ? 0.46 : 0.3,
          }}
        />

        {/* Layout */}
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

          {/* Spacer scales with format height */}
          <div style={{ flex: isSquare ? 1.2 : isStory ? 2 : 1.5 }} />

          {/* Headline block */}
          <div>
            {/* Teal accent rule — slightly wider and thicker for portrait */}
            <div
              style={{
                width: isPortrait ? 52 : 44,
                height: isPortrait ? 3 : 2,
                background: brand.teal,
                marginBottom: isPortrait ? 26 : 24,
                boxShadow: isPortrait ? `0 0 12px rgba(73,160,164,0.55)` : 'none',
              }}
            />

            <h1
              style={{
                fontFamily: brand.sans,
                // Portrait bumped to 90 — stronger thumbnail read, tighter line breaks in feed
                fontSize: isSquare ? 72 : isStory ? 96 : 90,
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

            {data.sub && (
              <p
                style={{
                  fontFamily: brand.sans,
                  fontSize: isPortrait ? 21 : 20,
                  fontWeight: 300,
                  lineHeight: 1.55,
                  // Portrait: slightly brighter sub for feed contrast
                  color: isPortrait ? 'rgba(138,158,159,0.92)' : brand.secondary,
                  margin: isPortrait ? '26px 0 0' : '24px 0 0',
                  maxWidth: 760,
                }}
              >
                {data.sub}
              </p>
            )}
          </div>

          {/* Flexible gap pushes proof down */}
          <div style={{ flex: isSquare ? 1 : isStory ? 2 : 1.3 }} />

          {/* Proof points */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isPortrait ? 22 : 20, marginBottom: isPortrait ? 44 : 48 }}>
            {data.proofPoints.map((point, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    // Portrait: slightly larger dot with subtle glow for feed legibility
                    width: isPortrait ? 6 : 5,
                    height: isPortrait ? 6 : 5,
                    borderRadius: '50%',
                    background: brand.teal,
                    boxShadow: isPortrait ? `0 0 6px rgba(73,160,164,0.7)` : 'none',
                    flexShrink: 0,
                    marginTop: isPortrait ? 9 : 8,
                  }}
                />
                <span
                  style={{
                    fontFamily: brand.sans,
                    fontSize: isPortrait ? 18 : 17,
                    fontWeight: 400,
                    lineHeight: 1.45,
                    color: brand.secondary,
                  }}
                >
                  {point}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: brand.border, marginBottom: 22 }} />

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: brand.mono,
                fontSize: 11,
                color: brand.muted,
                letterSpacing: '0.1em',
              }}
            >
              inovense.com
            </span>
          </div>
        </div>
      </PostFrame>
    );
  }
);

AuthorityPost.displayName = 'AuthorityPost';
