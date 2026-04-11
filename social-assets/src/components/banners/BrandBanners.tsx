import { forwardRef } from 'react';
import { GridOverlay } from '../primitives/GridOverlay';
import { GlowAccent } from '../primitives/GlowAccent';
import { Logo } from '../primitives/Logo';
import { PostFrame } from '../primitives/PostFrame';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';

export interface BrandBannerData {
  strapline: string;
  headline: string;
  subline?: string;
}

interface BannerProps {
  data: BrandBannerData;
  format: Format;
  showSafeGuides?: boolean;
}

interface SafeRectSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

interface SafeCircleSpec {
  x: number;
  y: number;
  radius: number;
  label: string;
}

function SafeRectGuide({ x, y, width, height, label }: SafeRectSpec) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        border: '1px dashed rgba(73, 160, 164, 0.48)',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.48) inset',
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 8,
          top: 8,
          fontFamily: brand.mono,
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(73, 160, 164, 0.92)',
          background: 'rgba(4, 8, 9, 0.68)',
          padding: '2px 5px',
          borderRadius: 3,
          border: '1px solid rgba(73, 160, 164, 0.24)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function SafeCircleGuide({ x, y, radius, label }: SafeCircleSpec) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: x - radius,
        top: y - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: '50%',
        border: '1px dashed rgba(73, 160, 164, 0.48)',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.48) inset',
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: radius + 8,
          top: radius - 10,
          fontFamily: brand.mono,
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(73, 160, 164, 0.92)',
          background: 'rgba(4, 8, 9, 0.68)',
          padding: '2px 5px',
          borderRadius: 3,
          border: '1px solid rgba(73, 160, 164, 0.24)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function FacebookSafeGuides({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <>
      <SafeRectGuide x={180} y={42} width={1280} height={540} label="Mobile crop safe" />
      <SafeRectGuide x={300} y={72} width={980} height={390} label="Primary content safe" />
      <SafeCircleGuide x={190} y={500} radius={122} label="Profile overlap" />
    </>
  );
}

function LinkedInSafeGuides({ show }: { show: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <>
      <SafeRectGuide x={72} y={0} width={984} height={191} label="Desktop crop safe" />
      <SafeRectGuide x={206} y={14} width={860} height={163} label="Primary content safe" />
      <SafeRectGuide x={0} y={24} width={176} height={143} label="Logo zone overlap" />
    </>
  );
}

export const FacebookPageCoverBanner = forwardRef<HTMLDivElement, BannerProps>(
  ({ data, format, showSafeGuides = true }, ref) => {
    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.05} spacing={58} />
        <GlowAccent x="86%" y="6%" size={980} opacity={0.13} />
        <GlowAccent x="18%" y="86%" size={640} opacity={0.07} />

        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background:
              'linear-gradient(116deg, rgba(10,16,17,0.78) 0%, rgba(10,16,17,0.24) 56%, rgba(10,16,17,0.74) 100%)',
          }}
        />

        <FacebookSafeGuides show={showSafeGuides} />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            padding: '54px 94px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: brand.mono,
                fontSize: 10,
                color: brand.teal,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {data.strapline}
            </span>
            <Logo size="md" />
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ maxWidth: 1020, marginLeft: 240 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: brand.sans,
                fontSize: 62,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: brand.white,
                fontWeight: 600,
              }}
            >
              {data.headline}
            </h1>
            {data.subline ? (
              <p
                style={{
                  margin: '16px 0 0',
                  fontFamily: brand.sans,
                  fontSize: 22,
                  lineHeight: 1.42,
                  color: brand.secondary,
                  letterSpacing: '-0.01em',
                }}
              >
                {data.subline}
              </p>
            ) : null}
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginLeft: 240,
            }}
          >
            <span
              style={{
                fontFamily: brand.mono,
                fontSize: 10,
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

FacebookPageCoverBanner.displayName = 'FacebookPageCoverBanner';

export const LinkedInCompanyBanner = forwardRef<HTMLDivElement, BannerProps>(
  ({ data, format, showSafeGuides = true }, ref) => {
    return (
      <PostFrame ref={ref} format={format}>
        <GridOverlay opacity={0.04} spacing={40} />
        <GlowAccent x="82%" y="4%" size={420} opacity={0.13} />
        <GlowAccent x="30%" y="92%" size={280} opacity={0.07} />

        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background:
              'linear-gradient(108deg, rgba(10,16,17,0.8) 0%, rgba(10,16,17,0.26) 55%, rgba(10,16,17,0.76) 100%)',
          }}
        />

        <LinkedInSafeGuides show={showSafeGuides} />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            padding: '22px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ marginLeft: 190, maxWidth: 690 }}>
            <p
              style={{
                margin: 0,
                fontFamily: brand.mono,
                fontSize: 8,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: brand.teal,
              }}
            >
              {data.strapline}
            </p>
            <h1
              style={{
                margin: '8px 0 0',
                fontFamily: brand.sans,
                fontSize: 33,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: brand.white,
                fontWeight: 600,
              }}
            >
              {data.headline}
            </h1>
            {data.subline ? (
              <p
                style={{
                  margin: '6px 0 0',
                  fontFamily: brand.sans,
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: brand.secondary,
                  letterSpacing: '-0.01em',
                }}
              >
                {data.subline}
              </p>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <Logo size="sm" />
            <span
              style={{
                fontFamily: brand.mono,
                fontSize: 8,
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

LinkedInCompanyBanner.displayName = 'LinkedInCompanyBanner';
