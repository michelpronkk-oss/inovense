import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Inovense | Digital Infrastructure for Operators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Panel height and vertical alignment math
const PANEL_H = 262;
const PANEL_TOP = Math.round((630 - PANEL_H) / 2);

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
        {/* Subtle grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage:
              "linear-gradient(rgba(63,63,70,0.14) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(63,63,70,0.14) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Teal atmospheric glow */}
        <div
          style={{
            position: "absolute",
            top: "-160px",
            left: "-160px",
            width: "820px",
            height: "820px",
            borderRadius: "50%",
            backgroundImage:
              "radial-gradient(ellipse at center, rgba(73,160,164,0.09) 0%, transparent 58%)",
          }}
        />

        {/* Right panel depth card */}
        <div
          style={{
            position: "absolute",
            right: "54px",
            top: `${PANEL_TOP + 18}px`,
            width: "312px",
            height: `${PANEL_H}px`,
            backgroundColor: "#0b0b0d",
            borderRadius: "14px",
            border: "1px solid rgba(26,26,32,1)",
          }}
        />

        {/* Right panel main card */}
        <div
          style={{
            position: "absolute",
            right: "76px",
            top: `${PANEL_TOP}px`,
            width: "312px",
            height: `${PANEL_H}px`,
            backgroundColor: "#111114",
            borderRadius: "14px",
            border: "1px solid rgba(40,40,48,0.9)",
            display: "flex",
            flexDirection: "column",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "7px", marginBottom: "22px" }}>
            {(["#1d1d24", "#1d1d24", "rgba(73,160,164,0.28)"] as const).map(
              (bg, i) => (
                <div
                  key={i}
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: bg,
                  }}
                />
              )
            )}
          </div>

          {(
            [
              [30, 74],
              [42, 46],
              [24, 83],
              [38, 57],
              [28, 68],
            ] as [number, number][]
          ).map(([lw, fp], i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: i < 4 ? "12px" : "0px",
              }}
            >
              <div
                style={{
                  width: `${lw}px`,
                  height: "5px",
                  borderRadius: "3px",
                  backgroundColor: "#1e1e26",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: "5px",
                  borderRadius: "3px",
                  backgroundColor: "#18181b",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${fp}%`,
                    height: "100%",
                    borderRadius: "3px",
                    backgroundColor: "#222229",
                  }}
                />
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
            <div
              style={{
                flex: 1,
                height: "26px",
                borderRadius: "7px",
                backgroundColor: "rgba(73,160,164,0.07)",
                border: "1px solid rgba(73,160,164,0.13)",
              }}
            />
            <div
              style={{
                width: "52px",
                height: "26px",
                borderRadius: "7px",
                backgroundColor: "#18181b",
                border: "1px solid #222229",
              }}
            />
          </div>
        </div>

        {/* Panel top accent */}
        <div
          style={{
            position: "absolute",
            right: "76px",
            top: `${PANEL_TOP}px`,
            width: "312px",
            height: "2px",
            backgroundColor: "rgba(73,160,164,0.42)",
            borderRadius: "14px 14px 0 0",
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
            width={126}
            height={34}
            alt=""
            style={{
              objectFit: "contain",
              objectPosition: "left center",
              marginBottom: "52px",
            }}
          />

          <div
            style={{
              display: "flex",
              color: "#49A0A4",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "18px",
            }}
          >
            Digital Infrastructure
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
            We build the infrastructure serious operators run on.
          </div>

          <div
            style={{
              display: "flex",
              color: "#52525b",
              fontSize: "13px",
              letterSpacing: "0.05em",
              marginTop: "44px",
            }}
          >
            inovense.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
