import Image from "next/image";

export default function HeroMobileOperatingLoop() {
  return (
    <div
      className="hero-mobile-loop"
      role="img"
      aria-label="Revenue Operator detected a signal and prepared context. The next move is ready and awaiting approval."
    >
      <div className="hero-mobile-loop-header">
        <span className="hero-mobile-loop-identity">
          <span className="hero-mobile-loop-mark">
            <Image src="/brand/auterim-mark-live.svg" width={16} height={16} alt="" />
          </span>
          <strong>Revenue Operator</strong>
        </span>
        <span className="hero-mobile-loop-approval"><i />Awaiting approval</span>
      </div>

      <div className="hero-mobile-loop-stages" aria-hidden="true">
        <span className="hero-mobile-loop-stage is-signal"><i /><span>Signal detected</span></span>
        <span className="hero-mobile-loop-stage is-context"><i /><span>Context prepared</span></span>
      </div>
    </div>
  );
}
