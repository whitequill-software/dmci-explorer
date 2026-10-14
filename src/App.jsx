import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Download,
  Heart,
  Leaf,
  MapPin,
  Menu,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  Explorer,
  Neighborhood,
  FloorPlan,
} from "./components/Illustrations.jsx";
import { homeTypes, questions } from "./data/content.js";
import { makeBrief } from "./planner.js";

function Brand() {
  return (
    <a href="#home" className="brand" aria-label="DMCI Explorer home">
      <span className="brand-icon">
        <Compass size={29} />
      </span>
      <span>
        DMCI <strong>Explorer</strong>
        <small>DMCI HOMES FOR FAMILIES</small>
      </span>
    </a>
  );
}
function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p className="section-description">{children}</p>}
    </div>
  );
}
function Planner() {
  const [values, setValues] = useState({
    bedrooms: "2 bedrooms",
    location: "",
    priorities: [],
    budget: "",
    notes: "",
  });
  const [downloaded, setDownloaded] = useState(false);
  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
    setDownloaded(false);
  }
  function download(event) {
    event.preventDefault();
    const blob = new Blob([makeBrief(values)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-family-home-plan.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  }
  return (
    <section id="planner" className="planner-section section-pad">
      <div className="planner-intro">
        <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
        <h2>
          Big dreams.
          <br />
          Little first steps.
        </h2>
        <p>
          You don’t need all the answers just yet. Put together a simple home
          search brief, starting with what matters most.
        </p>
        <div className="planner-note">
          <ShieldCheck size={21} />
          <span>
            Your answers stay in your browser and are never sent to a server.
          </span>
        </div>
        <Explorer className="planner-explorer" />
      </div>
      <form onSubmit={download} className="planner-form">
        <div className="flex items-center justify-between gap-3">
          <h3>Let’s map out your family home</h3>
          <span className="step-label">HOME PLANNER</span>
        </div>
        <fieldset>
          <legend>How much space feels right?</legend>
          <div className="bedroom-options">
            {["2 bedrooms", "3 bedrooms", "Still exploring"].map((label) => (
              <label
                key={label}
                className={values.bedrooms === label ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="bedrooms"
                  value={label}
                  checked={values.bedrooms === label}
                  onChange={() => update("bedrooms", label)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field-label">
          Preferred city or neighborhood
          <input
            maxLength={120}
            value={values.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Where would your family feel at home?"
          />
        </label>
        <fieldset>
          <legend>What’s on your family’s wish list?</legend>
          <div className="priority-options">
            {[
              "Near school",
              "Easy commute",
              "Green spaces",
              "Home office",
              "Room for family",
              "Play spaces",
            ].map((label) => (
              <label key={label}>
                <input
                  type="checkbox"
                  checked={values.priorities.includes(label)}
                  onChange={(e) =>
                    update(
                      "priorities",
                      e.target.checked
                        ? [...values.priorities, label]
                        : values.priorities.filter((x) => x !== label),
                    )
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field-label">
          Comfortable budget <span>(optional)</span>
          <input
            maxLength={100}
            value={values.budget}
            onChange={(e) => update("budget", e.target.value)}
            placeholder="e.g. a total budget or monthly target"
          />
        </label>
        <label className="field-label">
          Anything else on your mind? <span>(optional)</span>
          <textarea
            rows={3}
            maxLength={1200}
            value={values.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="A favorite neighborhood, a timeline, a question…"
          />
        </label>
        <button className="button primary w-full justify-center" type="submit">
          <Download size={18} /> Download my home plan
        </button>
        <p className="form-help" role="status">
          {downloaded
            ? "Your plan is ready. Check your downloads for my-family-home-plan.txt."
            : "Save your brief to share when you’re ready. This is a planning tool, not an inquiry submission."}
        </p>
      </form>
    </section>
  );
}
export default function App() {
  const [menu, setMenu] = useState(false);
  const [homeFilter, setHomeFilter] = useState("all");
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="nav-wrap">
          <Brand />
          <button
            className="menu-toggle"
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            aria-controls="main-navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <nav
            id="main-navigation"
            className={menu ? "open" : ""}
            aria-label="Main navigation"
          >
            {[
              ["Explore homes", "#homes"],
              ["Our approach", "#approach"],
              ["FAQs", "#faqs"],
            ].map(([label, url]) => (
              <a key={url} href={url} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
            <a
              className="button nav-cta"
              href="#planner"
              onClick={() => setMenu(false)}
            >
              Start your journey <ArrowRight size={16} />
            </a>
          </nav>
        </div>
      </header>
      <main id="main">
        <section id="home" className="hero section-pad">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-sun">✳</span> A HOME FOR YOUR NEXT ADVENTURE
            </p>
            <h1>
              A little exploring.
              <br />A place to <em>grow.</em>
            </h1>
            <p className="hero-description">
              For first steps, Sunday mornings, and everything in between. Let’s
              explore a DMCI home that fits your family’s next chapter.
            </p>
            <div className="hero-actions">
              <a href="#homes" className="button primary">
                Explore family homes <ArrowRight size={18} />
              </a>
              <a href="#planner" className="text-link">
                Plan your journey <MoveUpRight size={16} />
              </a>
            </div>
            <div className="hero-footnote">
              <span className="heart-badge">
                <Heart size={18} />
              </span>
              <span>
                Thoughtfully exploring homes.
                <br />
                <strong>Always putting families first.</strong>
              </span>
            </div>
          </div>
          <div className="hero-art">
            <span className="art-note note-top">
              <Leaf size={16} /> A little closer to nature
            </span>
            <Neighborhood className="neighborhood" />
            <div className="explorer-greeting">
              <Explorer className="hero-explorer" />
              <span>
                Hi, explorer!
                <br />
                <strong>Let’s find your happy place.</strong>
                <svg viewBox="0 0 60 40" aria-hidden="true">
                  <path
                    d="M55 3Q55 35 8 29m0 0 12-10M8 29l15 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
            </div>
            <span className="art-note note-bottom">
              <span className="small-dot" /> Room for life’s best moments
            </span>
          </div>
          <a href="#approach" className="scroll-hint">
            <ArrowDown size={14} /> A little more to discover
          </a>
        </section>
        <div className="values-strip">
          <span>
            <Heart /> Family comes first
          </span>
          <span>
            <Leaf /> Space to slow down
          </span>
          <span>
            <Compass /> Guidance for your journey
          </span>
        </div>
        <section id="approach" className="approach section-pad">
          <SectionHeading
            eyebrow="MORE THAN A PLACE TO LIVE"
            title={
              <>
                Home is where your
                <br />
                family’s story unfolds.
              </>
            }
          >
            The right home fits more than your furniture. It fits the way you
            live, the people you love, and the life you’re building together.
          </SectionHeading>
          <div className="approach-grid">
            {[
              [
                Heart,
                "Made for your everyday",
                "Room to gather, space to recharge, and a place for the little routines that make a house feel like home.",
              ],
              [
                Leaf,
                "A little breathing room",
                "Think about light, open spaces, and the outdoor moments you’d love to bring into your daily routine.",
              ],
              [
                MapPin,
                "Close to what matters",
                "Start with school runs, workdays, and weekend visits. A good location works for your whole family.",
              ],
            ].map(([Icon, title, description], i) => (
              <article key={title}>
                <span className={"feature-icon feature-" + i}>
                  <Icon size={25} />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="homes" className="homes section-pad">
          <div className="homes-heading">
            <SectionHeading
              eyebrow="FIND YOUR KIND OF SPACE"
              title="Small moments. More room."
            >
              Begin with a home size that makes sense for your family.
            </SectionHeading>
            <div
              className="filter-tabs"
              role="group"
              aria-label="Filter home types"
            >
              {[
                ["all", "All home types"],
                ["2br", "2 bedrooms"],
                ["3br", "3 bedrooms"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={homeFilter === id}
                  className={homeFilter === id ? "active" : ""}
                  onClick={() => setHomeFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="home-grid">
            {homeTypes
              .filter((h) => homeFilter === "all" || h.id === homeFilter)
              .map((home) => (
                <article className="home-card" key={home.id}>
                  <div className={"plan-art " + home.tone}>
                    <span className="plan-label">{home.label}</span>
                    <FloorPlan beds={home.beds} />
                    <span className="concept-label">
                      ILLUSTRATIVE PLAN · NOT AN ACTUAL UNIT
                    </span>
                  </div>
                  <div className="home-card-copy">
                    <h3>{home.title}</h3>
                    <p>{home.description}</p>
                    <div className="home-tags">
                      {home.tags.map((t) => (
                        <span key={t}>
                          <Check size={13} />
                          {t}
                        </span>
                      ))}
                    </div>
                    <a href="#planner" className="text-link">
                      Plan for {home.beds} bedrooms <ArrowRight size={17} />
                    </a>
                  </div>
                </article>
              ))}
          </div>
          <p className="listing-notice">
            <Compass size={17} /> Verified property listings are on their way.
            These are home planning guides, not available units.
          </p>
        </section>
        <section className="journey section-pad">
          <div className="journey-top">
            <SectionHeading
              eyebrow="ONE STEP AT A TIME"
              title="Your home journey, made a little simpler."
            />
            <p>
              No pressure to have it all figured out.
              <br />
              Just a thoughtful place to begin.
            </p>
          </div>
          <div className="journey-steps">
            {[
              [
                "01",
                "Dream a little",
                "Imagine your family’s everyday life. What would make it easier, happier, or a little more you?",
              ],
              [
                "02",
                "Explore your fit",
                "Consider your space, location, and budget. Keep the things that matter most in focus.",
              ],
              [
                "03",
                "Plan your next step",
                "Download your home search brief and bring your questions to a verified property consultation.",
              ],
            ].map(([number, title, description]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <Planner />
        <section id="faqs" className="faq section-pad">
          <SectionHeading
            eyebrow="A FEW THINGS YOU MIGHT BE WONDERING"
            title="Good questions. A clearer path."
          />
          <div className="faq-list">
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={20} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing">
          <Sparkles size={23} />
          <h2>Here’s to a place for your next chapter.</h2>
          <a className="button light" href="#planner">
            Let’s start exploring <ArrowRight size={17} />
          </a>
        </section>
      </main>
      <footer className="section-pad">
        <div className="footer-main">
          <Brand />
          <p>
            A little exploring. A place to grow.
            <br />
            DMCI Homes for Families.
          </p>
          <div>
            <a href="#homes">Explore homes</a>
            <a href="#planner">Home planner</a>
            <a href="#faqs">Questions & answers</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} DMCI Explorer</span>
          <span>
            Independent home search guide. Not the official DMCI Homes website.
          </span>
          <a href="#privacy">Privacy</a>
        </div>
        <details id="privacy" className="privacy">
          <summary>Privacy & website information</summary>
          <p>
            This version has no analytics, cookies, inquiry backend, or visitor
            tracking. Planner answers are held in your browser’s memory and only
            exported when you download your brief. Closing or refreshing the
            page clears them. The hosting provider may process standard access
            logs. No availability, prices, or offers are represented here.
            Contact details and inquiry services will be added after
            verification.
          </p>
        </details>
      </footer>
    </>
  );
}
