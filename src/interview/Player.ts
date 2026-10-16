import { gsap } from "../core/motion";
import { timeHtml } from "./template";

const STORAGE = { volume: "player-volume", speed: "player-speed" };

const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable (private mode); settings just won't persist.
    }
  },
};

/**
 * Custom video controls: stacked Play/Pause label, big H:MM:SS timecode, tick-mark timeline, and hover popups
 * for volume, captions and speed. State is mirrored onto `.player` as classes for the CSS to react to.
 */
export class Player {
  readonly video: HTMLVideoElement;
  private time: HTMLElement;
  private timeline: HTMLElement;
  private hover: HTMLElement;
  private progress: HTMLElement;
  private volumeValue: HTMLElement;
  private captions: HTMLElement;
  private started = false;
  private seeking = false;

  constructor(
    private el: HTMLElement,
    private onTime: (t: number) => void,
    private onFirstPlay: () => void,
  ) {
    this.video = el.querySelector("video")!;
    this.time = el.querySelector(".player__time")!;
    this.timeline = el.querySelector(".player__timeline")!;
    this.hover = el.querySelector(".player__hover")!;
    this.progress = el.querySelector(".player__progress")!;
    this.volumeValue = el.querySelector(".volume__value")!;
    this.captions = el.querySelector(".player__captions")!;

    const volume = parseFloat(store.get(STORAGE.volume) ?? "1");
    this.video.volume = Number.isFinite(volume) ? volume : 1;
    this.setSpeed(parseFloat(store.get(STORAGE.speed) ?? "1") || 1);
    this.updateVolume();
    this.bind();
    el.classList.add("is-initialized", "has-controls", "has-poster");
    if (this.video.textTracks.length) el.classList.add("has-cc");
  }

  play() {
    return this.video.play().catch(() => {});
  }

  seek(t: number, andPlay = true) {
    this.video.currentTime = Math.max(0, Math.min(t, this.video.duration || t));
    if (andPlay) this.play();
  }

  destroy() {
    this.video.pause();
    document.removeEventListener("keydown", this.onKey);
    document.removeEventListener("mouseup", this.onSeekEnd);
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
  }

  private bind() {
    const v = this.video;
    const set = (cls: string, on: boolean) => this.el.classList.toggle(cls, on);

    v.addEventListener("loadeddata", () => set("is-loaded", true));
    v.addEventListener("canplay", () => set("is-canplay", true));
    v.addEventListener("waiting", () => set("is-loading", true));
    v.addEventListener("playing", () => set("is-loading", false));
    v.addEventListener("play", () => {
      set("is-played", true);
      set("is-playing", true);
      set("is-ended", false);
      this.el.closest(".interview")?.classList.add("is-video-playing");
      if (!this.started) {
        this.started = true;
        this.onFirstPlay();
      }
    });
    v.addEventListener("pause", () => {
      set("is-playing", false);
      this.el.closest(".interview")?.classList.remove("is-video-playing");
    });
    v.addEventListener("ended", () => set("is-ended", true));
    v.addEventListener("volumechange", () => this.updateVolume());
    v.addEventListener("timeupdate", () => {
      const t = v.currentTime;
      set("is-started", t > 0.001);
      this.time.innerHTML = timeHtml(t);
      if (v.duration) gsap.to(this.progress, { width: `${(t / v.duration) * 100}%`, duration: 0.3, ease: "none" });
      this.onTime(t);
    });

    this.el.querySelector(".player__toggle")!.addEventListener("click", () => this.togglePlay());
    this.el.querySelector(".player__toggle")!.addEventListener("dblclick", () => this.toggleFullscreen());
    this.el.querySelector(".player__playpause")!.addEventListener("click", () => this.togglePlay());
    this.el.querySelector(".player__fullscreen")!.addEventListener("click", () => this.toggleFullscreen());
    this.el.querySelector(".player__volume")!.addEventListener("click", () => (v.muted = !v.muted));

    // Timeline: hover fill follows the cursor, seek happens on release.
    this.timeline.addEventListener("mousemove", (e) => {
      this.hover.style.width = `${(this.ratio(e) * 100).toFixed(2)}%`;
    });
    this.timeline.addEventListener("mousedown", () => {
      this.seeking = true;
      document.addEventListener("mouseup", this.onSeekEnd, { once: true });
    });

    const volumeBar = this.el.querySelector<HTMLElement>(".volume__bar")!;
    const setVolumeFrom = (e: MouseEvent) => {
      const r = volumeBar.getBoundingClientRect();
      v.volume = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
      v.muted = false;
    };
    volumeBar.addEventListener("mousedown", (e) => {
      setVolumeFrom(e);
      const move = (ev: MouseEvent) => setVolumeFrom(ev);
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", () => document.removeEventListener("mousemove", move), { once: true });
    });

    this.el.querySelectorAll<HTMLButtonElement>("[data-speed]").forEach((b) =>
      b.addEventListener("click", () => this.setSpeed(parseFloat(b.dataset.speed!))),
    );
    this.el.querySelectorAll<HTMLButtonElement>("[data-cc]").forEach((b) =>
      b.addEventListener("click", () => this.setCaptions(parseInt(b.dataset.cc!, 10))),
    );

    document.addEventListener("keydown", this.onKey);
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
  }

  private ratio(e: MouseEvent) {
    const r = this.timeline.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  }

  private onSeekEnd = (e: MouseEvent) => {
    if (!this.seeking) return;
    this.seeking = false;
    if (this.video.duration) this.seek(this.ratio(e) * this.video.duration, !this.video.paused || !this.started);
  };

  private togglePlay() {
    if (this.video.paused) this.play();
    else this.video.pause();
  }

  private toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else this.el.requestFullscreen?.();
  }

  private onFullscreenChange = () => {
    this.el.classList.toggle("is-fullscreen", document.fullscreenElement === this.el);
  };

  private updateVolume() {
    const v = this.video;
    this.el.classList.toggle("is-muted", v.muted || v.volume === 0);
    gsap.to(this.volumeValue, { height: `${(v.muted ? 0 : v.volume) * 100}%`, duration: 0.2 });
    store.set(STORAGE.volume, String(v.volume));
  }

  private setSpeed(speed: number) {
    const s = Math.min(2, Math.max(0.25, Math.round(speed * 4) / 4));
    this.video.playbackRate = s;
    store.set(STORAGE.speed, String(s));
    this.el.querySelectorAll<HTMLElement>("[data-speed]").forEach((b) => {
      b.classList.toggle("is-active", parseFloat(b.dataset.speed!) === s);
    });
  }

  /** Captions render in our own overlay: the track is "hidden" and we copy the active cue text on cuechange. */
  private setCaptions(index: number) {
    [...this.video.textTracks].forEach((track, i) => {
      track.mode = i === index ? "hidden" : "disabled";
      track.oncuechange =
        i === index
          ? () => {
              const cue = track.activeCues?.[0] as VTTCue | undefined;
              this.captions.innerHTML = cue ? `<span>${cue.text.replace(/\n/g, "<br>")}</span>` : "";
            }
          : null;
    });
    if (index < 0) this.captions.innerHTML = "";
    this.el.classList.toggle("has-captions-on", index >= 0);
    this.el.querySelectorAll<HTMLElement>("[data-cc]").forEach((b) => {
      b.classList.toggle("is-active", parseInt(b.dataset.cc!, 10) === index);
    });
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest("input, textarea")) return;
    const v = this.video;
    const step = (s: number) => this.seek(v.currentTime + s, !v.paused);
    const actions: Record<string, () => void> = {
      " ": () => this.togglePlay(),
      k: () => this.togglePlay(),
      ArrowLeft: () => step(-5),
      ArrowRight: () => step(5),
      j: () => step(-10),
      l: () => step(10),
      ArrowUp: () => ((v.muted = false), (v.volume = Math.min(1, v.volume + 0.05))),
      ArrowDown: () => (v.volume = Math.max(0, v.volume - 0.05)),
      m: () => (v.muted = !v.muted),
      "<": () => this.setSpeed(v.playbackRate - 0.25),
      ">": () => this.setSpeed(v.playbackRate + 0.25),
      "0": () => this.seek(0),
      Home: () => this.seek(0),
      End: () => (this.seek(v.duration, false), v.pause()),
      f: () => this.toggleFullscreen(),
      c: () => {
        const on = this.el.classList.contains("has-captions-on");
        this.setCaptions(on ? -1 : 0);
      },
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };
}
