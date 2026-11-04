/** Target smoothing only. Never smooth the tracked camera or placed object transforms. */
export class TrackedTargetFilter {
  constructor() {
    this.reset();
  }
  reset() {
    this.position = null;
    this.previous = null;
    this.kind = null;
    this.samples = 0;
    this.time = null;
  }
  update(pose, now) {
    if (
      !pose ||
      !Array.isArray(pose.position) ||
      pose.position.length !== 3 ||
      !pose.position.every((n) => Number.isFinite(n) && Math.abs(n) <= 20) ||
      !Number.isFinite(pose.rotation)
    ) {
      this.reset();
      return null;
    }
    const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
    const changed =
      this.kind !== pose.kind ||
      (this.previous && distance(this.previous, pose.position) > 0.35);
    if (!this.position || changed) {
      this.position = [...pose.position];
      this.samples = 0;
    }
    const dt =
      this.time === null
        ? 1 / 60
        : Math.max(0, Math.min(0.1, (now - this.time) / 1000));
    const displacement = distance(this.position, pose.position);
    if (displacement > 0.002) {
      const alpha = 1 - Math.exp(-dt / (displacement > 0.08 ? 0.02 : 0.045));
      this.position = this.position.map(
        (n, i) => n + (pose.position[i] - n) * alpha,
      );
    }
    this.previous = [...pose.position];
    this.kind = pose.kind;
    this.time = now;
    this.samples++;
    // A new surface/jump needs fresh consecutive observations; never bridge tracking loss.
    return this.samples >= 3 ? { ...pose, position: [...this.position] } : null;
  }
}
export function surfaceHitPose(hits, kindForType) {
  if (!Array.isArray(hits)) return null;
  // Prefer detected surfaces over estimated surfaces, independent of API result order.
  for (const type of ["DETECTED_SURFACE", "ESTIMATED_SURFACE"])
    for (const hit of hits) {
      if (hit.type !== type) continue;
      const p = hit.position,
        q = hit.rotation;
      if (
        !p ||
        ![p.x, p.y, p.z].every(
          (n) => Number.isFinite(n) && Math.abs(n) <= 20,
        ) ||
        !q ||
        ![q.x, q.y, q.z, q.w].every(Number.isFinite)
      )
        continue;
      const norm = Math.hypot(q.x, q.y, q.z, q.w);
      if (
        norm < 0.9 ||
        norm > 1.1 ||
        !Number.isFinite(hit.distance) ||
        hit.distance <= 0 ||
        hit.distance > 8
      )
        continue;
      const upY = 1 - 2 * ((q.x / norm) ** 2 + (q.z / norm) ** 2);
      if (upY < 0.9) continue;
      return {
        position: [p.x, p.y, p.z],
        rotation: 0,
        kind: kindForType?.[type] || type.toLowerCase().replaceAll("_", "-"),
      };
    }
  return null;
}
