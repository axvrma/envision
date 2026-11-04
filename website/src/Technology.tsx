import {
  ArrowDown,
  ArrowUpRight,
  Box,
  Mic,
  ScanLine,
  Smartphone,
  Code2,
  Layers3,
} from "lucide-react";
import { Footer, REPO } from "./App";
const tech = [
  {
    icon: Box,
    name: "Three.js",
    tag: "THE RENDERER",
    copy: "Procedural geometry, material, light, and movement. Both experiences use the same ten object factories and bundled Three.js r152.",
  },
  {
    icon: ScanLine,
    name: "WebXR",
    tag: "THE SPATIAL LAYER",
    copy: "On compatible devices, WebXR is tried first. An immersive session requires hit tests and DOM overlay and places upright objects on horizontal surfaces.",
  },
  {
    icon: Layers3,
    name: "8th Wall",
    tag: "THE FALLBACK AR ENGINE",
    copy: "When WebXR is unavailable, Start AR tries the pinned 8th Wall 1.0.0 binary from jsDelivr. This closed SLAM engine has a separate license. Placement requires normal tracking and an estimated ground-plane intersection; it is not surface detection. Network access and compatible hardware are required.",
  },
  {
    icon: Mic,
    name: "Web Speech API",
    tag: "THE VOICE",
    copy: "Browser speech recognition passes a transcript to a shared command parser. It selects a predefined object and color. Recognition availability varies and may use your browser’s online speech service.",
  },
  {
    icon: Smartphone,
    name: "Progressive Web App",
    tag: "THE APP SHELL",
    copy: "The AR route has a scoped manifest and service worker. Supporting browsers can install its shell. Cached assets are helpful, but engine startup and speech may still require a connection.",
  },
  {
    icon: Code2,
    name: "React + TypeScript",
    tag: "THE BROWSER STUDIO",
    copy: "Vite builds the website. React Three Fiber manages the playground scene. Webpack builds the original camera AR runtime separately into the same static publish directory.",
  },
];
function Flow({ camera = false }: { camera?: boolean }) {
  return (
    <div className="flow-path">
      <div className="flow-title">
        {camera ? <ScanLine size={19} /> : <Box size={19} />}{" "}
        {camera ? "CAMERA AR" : "BROWSER PLAYGROUND"}
      </div>
      {(camera
        ? [
            "Explicit start + permissions",
            "WebXR first / 8th Wall fallback",
            "WebXR hit test / 8th Wall ground-plane reticle",
            "Shared objects + Three.js scene",
          ]
        : [
            "Choose an object / optional text or voice",
            "Shared vocabulary + command parser",
            "Object selection + color application",
            "React Three Fiber + Three.js scene",
          ]
      ).map((text, index) => (
        <div className="flow-step" key={text}>
          {index > 0 && <ArrowDown size={15} />}
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}
export default function Technology() {
  return (
    <>
      <main id="main-content" className="technology-page wrap">
        <section className="tech-intro">
          <span className="eyebrow">A LITTLE MAGIC. BUILT ON THE WEB.</span>
          <h1>
            Built for the next
            <br />
            <span>dimension of the web.</span>
          </h1>
          <p>
            Touch, geometry, and spatial tracking. Open web technologies come
            together to make imagination tangible.
          </p>
          <a href={REPO} className="text-link">
            Explore the source <ArrowUpRight size={17} />
          </a>
        </section>
        <div className="architecture">
          <div className="section-heading-row">
            <h2>Two ways to enter.</h2>
            <span className="eyebrow">ONE SHARED MODEL LIBRARY</span>
          </div>
          <div className="flow-grid">
            <Flow />
            <Flow camera />
          </div>
          <p>
            The playground works without camera access. AR uses a separate
            runtime with device-specific tracking. Saved compositions are shared through IndexedDB in the same browser and origin. AR requires placement at a fresh tracked origin; real-world anchors do not persist.
          </p>
        </div>
        <section className="tech-grid">
          {tech.map(({ icon: Icon, name, tag, copy }) => (
            <article key={name}>
              <Icon size={25} strokeWidth={1.3} />
              <span className="eyebrow">{tag}</span>
              <h2>{name}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </section>
        <p className="sheet-note">8th Wall XR engine by Niantic Spatial. Copyright © 2026 Niantic Spatial, Inc. All rights reserved. <a href="https://github.com/8thwall/engine/blob/main/LICENSE" target="_blank" rel="noreferrer">XR Engine License Agreement and warranty disclaimer ↗</a>. Its MIT framework excludes SLAM. Engine availability does not establish compatibility or licensing for every intended use.</p>
        <section className="honest-tech">
          <span className="eyebrow">
            SMALL VOCABULARY. SPATIAL POSSIBILITIES.
          </span>
          <h2>
            Your words select the object.
            <br />
            Your world gives it context.
          </h2>
          <p>
            Envision recognizes supported color and object combinations,
            including “gold rocket”, “blue bird”, and “gray elephant”. It places
            predefined models; arbitrary descriptions do not generate new
            geometry.
          </p>
          <p>
            Camera and microphone permissions are requested only after your
            action. Third-party AR and speech services have their own processing
            behavior. Envision adds no analytics or visitor tracking.
          </p>
          <a className="button primary" href="/experience">
            Explore the playground <ArrowUpRight size={17} />
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
