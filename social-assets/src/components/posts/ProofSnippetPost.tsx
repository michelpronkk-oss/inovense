import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { Tag } from '../primitives/Tag';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';
import type { ProofSnippetPostData } from './proof-types';

interface ProofSnippetPostProps {
  data: ProofSnippetPostData;
  format: Format;
}

export const ProofSnippetPost = forwardRef<HTMLDivElement, ProofSnippetPostProps>(
  ({ data, format }, ref) => {
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';
    const pad = 72;

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.07} spacing={46} />
        <GlowAccent x="88%" y="6%" size={isStory ? 980 : 840} opacity={0.11} />
        <GlowAccent x="20%" y="100%" size={isStory ? 760 : 640} opacity={0.08} />

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
                fontSize: isSquare ? 56 : isStory ? 76 : 62,
                lineHeight: 1.05,
                letterSpacing: '-0.04em',
                color: brand.white,
                whiteSpace: 'pre-line',
              }}
            >
              {data.headline}
            </h1>
            {data.sub ? (
              <p
                style={{
                  margin: '18px 0 0',
                  fontFamily: brand.sans,
                  fontSize: isStory ? 22 : 19,
                  lineHeight: 1.55,
                  color: brand.secondary,
                  maxWidth: 780,
                }}
              >
                {data.sub}
              </p>
            ) : null}
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              border: `1px solid ${brand.borderMid}`,
              borderRadius: 4,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)',
              padding: '18px 22px',
              marginBottom: 18,
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
                margin: '8px 0 0',
                fontFamily: brand.sans,
                fontSize: isSquare ? 40 : 44,
                fontWeight: 650,
                lineHeight: 1.08,
                color: brand.white,
                letterSpacing: '-0.03em',
              }}
            >
              {data.outcome}
            </p>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: brand.sans,
                fontSize: 14,
                lineHeight: 1.5,
                color: brand.secondary,
              }}
            >
              {data.context}
            </p>
          </div>

          <div
            style={{
              border: `1px solid ${brand.borderMid}`,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 36,
            }}
          >
            {data.whatChanged.slice(0, 4).map((item, index) => (
              <div
                key={`${item}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px minmax(0,1fr)',
                  gap: 14,
                  alignItems: 'start',
                  padding: '14px 18px',
                  borderBottom:
                    index < data.whatChanged.slice(0, 4).length - 1
                      ? `1px solid ${brand.border}`
                      : 'none',
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
                    fontSize: 14,
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
              PROOF SNIPPET
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

ProofSnippetPost.displayName = 'ProofSnippetPost';

