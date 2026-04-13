import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Inovense | Web, Systems, and Growth Built to Perform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PANEL_H = 272;
const PANEL_TOP = Math.round((630 - PANEL_H) / 2);

const LANES = [
  { name: "Build", desc: "Websites and digital products" },
  { name: "Systems", desc: "Automation and operations" },
  { name: "Growth", desc: "SEO and demand systems" },
] as const;

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logo = `data:image/png;base64,${logoBuffer.toString("base64")}`;

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
              "linear-gradient(rgba(113,128,150,0.20) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(113,128,150,0.20) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            opacity: 0.32,
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
              "radial-gradient(ellipse at center, rgba(73,160,164,0.18) 0%, transparent 60%)",
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
              "radial-gradient(ellipse at center, rgba(79,136,173,0.12) 0%, transparent 66%)",
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
            backgroundColor: "#121822",
            borderRadius: "16px",
            border: "1px solid rgba(84,103,132,0.32)",
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
            backgroundColor: "rgba(22,28,39,0.95)",
            borderRadius: "16px",
            border: "1px solid #364054",
            display: "flex",
            flexDirection: "column",
            padding: "28px",
          }}
        >
          {/* Section label */}
          <div
            style={{
              display: "flex",
              color: "#9aa6bd",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "22px",
            }}
          >
            Services
          </div>

          {/* Lane rows */}
          {LANES.map((lane, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                paddingBottom: i < 2 ? "20px" : "0",
                marginBottom: i < 2 ? "20px" : "0",
                borderBottom: i < 2 ? "1px solid rgba(95,111,139,0.28)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  marginBottom: "5px",
                }}
              >
                <div
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    backgroundColor: "#5ec5ca",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    display: "flex",
                    color: "#e6eaf3",
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                  }}
                >
                  {lane.name}
                </span>
              </div>
              <span
                style={{
                  display: "flex",
                  color: "#9ea9be",
                  fontSize: "12px",
                  letterSpacing: "0.02em",
                  paddingLeft: "14px",
                }}
              >
                {lane.desc}
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
            backgroundColor: "rgba(94,197,202,0.85)",
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
              color: "#6ad5da",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            Digital Infrastructure
          </div>

          <div
            style={{
              display: "flex",
              color: "#f7f9fd",
              fontSize: "47px",
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.026em",
              maxWidth: "548px",
              textShadow: "0 1px 0 rgba(3,6,10,0.35)",
            }}
          >
            Web, systems, and growth built to perform.
          </div>

          <div
            style={{
              display: "flex",
              color: "#b4bed0",
              fontSize: "18px",
              fontWeight: 500,
              lineHeight: 1.38,
              maxWidth: "548px",
              marginTop: "16px",
            }}
          >
            Conversion-focused websites, automation workflows, and growth systems.
          </div>

          <div
            style={{
              display: "flex",
              color: "#9ca7bb",
              fontSize: "13px",
              letterSpacing: "0.05em",
              marginTop: "42px",
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
