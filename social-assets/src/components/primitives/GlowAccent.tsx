import type { CSSProperties } from 'react';

interface GlowAccentProps {
  x?: number | string;
  y?: number | string;
  size?: number;
  opacity?: number;
  color?: string;
  blendMode?: CSSProperties['mixBlendMode'];
}

export function GlowAccent({
  x = '50%',
  y = '0',
  size = 860,
  opacity = 0.11,
  color = '73,160,164',
  blendMode = 'screen',
}: GlowAccentProps) {
  const liftedOpacity = opacity * 1.14;
  const baseOpacity = Math.max(0, Math.min(liftedOpacity, 0.28));
  const coreOpacity = (baseOpacity * 0.78).toFixed(4);
  const midOpacity = (baseOpacity * 0.53).toFixed(4);
  const edgeOpacity = (baseOpacity * 0.3).toFixed(4);
  const tailOpacity = (baseOpacity * 0.16).toFixed(4);
  const sheenOpacity = (baseOpacity * 0.19).toFixed(4);
  const depthOpacity = (baseOpacity * 0.14).toFixed(4);
  const hazeOpacity = (baseOpacity * 0.1).toFixed(4);
  const veilOpacity = (baseOpacity * 0.075).toFixed(4);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%) rotate(-6deg) scale(1.08, 0.92)',
        background: [
          `radial-gradient(ellipse 66% 54% at 53% 47%, rgba(${color},${coreOpacity}) 0%, rgba(${color},${midOpacity}) 26%, rgba(${color},${edgeOpacity}) 52%, rgba(${color},${tailOpacity}) 72%, rgba(${color},0) 92%)`,
          `radial-gradient(ellipse 60% 50% at 39% 61%, rgba(${color},${sheenOpacity}) 0%, rgba(${color},${tailOpacity}) 44%, rgba(${color},0) 82%)`,
          `radial-gradient(ellipse 57% 47% at 65% 35%, rgba(${color},${depthOpacity}) 0%, rgba(${color},${tailOpacity}) 46%, rgba(${color},0) 84%)`,
          `linear-gradient(132deg, rgba(${color},${hazeOpacity}) 2%, rgba(${color},0) 51%)`,
          `linear-gradient(312deg, rgba(${color},${veilOpacity}) 10%, rgba(${color},0) 56%)`,
        ].join(', '),
        pointerEvents: 'none',
        mixBlendMode: blendMode,
        filter: 'blur(0.16px)',
        zIndex: 0,
      }}
    />
  );
}
