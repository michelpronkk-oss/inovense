interface GridOverlayProps {
  opacity?: number;
  spacing?: number;
  dotSize?: number;
}

export function GridOverlay({ opacity = 0.07, spacing = 44, dotSize = 1 }: GridOverlayProps) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle, rgba(73,160,164,${opacity}) ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
