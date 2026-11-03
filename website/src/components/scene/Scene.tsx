import {
  Component,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createObject, disposeObject } from "../../../../shared/models.js";
import { COLORS } from "../../../../shared/commands";
import type { SceneObject } from "../../lib/scene";
export type SceneProps = {
  objects: SceneObject[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  resetKey?: number;
  cameraView?: { azimuth: number; zoom: number };
  studio?: boolean;
  reduced?: boolean;
};
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function Model({
  item,
  selected,
  onSelect,
  reduced,
  studio,
}: {
  item: SceneObject;
  selected: boolean;
  onSelect?: (id: string) => void;
  reduced: boolean;
  studio: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const model = useMemo(() => {
    const object = createObject(COLORS[item.color], item.type) as THREE.Group;
    // Website finish only: retain the source rocket and refine its materials and details.
    if (item.type === "rocket") {
      const finish = item.color === "gold" ? 0xcda55f : COLORS[item.color];
      object.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (
            material.color.getHex() === 0xf8fafc ||
            material.color.getHex() === COLORS[item.color]
          ) {
            material.color.setHex(finish);
            material.metalness = 0.88;
            material.roughness = 0.26;
            material.envMapIntensity = 0.8;
          }
          if (
            child.geometry instanceof THREE.ConeGeometry &&
            Math.abs(child.position.y - 0.327) < 0.001
          ) {
            child.geometry.dispose();
            child.geometry = new THREE.LatheGeometry(
              [
                new THREE.Vector2(0.057, -0.0575),
                new THREE.Vector2(0.057, -0.04),
                new THREE.Vector2(0.054, -0.015),
                new THREE.Vector2(0.047, 0.012),
                new THREE.Vector2(0.035, 0.038),
                new THREE.Vector2(0.017, 0.065),
                new THREE.Vector2(0, 0.083),
              ],
              48,
            );
          }
          if (Math.abs(child.position.z - 0.052) < 0.001) {
            material.color.setHex(0x122235);
            material.metalness = 0.55;
            material.roughness = 0.19;
          }
          if (Math.abs(child.position.x) > 0.06)
            child.scale.multiplyScalar(1.3);
        }
      });
      const trim = new THREE.MeshStandardMaterial({
        color: finish,
        metalness: 0.85,
        roughness: 0.3,
      });
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.028, 0.004, 12, 48),
        trim,
      );
      rim.position.set(0, 0.19, 0.058);
      object.add(rim);
      for (const y of [0.06, 0.26]) {
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(0.0555, 0.0017, 8, 48),
          trim,
        );
        band.rotation.x = Math.PI / 2;
        band.position.y = y;
        object.add(band);
      }
      for (let i = 0; i < 8; i++) {
        const bolt = new THREE.Mesh(
          new THREE.SphereGeometry(0.0016, 6, 4),
          trim,
        );
        const angle = (i * Math.PI) / 4;
        bolt.position.set(
          Math.cos(angle) * 0.028,
          0.19 + Math.sin(angle) * 0.028,
          0.062,
        );
        object.add(bolt);
      }
    }
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const factor = (studio ? 2.5 : 3.1) / Math.max(size.x, size.y, size.z);
    object.scale.setScalar(factor);
    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(factor);
    object.position.set(-center.x, -box.min.y * factor, -center.z);
    object.traverse((child) => {
      if (child.userData.animate) child.userData.baseY = child.position.y;
    });
    return object;
  }, [item.type, item.color, studio]);
  useEffect(() => () => disposeObject(model), [model]);
  const born = useRef<number | null>(null);
  useFrame(({ clock, pointer }, delta) => {
    if (!ref.current) return;
    if (born.current === null) born.current = clock.elapsedTime;
    const age = clock.elapsedTime - born.current;
    const appear = reduced ? 1 : Math.min(1, age * 1.8);
    const eased = 1 - Math.pow(1 - appear, 3);
    ref.current.scale.setScalar(item.scale * Math.max(0.001, eased));
    ref.current.position.y =
      item.position[1] +
      (studio ? 0.02 : 0.6) +
      (reduced ? 0 : Math.sin(clock.elapsedTime * 0.9) * 0.055);
    if (!studio) {
      ref.current.rotation.y = THREE.MathUtils.damp(
        ref.current.rotation.y,
        (item.rotation * Math.PI) / 180 +
          (reduced
            ? 0
            : pointer.x * 0.2 + Math.sin(clock.elapsedTime * 0.3) * 0.12),
        3,
        delta,
      );
      ref.current.rotation.z =
        -0.22 + (reduced ? 0 : Math.sin(clock.elapsedTime * 0.45) * 0.025);
    }
    if (!reduced && ["bird", "flock"].includes(item.type))
      model.userData.animate?.(clock.elapsedTime * 1000);
  });
  return (
    <group
      ref={ref}
      position={[
        item.position[0],
        item.position[1] + (studio ? 0.02 : 0.6),
        item.position[2],
      ]}
      rotation={[0, (item.rotation * Math.PI) / 180, studio ? 0 : -0.22]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(item.id);
      }}
    >
      <primitive object={model} dispose={null} />
      {studio && selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.65, 0.67, 64]} />
          <meshBasicMaterial
            color="#b6a0fa"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
function Stage({ studio = false }: { studio?: boolean }) {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.03, 0]}
        receiveShadow
      >
        <circleGeometry args={[studio ? 14 : 2.5, 96]} />
        <shadowMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <circleGeometry args={[studio ? 14 : 2.5, 96]} />
        <meshBasicMaterial color={studio ? "#100c17" : "#14101b"} />
      </mesh>
      {[1.35, 1.75, 2.7, 3.15].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.016, 0]}
        >
          <ringGeometry args={[radius, radius + 0.008, 120]} />
          <meshBasicMaterial
            color={index === 0 ? "#a28a6a" : "#777080"}
            transparent
            opacity={index === 0 ? 0.55 : 0.22}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {studio && (
        <gridHelper
          args={[24, 24, "#40384e", "#242030"]}
          position={[0, -0.01, 0]}
        />
      )}
    </group>
  );
}
function Setup({
  resetKey = 0,
  studio = false,
  reduced = false,
  cameraView,
}: {
  resetKey?: number;
  studio?: boolean;
  reduced?: boolean;
  cameraView?: { azimuth: number; zoom: number };
}) {
  const { camera, gl, scene, invalidate } = useThree();
  const environment = useLoader(
    THREE.TextureLoader,
    "/brand/studio-environment.png",
  );
  const controlsRef = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.enablePan = studio;
    controls.enableDamping = !reduced;
    controls.minDistance = 4;
    controls.maxDistance = studio ? 20 : 11;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.addEventListener("change", invalidate);
    return () => {
      controls.removeEventListener("change", invalidate);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl, studio, reduced, invalidate]);
  useEffect(() => {
    const baseX = studio ? 6 : 4;
    const baseZ = studio ? 8 : 7;
    const angle = Math.atan2(baseX, baseZ) + (cameraView?.azimuth || 0);
    const zoom = Math.pow(1.15, -(cameraView?.zoom || 0));
    const radius = Math.hypot(baseX, baseZ) * zoom;
    camera.position.set(
      Math.sin(angle) * radius,
      (studio ? 5 : 3.3) * zoom,
      Math.cos(angle) * radius,
    );
    controlsRef.current?.target.set(0, studio ? 0.8 : 1.45, 0);
    controlsRef.current?.update();
    invalidate();
  }, [
    resetKey,
    studio,
    camera,
    reduced,
    invalidate,
    cameraView?.azimuth,
    cameraView?.zoom,
  ]);
  useLayoutEffect(() => {
    // Prebaked cube-UV atlas: skip runtime room rendering and PMREM shader compilation.
    environment.mapping = THREE.CubeUVReflectionMapping;
    environment.flipY = false;
    environment.colorSpace = THREE.LinearSRGBColorSpace;
    environment.generateMipmaps = false;
    environment.minFilter = THREE.LinearFilter;
    environment.magFilter = THREE.LinearFilter;
    environment.needsUpdate = true;
    scene.environment = environment;
    invalidate();
    return () => {
      scene.environment = null;
    };
  }, [environment, scene, invalidate]);
  useFrame(() => controlsRef.current?.update());
  return null;
}
export default function Scene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [lost, setLost] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let intersecting = true;
    const update = () => setActive(intersecting && !document.hidden);
    const observer = new IntersectionObserver(
      (entries) => {
        intersecting = entries[0].isIntersecting;
        update();
      },
      { rootMargin: "100px" },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const fallback = (
    <div className="webgl-fallback">
      <img src="/brand/rocket.svg" alt="Illustration of a golden rocket" />
      <p>3D rendering is unavailable in this browser.</p>
      <small>Commands still work. Try enabling hardware acceleration.</small>
      <button
        className="text-link"
        onClick={() => {
          setLost(false);
          setReady(false);
          setAttempt((value) => value + 1);
        }}
      >
        Retry 3D
      </button>
    </div>
  );
  return (
    <div
      ref={host}
      className={`scene-canvas ${props.studio ? "studio-canvas" : ""}`}
      role="region"
      aria-label="Interactive 3D scene. Drag to orbit and scroll or pinch to zoom. Keyboard alternatives are in scene controls."
      data-testid="scene"
      data-ready={ready}
    >
      {lost ? (
        fallback
      ) : (
        <SceneBoundary
          key={attempt}
          fallback={fallback}
          onFailure={() => {
            setReady(false);
            setLost(true);
          }}
        >
          <Canvas
            shadows
            dpr={[1, 1.6]}
            camera={{ position: [4, 3.3, 7], fov: 37, near: 0.1, far: 60 }}
            frameloop={!active ? "never" : props.reduced ? "demand" : "always"}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
            }}
            fallback={fallback}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.05;
              setReady(true);
              gl.domElement.addEventListener(
                "webglcontextlost",
                (event) => {
                  event.preventDefault();
                  setReady(false);
                  setLost(true);
                },
                { once: true },
              );
            }}
          >
            <ambientLight intensity={0.45} />
            <hemisphereLight args={["#dacbff", "#292032", 0.7]} />
            <directionalLight
              position={[3, 7, 4]}
              intensity={3}
              color="#ffdfaa"
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-bias={-0.001}
            />
            <pointLight position={[-4, 3, -2]} color="#a994ff" intensity={8} />
            <pointLight position={[2, 1, 4]} color="#fff0d5" intensity={3} />
            <Setup
              resetKey={props.resetKey}
              cameraView={props.cameraView}
              studio={props.studio}
              reduced={props.reduced}
            />
            <Stage studio={props.studio} />
            {props.objects.map((item) => (
              <Model
                key={item.id}
                item={item}
                selected={item.id === props.selected}
                onSelect={props.onSelect}
                reduced={!!props.reduced}
                studio={!!props.studio}
              />
            ))}
          </Canvas>
        </SceneBoundary>
      )}
      {!ready && !lost && (
        <span className="scene-loading">Preparing your dimension…</span>
      )}
    </div>
  );
}
