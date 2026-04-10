import { brand } from '../../tokens/brand';

interface TagProps {
  label: string;
  variant?: 'teal' | 'dim';
}

export function Tag({ label, variant = 'teal' }: TagProps) {
  const isTeal = variant === 'teal';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 12px',
        background: isTeal ? brand.tealFaint : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isTeal ? brand.tealBorder : brand.border}`,
        borderRadius: 2,
        fontFamily: brand.mono,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: isTeal ? brand.teal : brand.secondary,
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
}
