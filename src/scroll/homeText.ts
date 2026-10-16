import { gsap, SplitText } from "../core/motion";

/** Hero lead paragraph: lines slide up and fade in once, then the split is reverted. */
export function homeText(el: HTMLElement, delay: number) {
  const split = new SplitText(el, { type: "lines" });
  gsap.set(split.lines, { opacity: 0 });
  gsap.fromTo(
    split.lines,
    { yPercent: 100 },
    {
      yPercent: 0,
      opacity: 1,
      duration: 1,
      ease: "custom",
      stagger: 0.08,
      delay,
      onComplete: () => split.revert(),
    },
  );
  return null;
}
