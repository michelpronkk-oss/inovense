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
  const midOpacity = (opacity * 0.56).toFixed(4);
  const falloffOpacity = (opacity * 0.22).toFixed(4);

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
        background: `radial-gradient(circle, rgba(${color},${opacity}) 0%, rgba(${color},${midOpacity}) 34%, rgba(${color},${falloffOpacity}) 56%, rgba(${color},0) 74%)`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
