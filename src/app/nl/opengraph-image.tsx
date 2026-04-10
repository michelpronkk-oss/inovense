import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Inovense NL | Digitale infrastructuur voor operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PANEL_H = 272;
const PANEL_TOP = Math.round((630 - PANEL_H) / 2);

const LANES = [
  { name: "Build", desc: "Websites en digitale producten" },
  { name: "Systems", desc: "Automatisering en operaties" },
  { name: "Growth", desc: "Distributie en marktpositie" },
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
          backgroundColor: "#09090b",
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
            backgroundImage:
              "linear-gradient(rgba(63,63,70,0.13) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(63,63,70,0.13) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

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
            Lanes
          </div>

          {LANES.map((lane, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                paddingBottom: i < 2 ? "20px" : "0",
                marginBottom: i < 2 ? "20px" : "0",
                borderBottom: i < 2 ? "1px solid #18181b" : "none",
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
                    backgroundColor: "#49A0A4",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    display: "flex",
                    color: "#d4d4d8",
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
                  color: "#3f3f46",
                  fontSize: "11px",
                  letterSpacing: "0.02em",
                  paddingLeft: "14px",
                }}
              >
                {lane.desc}
              </span>
            </div>
          ))}
        </div>

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
            Digitale infrastructuur
          </div>

          <div
            style={{
              display: "flex",
              color: "#fafafa",
              fontSize: "50px",
              fontWeight: 700,
              lineHeight: 1.14,
              letterSpacing: "-0.026em",
              maxWidth: "548px",
            }}
          >
            Wij bouwen de infrastructuur waarop serieuze operators groeien.
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
            inovense.com/nl
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
