import { forwardRef } from 'react';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';
import { GlowAccent } from '../primitives/GlowAccent';
import { GridOverlay } from '../primitives/GridOverlay';
import { Logo } from '../primitives/Logo';
import { PostFrame } from '../primitives/PostFrame';
import { Tag } from '../primitives/Tag';
import type { HumanEditorialPostData } from './human-editorial-types';

interface HumanEditorialPostProps {
  data: HumanEditorialPostData;
  format: Format;
}

export const HumanEditorialPost = forwardRef<HTMLDivElement, HumanEditorialPostProps>(
  ({ data, format }, ref) => {
    const isStory = format.key === 'story';
    const isSquare = format.key === 'square';
    const mediaOnTop = !isSquare;
    const pad = isStory ? 64 : 58;
    const mediaHeight = isStory ? 760 : format.key === 'portrait' ? 710 : format.height - pad * 2;
    const mediaWidth = isSquare ? Math.round(format.width * 0.52) : format.width - pad * 2;
    const layout = data.layout ?? 'founder_portrait';

    const mediaBaseBackground =
      'radial-gradient(120% 90% at 18% 10%, rgba(73,160,164,0.28), rgba(73,160,164,0.08) 45%, rgba(7,11,12,0.95) 100%)';
    const mediaBackground = data.imageSrc
      ? `linear-gradient(168deg, rgba(5,8,9,0.18) 0%, rgba(4,6,7,0.68) 100%), url(${data.imageSrc})`
      : mediaBaseBackground;

    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.06} spacing={48} />
        <GlowAccent x="83%" y="12%" size={isStory ? 920 : 780} opacity={0.12} />
        <GlowAccent x="8%" y="96%" size={isStory ? 720 : 620} opacity={0.08} />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: `${pad}px`,
            display: 'grid',
            gridTemplateColumns: mediaOnTop ? '1fr' : `${mediaWidth}px minmax(0,1fr)`,
            gap: 30,
            zIndex: 1,
          }}
        >
          <div
            style={{
              position: 'relative',
              minHeight: mediaHeight,
              border: `1px solid ${brand.borderMid}`,
              borderRadius: 6,
              overflow: 'hidden',
              backgroundImage: mediaBackground,
              backgroundSize: 'cover',
              backgroundPosition: layout === 'walking_hook' ? 'center 22%' : 'center center',
            }}
            aria-label={data.imageAlt ?? 'Editorial portrait media'}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(4,7,8,0.08) 0%, rgba(4,7,8,0.62) 62%, rgba(4,7,8,0.92) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Logo size="sm" />
              <Tag label={data.tag} />
            </div>

            {!data.imageSrc ? (
              <div
                style={{
                  position: 'absolute',
                  right: 18,
                  bottom: 18,
                  border: `1px solid ${brand.border}`,
                  borderRadius: 4,
                  padding: '7px 10px',
                  background: 'rgba(7, 10, 11, 0.58)',
                  fontFamily: brand.mono,
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: brand.secondary,
                  textTransform: 'uppercase',
                }}
              >
                Add portrait image
              </div>
            ) : null}

            {data.personName || data.personRole ? (
              <div
                style={{
                  position: 'absolute',
                  left: 20,
                  right: 20,
                  bottom: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {data.personName ? (
                  <span
                    style={{
                      fontFamily: brand.sans,
                      fontSize: 22,
                      fontWeight: 560,
                      letterSpacing: '-0.02em',
                      color: brand.white,
                    }}
                  >
                    {data.personName}
                  </span>
                ) : null}
                {data.personRole ? (
                  <span
                    style={{
                      fontFamily: brand.sans,
                      fontSize: 14,
                      color: 'rgba(167,187,189,0.96)',
                    }}
                  >
                    {data.personRole}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 0,
              marginTop: mediaOnTop ? 6 : 0,
            }}
          >
            {mediaOnTop ? (
              <div style={{ marginBottom: 18 }}>
                <Tag label={data.tag} variant="dim" />
              </div>
            ) : null}

            <h1
              style={{
                margin: 0,
                fontFamily: brand.sans,
                fontSize: isStory ? 74 : isSquare ? 56 : 62,
                lineHeight: 1.06,
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
                  fontSize: isStory ? 21 : 18,
                  lineHeight: 1.5,
                  color: 'rgba(171,191,193,0.94)',
                  maxWidth: 690,
                }}
              >
                {data.sub}
              </p>
            ) : null}

            <div style={{ height: 1, background: brand.borderMid, margin: '28px 0 16px' }} />
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
                Editorial
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
        </div>
      </PostFrame>
    );
  }
);

HumanEditorialPost.displayName = 'HumanEditorialPost';
