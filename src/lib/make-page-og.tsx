/**
 * OG image factory for Auterim OS product/marketing pages.
 * Renders the slab-I mark inline as JSX â€” no external file dependency.
 * Right panel is optional: pass `items` (2-3 strings) to show a feature card.
 */

export interface PageOgConfig {
  /** Category label shown above headline, e.g. "Platform" or "Solutions" */
  category: string;
  /** Main page headline (keep under ~50 chars for 2-line fit) */
  headline: string;
  /** Short description shown below headline */
  description?: string;
  /** 2â€“3 bullet points shown in the right panel. Omit for headline-only layout. */
  items?: [string, string] | [string, string, string];
}

/** Slab-I mark rendered as absolute-positioned divs. Size: 26Ã—26 px */
function SlabIMark() {
  const s = "#ECEFF3";
  return (
    <div style={{ position: "relative", display: "flex", width: 26, height: 26, flexShrink: 0 }}>
      {/* Top bar */}
      <div style={{ position: "absolute", left: 4, top: 4, width: 18, height: 4, background: s, borderRadius: 1 }} />
      {/* Upper stem */}
      <div style={{ position: "absolute", left: 11, top: 8, width: 5, height: 4, background: s, borderRadius: 1 }} />
      {/* Lower stem */}
      <div style={{ position: "absolute", left: 11, top: 14, width: 5, height: 4, background: s, borderRadius: 1 }} />
      {/* Bottom bar */}
      <div style={{ position: "absolute", left: 4, top: 18, width: 18, height: 4, background: s, borderRadius: 1 }} />
    </div>
  );
}

const PANEL_H = 260;
const PANEL_TOP = Math.round((630 - PANEL_H) / 2);

export function makePageOg(config: PageOgConfig) {
  const { category, headline, description, items } = config;
  const hasPanel = items && items.length >= 2;

  return (
    <div
      style={{
        display: "flex",
        width: "1200px",
        height: "630px",
        backgroundColor: "#06070A",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          top: 0, right: 0, bottom: 0, left: 0,
          background: "linear-gradient(130deg, #0A0D12 0%, #06070A 55%, #080B10 100%)",
        }}
      />

      {/* Grid */}
      <div
        style={{
          position: "absolute",
          top: 0, right: 0, bottom: 0, left: 0,
          backgroundImage:
            "linear-gradient(rgba(113,128,150,0.16) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(113,128,150,0.16) 1px, transparent 1px)",
          backgroundSize: "68px 68px",
          opacity: 0.28,
        }}
      />

      {/* Cyan glow â€” top-left */}
      <div
        style={{
          position: "absolute",
          top: "-180px",
          left: "-160px",
          width: "820px",
          height: "820px",
          borderRadius: "50%",
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(77,232,225,0.16) 0%, transparent 58%)",
        }}
      />

      {/* Blue glow â€” bottom-right */}
      <div
        style={{
          position: "absolute",
          right: "-220px",
          bottom: "-200px",
          width: "760px",
          height: "760px",
          borderRadius: "50%",
          backgroundImage:
            "radial-gradient(ellipse at center, rgba(91,141,239,0.09) 0%, transparent 64%)",
        }}
      />

      {/* Right panel â€” only when items provided */}
      {hasPanel && (
        <>
          {/* Shadow card */}
          <div
            style={{
              position: "absolute",
              right: "46px",
              top: `${PANEL_TOP + 18}px`,
              width: "320px",
              height: `${PANEL_H}px`,
              backgroundColor: "#0C0F14",
              borderRadius: "16px",
              border: "1px solid rgba(77,232,225,0.08)",
            }}
          />
          {/* Main card */}
          <div
            style={{
              position: "absolute",
              right: "62px",
              top: `${PANEL_TOP}px`,
              width: "320px",
              height: `${PANEL_H}px`,
              backgroundColor: "rgba(13,16,21,0.96)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              flexDirection: "column",
              padding: "26px 28px",
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#4A4F57",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}
            >
              Key capabilities
            </div>

            {items!.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  paddingBottom: i < items!.length - 1 ? "17px" : "0",
                  marginBottom: i < items!.length - 1 ? "17px" : "0",
                  borderBottom:
                    i < items!.length - 1 ? "1px solid rgba(255,255,255,0.055)" : "none",
                }}
              >
                <div
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    backgroundColor: "#4DE8E1",
                    flexShrink: 0,
                    boxShadow: "0 0 6px rgba(77,232,225,0.6)",
                  }}
                />
                <span
                  style={{
                    display: "flex",
                    color: "#C8D0DC",
                    fontSize: "13px",
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                    lineHeight: 1.35,
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Cyan accent line on card top */}
          <div
            style={{
              position: "absolute",
              right: "62px",
              top: `${PANEL_TOP}px`,
              width: "320px",
              height: "2px",
              backgroundColor: "rgba(77,232,225,0.80)",
              borderRadius: "16px 16px 0 0",
            }}
          />
        </>
      )}

      {/* Main content column */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: hasPanel ? "680px" : "1100px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: "80px",
          paddingRight: hasPanel ? "20px" : "80px",
        }}
      >
        {/* Logo mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 52 }}>
          <SlabIMark />
          <div
            style={{
              display: "flex",
              color: "#ECEFF3",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.16em",
            }}
          >
            AUTERIM
          </div>
        </div>

        {/* Category label */}
        <div
          style={{
            display: "flex",
            color: "#4DE8E1",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.17em",
            textTransform: "uppercase",
            marginBottom: "14px",
          }}
        >
          {category}
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            color: "#F0F4FA",
            fontSize: hasPanel ? "46px" : "54px",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.028em",
            maxWidth: hasPanel ? "560px" : "900px",
            textShadow: "0 1px 0 rgba(3,6,10,0.4)",
          }}
        >
          {headline}
        </div>

        {/* Description */}
        {description && (
          <div
            style={{
              display: "flex",
              color: "#7A8494",
              fontSize: "17px",
              fontWeight: 450,
              lineHeight: 1.45,
              maxWidth: hasPanel ? "500px" : "820px",
              marginTop: "16px",
            }}
          >
            {description}
          </div>
        )}

        {/* Domain */}
        <div
          style={{
            display: "flex",
            color: "#3D4350",
            fontSize: "13px",
            letterSpacing: "0.05em",
            marginTop: "40px",
          }}
        >
          inovense.com
        </div>
      </div>
    </div>
  );
}
