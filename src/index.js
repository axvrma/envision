import { prepareDialog } from "../shared/ui/dialog.js";
import { COLORS, OBJECT_LIBRARY, parseCommand } from "../shared/commands.js";
import {
  SceneStore,
  composition,
  clampScale,
  normalizeRotation,
} from "../shared/scene-state.js";
import { mountSceneManager, downloadBlob } from "../shared/ui/saved-scenes.js";
import { PlacementController } from "./ar/placement.js";
import { detectEngine, WebXRAdapter, EightWallAdapter } from "./ar/adapters.js";
import { captureObjects } from "./ar/capture.js";
import "./style.css";
const $ = (id) => document.getElementById(id);
const store = new SceneStore();
let adapter,
  controller,
  engine,
  chosenColor = "gold",
  chosenType = null,
  recognition = null,
  speechTimer = null,
  listening = false,
  captureBlob = null,
  captureURL = null,
  deferredInstall = null;
const colors = Object.keys(COLORS).filter((color) => color !== "grey");
const status = (message) => {
  $("status").textContent = message;
};
const run = (fn) => {
  try {
    const result = fn();
    if (result?.catch) result.catch((error) => status(error.message));
  } catch (error) {
    status(error.message);
  }
};
const sheets = [...document.querySelectorAll("dialog")];
let lastFailure = null,
  renderedSelection;
function closeSheets() {
  document.querySelectorAll("dialog[open]").forEach((sheet) => sheet.close());
}
function openSheet(id) {
  closeSheets();
  $(id).showModal();
}
sheets.forEach((sheet) => {
  prepareDialog(sheet);
  sheet
    .querySelector("[data-close]")
    ?.addEventListener("click", () => sheet.close());
  sheet.addEventListener("close", () => {
    if (sheet.id === "commands-sheet") stopSpeech();
    if (sheet.id === "capture-sheet") releaseCapture();
  });
  sheet.addEventListener("click", (event) => {
    if (event.target !== sheet) return;
    const r = sheet.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      sheet.close();
  });
  sheet.addEventListener("beforexrselect", (event) => event.preventDefault());
});
document
  .querySelectorAll("button,input,select,a")
  .forEach((element) =>
    element.addEventListener("beforexrselect", (event) =>
      event.preventDefault(),
    ),
  );
function palette(host, onChoose) {
  for (const color of colors) {
    const button = document.createElement("button");
    button.type = "button";
    button.style.setProperty(
      "--swatch",
      `#${COLORS[color].toString(16).padStart(6, "0")}`,
    );
    button.setAttribute("aria-label", `Use ${color}`);
    button.title = color;
    button.dataset.color = color;
    button.onclick = () => onChoose(color);
    host.appendChild(button);
  }
}
palette($("library-colors"), (color) => {
  chosenColor = color;
  renderPalette();
  renderLibrary();
});
palette($("inspector-colors"), (color) =>
  run(() => {
    controller.update({ color });
    status("Object color updated.");
  }),
);
function renderPalette() {
  for (const button of $("library-colors").children)
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.color === chosenColor),
    );
  $("chosen-color").textContent = chosenColor;
}
function renderLibrary() {
  const search = $("library-search").value.toLowerCase().trim(),
    thumbnails = Object.fromEntries(
      Object.keys(OBJECT_LIBRARY).map((type) => [
        type,
        `/models/thumbnails/${type}.png`,
      ]),
    );
  const grid = $("object-grid");
  grid.replaceChildren();
  for (const [type, entry] of Object.entries(OBJECT_LIBRARY)) {
    if (
      ![entry.label, ...entry.aliases].some((word) =>
        word.toLowerCase().includes(search),
      )
    )
      continue;
    const button = document.createElement("button");
    button.setAttribute("aria-label", `Add ${entry.label.toLowerCase()}`);
    button.setAttribute("aria-pressed", String(type === chosenType));
    if (thumbnails[type]) {
      const img = document.createElement("img");
      img.src = thumbnails[type];
      img.alt = "";
      img.width = 160;
      img.height = 130;
      button.appendChild(img);
    } else {
      const span = document.createElement("span");
      span.className = "model-unavailable";
      span.textContent = "3D preview unavailable";
      button.appendChild(span);
    }
    const label = document.createElement("span");
    label.textContent = entry.label;
    button.appendChild(label);
    const plus = document.createElement("span");
    plus.className = "plus";
    plus.textContent = "+";
    plus.setAttribute("aria-hidden", "true");
    button.appendChild(plus);
    button.onclick = () => {
      chosenType = type;
      controller?.begin({ type, color: chosenColor });
      $("library-sheet").close();
      status(
        controller?.active
          ? "Aim at a tracked target, then tap Place object."
          : "Object chosen. Start AR to scan and place it.",
      );
    };
    grid.appendChild(button);
  }
  $("library-empty").classList.toggle("hidden", grid.childElementCount > 0);
}
function selected() {
  return store.objects.find((object) => object.id === controller?.selected);
}
function renderInspector() {
  const item = selected();
  if (!item) return;
  $("selected-name").textContent = OBJECT_LIBRARY[item.type].label;
  $("object-scale").value = item.scale;
  $("scale-value").value = `${item.scale.toFixed(2)}×`;
  $("object-rotation").value = item.rotation;
  $("rotation-value").value = `${Math.round(item.rotation)}°`;
  for (const button of $("inspector-colors").children)
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.color === item.color),
    );
}
function renderObjects() {
  renderedSelection = controller?.selected;
  $("object-count").textContent = String(store.objects.length);
  $("undo-btn").disabled = !store.past.length;
  $("redo-btn").disabled = !store.future.length;
  if (
    controller?.selected &&
    !store.objects.some((o) => o.id === controller.selected)
  )
    controller.selected = null;
  adapter?.sync(store.objects, controller?.selected);
  const select = $("object-select");
  select.replaceChildren();
  store.objects.forEach((object, index) => {
    const option = document.createElement("option");
    option.value = object.id;
    option.textContent = `${index + 1}. ${OBJECT_LIBRARY[object.type].label}`;
    select.appendChild(option);
  });
  select.value = controller?.selected || "";
  $("select-object-btn").disabled = !store.objects.length;
  $("clear-btn").disabled = !store.objects.length;
  $("selection-controls").classList.toggle(
    "hidden",
    !controller?.active || !selected() || !!controller?.pending,
  );
  if (!selected() && $("inspector-sheet").open) $("inspector-sheet").close();
  renderInspector();
}
const trackingNames = {
  initializing: "INITIALIZING",
  searching: "FINDING A TARGET",
  ready: "TARGET READY",
  "temporarily-lost": "TRACKING LOST",
  failed: "SESSION FAILED",
  unsupported: "AR UNAVAILABLE",
};
function presentSessionFailure(c) {
  if (!c.error || !["failed", "unsupported"].includes(c.state)) return;
  const failure = `${c.generation}:${c.error}`;
  if (lastFailure === failure) return;
  lastFailure = failure;
  stopSpeech();
  $("session-error-message").textContent = c.error;
  $("session-error-title").textContent =
    c.state === "unsupported" ? "AR could not start" : "AR session failed";
  openSheet("session-error-sheet");
}
function renderController() {
  const c = controller;
  if (!c) return;
  $("tracking-label").textContent =
    !c.active && !c.starting && !["failed", "unsupported"].includes(c.state)
      ? "CAMERA OFF"
      : trackingNames[c.state] || c.state;
  $("tracking-badge").dataset.state = c.state;
  $("overlay").dataset.tracking = c.state;
  $("overlay").dataset.pending = String(!!c.pending);
  $("overlay").classList.toggle("session-active", c.active);
  document.body.classList.toggle("is-active", c.active);
  $("exit-btn").classList.toggle("hidden", !c.active && !c.starting);
  $("active-guidance").classList.toggle("hidden", !c.active);
  $("interaction-surface").classList.toggle("hidden", !c.active);
  $("preflight").classList.toggle("hidden", c.active);
  $("start-ar-btn").disabled = c.starting || c.stopping;
  $("retry-ar-btn").disabled = c.starting || c.stopping;
  $("start-ar-btn").classList.toggle("hidden", c.active);
  $("start-ar-btn").firstChild.textContent = c.starting
    ? "Starting camera…"
    : "Start AR Experience ";
  $("placement-controls").classList.toggle("hidden", !c.pending);
  $("confirm-placement").disabled = !c.canPlace;
  if (c.pending) {
    $("placement-name").textContent =
      c.pending.kind === "create"
        ? `${c.pending.input.color} ${OBJECT_LIBRARY[c.pending.input.type].label}`
        : c.pending.kind === "move"
          ? "Move selected object"
          : `Place “${c.pending.scene.name}”`;
    $("confirm-placement").textContent =
      c.pending.kind === "composition"
        ? "Place composition"
        : c.pending.kind === "move"
          ? "Confirm move"
          : "Place object";
  }
  $("engine-kind").textContent =
    engine === "webxr"
      ? "WEBXR · HORIZONTAL SURFACE HIT TEST"
      : c.pose?.kind === "detected-surface"
        ? "8TH WALL · DETECTED SURFACE"
        : c.pose?.kind === "estimated-surface"
          ? "8TH WALL · ESTIMATED SURFACE"
          : c.pose?.kind === "estimated-ground"
            ? "8TH WALL · ESTIMATED GROUND PLANE"
            : "8TH WALL · SCANNING";
  $("guidance-text").textContent =
    c.reason === "initializing"
      ? "Move your phone gently side to side over a well-lit, textured floor."
      : c.reason === "limited"
        ? "Tracking is limited. Improve the light and aim at a textured surface."
        : c.state === "ready"
          ? c.pending
            ? "Target found. Confirm when it looks right."
            : "Tap Add Object to start creating."
          : "Move slowly over a well-lit floor or table. Aim down.";
  if (c.state === "failed" || c.state === "unsupported")
    status(
      c.error || "Tracking ended. Restart the session or use browser Studio.",
    );
  else if (c.active && c.state === "temporarily-lost")
    status("Tracking lost. Placement is paused until a fresh target is found.");
  if (c.active && c.state === "ready")
    status(
      c.pending
        ? "Target ready. Confirm placement when it looks right."
        : "Tracking ready. Choose an object or tap one to select it.",
    );
  $("selection-controls").classList.toggle(
    "hidden",
    !c.active || !selected() || !!c.pending,
  );
  if (renderedSelection !== c.selected) renderObjects();
  presentSessionFailure(c);
}
store.subscribe(renderObjects);
$("overlay").addEventListener("beforexrselect", (event) => {
  if (
    event.target instanceof Element &&
    event.target.closest("dialog,button,input,select,a")
  )
    event.preventDefault();
});
const sceneManager = mountSceneManager($("overlay"), {
  getObjects: () => store.objects,
  onLoad: (scene) => {
    controller.load(scene);
    status(
      "Composition loaded for preview. Scan a new origin and confirm placement.",
    );
  },
  notify: status,
});
$("add-btn").onclick = () => {
  renderPalette();
  renderLibrary();
  openSheet("library-sheet");
};
$("library-search").oninput = renderLibrary;
$("settings-btn").onclick = () => openSheet("settings-sheet");
$("command-btn").onclick = () => openSheet("commands-sheet");
$("saved-btn").onclick = () => {
  closeSheets();
  sceneManager.open();
};
$("inspect-btn").onclick = () => {
  renderInspector();
  openSheet("inspector-sheet");
};
$("select-object-btn").onclick = () => {
  controller.select(controller.selected || store.objects[0]?.id);
  renderInspector();
  openSheet("inspector-sheet");
};
$("object-select").onchange = (event) => controller.select(event.target.value);
$("object-scale").onchange = (event) =>
  run(() => controller.update({ scale: Number(event.target.value) }));
$("object-scale").oninput = (event) => {
  $("scale-value").value = `${Number(event.target.value).toFixed(2)}×`;
};
$("object-rotation").onchange = (event) =>
  run(() => controller.update({ rotation: Number(event.target.value) }));
$("object-rotation").oninput = (event) => {
  $("rotation-value").value = `${event.target.value}°`;
};
const move = () => {
  run(() => controller.move());
  closeSheets();
  status("Aim at a new tracked target, then confirm the move.");
};
$("move-btn").onclick = move;
$("inspector-move").onclick = move;
$("duplicate-btn").onclick = () =>
  run(() => {
    const item = store.duplicate(controller.selected);
    controller.select(item.id);
    status("Duplicated at the original pose. Use Move to place it elsewhere.");
  });
$("delete-btn").onclick = () =>
  run(() => {
    controller.remove();
    status("Object removed. Undo is available in Scene actions.");
  });
const deselect = () => {
  controller.select(null);
  closeSheets();
  status("Selection reset.");
};
$("deselect-btn").onclick = deselect;
$("inspector-deselect").onclick = deselect;
$("cancel-placement").onclick = () => {
  controller.cancel();
  status("Placement cancelled.");
};
$("reset-placement-btn").onclick = () => {
  controller.cancel();
  closeSheets();
  status("Placement reset. Add an object whenever you’re ready.");
};
$("confirm-placement").onclick = () =>
  run(() => {
    controller.confirm();
    status("Placed. Tap your object to select it.");
  });
function clearScene() {
  if (!store.objects.length) {
    status("The scene is already empty.");
    return;
  }
  if (!window.confirm("Clear all objects? You can undo this in Scene actions."))
    return;
  controller.cancel();
  controller.select(null);
  store.clear();
  closeSheets();
  status("Scene cleared. Undo is available.");
}
$("clear-btn").onclick = clearScene;
$("undo-btn").onclick = () => {
  controller.cancel();
  store.undo();
  status("Latest scene change undone.");
};
$("redo-btn").onclick = () => {
  controller.cancel();
  store.redo();
  status("Scene change redone.");
};
function execute(text) {
  const command = parseCommand(text);
  if (!command) {
    $("speech-feedback").textContent =
      "Try a color and an object, like “gold rocket”.";
    return;
  }
  if (command.action === "clear") {
    clearScene();
    return;
  }
  controller.begin({ type: command.objectType, color: command.colorName });
  closeSheets();
  status("Command ready. Scan a target and confirm placement.");
}
$("ar-command-form").onsubmit = (event) => {
  event.preventDefault();
  execute($("ar-command").value);
  $("ar-command").value = "";
};
function stopSpeech() {
  clearTimeout(speechTimer);
  try {
    recognition?.abort();
  } catch {
    /* An ended speech service must not block session failure UI. */
  }
  recognition = null;
  listening = false;
  $("mic-btn").textContent = "Start listening";
}
$("mic-btn").onclick = () => {
  if (listening) {
    stopSpeech();
    return;
  }
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    $("speech-feedback").textContent =
      "Speech is unavailable. Choose an object from the library or type a command.";
    return;
  }
  const instance = new Speech();
  recognition = instance;
  instance.lang = "en-US";
  instance.continuous = false;
  instance.interimResults = false;
  instance.onresult = (event) => execute(event.results[0][0].transcript);
  instance.onerror = (event) => {
    $("speech-feedback").textContent =
      event.error === "not-allowed"
        ? "Microphone permission denied. The object library and text still work."
        : `Speech stopped (${event.error}). Use the library or type instead.`;
  };
  instance.onend = () => {
    clearTimeout(speechTimer);
    listening = false;
    $("mic-btn").textContent = "Start listening";
  };
  try {
    instance.start();
    listening = true;
    $("mic-btn").textContent = "Stop listening";
    $("speech-feedback").textContent = "Listening for a color and an object…";
    speechTimer = setTimeout(stopSpeech, 12000);
  } catch {
    $("speech-feedback").textContent =
      "Could not start listening. Manual creation is available.";
    stopSpeech();
  }
};
function releaseCapture() {
  if (captureURL) URL.revokeObjectURL(captureURL);
  captureURL = null;
  captureBlob = null;
  $("capture-preview").removeAttribute("src");
  $("capture-preview").classList.add("hidden");
  $("capture-results").classList.add("hidden");
}
$("capture-btn").onclick = () => {
  $("capture-feedback").textContent = controller?.active
    ? ""
    : "Start AR to render objects from the current view.";
  $("render-capture-btn").disabled = !controller?.active;
  openSheet("capture-sheet");
};
$("render-capture-btn").onclick = async () => {
  try {
    $("render-capture-btn").disabled = true;
    releaseCapture();
    captureBlob = await captureObjects(adapter);
    captureURL = URL.createObjectURL(captureBlob);
    $("capture-preview").src = captureURL;
    $("capture-preview").classList.remove("hidden");
    $("capture-results").classList.remove("hidden");
    $("capture-feedback").textContent =
      "Virtual objects only. Camera background excluded.";
    const file = new File([captureBlob], "envision-objects-only.png", {
      type: "image/png",
    });
    $("share-capture-btn").disabled = !navigator.canShare?.({ files: [file] });
  } catch (error) {
    $("capture-feedback").textContent = error.message;
  } finally {
    $("render-capture-btn").disabled = !controller?.active;
  }
};
$("download-capture-btn").onclick = () => {
  if (captureBlob) downloadBlob(captureBlob, "envision-objects-only.png");
};
$("share-capture-btn").onclick = async () => {
  if (!captureBlob) return;
  try {
    await navigator.share({
      files: [
        new File([captureBlob], "envision-objects-only.png", {
          type: "image/png",
        }),
      ],
      title: "Envision · Virtual objects only",
    });
  } catch (error) {
    if (error.name !== "AbortError")
      $("capture-feedback").textContent =
        "Sharing is unavailable. Download the image instead.";
  }
};
$("start-ar-btn").onclick = () =>
  run(async () => {
    if (controller.active || controller.starting || controller.stopping) return;
    // Session coordinates never carry over as physical anchors into a new camera session.
    if (store.objects.length) {
      const scene = composition(store.objects);
      store.objects = [];
      store.past = [];
      store.future = [];
      controller.select(null);
      controller.load(scene);
      store.emit();
    }
    await controller.start();
    if (controller.active)
      status("Camera active. Choose an object and scan a horizontal surface.");
  });
$("retry-ar-btn").onclick = () => {
  closeSheets();
  $("start-ar-btn").click();
};
$("exit-btn").onclick = () =>
  run(async () => {
    stopSpeech();
    closeSheets();
    await controller.end();
    status(
      "Camera session ended. Save your composition or start a new session.",
    );
  });
// Gestures change only scale/yaw. Move mode uses an explicit tracked target instead of unreliable screen-plane dragging.
const pointers = new Map();
let gesture = null,
  tap = null,
  suppressTap = false;
$("interaction-surface").addEventListener("pointerdown", (event) => {
  if (!controller?.active || controller.pending) return;
  event.preventDefault();
  try {
    event.target.setPointerCapture?.(event.pointerId);
  } catch {
    /* Synthetic accessibility inputs may not own a pointer. */
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 1) {
    tap = { x: event.clientX, y: event.clientY };
    suppressTap = false;
  }
  if (pointers.size === 2) {
    suppressTap = true;
    const pair = [...pointers.values()];
    if (!selected()) controller.select(adapter.select(pair[0].x, pair[0].y));
    const item = selected();
    if (!item) return;
    gesture = {
      id: item.id,
      scale: item.scale,
      rotation: item.rotation,
      distance: Math.max(
        1,
        Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y),
      ),
      angle: Math.atan2(pair[1].y - pair[0].y, pair[1].x - pair[0].x),
      patch: null,
    };
  }
});
$("interaction-surface").addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!gesture || pointers.size !== 2) return;
  if (controller.state !== "ready") {
    gesture = null;
    adapter.sync(store.objects, controller.selected);
    return;
  }
  const [a, b] = [...pointers.values()],
    angle = Math.atan2(b.y - a.y, b.x - a.x);
  gesture.patch = {
    scale: clampScale(
      (gesture.scale * Math.hypot(b.x - a.x, b.y - a.y)) / gesture.distance,
    ),
    rotation: normalizeRotation(
      gesture.rotation + ((angle - gesture.angle) * 180) / Math.PI,
    ),
  };
  const item = selected(),
    model = adapter.view?.models.get(gesture.id);
  if (model && item)
    adapter.view.transform(model, { ...item, ...gesture.patch });
  adapter.view?.highlight();
});
function endPointer(event, cancelled = false) {
  if (!pointers.has(event.pointerId)) return;
  if (gesture) {
    if (!cancelled && gesture.patch && controller.state === "ready")
      run(() => store.update(gesture.id, gesture.patch));
    else adapter.sync(store.objects, controller.selected);
    gesture = null;
  }
  if (
    !cancelled &&
    !suppressTap &&
    tap &&
    Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 10
  ) {
    controller.select(adapter.select(event.clientX, event.clientY));
    if (selected())
      status("Object selected. Edit it below or pinch and twist.");
  }
  pointers.delete(event.pointerId);
  if (!pointers.size) {
    tap = null;
    suppressTap = false;
  }
}
$("interaction-surface").addEventListener("pointerup", (event) =>
  endPointer(event),
);
$("interaction-surface").addEventListener("pointercancel", (event) =>
  endPointer(event, true),
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopSpeech();
    pointers.clear();
    gesture = null;
    if (controller?.active || controller?.starting) run(() => controller.end());
  }
});
window.addEventListener("pagehide", () => {
  stopSpeech();
  releaseCapture();
  run(() => controller?.end());
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstall = event;
  $("install-app-btn").classList.remove("hidden");
});
$("install-app-btn").onclick = async () => {
  if (!deferredInstall) return;
  await deferredInstall.prompt();
  deferredInstall = null;
  $("install-app-btn").classList.add("hidden");
};
if ("serviceWorker" in navigator && location.protocol !== "file:")
  window.addEventListener("load", () =>
    navigator.serviceWorker
      .register("/ar/sw.js", { scope: "/ar/" })
      .catch(() => {}),
  );
// Expire stale targets without manufacturing a camera heartbeat; notify if the stream stalls.
setInterval(() => run(() => controller?.checkTracking()), 200);
(async () => {
  try {
    engine = await detectEngine();
    adapter =
      engine === "webxr"
        ? new WebXRAdapter($("container"), $("overlay"))
        : new EightWallAdapter($("container"), $("overlay"));
    controller = new PlacementController(store, adapter, renderController);
    $("engine-note").textContent =
      engine === "webxr"
        ? "This browser reports WebXR AR support. Startup also requires hit tests and DOM overlay. Camera access starts only after your tap."
        : "WebXR AR is unavailable. Start AR will try the third-party 8th Wall runtime from jsDelivr. Network, device support and its separate engine license apply.";
    $("engine-kind").textContent =
      engine === "webxr"
        ? "WEBXR · HORIZONTAL SURFACE HIT TEST"
        : "8TH WALL · ESTIMATED GROUND PLANE";
    controller.state = "searching";
    renderController();
    status("Choose an object, or start AR when you’re ready.");
  } catch (error) {
    $("preflight").classList.add("hidden");
    $("start-ar-btn").classList.add("hidden");
    $("not-supported").classList.remove("hidden");
    $("not-supported-reason").textContent = error.message;
    $("tracking-label").textContent = "AR UNAVAILABLE";
    $("tracking-badge").dataset.state = "unsupported";
    status("Use browser Studio to keep creating.");
    // Browsing the catalog never depends on camera availability.
    adapter = { preview: () => {}, sync: () => {} };
    controller = new PlacementController(store, adapter, () => {});
  }
})();
