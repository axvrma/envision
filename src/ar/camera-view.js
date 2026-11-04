/** Keep the camera canvas and engine projection in the same aspect ratio. */
export function cameraLayout({
  width,
  height,
  videoWidth,
  videoHeight,
  dpr = 1,
  mode = "fit",
}) {
  if (![width, height].every((n) => Number.isFinite(n) && n > 0))
    throw new Error("Invalid camera viewport.");
  const hasVideo = [videoWidth, videoHeight].every(
    (n) => Number.isFinite(n) && n > 0,
  );
  const portraitAspect = hasVideo
    ? Math.min(videoWidth, videoHeight) / Math.max(videoWidth, videoHeight)
    : 3 / 4;
  const aspect = width > height ? 1 / portraitAspect : portraitAspect;
  const cssWidth = mode === "fill" ? width : Math.min(width, height * aspect);
  const cssHeight = mode === "fill" ? height : cssWidth / aspect;
  const videoLong = hasVideo ? Math.max(videoWidth, videoHeight) : Infinity;
  const density = Math.min(
    Math.max(1, dpr || 1),
    1.6,
    videoLong / Math.max(cssWidth, cssHeight),
  );
  return {
    width: cssWidth,
    height: cssHeight,
    left: (width - cssWidth) / 2,
    top: (height - cssHeight) / 2,
    pixelWidth: Math.max(1, Math.round(cssWidth * density)),
    pixelHeight: Math.max(1, Math.round(cssHeight * density)),
  };
}
export function cameraViewportModule(container, canvas, onLayout = () => {}) {
  let videoWidth = 0,
    videoHeight = 0,
    attached = false,
    mode = "fit";
  const update = () => {
    const layout = cameraLayout({
      width: innerWidth,
      height: innerHeight,
      videoWidth,
      videoHeight,
      dpr: devicePixelRatio,
      mode,
    });
    Object.assign(container.style, {
      inset: "auto",
      left: `${layout.left}px`,
      top: `${layout.top}px`,
      width: `${layout.width}px`,
      height: `${layout.height}px`,
    });
    Object.assign(canvas.style, {
      width: "100%",
      height: "100%",
      display: "block",
    });
    if (canvas.width !== layout.pixelWidth) canvas.width = layout.pixelWidth;
    if (canvas.height !== layout.pixelHeight)
      canvas.height = layout.pixelHeight;
    onLayout(layout);
  };
  const dimensions = (data) => {
    if (data?.videoWidth > 0 && data?.videoHeight > 0) {
      videoWidth = data.videoWidth;
      videoHeight = data.videoHeight;
    }
    update();
  };
  const module = {
    name: "envision-camera-viewport",
    onAttach: (data) => {
      attached = true;
      dimensions(data);
      window.addEventListener("resize", update);
    },
    onVideoSizeChange: dimensions,
    onCanvasSizeChange: update,
    onDeviceOrientationChange: update,
    onDetach: () => {
      if (!attached) return;
      attached = false;
      window.removeEventListener("resize", update);
      for (const property of ["inset", "left", "top", "width", "height"])
        container.style.removeProperty(property);
    },
  };
  return {
    module,
    setMode: (value) => {
      mode = value === "fill" ? "fill" : "fit";
      if (attached) update();
    },
    dispose: module.onDetach,
  };
}
/** Request natural 1x only if this already-authorized camera track exposes zoom. */
export async function resetCameraZoom(stream) {
  const track = stream?.getVideoTracks?.()[0];
  if (!track?.getCapabilities || !track?.applyConstraints) return;
  try {
    const zoom = track.getCapabilities().zoom,
      settings = track.getSettings?.();
    if (!zoom || ![zoom.min, zoom.max].every(Number.isFinite)) return;
    const natural = Math.max(zoom.min, Math.min(zoom.max, 1));
    if (
      !Number.isFinite(settings?.zoom) ||
      Math.abs(settings.zoom - natural) < 0.001
    )
      return;
    await track.applyConstraints({ advanced: [{ zoom: natural }] });
  } catch {
    /* Some devices expose zoom capabilities but reject changes. Keep the engine's stream. */
  }
}
