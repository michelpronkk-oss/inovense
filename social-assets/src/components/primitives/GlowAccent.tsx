interface GlowAccentProps {
  x?: number | string;
  y?: number | string;
  size?: number;
  opacity?: number;
  color?: string;
}

export function GlowAccent({
  x = '50%',
  y = '0',
  size = 860,
  opacity = 0.11,
  color = '73,160,164',
}: GlowAccentProps) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle, rgba(${color},${opacity}) 0%, transparent 68%)`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
