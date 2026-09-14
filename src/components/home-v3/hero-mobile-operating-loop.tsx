import Image from "next/image";

export default function HeroMobileOperatingLoop() {
  return (
    <div
      className="hero-mobile-loop"
      role="img"
      aria-label="Revenue Operator assembles a signal and context, prepares a reply, and waits for approval."
    >
      <div className="hero-mobile-loop-head">
        <span className="hero-mobile-loop-brand">
          <Image src="/brand/auterim-mark-live.svg" width={15} height={15} alt="" />
          <span>Operating loop</span>
        </span>
        <span className="hero-mobile-loop-policy"><i />Policy applied</span>
      </div>

      <div className="hero-mobile-loop-stages" aria-hidden="true">
        <span className="hero-mobile-loop-stage is-complete"><i /><b>Signal</b></span>
        <span className="hero-mobile-loop-stage is-complete"><i /><b>Context</b></span>
        <span className="hero-mobile-loop-stage is-held"><i /><b>Prepared</b></span>
      </div>

      <div className="hero-mobile-loop-result">
        <span><small>Revenue Operator</small><strong>Reply prepared</strong></span>
        <span className="hero-mobile-loop-gate">Awaiting approval</span>
      </div>
    </div>
  );
}
