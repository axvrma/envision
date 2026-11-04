import { lazy, Suspense, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  Github,
  Menu,
  X,
  MoveUpRight,
  MousePointer2,
  RotateCcw,
  ScanLine,
  Mic,
  Box,
  Smartphone,
  Sparkles,
  Check,
  Code2,
  Orbit,
  Layers3,
} from "lucide-react";
import SceneView from "./components/scene/SceneView";
import CommandBar from "./components/voice/CommandBar";
import { useScene, type SceneObject } from "./lib/scene";
const Studio = lazy(() => import("./Studio"));
const Technology = lazy(() => import("./Technology"));
export const REPO = "https://github.com/axvrma/envision";
export function Brand() {
  return (
    <a href="/" className="brand" aria-label="Envision home">
      <img src="/brand/icon.svg" alt="" width="34" height="34" />
      <span>envision.</span>
    </a>
  );
}
function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  return (
    <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        <Brand />
        <nav
          className={open ? "nav-links open" : "nav-links"}
          aria-label="Main navigation"
        >
          <a href="/experience">Experience</a>
          <a href="/#how-it-works">How it works</a>
          <a href="/technology">Technology</a>
          <a href={REPO} target="_blank" rel="noreferrer">
            GitHub <ArrowUpRight size={12} />
          </a>
        </nav>
        <a className="nav-launch" href="/ar">
          Launch AR <ArrowUpRight size={15} />
        </a>
        <button
          className="menu-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer wrap">
      <div>
        <Brand />
        <p>Choose it. Place it. Play.</p>
      </div>
      <nav aria-label="Footer navigation">
        <a href="/experience">Experience</a>
        <a href="/ar">AR</a>
        <a href="/technology">Technology</a>
        <a href={REPO}>GitHub</a>
        <a href={`${REPO}/issues`}>Issues</a>
      </nav>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Envision · ISC license</span>
        <a href="https://github.com/axvrma">
          Built by Abhishek Verma <ArrowUpRight size={12} />
        </a>
        <span>Made for the curious.</span>
      </div>
    </footer>
  );
}
const initialGallery: SceneObject[] = [
  {
    id: "show-elephant",
    type: "elephant",
    color: "gray",
    position: [-1.6, 0, 0],
    rotation: -25,
    scale: 0.8,
  },
  {
    id: "show-rocket",
    type: "rocket",
    color: "gold",
    position: [0.4, 0, -0.4],
    rotation: -25,
    scale: 1,
  },
  {
    id: "show-bird",
    type: "bird",
    color: "blue",
    position: [2.3, 1, 0],
    rotation: -30,
    scale: 0.55,
  },
];
function Home() {
  const scene = useScene();
  const reduced = !!useReducedMotion();
  const [step, setStep] = useState(0);
  const [gallery, setGallery] = useState(initialGallery);
  return (
    <>
      <main id="main-content">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="eyebrow"
            >
              <span className="status-dot" /> INTRODUCING ENVISION{" "}
              <span className="eyebrow-divider" /> AR PLAYGROUND
            </motion.div>
            <motion.h1
              id="hero-title"
              initial={reduced ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.12 }}
            >
              Your world.
              <br />
              <span>A new reality.</span>
            </motion.h1>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
            >
              <p className="hero-description">
                Choose a form. Make it yours.
                <br />
                Bring it into your space with augmented reality.
              </p>
              <div className="hero-actions">
                <a href="/experience" className="button primary">
                  Try the Experience <ArrowUpRight size={18} />
                </a>
                <a href="/ar" className="button secondary">
                  <ScanLine size={17} /> Launch AR
                </a>
              </div>
              <p className="device-note">
                <span className="tiny-ring" /> No headset required. Just a
                little curiosity.
              </p>
              <p className="compat-note">
                Compatible device and permissions needed for AR.
              </p>
            </motion.div>
          </div>
          <div className="hero-visual">
            <div className="scene-orbit orbit-one" />
            <div className="scene-orbit orbit-two" />
            <span className="spatial-cross cross-one">+</span>
            <span className="spatial-cross cross-two">+</span>
            <div className="scene-corner">
              <span className="status-dot" /> LIVE IN YOUR BROWSER
            </div>
            <div className="object-coordinate">
              OBJECT / {scene.objects[0]?.type.toUpperCase() || "EMPTY"}
              <br />
              <span>IMAGINATION, MATERIALIZED.</span>
            </div>
            <SceneView
              objects={scene.objects}
              selected={scene.selected}
              onSelect={scene.setSelected}
              resetKey={scene.resetKey}
              cameraView={scene.cameraView}
              reduced={reduced}
            />
            <div className="scene-tools">
              <span>
                <MousePointer2 size={12} /> Drag to explore
              </span>
              <button onClick={scene.reset} aria-label="Reset hero camera">
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => scene.orbit(1)}
                aria-label="Rotate hero view"
              >
                ↷
              </button>
              <button onClick={scene.clear} aria-label="Clear hero scene">
                <X size={15} />
              </button>
            </div>
            <div className="object-tag">
              <span className="tag-cross">✦</span>
              <span>
                {scene.objects.length
                  ? `${scene.objects[0].color} ${scene.objects[0].type}`
                  : "Your next idea"}
                <small>
                  {scene.objects.length
                    ? "FROM A FEW WORDS TO 3D"
                    : "THE POSSIBILITIES ARE OPEN"}
                </small>
              </span>
              <Check size={14} />
            </div>
          </div>
          <div className="hero-command">
            <CommandBar onCommand={scene.execute} message={scene.message} />
          </div>
          <div className="hero-bottom">
            <a href="#possibilities">
              <ChevronDown size={13} /> SCROLL TO DISCOVER
            </a>
            <span>LESS BETWEEN YOU AND YOUR IMAGINATION.</span>
            <span className="hero-index">01 — ∞</span>
          </div>
        </section>
        <div className="technology-strip">
          <div className="wrap">
            <span>BUILT FOR A MORE SPATIAL WEB</span>
            <div>
              <Box size={18} /> Three.js
            </div>
            <div>
              <Orbit size={19} /> WebXR
            </div>
            <div>
              <Layers3 size={18} /> 8th Wall
            </div>
            <div>
              <Mic size={17} /> Web Speech API
            </div>
            <div>
              <Smartphone size={17} /> Progressive Web App
            </div>
          </div>
        </div>
        <section
          id="possibilities"
          className="possibilities wrap section-space"
        >
          <div className="section-intro">
            <span className="eyebrow">THE SPACE BETWEEN IDEA AND REALITY</span>
            <h2>
              What if your imagination
              <br />
              didn’t stay in your head?
            </h2>
            <p>
              Turn your imagination into something you can see. Choose an object,
              bring a 3D object to life, and place it in the world around you.
            </p>
          </div>
          <div className="story-grid">
            <article className="voice-story">
              <div className="story-number">
                01 / A LITTLE VOICE. A BIG POSSIBILITY.
              </div>
              <div className="waveform" aria-hidden="true">
                {Array.from({ length: 43 }, (_, index) => (
                  <i
                    key={index}
                    style={{
                      height: `${12 + Math.abs(Math.sin(index * 1.7)) * 52}px`,
                      animationDelay: `${index * 0.035}s`,
                    }}
                  />
                ))}
              </div>
              <div className="voice-example">
                <Mic size={15} />
                <span>“gold rocket”</span>
                <ArrowRight size={16} />
                <Sparkles size={17} />
              </div>
              <h3>Say it. See it.</h3>
              <p>
                A color. An object. A moment of magic. Optional voice commands bring the
                model library to life. Manual controls are always available.
              </p>
              <a className="text-link" href="/experience">
                Find your first creation <ArrowUpRight size={15} />
              </a>
            </article>
            <article className="world-story">
              <div className="story-number">02 / RIGHT WHERE YOU ARE.</div>
              <div
                className="surface-illustration"
                aria-label="Illustration of a virtual crystal placed on a surface"
              >
                <div className="surface-plane" />
                <div className="surface-reticle" />
                <div className="crystal-shape" />
                <span className="surface-label">
                  <span className="status-dot" /> SURFACE PLACEMENT ·
                  ILLUSTRATION
                </span>
              </div>
              <div className="world-copy">
                <h3>Your world is the canvas.</h3>
                <p>
                  Find a surface. Place your object. Move around it. On
                  supported devices, your creation stays in place as your
                  perspective changes.
                </p>
                <a className="text-link" href="/ar">
                  Bring it into your space <ArrowUpRight size={15} />
                </a>
              </div>
            </article>
          </div>
        </section>
        <section className="library-section section-space">
          <div className="wrap">
            <div className="section-heading-row">
              <div>
                <span className="eyebrow">03 / ROOM FOR POSSIBILITY</span>
                <h2>Imagination has dimension.</h2>
              </div>
              <a className="text-link" href="/experience">
                Explore the object library <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="library-showcase">
              <h3 className="showcase-heading">
                See the impossible become visible.
              </h3>
              <SceneView objects={gallery} reduced={reduced} studio />
              <span className="illustration-label">
                LIVE 3D · PLACEMENT ILLUSTRATION · SHARED MODEL LIBRARY
              </span>
              <div className="library-switches">
                {["elephant", "rocket", "bird"].map((type, index) => (
                  <button
                    key={type}
                    onClick={() =>
                      setGallery(initialGallery.filter((_, i) => i === index))
                    }
                  >
                    {type}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
                <button
                  onClick={() => setGallery([])}
                  aria-label="Clear showcase scene"
                >
                  Clear <X size={12} />
                </button>
                <button onClick={() => setGallery(initialGallery)}>
                  Show all <Layers3 size={12} />
                </button>
              </div>
            </div>
            <p className="library-caption">
              From familiar forms to flights of fancy. Ten predefined objects. A
              whole spectrum of color.
            </p>
          </div>
        </section>
        <section id="how-it-works" className="how-section wrap section-space">
          <span className="eyebrow">FROM THE POSSIBLE TO THE TANGIBLE</span>
          <h2>
            Three steps from
            <br />
            ideas to reality.
          </h2>
          <div className="walkthrough">
            <div
              className="steps"
              role="tablist"
              aria-label="How Envision works"
            >
              {[
                {
                  title: "Open",
                  text: "Launch Envision on a compatible device. No headset, no app store.",
                },
                {
                  title: "Choose",
                  text: "Browse ten objects and choose a color. Voice and text are optional shortcuts.",
                },
                {
                  title: "Place",
                  text: "Scan a well-lit floor or table. Wait for a tracked target, then confirm placement.",
                },
              ].map((item, index) => (
                <button
                  id={`step-${index}`}
                  role="tab"
                  aria-selected={step === index}
                  aria-controls="step-panel"
                  key={item.title}
                  onClick={() => setStep(index)}
                  className={step === index ? "active" : ""}
                >
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                  <ArrowUpRight size={20} />
                </button>
              ))}
            </div>
            <div
              className="walkthrough-visual"
              role="tabpanel"
              id="step-panel"
              aria-labelledby={`step-${step}`}
            >
              <div className="phone">
                <div className="phone-island" />
                <div className="phone-brand">envision.</div>
                {step === 0 ? (
                  <>
                    <img src="/brand/icon.svg" alt="" />
                    <strong>
                      Your world.
                      <br />
                      Reimagined.
                    </strong>
                    <a href="/ar" className="button primary">
                      Start exploring <ArrowUpRight size={15} />
                    </a>
                  </>
                ) : step === 1 ? (
                  <>
                    <div className="phone-mic">
                      <Mic size={35} />
                    </div>
                    <strong>“gray elephant”</strong>
                    <span>A COLOR + AN OBJECT</span>
                  </>
                ) : (
                  <>
                    <div className="phone-reticle" />
                    <Box size={74} className="phone-object" />
                    <strong>Find your surface.</strong>
                    <span>WAIT FOR THE PLACEMENT RETICLE</span>
                  </>
                )}
              </div>
              <span className="illustration-label">
                INTERACTION WALKTHROUGH · ILLUSTRATION
              </span>
            </div>
          </div>
        </section>
        <section className="pwa-section wrap">
          <div className="pwa-icon">
            <Smartphone size={38} />
            <span>
              <Check size={13} />
            </span>
          </div>
          <div>
            <span className="eyebrow">
              04 / LESS FRICTION. MORE EXPLORATION.
            </span>
            <h2>
              Open your browser.
              <br />
              Enter another dimension.
            </h2>
            <p>
              Envision lives on the web. Install its AR app shell to your home
              screen where your browser supports it. The camera experience still
              needs a compatible device, permissions, and a connection for its
              AR engine.
            </p>
          </div>
          <a href="/ar" className="button secondary">
            Meet your new reality <ArrowUpRight size={17} />
          </a>
        </section>
        <section className="open-source wrap section-space">
          <div className="source-art" aria-hidden="true">
            <Code2 size={90} strokeWidth={0.7} />
            <span>OPEN SOURCE. OPEN POSSIBILITIES.</span>
          </div>
          <div>
            <span className="eyebrow">
              FOR THE BUILDERS. AND THE DAYDREAMERS.
            </span>
            <h2>Built in the open.</h2>
            <p>
              Explore the code behind Envision and discover how voice, 3D
              rendering, and augmented reality come together in the browser.
            </p>
            <div className="source-links">
              <a href={REPO} className="text-link">
                <Github size={17} /> View Source <ArrowUpRight size={14} />
              </a>
              <a href="/technology" className="text-link">
                Explore Architecture <ArrowUpRight size={14} />
              </a>
              <a href={`${REPO}/issues`} className="text-link">
                Report an Issue <ArrowUpRight size={14} />
              </a>
            </div>
            <span className="source-license">axvrma/envision · ISC LICENSE</span>
          </div>
        </section>
        <section className="final-cta">
          <div
            className="final-scene"
            aria-hidden="true"
            ref={(node) => node?.setAttribute("inert", "")}
          >
            <SceneView
              objects={[
                {
                  id: "final-rocket",
                  type: "rocket",
                  color: "gold",
                  position: [0, 0, 0],
                  rotation: 20,
                  scale: 1,
                },
              ]}
              reduced={reduced}
            />
          </div>
          <div className="final-orbit" />
          <div className="final-star">✦</div>
          <span className="eyebrow">SPEAK IT. SEE IT. EXPERIENCE IT.</span>
          <h2>
            The world is yours
            <br />
            to imagine.
          </h2>
          <p>Your next creation is a tap away.</p>
          <div className="hero-actions">
            <a href="/ar" className="button primary">
              Launch Envision <ArrowUpRight size={17} />
            </a>
            <a href={REPO} className="text-link">
              Explore on GitHub <ArrowUpRight size={16} />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
export default function App() {
  const route = window.location.pathname.replace(/\/$/, "") || "/";
  useEffect(() => {
    const title =
      route === "/experience"
        ? "3D Playground"
        : route === "/technology"
          ? "Technology"
          : "AR Playground";
    document.title = `Envision — ${title}`;
  }, [route]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Header />
      <Suspense
        fallback={
          <main id="main-content" className="route-loading">
            Opening your next dimension…
          </main>
        }
      >
        {route === "/experience" ? (
          <Studio />
        ) : route === "/technology" ? (
          <Technology />
        ) : route === "/" ? (
          <Home />
        ) : (
          <main id="main-content" className="not-found wrap">
            <span className="eyebrow">404 / OUTSIDE THIS DIMENSION</span>
            <h1>Let’s find your way back.</h1>
            <a href="/" className="button primary">
              Back to Envision <ArrowRight size={18} />
            </a>
          </main>
        )}
      </Suspense>
    </>
  );
}
