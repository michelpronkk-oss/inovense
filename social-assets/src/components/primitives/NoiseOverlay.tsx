const noiseTexture = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' seed='23' stitchTiles='stitch'/>
      <feColorMatrix type='saturate' values='0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#n)'/>
  </svg>`
);

interface NoiseOverlayProps {
  opacity?: number;
}

export function NoiseOverlay({ opacity = 0.028 }: NoiseOverlayProps) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity,
        mixBlendMode: 'soft-light',
        backgroundImage: `url("data:image/svg+xml,${noiseTexture}"), url("data:image/svg+xml,${noiseTexture}")`,
        backgroundSize: '140px 140px, 220px 220px',
        backgroundPosition: '0 0, 31px 47px',
      }}
    />
  );
}

