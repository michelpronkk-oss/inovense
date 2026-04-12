import { forwardRef } from 'react';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';
import { GlowAccent } from '../primitives/GlowAccent';
import { GridOverlay } from '../primitives/GridOverlay';
import { Logo } from '../primitives/Logo';
import { PostFrame } from '../primitives/PostFrame';
import { Tag } from '../primitives/Tag';
import type { CaseSnapshotPostData } from './proof-types';

interface CaseSnapshotPostProps {
  data: CaseSnapshotPostData;
  format: Format;
}

export const CaseSnapshotPost = forwardRef<HTMLDivElement, CaseSnapshotPostProps>(
  ({ data, format }, ref) => {
    const isStory = format.key === 'story';
    const isSquare = format.key === 'square';
    const pad = 72;
    const interventions = data.interventions.slice(0, 4);

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.072} spacing={46} />
        <GlowAccent x="16%" y="8%" size={isStory ? 980 : 820} opacity={0.12} />
        <GlowAccent x="87%" y="96%" size={isStory ? 760 : 630} opacity={0.09} />

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

          <div style={{ marginTop: 30 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: brand.sans,
                fontSize: isSquare ? 56 : isStory ? 74 : 61,
                lineHeight: 1.06,
                letterSpacing: '-0.04em',
                color: brand.white,
                whiteSpace: 'pre-line',
              }}
            >
              {data.headline}
            </h1>
            {data.summary ? (
              <p
                style={{
                  margin: '16px 0 0',
                  fontFamily: brand.sans,
                  fontSize: isStory ? 21 : 18,
                  lineHeight: 1.5,
                  color: 'rgba(171,191,193,0.94)',
                  maxWidth: 780,
                }}
              >
                {data.summary}
              </p>
            ) : null}
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                border: `1px solid ${brand.borderMid}`,
                borderRadius: 4,
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.018)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: brand.mono,
                  fontSize: 10,
                  letterSpacing: '0.11em',
                  textTransform: 'uppercase',
                  color: brand.secondary,
                }}
              >
                {data.beforeLabel ?? 'Before'}
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontFamily: brand.sans,
                  fontSize: 30,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.08,
                  color: brand.white,
                }}
              >
                {data.beforeValue}
              </p>
            </div>

            <div
              style={{
                border: `1px solid ${brand.tealBorder}`,
                borderRadius: 4,
                padding: '14px 16px',
                background: 'rgba(73,160,164,0.13)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: brand.mono,
                  fontSize: 10,
                  letterSpacing: '0.11em',
                  textTransform: 'uppercase',
                  color: brand.teal,
                }}
              >
                {data.afterLabel ?? 'After'}
              </p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontFamily: brand.sans,
                  fontSize: 30,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.08,
                  color: brand.white,
                }}
              >
                {data.afterValue}
              </p>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              fontFamily: brand.sans,
              fontSize: 14,
              lineHeight: 1.5,
              color: brand.secondary,
              marginBottom: 14,
            }}
          >
            {data.context}
          </p>

          <div
            style={{
              border: `1px solid ${brand.borderMid}`,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 22,
            }}
          >
            {interventions.map((item, index) => (
              <div
                key={`${item}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '34px minmax(0,1fr)',
                  gap: 10,
                  padding: '12px 14px',
                  borderBottom: index < interventions.length - 1 ? `1px solid ${brand.border}` : 'none',
                  background: index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}
              >
                <span
                  style={{
                    fontFamily: brand.mono,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    color: brand.teal,
                    textTransform: 'uppercase',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontFamily: brand.sans,
                    fontSize: 14,
                    lineHeight: 1.4,
                    color: brand.white,
                  }}
                >
                  {item}
                </span>
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
                textTransform: 'uppercase',
              }}
            >
              {data.timeframe ?? 'Case snapshot'}
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
              {data.cta ?? 'inovense.com'}
            </span>
          </div>
        </div>
      </PostFrame>
    );
  }
);

CaseSnapshotPost.displayName = 'CaseSnapshotPost';
