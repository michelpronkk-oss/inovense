import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "SilentSpend | Monetization Intelligence Layer — Built by Inovense";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// hero.png natural size: 1457 x 1097 (ratio 1.328:1)
// At card width 452px → natural height: 452 / 1.328 ≈ 340px
const CARD_W = 452;
const CHROME_H = 28;
const IMG_H = Math.round(CARD_W / (1457 / 1097));
const CARD_H = CHROME_H + IMG_H;
const CARD_TOP = Math.round((630 - CARD_H) / 2);

export default async function Image() {
  const [logoBuffer, heroBuffer] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.png")),
    readFile(join(process.cwd(), "public/work/silentspend/hero.png")),
  ]);
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  const hero = `data:image/png;base64,${heroBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          backgroundColor: "#0f1218",
          position: "relative",
          overflow: "hidden",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            background:
              "linear-gradient(130deg, #111722 0%, #0f131a 54%, #101821 100%)",
          }}
        />

        {/* Subtle grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage:
              "linear-gradient(rgba(113,128,150,0.18) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(113,128,150,0.18) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            opacity: 0.3,
          }}
        />

        {/* Teal glow - upper left */}
        <div
          style={{
            position: "absolute",
            top: "-280px",
            left: "-180px",
            width: "820px",
            height: "820px",
            borderRadius: "50%",
            backgroundImage:
              "radial-gradient(ellipse at center, rgba(73,160,164,0.16) 0%, transparent 60%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "-260px",
            bottom: "-220px",
            width: "860px",
            height: "860px",
            borderRadius: "50%",
            backgroundImage:
              "radial-gradient(ellipse at center, rgba(79,136,173,0.11) 0%, transparent 66%)",
          }}
        />

        {/* Right product screenshot card - depth shadow */}
        <div
          style={{
            position: "absolute",
            right: "42px",
            top: `${CARD_TOP + 18}px`,
            width: `${CARD_W}px`,
            height: `${CARD_H}px`,
            backgroundColor: "#111722",
            borderRadius: "14px",
            border: "1px solid rgba(84,103,132,0.32)",
          }}
        />

        {/* Right product screenshot card - main */}
        <div
          style={{
            position: "absolute",
            right: "58px",
            top: `${CARD_TOP}px`,
            width: `${CARD_W}px`,
            height: `${CARD_H}px`,
            backgroundColor: "rgba(22,28,39,0.96)",
            borderRadius: "14px",
            border: "1px solid #364054",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Chrome bar */}
          <div
            style={{
              display: "flex",
              height: `${CHROME_H}px`,
              alignItems: "center",
              paddingLeft: "12px",
              gap: "6px",
              backgroundColor: "rgba(18,23,33,0.98)",
              borderBottom: "1px solid rgba(95,111,139,0.28)",
              flexShrink: 0,
            }}
          >
            {(["#3a4255", "#3a4255", "rgba(94,197,202,0.75)"] as const).map(
              (bg, i) => (
                <div
                  key={i}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: bg,
                  }}
                />
              )
            )}
          </div>

          {/* Product screenshot */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero}
            width={CARD_W}
            height={IMG_H}
            alt=""
            style={{
              display: "flex",
              width: `${CARD_W}px`,
              height: `${IMG_H}px`,
              flexShrink: 0,
            }}
          />
        </div>

        {/* Card top accent line */}
        <div
          style={{
            position: "absolute",
            right: "58px",
            top: `${CARD_TOP}px`,
            width: `${CARD_W}px`,
            height: "2px",
            backgroundColor: "rgba(94,197,202,0.85)",
            borderRadius: "14px 14px 0 0",
          }}
        />

        {/* Left content column */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "590px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: "72px",
          }}
        >
          {/* Inovense logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            width={100}
            height={23}
            alt=""
            style={{
              objectFit: "contain",
              objectPosition: "left center",
              marginBottom: "38px",
            }}
          />

          {/* Case study tag */}
          <div
            style={{
              display: "flex",
              color: "#9ca7bb",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Case Study
          </div>

          {/* Product name */}
          <div
            style={{
              display: "flex",
              color: "#f7f9fd",
              fontSize: "64px",
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: "-0.032em",
              marginBottom: "14px",
              textShadow: "0 1px 0 rgba(3,6,10,0.35)",
            }}
          >
            SilentSpend
          </div>

          {/* Product descriptor */}
          <div
            style={{
              display: "flex",
              color: "#6ad5da",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "26px",
            }}
          >
            Monetization Intelligence Layer
          </div>

          {/* Description */}
          <div
            style={{
              display: "flex",
              color: "#b4bed0",
              fontSize: "15px",
              lineHeight: 1.55,
              letterSpacing: "0.01em",
              maxWidth: "420px",
            }}
          >
            A global decision layer for operators, pricing teams, growth, and product leaders who need trusted monetization signal.
          </div>

          {/* Bottom attribution */}
          <div
            style={{
              display: "flex",
              color: "#9ca7bb",
              fontSize: "12px",
              letterSpacing: "0.06em",
              marginTop: "38px",
            }}
          >
            inovense.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
