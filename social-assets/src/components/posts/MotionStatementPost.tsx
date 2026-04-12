import { forwardRef } from 'react';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';
import { GlowAccent } from '../primitives/GlowAccent';
import { GridOverlay } from '../primitives/GridOverlay';
import { Logo } from '../primitives/Logo';
import { PostFrame } from '../primitives/PostFrame';
import { Tag } from '../primitives/Tag';
import type { MotionStatementPostData } from './motion-types';

interface MotionStatementPostProps {
  data: MotionStatementPostData;
  format: Format;
}

export const MotionStatementPost = forwardRef<HTMLDivElement, MotionStatementPostProps>(
  ({ data, format }, ref) => {
    const isStory = format.key === 'story';
    const isSquare = format.key === 'square';
    const pad = 72;
    const beats = data.beats.slice(0, 5);
    const activeBeat = Math.min(Math.max(data.activeBeat ?? 0, 0), Math.max(0, beats.length - 1));
    const timeline = data.timeline ?? {
      beatDurationMs: 900,
      transition: 'fade' as const,
    };

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.08} spacing={44} />
        <GlowAccent x="14%" y="6%" size={isStory ? 980 : 840} opacity={0.12} />
        <GlowAccent x="90%" y="94%" size={isStory ? 760 : 640} opacity={0.09} />

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
                fontSize: isSquare ? 62 : isStory ? 78 : 68,
                lineHeight: 1.05,
                letterSpacing: '-0.04em',
                color: brand.white,
                whiteSpace: 'pre-line',
                maxWidth: 860,
              }}
            >
              {data.headline}
            </h1>
            {data.sub ? (
              <p
                style={{
                  margin: '18px 0 0',
                  fontFamily: brand.sans,
                  fontSize: isStory ? 21 : 18,
                  lineHeight: 1.55,
                  color: 'rgba(171,191,193,0.94)',
                  maxWidth: 760,
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
              padding: isStory ? '20px 22px' : '18px 20px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.018) 100%)',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: brand.mono,
                  fontSize: 10,
                  letterSpacing: '0.11em',
                  color: brand.teal,
                  textTransform: 'uppercase',
                }}
              >
                Motion beats
              </span>
              <span
                style={{
                  fontFamily: brand.mono,
                  fontSize: 10,
                  letterSpacing: '0.11em',
                  color: brand.secondary,
                  textTransform: 'uppercase',
                }}
              >
                {timeline.transition} | {timeline.beatDurationMs}ms
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {beats.map((beat, index) => {
                const isActive = index === activeBeat;
                return (
                  <div
                    key={`${beat}-${index}`}
                    style={{
                      border: `1px solid ${isActive ? brand.tealBorder : brand.border}`,
                      background: isActive ? 'rgba(73,160,164,0.14)' : 'rgba(255,255,255,0.02)',
                      borderRadius: 4,
                      padding: '10px 12px',
                      display: 'grid',
                      gridTemplateColumns: '34px minmax(0,1fr)',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: brand.mono,
                        fontSize: 10,
                        letterSpacing: '0.1em',
                        color: isActive ? brand.teal : brand.secondary,
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        fontFamily: brand.sans,
                        fontSize: 15,
                        lineHeight: 1.35,
                        color: isActive ? brand.white : brand.secondary,
                      }}
                    >
                      {beat}
                    </span>
                  </div>
                );
              })}
            </div>
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
              Motion-ready scene
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

MotionStatementPost.displayName = 'MotionStatementPost';
