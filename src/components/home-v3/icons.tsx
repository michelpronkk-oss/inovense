// Shared line-icon set for the new homepage (24x24, stroke=currentColor).
// Ported from design_handoff_inovense/src/icons.jsx — only the glyphs used on this page.

const PATHS: Record<string, string> = {
  arrow: '<path d="M5 12h14" /><path d="m13 6 6 6-6 6" />',
  arrowUR: '<path d="M7 17 17 7" /><path d="M8 7h9v9" />',
  check: '<path d="M4 12.5 9 17.5 20 6.5" />',
  check2: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" />',
  x: '<path d="M6 6l12 12M18 6 6 18" />',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />',
  bolt: '<path d="M13 3 5 14h6l-2 7 8-11h-6l2-7Z" />',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /><path d="m3 18 9 5 9-5" />',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />',
  cube: '<path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z" /><path d="M3 8l9 5 9-5M12 13v8" />',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />',
  flow: '<circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M7 5h10M5 7v10M19 7v10M7 19h10" />',
  inbox: '<path d="M3 13h6l1 2h4l1-2h6" /><path d="M5 5h14l2 8v6H3v-6L5 5Z" />',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />',
  globe: '<circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />',
  user: '<circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" />',
  users: '<circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3-7 7-7s7 3 7 7" /><circle cx="17" cy="6" r="3" /><path d="M14 14c4 0 8 2 8 6" />',
  message: '<path d="M21 12a8 8 0 1 1-3-6.2L21 4l-1 4a8 8 0 0 1 1 4Z" />',
  doc: '<path d="M14 3H6v18h12V7l-4-4Z" /><path d="M14 3v4h4" /><path d="M9 13h6M9 17h4" />',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" />',
  target: '<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />',
  megaphone: '<path d="M3 11v2l13 6V5L3 11Z" /><path d="M3 13h2v6h3v-4" /><path d="M19 8a4 4 0 0 1 0 8" />',
  branch: '<circle cx="6" cy="5" r="2" /><circle cx="18" cy="5" r="2" /><circle cx="12" cy="19" r="2" /><path d="M6 7v4a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 14v3" />',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" />',
  key: '<circle cx="8" cy="15" r="4" /><path d="m11 12 9-9 3 3-3 3-2-2-2 2-2-2-3 3" />',
  trend: '<path d="m3 17 6-6 4 4 8-9" /><path d="M14 6h7v7" />',
  // Hero artifact source glyphs — hardcoded per-icon stroke colors, matching the source design.
  artifactWeb: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="#37E6D4" stroke-width="1.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.2 0 17M12 3.5c-2.6 2.4-2.6 14.2 0 17" fill="none" stroke="#37E6D4" stroke-width="1.3" />',
  artifactPipeline: '<circle cx="12" cy="10" r="3" fill="none" stroke="#FF7A59" stroke-width="1.8" /><circle cx="12" cy="18" r="2.5" fill="none" stroke="#FF7A59" stroke-width="1.8" /><path d="M12 13v2.5M18 4l-3 3.5M21 6h-3M21 6v3" fill="none" stroke="#FF7A59" stroke-width="1.6" stroke-linecap="round" />',
  artifactMemory: '<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="#A7B1BE" stroke-width="1.5" /><path d="M8.5 4v16M4 9.5h4.5M4 14.5h4.5M12 9h5M12 13h3.5" fill="none" stroke="#A7B1BE" stroke-width="1.4" stroke-linecap="round" />',
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.5,
  className = "",
  style,
}: {
  name: keyof typeof PATHS;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}
