import { forwardRef } from 'react';
import { PostFrame } from '../primitives/PostFrame';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { Tag } from '../primitives/Tag';
import { ExplainerIcon } from '../primitives/explainer-icons';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';
import type { BuildFlowExplainerData } from './explainer-types';

interface BuildFlowExplainerProps {
  data: BuildFlowExplainerData;
  format: Format;
}

export const BuildFlowExplainer = forwardRef<HTMLDivElement, BuildFlowExplainerProps>(
  ({ data, format }, ref) => {
    const pad = 72;
    const isSquare = format.key === 'square';
    const isStory = format.key === 'story';
    const steps = data.steps.slice(0, 5);

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.07} spacing={46} />
        <GlowAccent x="80%" y="0" size={isStory ? 980 : 840} opacity={0.11} />
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
                fontSize: isSquare ? 54 : isStory ? 68 : 60,
                lineHeight: 1.06,
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
                fontSize: isStory ? 21 : 18,
                lineHeight: 1.55,
                color: brand.secondary,
                maxWidth: 780,
              }}
            >
              {data.subtitle}
            </p>
          </div>

          <div style={{ flex: 1 }} />

          {isSquare ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0,1fr))',
                gap: 10,
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
                    padding: '14px 12px',
                    minHeight: 148,
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
                      marginBottom: 12,
                    }}
                  >
                    <ExplainerIcon icon={step.icon} size={17} />
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: brand.mono,
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      color: brand.teal,
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontFamily: brand.sans,
                      fontSize: 14,
                      fontWeight: 600,
                      color: brand.white,
                      lineHeight: 1.3,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {step.title}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${brand.borderMid}`,
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 36,
              }}
            >
              {steps.map((step, index) => (
                <div
                  key={`${step.title}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 44px minmax(0,1fr)',
                    gap: 16,
                    alignItems: 'center',
                    padding: isStory ? '17px 22px' : '15px 22px',
                    borderBottom: index < steps.length - 1 ? `1px solid ${brand.border}` : 'none',
                    background: index % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent',
                  }}
                >
                  <span
                    style={{
                      fontFamily: brand.mono,
                      fontSize: 10,
                      color: brand.teal,
                      letterSpacing: '0.1em',
                    }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
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
                    }}
                  >
                    <ExplainerIcon icon={step.icon} size={17} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: brand.sans,
                        fontSize: 16,
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
                          fontSize: 13,
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
          )}

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
              BUILD FLOW
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

BuildFlowExplainer.displayName = 'BuildFlowExplainer';

