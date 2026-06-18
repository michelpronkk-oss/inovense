import Reveal from "@/components/reveal";
import { Eyebrow } from "@/components/marketing-ui";
import { Icon } from "./icons";

const LINE = "rgba(255,255,255,0.055)";
const TEXT = "#ECEFF3";
const TEXT_DIM = "#9AA1AA";
const TEXT_MUTE = "#646A72";
const CYAN = "#4DE8E1";
const CYAN_SOFT = "rgba(77,232,225,0.08)";
const CYAN_LINE = "rgba(77,232,225,0.28)";

const FEATURES: { icon: Parameters<typeof Icon>[0]["name"]; title: string; body: string }[] = [
  { icon: "shield", title: "SOC 2 Type II", body: "Annual independent audit. Continuous monitoring across infrastructure and access." },
  { icon: "lock", title: "Encrypted end-to-end", body: "TLS in transit. AES-256 at rest. Per-workspace KMS keys for sensitive data." },
  { icon: "users", title: "SSO & SCIM", body: "Okta, Azure AD, Google. Role-based access, JIT provisioning, deprovision on offboard." },
  { icon: "key", title: "Granular tool scopes", body: "Every operator acts under explicit, revocable permissions per system and per action." },
  { icon: "globe", title: "Data residency", body: "US, EU and AU regions. Pin where data is stored, processed and indexed." },
  { icon: "doc", title: "Immutable audit", body: "Append-only logs. Export to SIEM. Required reasons for sensitive overrides." },
];

const BADGES = ["SOC 2 II", "ISO 27001", "GDPR", "HIPAA-ready", "PCI-DSS", "CCPA"];

export default function SecuritySection() {
  return (
    <section id="security" className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-6 md:py-24 lg:px-8">
      <Reveal>
        <div className="mb-12 flex flex-col items-start gap-6 min-[881px]:flex-row min-[881px]:items-end min-[881px]:justify-between">
          <div>
            <Eyebrow>Enterprise</Eyebrow>
            <h2
              className="font-medium"
              style={{ color: TEXT, fontSize: "clamp(28px, 3.6vw, 44px)", lineHeight: 1.12, letterSpacing: "-0.03em", maxWidth: "16ch" }}
            >
              Trust isn&apos;t a feature.
              <br />
              It&apos;s the substrate.
            </h2>
          </div>
          <p className="text-[15px] leading-[1.6]" style={{ color: TEXT_MUTE, maxWidth: "46ch" }}>
            Inovense OS is built for regulated industries from the floor up, with the controls, audits and
            isolation that procurement, security and legal have already asked you to ship.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-3.5 min-[641px]:grid-cols-2 min-[881px]:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delayMs={(i % 3) * 70}>
            <div
              className="h-full rounded-2xl p-6"
              style={{ background: "linear-gradient(180deg, #0E1218, #090C11)", boxShadow: `inset 0 0 0 1px ${LINE}` }}
            >
              <div
                className="mb-3.5 grid h-9 w-9 place-items-center rounded-[10px]"
                style={{ background: CYAN_SOFT, color: CYAN, boxShadow: `inset 0 0 0 1px ${CYAN_LINE}` }}
              >
                <Icon name={f.icon} size={16} />
              </div>
              <h4 className="text-[15px] font-medium" style={{ color: TEXT, letterSpacing: "-0.01em" }}>
                {f.title}
              </h4>
              <p className="mt-1.5 text-[13.5px] leading-[1.55]" style={{ color: TEXT_MUTE }}>
                {f.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-7 flex flex-wrap gap-2.5 border-t pt-7" style={{ borderColor: LINE }}>
          {BADGES.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12.5px]"
              style={{ background: "rgba(255,255,255,0.02)", boxShadow: `inset 0 0 0 1px ${LINE}`, color: TEXT_DIM }}
            >
              <Icon name="check2" size={13} style={{ color: CYAN }} />
              {b}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
