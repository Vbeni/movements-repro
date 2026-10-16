import { EASE, gsap, ScrollTrigger } from "../core/motion";

/** Hero intro: headline words rise out of their mask, then the thumbnail, then its caption. Replays on re-entry. */
export function home(el: HTMLElement, delay: number) {
  const words = el.querySelectorAll(".js-title span");
  const video = el.querySelector(".js-audio-link video");
  const caption = el.querySelector(".js-audio-caption")?.parentElement;

  const tl = gsap
    .timeline({ delay, defaults: { ease: EASE, duration: 1 } })
    .fromTo(words, { yPercent: 110 }, { yPercent: 0, stagger: 0.1 })
    .fromTo(video, { yPercent: 110 }, { yPercent: 0 }, "-=0.9");
  if (caption) {
    tl.fromTo(caption, { opacity: 0, yPercent: 110 }, { opacity: 1, yPercent: 0, duration: 0.6 }, "-=0.65");
  }

  return ScrollTrigger.create({ trigger: el, toggleActions: "play reset play reset", animation: tl });
}
