/**
 * Shared JSX factory for lane-specific Open Graph images.
 * Used by /build, /systems, and /growth opengraph-image.tsx files.
 * Not a Next.js route — just a utility.
 */

export interface LaneOgConfig {
  /** Short lane identifier shown in teal above the headline. E.g. "Build Lane" */
  laneLabel: string;
  /** Main headline for the OG image. */
  headline: string;
  /** Four deliverable items shown in the right panel. */
  items: [string, string, string, string];
  /** Panel section label shown above the items. */
  panelLabel: string;
  /** Base64 logo data URL loaded from public/logo.png */
  logo: string;
}

const PANEL_H = 272;
const PANEL_TOP = Math.round((630 - PANEL_H) / 2);

export function makeLaneOg(config: LaneOgConfig) {
  const { laneLabel, headline, items, panelLabel, logo } = config;

  return (
    <div
      style={{
        display: "flex",
        width: "1200px",
        height: "630px",
        backgroundColor: "#09090b",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundImage:
            "linear-gradient(rgba(63,63,70,0.13) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(63,63,70,0.13) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Teal atmospheric glow */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          left: "-200px",
          width: "900px",
          height: "900px",
          borderRadius: "50%",
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(73,160,164,0.12) 0%, transparent 58%)",
        }}
      />

      {/* Right panel - depth card */}
      <div
        style={{
          position: "absolute",
          right: "50px",
          top: `${PANEL_TOP + 20}px`,
          width: "328px",
          height: `${PANEL_H}px`,
          backgroundColor: "#0b0b0d",
          borderRadius: "16px",
          border: "1px solid rgba(20,20,26,1)",
        }}
      />

      {/* Right panel - main card */}
      <div
        style={{
          position: "absolute",
          right: "68px",
          top: `${PANEL_TOP}px`,
          width: "328px",
          height: `${PANEL_H}px`,
          backgroundColor: "#0f0f12",
          borderRadius: "16px",
          border: "1px solid #1d1d24",
          display: "flex",
          flexDirection: "column",
          padding: "28px",
        }}
      >
        {/* Panel label */}
        <div
          style={{
            display: "flex",
            color: "#27272a",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "22px",
          }}
        >
          {panelLabel}
        </div>

        {/* Deliverable items */}
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              paddingBottom: i < items.length - 1 ? "18px" : "0",
              marginBottom: i < items.length - 1 ? "18px" : "0",
              borderBottom: i < items.length - 1 ? "1px solid #18181b" : "none",
            }}
          >
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                backgroundColor: "#49A0A4",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                display: "flex",
                color: "#d4d4d8",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>

      {/* Panel top accent line */}
      <div
        style={{
          position: "absolute",
          right: "68px",
          top: `${PANEL_TOP}px`,
          width: "328px",
          height: "2px",
          backgroundColor: "rgba(73,160,164,0.5)",
          borderRadius: "16px 16px 0 0",
        }}
      />

      {/* Main content column */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "700px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: "82px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          width={132}
          height={30}
          alt=""
          style={{
            objectFit: "contain",
            objectPosition: "left center",
            marginBottom: "50px",
          }}
        />

        <div
          style={{
            display: "flex",
            color: "#49A0A4",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.17em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}
        >
          {laneLabel}
        </div>

        <div
          style={{
            display: "flex",
            color: "#fafafa",
            fontSize: "48px",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.024em",
            maxWidth: "520px",
          }}
        >
          {headline}
        </div>

        <div
          style={{
            display: "flex",
            color: "#52525b",
            fontSize: "13px",
            letterSpacing: "0.05em",
            marginTop: "42px",
          }}
        >
          inovense.com
        </div>
      </div>
    </div>
  );
}
