import { Component } from "../core/Component";
import { url } from "../core/paths";
import { TEASERS } from "../data/interviews";

/** Renders the interview teaser grid from data. */
export class Tiles extends Component {
  init() {
    this.view.innerHTML = TEASERS.map(
      (t) => `
      <li class="tile-interview col-span-4" data-video-hover>
        <a class="tile-interview__link" href="${url(`/interviews/${t.slug}`)}">
          <div class="tile-interview__image">
            <img src="${url(`/media/tiles/clip-${t.clip}.jpg`)}" alt="" loading="lazy" />
            <video src="${url(`/media/tiles/clip-${t.clip}.mp4`)}" muted playsinline loop preload="none"></video>
          </div>
          <div class="tile-interview__content">
            <div class="tile-interview__name">${t.name}</div>
            <div class="tile-interview__location">(${t.location})</div>
            <div class="tile-interview__wrap">
              <div class="tile-interview__role">${t.role}</div>
              <div class="tile-interview__description"><p>${t.description}</p></div>
            </div>
          </div>
        </a>
      </li>`,
    ).join("");
  }
}
