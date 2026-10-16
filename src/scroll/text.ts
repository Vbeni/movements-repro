import { gsap, SplitText } from "../core/motion";

/**
 * Body copy reveal, fired once when the block enters the viewport. Each paragraph's lines rise and fade in;
 * later paragraphs start 55% into the previous one, and a sibling "more" link fades up last.
 */
export function text(el: HTMLElement, delay: number) {
  const paragraphs: HTMLElement[] = el.children.length ? [...el.querySelectorAll<HTMLElement>("p")] : [el];

  const tl = gsap.timeline({
    defaults: { ease: "custom", duration: 1.2 },
    scrollTrigger: { trigger: el },
    delay: delay || 0.2,
    onComplete: () => {
      tl.scrollTrigger?.kill();
    },
  });

  paragraphs.forEach((p, i) => {
    const split = new SplitText(p, { type: "lines" });
    tl.fromTo(
      split.lines,
      { yPercent: 100, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.7,
        stagger: 0.08,
        onComplete: () => split.revert(),
      },
      i === 0 ? undefined : "-=55%",
    );
  });

  const link = el.parentElement?.querySelector<HTMLElement>(".link, .arrow-hover");
  if (link) {
    gsap.set(link, { pointerEvents: "none", opacity: 0 });
    tl.fromTo(
      link,
      { yPercent: 50, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 1,
        onComplete: () => {
          gsap.set(link, { clearProps: "pointer-events" });
        },
      },
      ">-50%",
    );
  }

  return null;
}
