import { useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  Box,
  Circle,
  Triangle,
  Cylinder,
  Bird,
  TreePine,
  Rocket,
  Gem,
  Shapes,
  RotateCcw,
  Trash2,
  ChevronDown,
  Plus,
  ArrowUpRight,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { COLORS, OBJECT_LIBRARY, type ObjectType } from "../../shared/commands";
import { useScene } from "./lib/scene";
import SceneView from "./components/scene/SceneView";
import CommandBar from "./components/voice/CommandBar";
const icons = {
  cube: Box,
  sphere: Circle,
  cylinder: Cylinder,
  cone: Triangle,
  elephant: Shapes,
  bird: Bird,
  flock: Bird,
  tree: TreePine,
  rocket: Rocket,
  crystal: Gem,
};
const colorNames = Object.keys(COLORS).filter((color) => color !== "grey");
export default function Studio() {
  const scene = useScene(true);
  const reduced = !!useReducedMotion();
  const [color, setColor] = useState("gold");
  const [inspector, setInspector] = useState(
    () => window.matchMedia("(min-width: 851px)").matches,
  );
  const [library, setLibrary] = useState(
    () => window.matchMedia("(min-width: 641px)").matches,
  );
  const selected = scene.objects.find((object) => object.id === scene.selected);
  return (
    <main id="main-content" className="studio-page">
      <div className="studio-top">
        <div>
          <span className="eyebrow">
            <span className="status-dot" /> YOUR BROWSER IS YOUR STUDIO
          </span>
          <h1>A little space to imagine.</h1>
        </div>
        <a href="/ar" className="text-link">
          Take it into your world <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="studio-workspace">
        <aside className={`object-library ${library ? "expanded" : ""}`}>
          <button
            className="panel-heading"
            onClick={() => setLibrary(!library)}
            aria-expanded={library}
          >
            OBJECT LIBRARY <ChevronDown size={15} />
          </button>
          <div className="library-content">
            <p className="panel-hint">Pick a form. Make it yours.</p>
            <div className="object-grid">
              {(Object.keys(OBJECT_LIBRARY) as ObjectType[]).map((type) => {
                const Icon = icons[type];
                return (
                  <button
                    key={type}
                    aria-label={`Add ${OBJECT_LIBRARY[type].label.toLowerCase()}`}
                    onClick={() => scene.execute(`${color} ${type}`)}
                  >
                    <Icon size={25} strokeWidth={1.2} />
                    <span>{OBJECT_LIBRARY[type].label}</span>
                    <Plus className="object-plus" size={10} />
                  </button>
                );
              })}
            </div>
            <div className="panel-heading">COLOR PALETTE</div>
            <div className="color-palette">
              {colorNames.map((name) => (
                <button
                  key={name}
                  style={
                    {
                      "--swatch": `#${COLORS[name].toString(16).padStart(6, "0")}`,
                    } as React.CSSProperties
                  }
                  className={name === color ? "selected" : ""}
                  aria-label={`Use ${name}`}
                  aria-pressed={name === color}
                  onClick={() => {
                    setColor(name);
                    if (selected) scene.update(selected.id, { color: name });
                  }}
                  title={name}
                />
              ))}
            </div>
            <label className="mode-label">
              WHEN I CREATE
              <select
                aria-label="Scene mode"
                value={scene.mode}
                onChange={(event) =>
                  scene.setMode(event.target.value as "add" | "replace")
                }
              >
                <option value="add">Add to scene</option>
                <option value="replace">Replace scene</option>
              </select>
            </label>
            <div className="studio-control-buttons">
              <button onClick={scene.reset}>
                <RotateCcw size={15} /> Reset camera
              </button>
              <button onClick={scene.clear}>
                <Trash2 size={15} /> Clear scene
              </button>
            </div>
            <div className="camera-alternatives" aria-label="Camera controls">
              <button
                onClick={() => scene.orbit(-1)}
                aria-label="Rotate view left"
              >
                ↶
              </button>
              <button
                onClick={() => scene.orbit(1)}
                aria-label="Rotate view right"
              >
                ↷
              </button>
              <button onClick={() => scene.zoom(1)} aria-label="Zoom in">
                +
              </button>
              <button onClick={() => scene.zoom(-1)} aria-label="Zoom out">
                −
              </button>
            </div>
          </div>
        </aside>
        <div className="studio-center">
          <div className="viewport-meta">
            <span>
              <span className="status-dot" /> PERSPECTIVE VIEW
            </span>
            <span>{scene.objects.length} / 12 OBJECTS</span>
          </div>
          <SceneView
            objects={scene.objects}
            selected={scene.selected}
            onSelect={scene.setSelected}
            resetKey={scene.resetKey}
            cameraView={scene.cameraView}
            studio
            reduced={reduced}
          />
          <div className="viewport-help">
            Drag to orbit <span>·</span> Pinch or scroll to zoom <span>·</span>{" "}
            Click an object to select
          </div>
          <button
            className="inspector-toggle"
            aria-label={inspector ? "Hide inspector" : "Show inspector"}
            onClick={() => setInspector(!inspector)}
          >
            {inspector ? (
              <PanelRightClose size={18} />
            ) : (
              <PanelRightOpen size={18} />
            )}
          </button>
        </div>
        {inspector && (
          <aside className="inspector">
            <div className="panel-heading">
              OBJECT INSPECTOR <Box size={14} />
            </div>
            {selected ? (
              <>
                <div className="selected-object">
                  <span className="status-dot" />
                  <h2>{OBJECT_LIBRARY[selected.type].label}</h2>
                  <span className="panel-hint">Selected</span>
                </div>
                <label className="field-label">
                  COLOR
                  <select
                    aria-label="Selected object color"
                    value={selected.color}
                    onChange={(event) =>
                      scene.update(selected.id, { color: event.target.value })
                    }
                  >
                    {colorNames.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend>POSITION</legend>
                  <div className="position-fields">
                    {["X", "Y", "Z"].map((axis, index) => (
                      <label key={axis}>
                        {axis}
                        <input
                          type="number"
                          aria-label={`Position ${axis}`}
                          min={-8}
                          max={8}
                          step={0.1}
                          value={selected.position[index]}
                          onChange={(event) => {
                            const position = [...selected.position] as [
                              number,
                              number,
                              number,
                            ];
                            position[index] = Math.max(
                              -8,
                              Math.min(8, Number(event.target.value)),
                            );
                            scene.update(selected.id, { position });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="field-label">
                  ROTATION <span>{selected.rotation}°</span>
                  <input
                    aria-label="Object rotation"
                    type="range"
                    min={-180}
                    max={180}
                    value={selected.rotation}
                    onChange={(event) =>
                      scene.update(selected.id, {
                        rotation: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="field-label">
                  SCALE <span>{selected.scale.toFixed(1)}×</span>
                  <input
                    aria-label="Object scale"
                    type="range"
                    min={0.2}
                    max={2}
                    step={0.1}
                    value={selected.scale}
                    onChange={(event) =>
                      scene.update(selected.id, {
                        scale: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <button
                  className="remove-button"
                  onClick={() => scene.remove(selected.id)}
                >
                  <Trash2 size={14} /> Remove object
                </button>
              </>
            ) : (
              <p className="panel-hint empty-inspector">
                Select an object in the scene or add one from the library.
              </p>
            )}
            <div className="scene-object-list">
              <div className="panel-heading">IN YOUR SCENE</div>
              {scene.objects.map((object, index) => (
                <button
                  aria-pressed={scene.selected === object.id}
                  key={object.id}
                  onClick={() => scene.setSelected(object.id)}
                >
                  <span
                    className="object-list-color"
                    style={{
                      background: `#${COLORS[object.color].toString(16).padStart(6, "0")}`,
                    }}
                  />
                  {OBJECT_LIBRARY[object.type].label}
                  <small>{String(index + 1).padStart(2, "0")}</small>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
      <div className="studio-command">
        <CommandBar compact onCommand={scene.execute} message={scene.message} />
        <span className="local-note">
          A browser playground. Scenes stay in this tab and do not transfer to
          AR.
        </span>
      </div>
    </main>
  );
}
