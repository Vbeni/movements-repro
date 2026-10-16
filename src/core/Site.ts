import { Interview } from "../interview/Interview";
import { gsap, ScrollTrigger } from "./motion";
import { url } from "./paths";
import { Page } from "./Page";

/**
 * Boots the site: reveals the first page from behind the grey cover (`body.is-not-ready`), keeps scroll-state
 * classes on <body> for the header, and swaps pages in place on internal navigation (fetch + history API).
 */
export class Site {
  private page!: Page;
  private interview!: Interview;
  /** Path of the page rendered in #content; the interview overlay can own the URL on top of it. */
  private pagePath = location.pathname;
  private lastY = 0;
  private navigating = false;

  init() {
    this.page = new Page(this.pageEl());
    this.page.mount();
    this.interview = new Interview(document.querySelector<HTMLElement>("#interview")!);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize);
    window.addEventListener("popstate", this.onPopState);
    document.addEventListener("click", this.onLinkClick);
    this.bindHashLinks();

    // Landing directly on an interview URL serves the home page; the overlay opens on top of it.
    if (Interview.matches(this.pagePath)) this.pagePath = url("/");

    document.fonts.ready.then(() => {
      document.body.classList.remove("is-not-ready");
      setTimeout(() => document.body.classList.add("is-ready"), 2000);
      this.page.animateIn();
      this.interview.onState();
    });
  }

  private onPopState = async () => {
    const claimed = await this.interview.onState();
    if (!claimed && location.pathname !== this.pagePath) this.navigate(location.href, false);
  };

  private pageEl() {
    return document.querySelector<HTMLElement>("[data-page]")!;
  }

  private onScroll = () => {
    const y = window.scrollY;
    const body = document.body.classList;
    body.toggle("is-scrolled", y > 0);
    body.toggle("is-scrolling-down", y > this.lastY && y > 0);
    body.toggle("is-scrolled-window-height", y > window.innerHeight);
    this.lastY = y;
  };

  private resizeTimer = 0;
  private onResize = () => {
    document.body.classList.add("is-resizing");
    clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.page.resize();
      ScrollTrigger.refresh();
      document.body.classList.remove("is-resizing");
    }, 250);
  };

  private onLinkClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!a || a.target || a.hasAttribute("download") || a.dataset.noPush !== undefined) return;
    const url = new URL(a.href);
    if (url.origin !== location.origin || url.hash || url.pathname === location.pathname) return;
    e.preventDefault();
    if (Interview.matches(url.pathname)) {
      if (a.dataset.history === "replace") history.replaceState(history.state, "", url.href);
      else history.pushState({ fromSite: true }, "", url.href);
      this.interview.onState();
      return;
    }
    this.navigate(url.href, true);
  };

  /** "Scroll down" style links: `data-scroll-down` scrolls to the next section. */
  private bindHashLinks() {
    document.querySelectorAll<HTMLAnchorElement>("[data-scroll-down]").forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        a.classList.add("is-animating");
        setTimeout(() => a.classList.remove("is-animating"), 800);
        const next = a.closest("section")?.nextElementSibling;
        if (next) gsap.to(window, { scrollTo: { y: next, offsetY: 0 }, duration: 1, ease: "power3.out" });
      }),
    );
  }

  private async navigate(href: string, push: boolean) {
    if (this.navigating) return;
    this.navigating = true;
    try {
      const [html] = await Promise.all([fetch(href).then((r) => r.text()), this.page.animateOut()]);
      const next = new DOMParser().parseFromString(html, "text/html");
      const content = next.querySelector("#content");
      if (!content) {
        location.href = href;
        return;
      }
      if (push) history.pushState({}, "", href);
      this.pagePath = new URL(href).pathname;
      this.page.destroy();
      document.title = next.title;
      document.body.className = next.body.className.replace("is-not-ready", "").trim();
      document.querySelector("#content")!.replaceWith(document.adoptNode(content));
      window.scrollTo(0, 0);
      this.page = new Page(this.pageEl());
      gsap.set(this.pageEl(), { opacity: 0 });
      this.page.mount();
      this.bindHashLinks();
      await this.page.animateIn();
    } finally {
      this.navigating = false;
    }
  }
}
