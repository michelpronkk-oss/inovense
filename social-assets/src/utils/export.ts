import { toPng } from 'html-to-image';

export async function exportPost(
  el: HTMLElement,
  filename: string,
  pixelRatio = 2
): Promise<void> {
  const dataUrl = await toPng(el, {
    pixelRatio,
    cacheBust: true,
    skipFonts: false,
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}
