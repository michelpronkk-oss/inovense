import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import { brand } from '../../tokens/brand';
import type { Format } from '../../utils/formats';

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
          background: brand.bg,
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
      </div>
    );
  }
);

PostFrame.displayName = 'PostFrame';
