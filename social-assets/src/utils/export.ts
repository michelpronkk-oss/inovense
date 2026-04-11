import { toPng } from 'html-to-image';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolvePixelRatio(requestedPixelRatio?: number): number {
  if (typeof requestedPixelRatio === 'number' && Number.isFinite(requestedPixelRatio)) {
    return clamp(requestedPixelRatio, 2.6, 4.2);
  }

  const deviceRatio =
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return clamp(Math.max(3.2, deviceRatio * 1.72), 2.6, 4.2);
}

export async function exportPost(
  el: HTMLElement,
  filename: string,
  pixelRatio?: number
): Promise<void> {
  const preferredRatio = resolvePixelRatio(pixelRatio);
  const fallbackRatios = Array.from(
    new Set(
      [preferredRatio, preferredRatio - 0.3, preferredRatio - 0.6, 2.8].map((ratio) =>
        clamp(ratio, 2.6, 4.2)
      )
    )
  );

  let dataUrl: string | null = null;
  let lastError: unknown = null;

  for (const ratio of fallbackRatios) {
    try {
      dataUrl = await toPng(el, {
        pixelRatio: ratio,
        cacheBust: true,
        skipFonts: false,
        skipAutoScale: true,
        backgroundColor: '#0A1113',
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!dataUrl) {
    throw lastError instanceof Error ? lastError : new Error('Export failed.');
  }

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}
