import { brand } from '../../tokens/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showHandle?: boolean;
}

const sizes = {
  sm: { logoHeight: 20, handle: 10 },
  md: { logoHeight: 24, handle: 11 },
  lg: { logoHeight: 28, handle: 13 },
};

export function Logo({ size = 'md', showHandle = false }: LogoProps) {
  const s = sizes[size];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <img
        src="/logo.png"
        alt="Inovense"
        style={{
          display: 'block',
          height: s.logoHeight,
          width: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 10px rgba(73, 160, 164, 0.14))',
        }}
      />
      {showHandle && (
        <span
          style={{
            fontFamily: brand.mono,
            fontSize: s.handle,
            color: brand.teal,
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}
        >
          @inovense
        </span>
      )}
    </div>
  );
}
