import type { ScrollTrigger } from "gsap/ScrollTrigger";
import { home } from "./home";
import { homeText } from "./homeText";
import { text } from "./text";

type ScrollAnimation = (el: HTMLElement, delay: number) => ScrollTrigger | null;

export const scrolls: Record<string, ScrollAnimation> = { home, homeText, text };

/** Bind every `[data-scroll]` element in `root` to its named animation. */
export function bindScrolls(root: ParentNode): Array<ScrollTrigger | null> {
  return [...root.querySelectorAll<HTMLElement>("[data-scroll]")].map((el) => {
    const animation = scrolls[el.dataset.scroll ?? ""];
    return animation ? animation(el, parseFloat(el.dataset.delay ?? "") || 0) : null;
  });
}
