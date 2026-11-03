import { COLORS, OBJECT_LIBRARY, parseCommand } from "../shared/commands.js";
import { createObject, disposeObject } from "../shared/models.js";
import * as THREE from "three";
import "./style.css";

let camera, scene, renderer;
let reticle;
let reticleVisible = false;
let hitTestSource = null;
let hitTestSourceRequested = false;
let xrSession = null;
let deferredInstallPrompt = null;
let arEngine = "webxr";
let eightWallLoadPromise = null;
let eightWallStarted = false;
let fallbackGroundPlane = null;
let fallbackRaycaster = null;
let fallbackPlacementPoint = null;
let fallbackReticleTarget = null;
let fallbackReticleStable = null;
let fallbackReticleReady = false;
let fallbackHitStreak = 0;
let fallbackLastGoodHitAt = 0;

const placedObjects = [];
const EIGHT_WALL_OBJECT_SCALE = 2.15;
const FALLBACK_RETICLE_LERP = 0.18;
const FALLBACK_RETICLE_TARGET_LERP = 0.32;
const FALLBACK_RETICLE_JUMP_LERP = 0.07;
const FALLBACK_RETICLE_JUMP_DISTANCE = 0.55;
const FALLBACK_RETICLE_HOLD_MS = 450;
const FALLBACK_RETICLE_MIN_HITS = 3;
const EIGHT_WALL_SCRIPTS = [
  {
    src: "https://cdn.jsdelivr.net/npm/@8thwall/xrextras@1/dist/xrextras.js",
    id: "xrextras-script",
  },
  {
    src: "https://cdn.jsdelivr.net/npm/@8thwall/landing-page@1/dist/landing-page.js",
    id: "landing-page-script",
  },
  {
    src: "https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js",
    id: "xr8-engine-script",
    attrs: { "data-preload-chunks": "slam" },
  },
];

const startARBtn = document.getElementById("start-ar-btn");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const infoBtn = document.getElementById("info-btn");
const installAppBtn = document.getElementById("install-app-btn");
const statusEl = document.getElementById("status");
const transcriptEl = document.getElementById("transcript");
const instructionsEl = document.getElementById("instructions");
const objectCountEl = document.getElementById("object-count");
const notSupportedEl = document.getElementById("not-supported");
const notSupportedReasonEl = document.getElementById("not-supported-reason");
let instructionsTimer = null;

init();

async function init() {
  registerServiceWorker();
  setupInstallButton();
  setupStartButton();
  setupMicButton();
  setupClearButton();
  setupTextCommands();
  setupInfoButton();
  updateObjectCount();

  const isSecure = window.isSecureContext;

  if (!isSecure) {
    showNotSupported(
      "This app must be loaded over HTTPS. Current protocol: " +
        location.protocol,
    );
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    showNotSupported(
      "Camera access is unavailable in this browser. Try a secure URL on a compatible device.",
    );
    return;
  }

  if (shouldUseUnifiedEightWall()) {
    enableEightWallMode("Unified AR mode ready.");
    return;
  }

  if (!navigator.xr) {
    enableEightWallMode("WebXR is not available in this browser.");
    return;
  }

  try {
    const isARSupported = await navigator.xr.isSessionSupported("immersive-ar");
    if (!isARSupported) {
      enableEightWallMode(
        "Immersive WebXR AR is not supported on this device.",
      );
      return;
    }
  } catch (error) {
    enableEightWallMode("WebXR support check failed: " + error.message);
    return;
  }

  arEngine = "webxr";
  setupScene();
  statusEl.textContent = "Ready to place AR objects";
  startARBtn.disabled = false;
}

function shouldUseUnifiedEightWall() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function enableEightWallMode(reason) {
  arEngine = "8thwall";
  statusEl.textContent = `${reason} Tap Start AR to begin.`;
  startARBtn.disabled = false;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/ar/sw.js", { scope: "/ar/" })
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
  });
}

function setupInstallButton() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installAppBtn.classList.remove("hidden");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installAppBtn.classList.add("hidden");
  });

  installAppBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installAppBtn.classList.add("hidden");
  });
}

function showNotSupported(reason) {
  document.getElementById("preflight").classList.add("hidden");
  document.getElementById("ar-command-form").classList.add("hidden");
  startARBtn.classList.add("hidden");
  micBtn.classList.add("hidden");
  clearBtn.classList.add("hidden");
  infoBtn.classList.add("hidden");
  instructionsEl.classList.add("hidden");
  notSupportedEl.classList.remove("hidden");
  statusEl.textContent = "AR is unavailable on this device";

  if (notSupportedReasonEl && reason) {
    const paragraph = document.createElement("p");
    paragraph.className = "error-reason";
    paragraph.textContent = reason;
    notSupportedReasonEl.replaceChildren(paragraph);
  }

  console.error("AR not supported:", reason);
}

function setupScene() {
  const container = document.getElementById("container");

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    30,
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  configureRenderer();
  container.appendChild(renderer.domElement);

  addSceneLighting();
  createReticle();
  window.addEventListener("resize", onWindowResize);
}

function configureRenderer() {
  if (!renderer) return;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

function addSceneLighting() {
  const ambientLight = new THREE.HemisphereLight(0xffffff, 0x8fb3ff, 1.6);
  ambientLight.position.set(0.5, 1, 0.25);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(2, 4, 3);
  keyLight.castShadow = true;
  scene.add(keyLight);
}

function createReticle() {
  reticle = new THREE.Group();
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;

  const ringGeometry = new THREE.RingGeometry(0.055, 0.072, 48);
  ringGeometry.rotateX(-Math.PI / 2);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.92,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  reticle.add(ring);

  const dotGeometry = new THREE.CircleGeometry(0.012, 32);
  dotGeometry.rotateX(-Math.PI / 2);
  const dot = new THREE.Mesh(
    dotGeometry,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.86,
    }),
  );
  reticle.add(dot);

  scene.add(reticle);
}

function createFallbackReticle() {
  createReticle();
  reticle.matrixAutoUpdate = true;
  reticle.position.set(0, 0, -1.2);
  reticle.quaternion.identity();
  reticle.scale.setScalar(1.35);
  reticle.visible = true;
  reticleVisible = true;
}

function setupFallbackPlacement() {
  fallbackGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  fallbackRaycaster = new THREE.Raycaster();
  fallbackPlacementPoint = new THREE.Vector3(0, 0, -1.2);
  fallbackReticleTarget = new THREE.Vector3(0, 0, -1.2);
  fallbackReticleStable = new THREE.Vector3(0, 0, -1.2);
  fallbackReticleReady = false;
  fallbackHitStreak = 0;
  fallbackLastGoodHitAt = 0;

  const shadowGeometry = new THREE.PlaneGeometry(2000, 2000);
  shadowGeometry.rotateX(-Math.PI / 2);
  const shadowMaterial = new THREE.ShadowMaterial({
    opacity: 0.34,
    transparent: true,
  });
  const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);
}

function updateFallbackReticle() {
  if (arEngine !== "8thwall" || !camera || !reticle || !fallbackRaycaster)
    return;

  fallbackRaycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const didIntersect = fallbackRaycaster.ray.intersectPlane(
    fallbackGroundPlane,
    fallbackPlacementPoint,
  );
  const now = performance.now();

  if (!didIntersect) {
    fallbackHitStreak = 0;

    if (now - fallbackLastGoodHitAt > FALLBACK_RETICLE_HOLD_MS) {
      reticle.visible = false;
      reticleVisible = false;
    }
    return;
  }

  fallbackLastGoodHitAt = now;
  fallbackHitStreak += 1;

  if (!fallbackReticleReady) {
    fallbackReticleTarget.copy(fallbackPlacementPoint);
    fallbackReticleStable.copy(fallbackPlacementPoint);
    reticle.position.copy(fallbackPlacementPoint);
    fallbackReticleReady = true;
  } else {
    const targetDistance = fallbackReticleTarget.distanceTo(
      fallbackPlacementPoint,
    );
    const targetLerp =
      targetDistance > FALLBACK_RETICLE_JUMP_DISTANCE
        ? FALLBACK_RETICLE_JUMP_LERP
        : FALLBACK_RETICLE_TARGET_LERP;

    fallbackReticleTarget.lerp(fallbackPlacementPoint, targetLerp);
    fallbackReticleStable.lerp(fallbackReticleTarget, FALLBACK_RETICLE_LERP);
    reticle.position.copy(fallbackReticleStable);
  }

  reticle.rotation.x = 0;
  reticle.rotation.y = 0;
  reticle.rotation.z = 0;
  reticle.visible = true;
  reticleVisible = fallbackHitStreak >= FALLBACK_RETICLE_MIN_HITS;
}

function setupStartButton() {
  startARBtn.disabled = true;
  startARBtn.addEventListener("click", startAR);
}

async function startAR() {
  if (arEngine === "8thwall") {
    startEightWallAR();
    return;
  }

  try {
    xrSession = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["local-floor", "dom-overlay"],
      domOverlay: { root: document.getElementById("overlay") },
    });

    xrSession.addEventListener("end", onSessionEnd);

    await renderer.xr.setReferenceSpaceType("local");
    await renderer.xr.setSession(xrSession);

    showActiveARControls();
    statusEl.textContent = "Scan a surface, then speak an object";

    renderer.setAnimationLoop(render);
  } catch (error) {
    console.error("Failed to start AR session:", error);
    statusEl.textContent = "Failed to start AR: " + error.message;
  }
}

async function startEightWallAR() {
  if (eightWallStarted) return;

  startARBtn.disabled = true;
  statusEl.textContent = "Loading 8th Wall AR engine...";

  try {
    await loadEightWallLibraries();
    window.THREE = THREE;

    const container = document.getElementById("container");
    container.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.id = "camerafeed";
    container.appendChild(canvas);

    const modules = [
      window.XR8.GlTextureRenderer.pipelineModule(),
      window.XR8.Threejs.pipelineModule(),
      window.XR8.XrController.pipelineModule(),
      window.LandingPage.pipelineModule(),
      window.XRExtras.FullWindowCanvas.pipelineModule(),
      window.XRExtras.Loading.pipelineModule(),
      window.XRExtras.RuntimeError.pipelineModule(),
      createEightWallScenePipelineModule(),
    ];

    window.XR8.addCameraPipelineModules(modules);

    const runConfig = { canvas };
    if (window.XR8.XrConfig?.device) {
      runConfig.allowedDevices = window.XR8.XrConfig.device().ANY;
    }
    await window.XR8.run(runConfig);
  } catch (error) {
    console.error("8th Wall AR failed:", error);
    showNotSupported("8th Wall fallback could not start: " + error.message);
  }
}

function loadEightWallLibraries() {
  if (window.XR8 && window.XRExtras && window.LandingPage) {
    return Promise.resolve();
  }

  if (eightWallLoadPromise) return eightWallLoadPromise;

  window.THREE = THREE;

  const xrReady = new Promise((resolve, reject) => {
    if (window.XR8) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      reject(new Error("Timed out while loading XR8"));
    }, 20000);

    window.addEventListener(
      "xrloaded",
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });

  eightWallLoadPromise = Promise.all([
    xrReady,
    EIGHT_WALL_SCRIPTS.reduce(
      (promise, script) => promise.then(() => loadScript(script)),
      Promise.resolve(),
    ),
  ]).then(() => {
    if (!window.XR8 || !window.XRExtras || !window.LandingPage) {
      throw new Error("8th Wall libraries did not initialize");
    }
  });

  return eightWallLoadPromise;
}

function loadScript({ src, id, attrs = {} }) {
  const existing = document.getElementById(id);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.id = id;
    script.crossOrigin = "anonymous";

    Object.entries(attrs).forEach(([name, value]) => {
      script.setAttribute(name, value);
    });

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load ${src}`)),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

function createEightWallScenePipelineModule() {
  return {
    name: "voxr-8thwall-scene",
    onStart: ({ canvas }) => {
      const xrScene = window.XR8.Threejs.xrScene();
      scene = xrScene.scene;
      camera = xrScene.camera;
      renderer = xrScene.renderer;

      configureRenderer();
      addSceneLighting();
      createFallbackReticle();
      setupFallbackPlacement();

      canvas.addEventListener("touchmove", (event) => event.preventDefault(), {
        passive: false,
      });
      window.XR8.XrController.updateCameraProjectionMatrix({
        origin: camera.position,
        facing: camera.quaternion,
      });

      eightWallStarted = true;
      showActiveARControls();
      statusEl.textContent =
        "AR ready. Aim at the floor, then speak an object.";
    },
    onUpdate: () => {
      updateFallbackReticle();
      animatePlacedObjects(performance.now());
    },
    onException: (error) => {
      console.error("8th Wall runtime error:", error);
      showNotSupported(
        "AR engine error: " +
          error.message +
          ". Try the 3D playground on this device.",
      );
    },
  };
}

function showActiveARControls() {
  document.getElementById("preflight").classList.add("hidden");
  document.getElementById("ar-command-form").classList.remove("hidden");
  startARBtn.classList.add("hidden");
  startARBtn.disabled = false;
  micBtn.classList.remove("hidden");
  clearBtn.classList.remove("hidden");
  infoBtn.classList.remove("hidden");
  hideInstructions();
}

function onSessionEnd() {
  xrSession = null;
  hitTestSource = null;
  hitTestSourceRequested = false;
  reticleVisible = false;

  document.getElementById("preflight").classList.remove("hidden");
  document.getElementById("ar-command-form").classList.add("hidden");
  startARBtn.classList.remove("hidden");
  micBtn.classList.add("hidden");
  clearBtn.classList.add("hidden");
  infoBtn.classList.add("hidden");
  hideInstructions();
  statusEl.textContent = "AR session ended. Tap Start AR to resume.";

  renderer.setAnimationLoop(null);
}

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();

    if (!hitTestSourceRequested) {
      requestHitTestSource(frame.session);
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);

        if (pose) {
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
          reticleVisible = true;
        }
      } else {
        reticle.visible = false;
        reticleVisible = false;
      }
    }
  }

  animatePlacedObjects(timestamp || performance.now());
  renderer.render(scene, camera);
}

async function requestHitTestSource(session) {
  hitTestSourceRequested = true;

  try {
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

    session.addEventListener("end", () => {
      hitTestSource = null;
      hitTestSourceRequested = false;
    });
  } catch (error) {
    console.error("Hit test source request failed:", error);
  }
}

function setupMicButton() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micBtn.addEventListener("click", () => {
      statusEl.textContent =
        "Speech recognition is not supported in this browser";
    });
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  recognition.continuous = false;

  let isListening = false;

  micBtn.addEventListener("click", () => {
    if (!reticleVisible) {
      statusEl.textContent = "Point at a detected surface first";
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
      isListening = true;
      micBtn.classList.add("listening");
      statusEl.textContent = "Listening for a color and object";
      transcriptEl.textContent = "";
    } catch (error) {
      console.error("Speech recognition error:", error);
      statusEl.textContent = "Could not start listening";
    }
  });

  recognition.onresult = (event) => {
    const results = event.results[0];
    const commands = Array.from(results).map((result) =>
      result.transcript.toLowerCase().trim(),
    );
    transcriptEl.textContent = `"${commands[0]}"`;

    for (const command of commands) {
      if (command.includes("clear") || command.includes("remove all")) {
        clearPlacedObjects();
        statusEl.textContent = "Cleared the scene";
        return;
      }

      const parsed = parseCommand(command);
      if (parsed?.action === "create") {
        if (placeObject(parsed.color, parsed.objectType))
          statusEl.textContent = `Placed ${parsed.colorName} ${OBJECT_LIBRARY[parsed.objectType].label.toLowerCase()}`;
        return;
      }
    }

    statusEl.textContent = 'Try "gray elephant", "blue bird", or "gold rocket"';
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    isListening = false;
    micBtn.classList.remove("listening");

    if (event.error === "no-speech") {
      statusEl.textContent = "No speech detected. Try again.";
    } else if (event.error === "not-allowed") {
      statusEl.textContent = "Microphone permission denied";
    } else {
      statusEl.textContent = "Speech error: " + event.error;
    }
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
  };
}

function setupTextCommands() {
  document
    .getElementById("ar-command-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("ar-command");
      const command = parseCommand(input.value);
      if (!command) {
        statusEl.textContent = "Try a color and an object, like gold rocket.";
        return;
      }
      if (command.action === "clear") {
        clearPlacedObjects();
        statusEl.textContent = "Scene cleared";
        input.value = "";
        return;
      }
      if (!reticleVisible) {
        statusEl.textContent = "Point at a detected surface first";
        return;
      }
      if (placeObject(command.color, command.objectType)) {
        statusEl.textContent = `Placed ${command.colorName} ${command.objectType}`;
        input.value = "";
      }
    });
}

function setupClearButton() {
  clearBtn.addEventListener("click", () => {
    clearPlacedObjects();
    statusEl.textContent = "Scene cleared";
  });
}

function setupInfoButton() {
  infoBtn.addEventListener("click", () => {
    showInstructionsFor15Seconds();
  });
}

function showInstructionsFor15Seconds() {
  window.clearTimeout(instructionsTimer);
  instructionsEl.classList.remove("hidden");
  infoBtn.classList.add("active");
  infoBtn.setAttribute("aria-expanded", "true");

  instructionsTimer = window.setTimeout(() => {
    hideInstructions();
  }, 15000);
}

function hideInstructions() {
  window.clearTimeout(instructionsTimer);
  instructionsTimer = null;
  instructionsEl.classList.add("hidden");
  infoBtn.classList.remove("active");
  infoBtn.setAttribute("aria-expanded", "false");
}

function placeObject(color, objectType) {
  if (!reticle.visible || !reticleVisible) {
    statusEl.textContent = "Point at a detected surface first";
    return false;
  }
  if (placedObjects.length >= 30) {
    statusEl.textContent =
      "Scene limit reached. Clear the scene to keep creating.";
    return false;
  }

  const object = createObject(color, objectType);

  if (arEngine === "8thwall") {
    object.position.copy(reticle.position);
    object.quaternion.copy(reticle.quaternion);
    object.scale.multiplyScalar(EIGHT_WALL_OBJECT_SCALE);
  } else {
    reticle.matrix.decompose(object.position, object.quaternion, object.scale);
  }

  object.position.y += (object.userData.groundOffset || 0.08) * object.scale.y;
  object.rotation.y += Math.random() * Math.PI * 2;
  initializeAnimationState(object);

  scene.add(object);
  placedObjects.push(object);
  updateObjectCount();
  flashReticle();
  return true;
}

function animatePlacedObjects(timestamp) {
  placedObjects.forEach((object) => {
    if (object.userData.animate) object.userData.animate(timestamp);
  });
}

function initializeAnimationState(object) {
  object.traverse((child) => {
    if (child.userData?.animate) {
      child.userData.baseY = child.position.y;
    }
  });
}

function clearPlacedObjects() {
  while (placedObjects.length) {
    const object = placedObjects.pop();
    scene.remove(object);
    disposeObject(object);
  }
  updateObjectCount();
}

function flashReticle() {
  reticle.children.forEach((child) => {
    if (child.material?.color) child.material.color.setHex(0xffffff);
  });
  setTimeout(() => {
    reticle.children.forEach((child, index) => {
      if (child.material?.color)
        child.material.color.setHex(index === 0 ? 0x7dd3fc : 0xffffff);
    });
  }, 180);
}

function updateObjectCount() {
  objectCountEl.textContent = String(placedObjects.length);
}

function onWindowResize() {
  if (!camera || !renderer) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
