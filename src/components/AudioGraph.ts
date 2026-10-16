import { Component } from "../core/Component";
import { EASE, gsap } from "../core/motion";
import { GRADIENTS, type GradientStop } from "./gradients";

interface Loop {
  label: string;
  url: string;
  timestamp: number;
}

interface Options extends Record<string, unknown> {
  loops: Loop[];
}

interface Bar {
  x: number;
  width: number;
  direction: 1 | -1;
  height: number;
  phase: number;
  gradient: CanvasGradient | null;
  gradientTween?: gsap.core.Timeline;
  streaks: { y: number; speed: number }[];
}

const FPS = 30;
const FRAME_MS = 1000 / FPS;
const STREAKS_PER_BAR = 12;
const STREAK_HEIGHT = 40;
const STREAK_ALPHA = 0.2;
// Share of the frequency bins actually used; the top of the spectrum is mostly silent for voice.
const SPECTRUM_SHARE = 87 / 128;
// Per-frame approach toward the target height; matches a 0.5s ease-out retargeted every frame.
const HEIGHT_SMOOTHING = 0.13;

/**
 * Hero visualiser: a row of vertical bars of uneven width straddling the headline baseline. Each bar is filled
 * with a slowly breathing gradient and has faint light streaks drifting through it. Until the visitor clicks,
 * bar heights follow a synthetic "idle" signal; after a click the hero video is unmuted and the bars follow its
 * real frequency spectrum.
 */
export class AudioGraph extends Component<Options> {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private media!: HTMLVideoElement;
  private caption: HTMLElement[] = [];
  private link: HTMLAnchorElement | null = null;
  private section!: HTMLElement;

  private width = 0;
  private height = 0;
  private bars: Bar[] = [];
  private strength = 0;
  private frame = 0;
  private nextFrameAt = 0;
  private raf = 0;
  private loopIndex = -1;

  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private spectrum?: Uint8Array;
  private started = false;

  init() {
    this.canvas = this.view.querySelector("canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
    this.section = this.view.closest("section")!;
    this.media = this.section.querySelector("video")!;
    this.caption = [...this.section.querySelectorAll<HTMLElement>(".js-audio-caption")];
    this.link = this.section.querySelector(".js-audio-link");

    this.view.classList.toggle("is-muted", this.media.muted);
    this.measure();
    this.createBars();
    this.pickGradient();

    document.querySelectorAll(".js-audio-toggle").forEach((el) => el.addEventListener("click", this.onToggle));
    document.addEventListener("click", this.onFirstClick);
    this.media.addEventListener("timeupdate", this.onTimeUpdate);

    this.raf = requestAnimationFrame(this.render);
  }

  animateIn() {
    gsap.fromTo(this, { strength: 0 }, { strength: 1, duration: 3, delay: 1, ease: EASE });
    gsap.fromTo(this.view, { opacity: 0 }, { opacity: 1, duration: 3, delay: 1, ease: EASE });
  }

  resize() {
    this.measure();
    this.createBars();
    this.pickGradient();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    document.querySelectorAll(".js-audio-toggle").forEach((el) => el.removeEventListener("click", this.onToggle));
    document.removeEventListener("click", this.onFirstClick);
    this.media.removeEventListener("timeupdate", this.onTimeUpdate);
    this.bars.forEach((bar) => bar.gradientTween?.kill());
    this.media.pause();
    this.analyser?.disconnect();
    this.audioContext?.close();
  }

  private measure() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    this.width = this.canvas.width = this.view.clientWidth * ratio;
    this.height = this.canvas.height = this.view.clientHeight * ratio;
  }

  /** Random widths between 16 and 90 units, normalised to the canvas width; directions alternate irregularly. */
  private createBars() {
    this.bars.forEach((bar) => bar.gradientTween?.kill());
    const units: number[] = [];
    let remaining = 806;
    while (remaining > 0) {
      const w = Math.min(remaining, 16 + Math.round(74 * Math.random()));
      units.push(w);
      remaining -= w;
    }
    const total = units.reduce((a, b) => a + b, 0);

    let x = 0;
    this.bars = units.map((u, i) => {
      const width = Math.round((u / total) * this.width);
      const speed = 5e-4 + Math.random() * 2e-4;
      const bar: Bar = {
        x,
        width,
        direction: i === 0 || Math.random() > 0.6 ? 1 : -1,
        height: 0,
        phase: Math.random() * Math.PI * 2,
        gradient: null,
        streaks: Array.from({ length: STREAKS_PER_BAR }, () => ({ y: Math.random(), speed: i % 2 ? -speed : speed })),
      };
      x += width;
      return bar;
    });
  }

  /**
   * Every bar gets its own looping tween that slides the colour-stop offsets between two positions, so the
   * gradients drift independently. Alternate bars use the mirrored palette.
   */
  private pickGradient() {
    const palette = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    const mirrored = palette.map((s) => ({ ...s, min: 1 - s.max, max: 1 - s.min }));

    this.bars.forEach((bar, i) => {
      bar.gradientTween?.kill();
      const stops: Array<GradientStop & { value: number }> = (i % 2 ? mirrored : palette).map((s) => ({ ...s, value: 0 }));
      const reverse = Math.random() > 0.5;
      const tl = gsap.timeline({
        defaults: { duration: i % 2 ? 4 : 3 + 2 * Math.random(), repeat: -1, yoyo: true, ease: "none" },
        onUpdate: () => {
          const g = this.ctx.createLinearGradient(0, 0.3 * this.height, 0, 0.7 * this.height);
          stops.forEach((s) => g.addColorStop(Math.min(1, Math.max(0, s.value)), s.color));
          bar.gradient = g;
        },
      });
      stops.forEach((s) => {
        tl.fromTo(s, { value: reverse ? s.min : s.max }, { value: reverse ? s.max : s.min }, 0);
      });
      bar.gradientTween = tl;
    });
  }

  /** 0–255 level for a bar: real spectrum when unmuted, otherwise a smooth synthetic wobble. */
  private level(i: number, bar: Bar) {
    if (this.analyser && this.spectrum && !this.media.muted) {
      const binsPerBar = (this.spectrum.length * SPECTRUM_SHARE) / this.bars.length;
      const from = Math.floor(i * binsPerBar);
      const to = Math.max(from + 1, Math.floor((i + 1) * binsPerBar));
      let sum = 0;
      for (let b = from; b < to; b++) sum += this.spectrum[b];
      return sum / (to - from);
    }
    const t = this.frame / FPS;
    const wobble = 0.55 + 0.25 * Math.sin(t * 1.3 + bar.phase) + 0.2 * Math.sin(t * 3.7 + bar.phase * 2.1);
    return 255 * Math.min(1, Math.max(0.15, wobble));
  }

  private render = (now: number) => {
    this.raf = requestAnimationFrame(this.render);
    if (now < this.nextFrameAt) return;
    this.nextFrameAt = now + FRAME_MS;
    this.frame++;

    if (this.analyser && this.spectrum && !this.media.muted) this.analyser.getByteFrequencyData(this.spectrum);

    const { ctx, width: W, height: H } = this;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);

    this.bars.forEach((bar, i) => {
      const target = H * (this.level(i, bar) / 255) * 0.5;
      bar.height += (target - bar.height) * HEIGHT_SMOOTHING;
      const h = bar.height * this.strength;

      ctx.fillStyle = bar.gradient ?? "#c5c5c5";
      ctx.fillRect(bar.x, bar.direction === 1 ? H / 2 - h : H / 2, bar.width, h);

      // Light streaks scroll through the full canvas height; the white background hides them outside bars.
      ctx.globalAlpha = STREAK_ALPHA;
      bar.streaks.forEach((s) => {
        s.y += s.speed;
        if (s.y > 1) s.y = 0;
        else if (s.y < 0) s.y = 1;
        const y = s.y * H;
        const g = ctx.createLinearGradient(0, y, 0, y + STREAK_HEIGHT);
        g.addColorStop(0, "#ffffffff");
        g.addColorStop(1, "#ffffff00");
        ctx.fillStyle = g;
        ctx.fillRect(bar.x, y, bar.width, STREAK_HEIGHT);
      });
      ctx.globalAlpha = 1;
    });
  };

  private onTimeUpdate = () => {
    const loops = this.options.loops ?? [];
    let index = 0;
    loops.forEach((loop, i) => {
      if (this.media.currentTime >= loop.timestamp) index = i;
    });
    if (index === this.loopIndex || !loops[index]) return;
    this.loopIndex = index;
    this.caption.forEach((el) => (el.textContent = loops[index].label));
    if (this.link && loops[index].url) this.link.href = loops[index].url;
    this.pickGradient();
  };

  /** The first click inside the hero section starts the analyser and unmutes, instead of following a link. */
  private onFirstClick = (e: MouseEvent) => {
    if (this.started || !this.section.contains(e.target as Node)) return;
    e.preventDefault();
    e.stopPropagation();
    document.removeEventListener("click", this.onFirstClick);
    this.startAnalyser();
  };

  private onToggle = (e: Event) => {
    e.preventDefault();
    if (!this.started) return; // the first click is handled by onFirstClick
    this.setMuted(!this.media.muted);
  };

  private startAnalyser() {
    this.started = true;
    this.view.classList.add("is-interacted");
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaElementSource(this.media);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.spectrum = new Uint8Array(this.analyser.frequencyBinCount);
    } catch {
      // Without Web Audio the bars keep the idle signal but sound still plays.
    }
    this.setMuted(false);
    this.media.play().catch(() => {});
  }

  private setMuted(muted: boolean) {
    this.media.muted = muted;
    this.view.classList.toggle("is-muted", muted);
  }
}
