import V3Header from "./v3-header";
import V3Footer from "./v3-footer";
import { PublicHero, PublicCta } from "./public-page-components";
import { ConnectionLayer, StorySection } from "./public-story-components";
import { AboutHeroVisual } from "./page-specific-hero-visuals";
import "./auterim-v3.css";
import "./auterim-v3-refinement.css";
import "./auterim-v3-typography.css";
import "./public-pages.css";
import "./about-editorial.css";

export default function AboutEditorial() {
  return <div className="auterim-v3-page public-page about-page">
    <V3Header />
    <main>
      <PublicHero label="About Auterim" title="AI should understand the business before it touches the work." description="We are building an AI workforce around the context, systems, and decisions that make a business its own." visual={<AboutHeroVisual />} />
      <section className="about-thesis"><div className="wrap">
        <span className="lbl">Why Auterim exists</span>
        <h2>The difficult part is knowing what should happen next.</h2>
        <div className="about-thesis-copy"><p>Real work is spread across inboxes, CRM, tasks, files, and the knowledge people carry. Teams spend time rebuilding that context before they can move anything forward.</p><p>Auterim begins with the business: what matters, who owns the work, and where action is safe.</p></div>
      </div></section>
      <StorySection label="What changed in software" title="The next useful layer prepares the next move." description="Software can do more than wait for another instruction. It can notice relevant context, prepare useful work, and know when a person needs to decide.">
        <div className="about-shift-statement"><span>Understand the context.</span><span>Prepare the work.</span><span>Respect the boundary.</span></div>
      </StorySection>
      <StorySection label="What we are building" title="An operating layer around your business." description="Defined operator roles, connected systems, and clear human control. A useful next step should arrive with its context intact.">
        <ConnectionLayer />
      </StorySection>
      <aside className="about-company-note"><div className="wrap"><span className="lbl">The company we are building</span><p>Auterim is built around a simple product belief: AI should earn its place through the work it helps move forward. We are developing that depth during Early Access, one controlled operating loop at a time.</p></div></aside>
      <PublicCta title="Start with the work you want to move." description="Tell us where your team needs a clearer next step." />
    </main>
    <V3Footer />
  </div>;
}
