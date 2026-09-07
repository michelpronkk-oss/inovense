import { roadmapItems } from "@/lib/product/roadmap";
import { RoadmapFeedbackButton } from "@/components/dashboard/roadmap-feedback-button";

const labels = { available: "Available now", next: "Next", exploring: "Exploring" } as const;

export default function RoadmapPage() {
  return <div className="os-page roadmap-page"><header className="os-page-head"><div><div className="os-profile-eyebrow">Product direction</div><h1>Roadmap built around real customer work.</h1><p className="os-page-sub">Auterim evolves around the systems and work customers actually use. Priorities may change as we learn.</p></div></header>{(["available", "next", "exploring"] as const).map((status) => <section key={status} className="roadmap-section"><div className="roadmap-section-head"><div><span>{labels[status]}</span><h2>{status === "available" ? "The workforce you can use today." : status === "next" ? "The clearest direction from here." : "Where we are learning next."}</h2></div></div><div className="roadmap-list">{roadmapItems(status).map((item) => <article key={item.key} className="roadmap-item"><div><strong>{item.name}</strong><span>{item.type}</span></div><p>{item.summary}</p><em>{labels[status]}</em></article>)}</div></section>)}<section className="roadmap-feedback"><div><span>Missing something?</span><h2>Tell us what your business needs next.</h2><p>Connector and operator requests help shape what Auterim prioritizes.</p></div><RoadmapFeedbackButton /></section></div>;
}
