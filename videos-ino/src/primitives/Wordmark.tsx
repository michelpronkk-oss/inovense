type WordmarkProps = {
  size?: number;
  opacity?: number;
  withMark?: boolean;
};

export const Wordmark: React.FC<WordmarkProps> = ({
  size = 72,
  opacity = 1,
  withMark = true,
}) => {
  const spacing = Math.max(0.2, size * 0.16);
  const markSize = Math.max(12, size * 0.22);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spacing,
        opacity,
      }}
    >
      {withMark ? (
        <span
          style={{
            width: markSize,
            height: markSize,
            borderRadius: markSize * 0.36,
            background:
              "linear-gradient(145deg, rgba(122,228,233,1) 0%, rgba(73,160,164,1) 72%)",
            boxShadow: "0 0 30px rgba(73, 160, 164, 0.42)",
          }}
        />
      ) : null}
      <span
        style={{
          fontFamily: '"Sora", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
          fontSize: size,
          fontWeight: 640,
          letterSpacing: "0.28em",
          lineHeight: 1,
          color: "#f4f7ff",
          textTransform: "uppercase",
        }}
      >
        Inovense
      </span>
    </div>
  );
};
