import type { OgVariant } from "@/lib/og-variant";

type HubLane = {
  name: string;
  desc: string;
};

export interface HubOgConfig {
  eyebrow: string;
  headline: string;
  subheadline: string;
  panelLabel: string;
  lanes: readonly [HubLane, HubLane, HubLane];
  domainLabel: string;
  logo: string;
  variant?: OgVariant;
}

const PANEL_H = 272;
const PANEL_TOP = Math.round((630 - PANEL_H) / 2);

export function makeHubOg(config: HubOgConfig) {
  const {
    eyebrow,
    headline,
    subheadline,
    panelLabel,
    lanes,
    domainLabel,
    logo,
  } = config;
  const variant = config.variant ?? "premium";

  if (variant === "facebook-safe") {
    return (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          backgroundColor: "#121926",
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
              "linear-gradient(118deg, #152033 0%, #131d2d 46%, #162433 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage:
              "linear-gradient(rgba(119,137,166,0.24) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(119,137,166,0.24) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            opacity: 0.3,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "-170px",
            left: "-170px",
            width: "770px",
            height: "770px",
            borderRadius: "50%",
            backgroundImage:
              "radial-gradient(ellipse at center, rgba(84,196,206,0.22) 0%, transparent 62%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "-205px",
            bottom: "-205px",
            width: "730px",
            height: "730px",
            borderRadius: "50%",
            backgroundImage:
              "radial-gradient(ellipse at center, rgba(76,141,186,0.15) 0%, transparent 68%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "42px",
            top: "162px",
            width: "432px",
            height: "306px",
            borderRadius: "18px",
            border: "1px solid rgba(89,112,148,0.34)",
            backgroundColor: "rgba(24,34,49,0.96)",
            padding: "28px 30px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#b0bdd2",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: "18px",
            }}
          >
            {panelLabel}
          </div>

          {lanes.map((lane, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                paddingBottom: i < lanes.length - 1 ? "14px" : "0",
                marginBottom: i < lanes.length - 1 ? "14px" : "0",
                borderBottom:
                  i < lanes.length - 1 ? "1px solid rgba(101,124,160,0.35)" : "none",
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
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#61d8df",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    display: "flex",
                    color: "#edf2fa",
                    fontSize: "14px",
                    fontWeight: 620,
                    letterSpacing: "0.03em",
                  }}
                >
                  {lane.name}
                </span>
              </div>
              <span
                style={{
                  display: "flex",
                  color: "#b3c0d4",
                  fontSize: "13px",
                  letterSpacing: "0.02em",
                  paddingLeft: "15px",
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
            right: "42px",
            top: "162px",
            width: "432px",
            height: "2px",
            backgroundColor: "rgba(97,216,223,0.95)",
            borderRadius: "18px 18px 0 0",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "730px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            paddingLeft: "66px",
            paddingTop: "108px",
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
              marginBottom: "32px",
            }}
          />

          <div
            style={{
              display: "flex",
              color: "#76e2e8",
              fontSize: "13px",
              fontWeight: 620,
              letterSpacing: "0.17em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            {eyebrow}
          </div>

          <div
            style={{
              display: "flex",
              color: "#f7fbff",
              fontSize: "54px",
              fontWeight: 740,
              lineHeight: 1.08,
              letterSpacing: "-0.027em",
              maxWidth: "652px",
              textShadow: "0 1px 0 rgba(2,5,10,0.35)",
            }}
          >
            {headline}
          </div>

          <div
            style={{
              display: "flex",
              color: "#c2cedf",
              fontSize: "20px",
              fontWeight: 520,
              lineHeight: 1.32,
              maxWidth: "650px",
              marginTop: "14px",
            }}
          >
            {subheadline}
          </div>

          <div
            style={{
              display: "flex",
              color: "#aab8cd",
              fontSize: "14px",
              letterSpacing: "0.045em",
              marginTop: "30px",
            }}
          >
            {domainLabel}
          </div>
        </div>
      </div>
    );
  }

  return (
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
          {panelLabel}
        </div>

        {lanes.map((lane, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              paddingBottom: i < lanes.length - 1 ? "20px" : "0",
              marginBottom: i < lanes.length - 1 ? "20px" : "0",
              borderBottom:
                i < lanes.length - 1 ? "1px solid rgba(95,111,139,0.28)" : "none",
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
          {eyebrow}
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
          {headline}
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
          {subheadline}
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
          {domainLabel}
        </div>
      </div>
    </div>
  );
}
