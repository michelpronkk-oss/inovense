import { GLYPHS, type Operator } from "@/data/operators";
import { OperatorAvatar } from "./avatar";

export function OperatorCard({ operator, index }: { operator: Operator; index: number }) {
  const num = String(index + 1).padStart(2, "0");
  const c = operator.color;

  return (
    <article
      className="group relative overflow-hidden rounded-[18px] p-[22px] pb-2 transition-all duration-250 hover:-translate-y-0.5"
      style={
        {
          background: "linear-gradient(180deg, #0E1218, #090C11)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.055)",
          "--glow": c,
        } as React.CSSProperties
      }
    >
      {/* top accent line */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-[22px] right-[22px] top-0 h-px opacity-45"
        style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)` }}
      />
      {/* hover glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 transition-opacity duration-250 group-hover:opacity-100"
        style={{
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.085), 0 30px 70px -34px rgba(0,0,0,0.75), 0 0 60px -30px var(--glow)`,
        }}
      />

      <div className="flex items-center gap-3.5">
        <OperatorAvatar color={c} glyph={GLYPHS[operator.glyph]} size={48} />
        <div className="min-w-0 flex-1">
          <div className="text-[16.5px] font-medium" style={{ color: "#ECEFF3", letterSpacing: "-0.015em" }}>
            {operator.name}
          </div>
          <div
            className="mt-[3px] font-mono text-[10.5px] uppercase"
            style={{ color: "#646A72", letterSpacing: "0.08em" }}
          >
            {operator.tag}
          </div>
        </div>
        <div className="self-start font-mono text-xs" style={{ color: "#454A51", letterSpacing: "0.04em" }}>
          {num}
        </div>
      </div>

      <p className="mt-3.5 mb-0.5 text-[13.5px] leading-[1.5] text-pretty" style={{ color: "#9AA1AA" }}>
        {operator.mission}
      </p>

      <div className="relative mt-3 flex flex-col">
        {operator.loop.map((step, i) => {
          const isGate = step.k === "Approve";
          const isLast = i === operator.loop.length - 1;
          return (
            <div key={step.k} className="relative flex gap-3.5 py-2">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[4.5px] top-[17px] bottom-[-1px] w-px"
                  style={{ background: "rgba(255,255,255,0.085)" }}
                />
              )}
              <span
                aria-hidden
                className="relative z-[1] mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: isGate ? "#F5C26B" : c,
                  boxShadow: isGate ? "0 0 8px -1px #F5C26B" : `0 0 8px -1px ${c}`,
                }}
              />
              <div className="flex min-w-0 flex-col gap-px">
                <span
                  className="font-mono text-[9.5px] uppercase"
                  style={{ color: isGate ? "#F5C26B" : "#646A72", letterSpacing: "0.1em" }}
                >
                  {step.k}
                </span>
                <span className="text-[12.5px] leading-[1.45]" style={{ color: "#9AA1AA" }}>
                  {step.t}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
