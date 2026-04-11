import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';
import { NoiseOverlay } from './NoiseOverlay';

interface PostFrameProps {
  format: Format;
  children: ReactNode;
  style?: CSSProperties;
}

export const PostFrame = forwardRef<HTMLDivElement, PostFrameProps>(
  ({ format, children, style }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: format.width,
          height: format.height,
          background: `
            radial-gradient(110% 85% at 18% -10%, rgba(73,160,164,0.1) 0%, rgba(73,160,164,0.035) 32%, rgba(73,160,164,0) 62%),
            radial-gradient(95% 80% at 100% 105%, rgba(73,160,164,0.065) 0%, rgba(73,160,164,0.018) 40%, rgba(73,160,164,0) 70%),
            linear-gradient(160deg, #0A1113 0%, #0B1315 52%, #0A1012 100%)
          `,
          border: `1px solid ${brand.borderMid}`,
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.03), inset 0 0 0 1px rgba(255,255,255,0.026), inset 0 0 0 2px rgba(73,160,164,0.06)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: brand.sans,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          flexShrink: 0,
          ...style,
        }}
      >
        {children}
        <NoiseOverlay />
      </div>
    );
  }
);

PostFrame.displayName = 'PostFrame';
