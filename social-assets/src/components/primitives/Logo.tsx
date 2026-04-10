import { brand } from '../../tokens/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showHandle?: boolean;
}

const sizes = {
  sm: { name: 13, handle: 10 },
  md: { name: 15, handle: 11 },
  lg: { name: 18, handle: 13 },
};

export function Logo({ size = 'md', showHandle = false }: LogoProps) {
  const s = sizes[size];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontFamily: brand.sans,
          fontSize: s.name,
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: brand.white,
          lineHeight: 1,
        }}
      >
        INOVENSE
      </span>
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
