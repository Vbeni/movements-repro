import { Component } from "../core/Component";

/**
 * Arrow + label link. On hover (CSS) the label fades away and the arrow's line stretches across the space the
 * label occupied. This component measures that space and hands it to CSS as custom properties.
 */
export class Arrow extends Component {
  init() {
    this.measure();
  }

  resize() {
    this.measure();
  }

  private measure() {
    const label = this.view.parentElement?.querySelector<HTMLElement>(".js-arrow-label");
    const line = this.view.querySelector<HTMLElement>("i");
    if (!label || !line) return;

    this.view.classList.add("is-vert");
    label.classList.add("is-vert");

    const lineWidth = line.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(this.view.parentElement!).gap) || 0;
    const span = lineWidth + label.getBoundingClientRect().width + gap;

    this.view.style.setProperty("--arrow-line-scale", String(span / lineWidth));
    this.view.style.setProperty("--arrow-svg-transform", `${span - lineWidth}px`);
  }
}
