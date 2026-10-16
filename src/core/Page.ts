import { bindVideoHover } from "../components/VideoHover";
import { bindScrolls } from "../scroll";
import type { Component } from "./Component";
import { gsap, ScrollTrigger } from "./motion";
import { components } from "./registry";

/** One rendered page (`[data-page]`): owns its components and scroll animations. */
export class Page {
  private components: Component[] = [];

  constructor(private view: HTMLElement) {}

  mount() {
    this.view.querySelectorAll<HTMLElement>("[data-component]").forEach((el) => {
      const Ctor = components[el.dataset.component ?? ""];
      if (!Ctor) return;
      const component = new Ctor(el, el.dataset.options ? JSON.parse(el.dataset.options) : {});
      component.init();
      this.components.push(component);
    });
    bindVideoHover(this.view);
  }

  animateIn() {
    this.components.forEach((c, i) => c.animateIn(i));
    // Scroll animations bind after the page is visible so SplitText measures final line breaks.
    bindScrolls(this.view);
    document.body.classList.remove("is-outgoing");
    document.body.classList.add("is-incoming");
    setTimeout(() => document.body.classList.remove("is-incoming"), 2000);
    return gsap.to(this.view, { opacity: 1, duration: 0.3, delay: 0.1 }).then();
  }

  animateOut() {
    document.body.classList.add("is-outgoing");
    return gsap.to(this.view, { opacity: 0, duration: 0.2 }).then();
  }

  resize() {
    this.components.forEach((c) => c.resize());
  }

  destroy() {
    this.components.forEach((c) => c.destroy());
    this.components = [];
    ScrollTrigger.getAll().forEach((t) => t.kill());
  }
}
