import { EASE, gsap } from "../core/motion";
import { route, url } from "../core/paths";
import { Panel } from "./Panel";
import { Player } from "./Player";
import { renderInterview } from "./template";
import type { InterviewData } from "./types";

const ROUTE = /^\/interviews\/[a-z0-9-]+\/?$/;

/**
 * Interview overlay: one fixed <aside> that slides up over whatever page is showing. Opening pushes the
 * interview URL; Close goes back in history and the overlay slides away, restoring the page's scroll position.
 * While open, the page behind is removed from layout (`body.is-interview-open`).
 */
export class Interview {
  private main: HTMLElement;
  private player?: Player;
  private panel?: Panel;
  private scrollTop = 0;
  private pageTitle = document.title;
  private openPath: string | null = null;
  private abort?: AbortController;

  static matches(pathname: string) {
    return ROUTE.test(route(pathname));
  }

  constructor(private el: HTMLElement) {
    this.main = el.querySelector(".interview__main")!;
    gsap.set(el, { yPercent: 100 });
  }

  /** Called on every URL change; returns true if the interview owns the new URL. */
  async onState() {
    const path = location.pathname;
    if (Interview.matches(path)) {
      if (path !== this.openPath) await this.open(path);
      return true;
    }
    if (this.openPath) await this.close();
    return false;
  }

  private async open(path: string) {
    const switching = this.openPath !== null;
    this.openPath = path;

    if (!switching) this.show();
    this.abort?.abort();
    this.abort = new AbortController();
    this.el.classList.add("is-fetching");
    // The real site POSTs to the page URL; we serve one static JSON for every slug.
    const load = fetch(url("/data/interview.json"), { signal: this.abort.signal }).then((r) => r.json() as Promise<InterviewData>);

    try {
      const [data] = await Promise.all([load, switching ? this.animateOut() : Promise.resolve()]);
      this.el.classList.remove("is-fetching");
      this.destroyContent();
      document.title = data.title;
      this.main.innerHTML = renderInterview(data);
      this.bindContent();
      this.animateIn();
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error(err);
    }
  }

  private show() {
    this.el.classList.add("is-open");
    this.scrollTop = window.scrollY;
    this.pageTitle = document.title;
    gsap.to(this.el, {
      yPercent: 0,
      duration: 1,
      ease: "expo.out",
      onComplete: () => {
        document.body.classList.add("is-interview-open");
        window.scrollTo(0, 0);
      },
    });
  }

  private async close() {
    this.openPath = null;
    this.abort?.abort();
    document.title = this.pageTitle;
    this.player?.video.pause();
    const animateOut = this.animateOut();
    document.body.classList.remove("is-interview-open");
    window.scrollTo(0, this.scrollTop);
    await Promise.all([
      animateOut,
      gsap.to(this.el, { yPercent: 100, duration: 0.8, ease: "expo.inOut" }).then(),
    ]);
    this.el.classList.remove("is-open");
    this.destroyContent();
    window.dispatchEvent(new Event("resize"));
  }

  private bindContent() {
    const playerEl = this.main.querySelector<HTMLElement>(".player")!;
    const panelEl = this.main.querySelector<HTMLElement>(".interview-transcript")!;
    this.panel = new Panel(panelEl, (t) => this.player?.seek(t));
    this.player = new Player(
      playerEl,
      (t) => this.panel?.sync(t),
      () => this.panel?.onFirstPlay(),
    );

    const back = this.main.querySelector<HTMLAnchorElement>(".interview__back")!;
    back.addEventListener("click", (e) => {
      e.preventDefault();
      // Going back only makes sense if we pushed the interview URL; after a direct landing, go to url_back.
      if (history.state?.fromSite) history.back();
      else {
        history.pushState({}, "", back.href);
        this.onState();
      }
    });
    this.main.querySelectorAll(".js-related-toggle").forEach((b) =>
      b.addEventListener("click", () => {
        const open = this.el.classList.toggle("is-related-open");
        this.main.querySelector(".interview-head__related-btn")!.setAttribute("aria-expanded", String(open));
      }),
    );
  }

  private destroyContent() {
    this.player?.destroy();
    this.player = undefined;
    this.panel = undefined;
    this.el.classList.remove("is-related-open", "is-visible", "is-video-playing");
    this.main.innerHTML = "";
  }

  private animateIn() {
    const q = (s: string) => this.main.querySelector(s);
    const tl = gsap.timeline({
      defaults: { ease: EASE, duration: 1 },
      onComplete: () => {
        this.el.classList.add("is-visible");
        this.player?.play();
      },
    });
    tl.fromTo(q(".interview-head"), { yPercent: 50, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2 }, 0)
      .fromTo(q(".interview-video"), { scale: 0.9, yPercent: 100, opacity: 0 }, { scale: 1, yPercent: 0, opacity: 1 }, 0)
      .fromTo(q(".interview-transcript"), { scale: 0.85, yPercent: 110 }, { scale: 1, yPercent: 0, duration: 1.2 }, 0);
    return tl;
  }

  private animateOut() {
    if (!this.el.classList.contains("is-visible")) return Promise.resolve();
    const q = (s: string) => this.main.querySelector(s);
    return gsap
      .timeline({ defaults: { ease: "expo.inOut" } })
      .to(q(".interview-head"), { opacity: 0, yPercent: 50, duration: 0.8 }, 0.1)
      .to(q(".interview-video"), { yPercent: 100, scale: 0.9, opacity: 0, duration: 1 }, 0)
      .to(q(".interview-transcript"), { yPercent: 110, scale: 0.85, duration: 0.8 }, 0)
      .then(() => this.el.classList.remove("is-visible"));
  }
}
