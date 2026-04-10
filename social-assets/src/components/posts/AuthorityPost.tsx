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
    const pad = 72;
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay />
        <GlowAccent x="50%" y={0} size={isStory ? 1100 : 900} opacity={0.10} />

        {/* Subtle top teal rule */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: pad,
            right: pad,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${brand.teal} 30%, ${brand.teal} 70%, transparent)`,
            opacity: 0.3,
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
          <div style={{ flex: isSquare ? 1.2 : isStory ? 2 : 1.6 }} />

          {/* Headline block */}
          <div>
            {/* Teal accent rule */}
            <div style={{ width: 44, height: 2, background: brand.teal, marginBottom: 24 }} />

            <h1
              style={{
                fontFamily: brand.sans,
                fontSize: isSquare ? 72 : isStory ? 96 : 82,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1.07,
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
                  fontSize: 20,
                  fontWeight: 300,
                  lineHeight: 1.55,
                  color: brand.secondary,
                  margin: '24px 0 0',
                  maxWidth: 760,
                }}
              >
                {data.sub}
              </p>
            )}
          </div>

          {/* Flexible gap pushes proof down */}
          <div style={{ flex: isSquare ? 1 : isStory ? 2 : 1.4 }} />

          {/* Proof points */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 48 }}>
            {data.proofPoints.map((point, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: brand.teal,
                    flexShrink: 0,
                    marginTop: 8,
                  }}
                />
                <span
                  style={{
                    fontFamily: brand.sans,
                    fontSize: 17,
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
