import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { Tag } from '../primitives/Tag';
import { ExplainerIcon } from '../primitives/explainer-icons';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';
import type { SystemsExplainerData } from './explainer-types';

interface SystemsExplainerProps {
  data: SystemsExplainerData;
  format: Format;
}

export const SystemsExplainer = forwardRef<HTMLDivElement, SystemsExplainerProps>(
  ({ data, format }, ref) => {
    const pad = 72;
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';
    const steps = data.steps.slice(0, 5);

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.07} spacing={44} />
        <GlowAccent x="100%" y="4%" size={isStory ? 980 : 820} opacity={0.115} />
        <GlowAccent x="12%" y="92%" size={isStory ? 740 : 620} opacity={0.085} />

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
                fontSize: isSquare ? 56 : isStory ? 72 : 62,
                lineHeight: 1.05,
                letterSpacing: '-0.04em',
                color: brand.white,
                whiteSpace: 'pre-line',
              }}
            >
              {data.title}
            </h1>
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
              {data.subtitle}
            </p>
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isSquare ? 'repeat(5, minmax(0,1fr))' : '1fr',
              gap: isSquare ? 12 : 10,
              marginBottom: 36,
            }}
          >
            {steps.map((step, index) => (
              <div
                key={`${step.title}-${index}`}
                style={{
                  border: `1px solid ${brand.borderMid}`,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 4,
                  padding: isSquare ? '16px 14px' : isStory ? '18px 18px' : '16px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: `1px solid ${brand.tealBorder}`,
                    background: brand.tealFaint,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ExplainerIcon icon={step.icon} size={17} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: brand.sans,
                      fontSize: isSquare ? 14 : 16,
                      fontWeight: 600,
                      color: brand.white,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {step.title}
                  </p>
                  {step.detail ? (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontFamily: brand.sans,
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: brand.secondary,
                      }}
                    >
                      {step.detail}
                    </p>
                  ) : null}
                </div>
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
              SYSTEM LAYER
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

SystemsExplainer.displayName = 'SystemsExplainer';

