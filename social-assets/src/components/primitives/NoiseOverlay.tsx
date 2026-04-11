import type { CSSProperties } from 'react';

const buildNoiseTexture = (seed: number, baseFrequency: number, octaves: number) =>
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='${baseFrequency}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch'/>
      <feColorMatrix type='saturate' values='0'/>
      <feComponentTransfer>
        <feFuncR type='gamma' amplitude='1' exponent='0.92' offset='0'/>
        <feFuncG type='gamma' amplitude='1' exponent='0.92' offset='0'/>
        <feFuncB type='gamma' amplitude='1' exponent='0.92' offset='0'/>
      </feComponentTransfer>
    </filter>
    <rect width='100%' height='100%' filter='url(#n)'/>
  </svg>`
  );

const fineNoiseTexture = buildNoiseTexture(23, 1.03, 3);
const microNoiseTexture = buildNoiseTexture(71, 2.11, 2);
const broadNoiseTexture = buildNoiseTexture(39, 0.37, 4);

interface NoiseOverlayProps {
  opacity?: number;
  mixBlendMode?: CSSProperties['mixBlendMode'];
  zIndex?: number;
  backgroundSize?: string;
  backgroundPosition?: string;
}

export function NoiseOverlay({
  opacity = 0.02,
  mixBlendMode = 'soft-light',
  zIndex = 0,
  backgroundSize = '241px 229px, 157px 149px, 367px 353px',
  backgroundPosition = '0 0, 37px 41px, 79px 23px',
}: NoiseOverlayProps) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex,
        opacity,
        mixBlendMode,
        backgroundImage: `url("data:image/svg+xml,${fineNoiseTexture}"), url("data:image/svg+xml,${microNoiseTexture}"), url("data:image/svg+xml,${broadNoiseTexture}")`,
        backgroundSize,
        backgroundPosition,
        filter: 'blur(0.24px)',
      }}
    />
  );
}
