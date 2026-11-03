import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { SceneProps } from "./Scene";
const Scene = lazy(() => import("./Scene"));
export default function SceneView(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const placeholder = (
    <div className="scene-placeholder">
      <img
        src="/brand/rocket.svg"
        alt="Golden rocket illustration while the interactive scene prepares"
      />
    </div>
  );
  return (
    <div className="scene-mount" ref={host}>
      {visible ? (
        <Suspense fallback={placeholder}>
          <Scene {...props} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}
