import type { CSSProperties } from "react";
import { brandPalette } from "./brand";

const displayStack =
  '"Sora", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const bodyStack = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const monoStack =
  '"IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace';

export const type = {
  kicker: {
    fontFamily: bodyStack,
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: brandPalette.accent,
  } satisfies CSSProperties,

  title: (size = 122) =>
    ({
      fontFamily: displayStack,
      fontSize: size,
      fontWeight: 680,
      lineHeight: 1.02,
      letterSpacing: "-0.034em",
      color: brandPalette.textPrimary,
    }) satisfies CSSProperties,

  titleTight: (size = 94) =>
    ({
      fontFamily: displayStack,
      fontSize: size,
      fontWeight: 640,
      lineHeight: 1.04,
      letterSpacing: "-0.028em",
      color: brandPalette.textPrimary,
    }) satisfies CSSProperties,

  body: {
    fontFamily: bodyStack,
    fontSize: 40,
    lineHeight: 1.22,
    color: brandPalette.textSecondary,
    letterSpacing: "-0.01em",
  } satisfies CSSProperties,

  bodySmall: {
    fontFamily: bodyStack,
    fontSize: 32,
    lineHeight: 1.32,
    color: brandPalette.textSecondary,
    letterSpacing: "-0.006em",
  } satisfies CSSProperties,

  label: {
    fontFamily: bodyStack,
    fontSize: 26,
    fontWeight: 600,
    color: brandPalette.textSecondary,
    letterSpacing: "0.03em",
  } satisfies CSSProperties,

  metric: {
    fontFamily: displayStack,
    fontSize: 98,
    fontWeight: 700,
    lineHeight: 1,
    color: brandPalette.textPrimary,
    letterSpacing: "-0.03em",
  } satisfies CSSProperties,

  note: {
    fontFamily: monoStack,
    fontSize: 22,
    fontWeight: 500,
    color: brandPalette.textMuted,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
};
