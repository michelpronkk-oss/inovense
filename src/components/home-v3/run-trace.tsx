"use client";

import { useEffect, useRef } from "react";
import { Head } from "./v3-page";

const WORK_ITEMS = ["Detected a qualified inbound signal", "Qualified it against the ideal client profile", "Prepared a personalized first reply", "Updated the CRM record"];
const AFTER_ITEMS = ["Send the reply via Gmail", "Create a three-day follow-up", "Log the outcome to company memory"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function RunTrace() {
  const traceRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Continuous scroll-progress dot layered on top of the existing one-shot entrance
  // choreography. JS only ever writes a plain 0-1 number to --run-progress and toggles
  // is-active/is-passed classes on the rows; CSS transitions own all the actual motion,
  // mirroring the rAF-throttled, CSS-custom-property pattern used in hero-editorial.tsx.
  useEffect(() => {
    const trace = traceRef.current;
    if (!trace) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const rows = rowRefs.current.filter((row): row is HTMLDivElement => Boolean(row));
    if (!rows.length) return;

    trace.classList.add("run-track");

    let frame = 0;

    const apply = () => {
      frame = 0;
      const rect = trace.getBoundingClientRect();
      const total = rect.height;
      if (total <= 0) return;

      // Progress reaches 0 when the top of the trace crosses the viewport's vertical
      // center, and 1 when the bottom of the trace crosses that same line, so the dot
      // travels while the section is actually being read rather than merely visible.
      const anchor = window.innerHeight * 0.5;
      const progress = clamp((anchor - rect.top) / total, 0, 1);
      trace.style.setProperty("--run-progress", progress.toFixed(4));

      // Rows are not equal height (the gate row is much taller), so the active row is
      // resolved from each row's real measured offset rather than a fixed percentage.
      const target = progress * total;
      let activeIndex = 0;
      rows.forEach((row, i) => {
        if (target >= row.offsetTop - 1) activeIndex = i;
      });
      rows.forEach((row, i) => {
        row.classList.toggle("is-active", i === activeIndex);
        row.classList.toggle("is-passed", i < activeIndex);
      });
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const setRow = (index: number) => (node: HTMLDivElement | null) => {
    rowRefs.current[index] = node;
  };

  return (
    <section className="run" id="run">
      <div className="wrap">
        <Head label="One real run" title="One lead. One operator. One controlled run." body="Watch Auterim turn a real inbound signal into prepared work, and stop exactly where human approval is required." />
        <div className="trace rv" ref={traceRef}>
          <div className="run-rail" aria-hidden="true"><span className="run-rail-fill" /><span className="run-rail-dot" /></div>
          <div className="tr in" ref={setRow(0)}><div className="tr-k"><span className="sn">01</span>Input</div><div className="tr-s" /><div className="tr-c"><div className="src"><span>Website enquiry<em>Northstar, 09:41</em></span><span>CRM history<em>No prior contact</em></span><span>Company memory<em>Tone, offers, pricing</em></span></div></div></div>
          <div className="tr work" ref={setRow(1)}><div className="tr-k"><span className="sn">02</span>Operator work</div><div className="tr-s" /><div className="tr-c">{WORK_ITEMS.map((item) => <div className="wk" key={item}><span className="wn" /><span className="wt">{item}</span><em>09:43</em></div>)}</div></div>
          <div className="tr gate" ref={setRow(2)}><div className="tr-k"><span className="sn">03</span><span className="gate-tag">Approval gate</span></div><div className="tr-s" /><div className="tr-c"><h3>Send the first reply to Sarah at Northstar?</h3><p>The draft, the CRM update and the follow-up are ready. First-contact messages wait for you.</p><div className="gate-acts"><button className="mini go" type="button">Approve and send</button><button className="mini alt" type="button">Edit draft</button><button className="mini alt" type="button">Reject</button></div><div className="gw">Owner: M. Keller, Managing Director · Policy: first contact, sales scope</div></div></div>
          <div className="tr after" ref={setRow(3)}><div className="tr-k"><span className="sn">04</span>After approval</div><div className="tr-s" /><div className="tr-c">{AFTER_ITEMS.map((item) => <div className="wk" key={item}><span className="wn" /><span className="wt">{item}</span><em>Queued</em></div>)}</div></div>
        </div>
      </div>
    </section>
  );
}
