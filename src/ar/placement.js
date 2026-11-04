import { atOrigin, validateScene } from "../../shared/scene-state.js";
const validPose = (pose) =>
  pose &&
  Array.isArray(pose.position) &&
  pose.position.length === 3 &&
  pose.position.every((n) => Number.isFinite(n) && Math.abs(n) <= 20) &&
  Number.isFinite(pose.rotation);
/** Tracking frames are transient. Only confirmed user mutations enter SceneStore history. */
export class PlacementController {
  constructor(
    store,
    adapter,
    notify = () => {},
    now = () => performance.now(),
  ) {
    this.store = store;
    this.adapter = adapter;
    this.notify = notify;
    this.now = now;
    this.state = "initializing";
    this.pose = null;
    this.poseAt = 0;
    this.pending = null;
    this.selected = null;
    this.active = false;
    this.starting = false;
    this.generation = 0;
    this.lastFrameAt = 0;
    this.reason = null;
  }
  emit() {
    this.notify(this);
  }
  async start() {
    if (this.active || this.starting || this.stopping || this.ending) return;
    const generation = ++this.generation;
    this.starting = true;
    this.error = null;
    this.state = "initializing";
    this.emit();
    this.launchPromise = (async () => {
      try {
        await this.adapter.start({
          tracking: (state, pose, reason) => {
            if (generation === this.generation) this.track(state, pose, reason);
          },
          ended: (error) => {
            if (generation === this.generation) this.end(error);
          },
        });
        if (generation !== this.generation) return;
        this.active = true;
        this.lastFrameAt = this.now();
        if (this.state === "initializing") this.state = "searching";
      } catch (error) {
        if (generation !== this.generation) return;
        await this.adapter.stop().catch(() => {});
        this.state =
          error.name === "NotSupportedError" ? "unsupported" : "failed";
        this.error =
          error.name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access in browser settings and retry."
            : error?.message ||
              "AR could not start. Check camera permissions and your connection, then retry.";
        this.pose = null;
        this.active = false;
      } finally {
        if (generation === this.generation) {
          this.starting = false;
          this.emit();
        }
      }
    })();
    return this.launchPromise;
  }
  track(state, pose = null, reason = null) {
    this.lastFrameAt = this.now();
    const next =
      state === "ready" && validPose(pose)
        ? "ready"
        : state === "ready"
          ? "searching"
          : state;
    const changed =
      this.state !== next ||
      this.pose?.kind !== pose?.kind ||
      this.reason !== reason;
    this.reason = reason;
    this.state = next;
    this.pose =
      next === "ready"
        ? { ...pose, position: [...pose.position], rotation: pose.rotation }
        : null;
    this.poseAt = this.pose ? this.now() : 0;
    this.adapter.preview?.(this.pending, this.pose);
    if (changed) this.emit();
  }
  checkTracking() {
    if (!this.active) return;
    const elapsed = this.now() - this.lastFrameAt;
    if (elapsed >= 8000)
      return this.end(
        new Error(
          "Camera tracking stopped sending frames. Check the camera and restart AR.",
        ),
      );
    if (this.pose && this.now() - this.poseAt >= 250) {
      this.pose = null;
      this.state = "temporarily-lost";
      this.reason = "stale-frame";
      this.adapter.preview?.(this.pending, null);
      this.emit();
    }
  }
  get canPlace() {
    return (
      this.active &&
      this.state === "ready" &&
      !!this.pose &&
      this.now() - this.poseAt < 250 &&
      !!this.pending
    );
  }
  begin(input) {
    this.pending = { kind: "create", input };
    this.adapter.preview?.(this.pending, this.pose);
    this.emit();
  }
  move() {
    if (!this.selected) throw new Error("Select an object first.");
    this.pending = { kind: "move", id: this.selected };
    this.emit();
  }
  load(scene) {
    this.pending = { kind: "composition", scene: validateScene(scene) };
    this.adapter.preview?.(this.pending, this.pose);
    this.emit();
  }
  cancel() {
    this.pending = null;
    this.adapter.preview?.(null, null);
    this.emit();
  }
  confirm() {
    if (!this.canPlace)
      throw new Error(
        "A fresh tracked target is required. Aim at a well-lit horizontal surface.",
      );
    if (this.pending.kind === "move")
      this.store.update(this.pending.id, { position: [...this.pose.position] });
    else if (this.pending.kind === "composition") {
      this.store.commit(atOrigin(this.pending.scene, this.pose));
      this.selected = this.store.objects[0]?.id || null;
    } else {
      const item = this.store.create({
        ...this.pending.input,
        position: [...this.pose.position],
        rotation: this.pose.rotation,
      });
      this.selected = item.id;
    }
    this.cancel();
  }
  select(id) {
    this.selected = this.store.objects.some((o) => o.id === id) ? id : null;
    this.emit();
  }
  update(patch) {
    if (!this.selected) throw new Error("Select an object first.");
    this.store.update(this.selected, patch);
  }
  remove() {
    if (this.selected) this.store.remove(this.selected);
    this.selected = null;
    this.cancel();
  }
  async end(error = null) {
    if (this.ending) return this.ending;
    ++this.generation;
    this.stopping = true;
    this.active = false;
    this.pose = null;
    this.state = error ? "failed" : "searching";
    if (error)
      this.error =
        error?.message ||
        "The AR session stopped unexpectedly. Retry to start a new camera session.";
    this.cancel();
    this.ending = (async () => {
      try {
        let cleanupError = null;
        const stop = async () => {
          try {
            await this.adapter.stop();
          } catch (failure) {
            cleanupError ||= failure;
          }
        };
        await stop();
        await this.launchPromise;
        await stop();
        if (cleanupError && !error) {
          this.state = "failed";
          this.error =
            cleanupError.message ||
            "The AR engine could not finish stopping. Reload before restarting.";
        }
      } finally {
        this.starting = false;
        this.stopping = false;
        this.ending = null;
        this.emit();
      }
    })();
    return this.ending;
  }
}
