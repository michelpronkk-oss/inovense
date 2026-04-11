import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { Tag } from '../primitives/Tag';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';

export interface ServicePostData {
  tag: string;
  service: string;
  description: string;
  features: string[];
  cta?: string;
}

interface ServicePostProps {
  data: ServicePostData;
  format: Format;
}

export const ServicePost = forwardRef<HTMLDivElement, ServicePostProps>(
  ({ data, format }, ref) => {
    const pad = 72;
    const isSquare = format.key === 'square';

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.06} />
        <GlowAccent x="100%" y="0" size={800} opacity={0.09} />
        <GlowAccent x="0" y="100%" size={600} opacity={0.07} />

        {/* Left teal border accent */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: `linear-gradient(180deg, transparent, ${brand.teal} 25%, ${brand.teal} 75%, transparent)`,
            opacity: 0.5,
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

          <div style={{ flex: isSquare ? 0.8 : 1.2 }} />

          {/* Service name */}
          <div>
            <p
              style={{
                fontFamily: brand.mono,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: brand.teal,
                margin: '0 0 16px',
              }}
            >
              Service
            </p>
            <h1
              style={{
                fontFamily: brand.sans,
                fontSize: isSquare ? 62 : 74,
                fontWeight: 700,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                color: brand.white,
                margin: '0 0 28px',
              }}
            >
              {data.service}
            </h1>
            <p
              style={{
                fontFamily: brand.sans,
                fontSize: 19,
                fontWeight: 300,
                lineHeight: 1.55,
                color: brand.secondary,
                margin: 0,
                maxWidth: 740,
              }}
            >
              {data.description}
            </p>
          </div>

          <div style={{ flex: 1 }} />

          {/* Feature divider */}
          <div
            style={{
              height: 1,
              background: brand.border,
              marginBottom: 36,
            }}
          />

          {/* Features list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 44 }}>
            {data.features.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '16px 0',
                  borderBottom: i < data.features.length - 1 ? `1px solid ${brand.border}` : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: brand.mono,
                    fontSize: 10,
                    color: brand.teal,
                    letterSpacing: '0.08em',
                    width: 24,
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontFamily: brand.sans,
                    fontSize: 16,
                    fontWeight: 400,
                    color: brand.white,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ height: 1, background: brand.border, marginBottom: 22 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: brand.mono, fontSize: 11, color: brand.muted, letterSpacing: '0.1em' }}>
              inovense.com
            </span>
            {data.cta && (
              <span
                style={{
                  fontFamily: brand.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: brand.white,
                  letterSpacing: '-0.01em',
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${brand.tealBorder}`,
                  background: brand.tealFaint,
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)',
                }}
              >
                {data.cta} {'->'}
              </span>
            )}
          </div>
        </div>
      </PostFrame>
    );
  }
);

ServicePost.displayName = 'ServicePost';
