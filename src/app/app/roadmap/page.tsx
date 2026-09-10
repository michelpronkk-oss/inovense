import { roadmapItems } from "@/lib/product/roadmap";
import { RoadmapFeedbackButton } from "@/components/dashboard/roadmap-feedback-button";
import { PageHeader, SectionHeader } from "@/components/product-ui/page-primitives";

const STATUSES = ["available", "next", "exploring"] as const;
const labels = { available: "Available now", next: "Next", exploring: "Exploring" } as const;
const sectionTitles = {
  available: "The workforce you can use today.",
  next: "The clearest direction from here.",
  exploring: "Where we are learning next.",
} as const;

export default function RoadmapPage() {
  return (
    <div className="os-page roadmap-page">
      <PageHeader
        eyebrow="Product direction"
        title="Roadmap"
        description="Auterim evolves around the systems and work customers actually use. Priorities may change as we learn."
      />
      {STATUSES.map((status) => {
        const items = roadmapItems(status);
        if (!items.length) return null;
        return (
          <section key={status} className="sec">
            <SectionHeader title={sectionTitles[status]} detail={labels[status]} />
            <div className="grid3">
              {items.map((item) => (
                <article key={item.key} className="panel" style={{ padding: "18px 20px" }}>
                  <span className="t-eyebrow">{labels[status]}</span>
                  <h3 className="t-object" style={{ margin: "10px 0 6px" }}>{item.name}</h3>
                  <p className="t-compact" style={{ margin: 0 }}>{item.summary}</p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <section className="sec panel" style={{ padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="t-eyebrow">Missing something?</span>
          <h2 className="t-section" style={{ margin: "8px 0 4px" }}>Tell us what your business needs next.</h2>
          <p className="t-compact" style={{ margin: 0 }}>Connector and operator requests help shape what Auterim prioritizes.</p>
        </div>
        <RoadmapFeedbackButton />
      </section>
    </div>
  );
}
