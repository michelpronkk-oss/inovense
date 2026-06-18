// Profile avatar = role-colored gradient circle + person silhouette + role-glyph badge.
// Shared between the Operators page and the homepage operators section.

const PERSON_PATH =
  '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5z"/>';

export function OperatorAvatar({
  color,
  glyph,
  size = 48,
}: {
  color: string;
  glyph: string;
  size?: number;
}) {
  const badgeSize = Math.round(size * 0.417);
  const badgeIconSize = Math.round(badgeSize * 0.55);
  const personSize = Math.round(size * 0.54);

  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 24%, transparent), color-mix(in oklab, ${color} 4%, transparent))`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 38%, transparent)`,
      }}
    >
      <svg
        width={personSize}
        height={personSize}
        viewBox="0 0 24 24"
        fill={color}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: PERSON_PATH }}
      />
      <span
        className="absolute grid place-items-center rounded-full"
        style={{
          right: -3,
          bottom: -3,
          width: badgeSize,
          height: badgeSize,
          background: "#0A0E12",
          color,
          boxShadow: `0 0 0 2px #06070A, inset 0 0 0 1px color-mix(in oklab, ${color} 45%, transparent)`,
        }}
      >
        <svg
          width={badgeIconSize}
          height={badgeIconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: glyph }}
        />
      </span>
    </div>
  );
}
