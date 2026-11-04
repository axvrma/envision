export function photoBlob(base64) {
  if (typeof base64 !== "string" || !base64.length || base64.length > 20000000)
    throw new Error("The camera returned an invalid photo.");
  const value = base64.replace(/^data:image\/(?:jpeg|png);base64,/, "");
  let binary;
  try {
    binary = atob(value);
  } catch {
    throw new Error("The camera returned an invalid photo.");
  }
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const jpeg =
    bytes.length > 32 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff &&
    bytes.at(-2) === 0xff &&
    bytes.at(-1) === 0xd9;
  const png =
    bytes.length > 32 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, index) => bytes[index] === byte,
    );
  if (!jpeg && !png)
    throw new Error("The camera did not return a JPEG or PNG image.");
  return new Blob([bytes], { type: jpeg ? "image/jpeg" : "image/png" });
}
/** The engine captures its camera + virtual rendering, never a separate or fabricated background. */
export async function captureCameraPhoto(adapter) {
  if (!adapter.view || !adapter.photoAPI?.takeScreenshot)
    throw new Error("Camera photos are unavailable in this AR runtime.");
  if (adapter.photoAbort) throw new Error("A photo is already being captured.");
  const abort = new AbortController();
  adapter.photoAbort = abort;
  const view = adapter.view;
  view.setCapturing(true);
  let timeout;
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => adapter.photoAPI.takeScreenshot()),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Camera capture timed out. Keep the camera active and try again.",
              ),
            ),
          5000,
        );
        abort.signal.addEventListener(
          "abort",
          () =>
            reject(
              new Error("The AR session ended before the photo was ready."),
            ),
          { once: true },
        );
      }),
    ]);
    if (abort.signal.aborted || adapter.view !== view)
      throw new Error("The AR session ended before the photo was ready.");
    const blob = photoBlob(result);
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(blob);
      try {
        if (!bitmap.width || !bitmap.height)
          throw new Error("The camera returned an empty photo.");
      } finally {
        bitmap.close();
      }
    }
    if (abort.signal.aborted || adapter.view !== view)
      throw new Error("The AR session ended before the photo was ready.");
    return blob;
  } finally {
    clearTimeout(timeout);
    view.setCapturing(false);
    if (adapter.photoAbort === abort) adapter.photoAbort = null;
  }
}
