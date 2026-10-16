import { timecode, type InterviewData } from "./types";

const icon = {
  play: `<svg viewBox="0 0 8 12" class="icon-play"><path d="M1 1.76L7.12 6 1 10.24V1.76z"/></svg>`,
  down: `<svg viewBox="0 0 7 11" class="icon-down"><use href="#sprite-arrow-down"/></svg>`,
  close: `<svg viewBox="0 0 10 10" class="icon-close"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1"/></svg>`,
  volume: `<svg viewBox="0 0 16 16"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path class="volume-wave" d="M11 5.5a3.5 3.5 0 010 5M12.5 3.5a6 6 0 010 9" stroke="currentColor" fill="none"/></svg>`,
  cc: `<svg viewBox="0 0 18 14"><rect x=".5" y=".5" width="17" height="13" fill="none" stroke="currentColor"/><path d="M4 9h4M10 9h4M4 6h7M13 6h1" stroke="currentColor"/></svg>`,
  settings: `<svg viewBox="0 0 16 16"><path d="M1 4h14M1 12h14" stroke="currentColor"/><circle cx="5" cy="4" r="1.6" fill="#1c1c1c" stroke="currentColor"/><circle cx="11" cy="12" r="1.6" fill="#1c1c1c" stroke="currentColor"/></svg>`,
  fullscreen: `<svg viewBox="0 0 16 16"><path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5M1 1l5 5M15 1l-5 5M15 15l-5-5M1 15l5-5" stroke="currentColor" fill="none"/></svg>`,
  download: `<svg viewBox="0 0 7 11"><use href="#sprite-arrow-down"/></svg>`,
};

/** Timecode with each colon wrapped so CSS can set it in the serif face. */
export const timeHtml = (seconds: number) => timecode(seconds).replace(/:/g, "<i>:</i>");

export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function renderInterview(d: InterviewData) {
  const session = d.sessions[0];
  const captions = session.video.captions;

  return `
  <a class="interview__back" href="${d.url_back}" data-history="back">
    <span>Close</span>${icon.close}
  </a>

  <header class="interview-head">
    <div class="interview-head__top">
      <div class="interview-head__heading">
        <div class="interview-head__narrator">${d.narrator.name}</div>
        <div class="interview-head__details">${d.date}, ${d.location}</div>
      </div>
      <div class="interview-head__interviewer">Interview by ${d.interviewers.map((i) => i.name).join(", ")}</div>
    </div>
    <div class="interview-head__bottom">
      <span></span>
      <button class="interview-head__related-btn js-related-toggle" aria-expanded="false">
        <span class="interview-head__related-amount"><strong>${d.related.length}</strong> Interviews</span>
        <span>Related</span>${icon.down}
      </button>
    </div>
  </header>

  <div class="interview-related">
    <ul class="interview-related__list">
      ${d.related
        .map(
          (r) => `<li><a href="${r.url}" data-history="replace"><img src="${r.image}" alt="" /><span>${r.title}</span></a></li>`,
        )
        .join("")}
    </ul>
  </div>
  <div class="interview-related-cover js-related-toggle"></div>

  <div class="interview-video">
    <div class="player" tabindex="-1">
      <video playsinline preload="auto" src="${session.video.src}" crossorigin="anonymous">
        ${captions.map((c) => `<track kind="captions" label="${c.label}" srclang="${c.srclang}" src="${c.src}" />`).join("")}
      </video>
      <div class="player__poster" style="background-image:url(${d.thumbnail})"></div>
      <button class="player__toggle" aria-label="Play or pause"></button>
      <div class="player__captions"></div>
      <div class="player__bar">
        <div class="player__bar-wrap">
          <button class="player__playpause"><span>Play</span><span>Pause</span></button>
          <div class="player__time">${timeHtml(d.totalDuration)}</div>
          <div class="player__timeline">
            <div class="player__hover"></div>
            <div class="player__progress"></div>
          </div>
          <div class="player__tools">
            <div class="player__tool options options--volume">
              <button class="player__volume" aria-label="Mute">${icon.volume}</button>
              <div class="options__list volume__bar"><div class="volume__track"><div class="volume__value"></div></div></div>
            </div>
            ${
              captions.length
                ? `<div class="player__tool options">
                    <button class="player__cc" aria-label="Captions">${icon.cc}</button>
                    <ul class="options__list">
                      <li><button data-cc="-1" class="is-active">Off</button></li>
                      ${captions.map((c, i) => `<li><button data-cc="${i}">${c.label}</button></li>`).join("")}
                    </ul>
                  </div>`
                : ""
            }
            <div class="player__tool options">
              <button class="player__settings" aria-label="Playback speed">${icon.settings}</button>
              <ul class="options__list">
                ${SPEEDS.slice()
                  .reverse()
                  .map((s) => `<li><button data-speed="${s}" class="${s === 1 ? "is-active" : ""}">${s === 1 ? "Normal" : s}</button></li>`)
                  .join("")}
              </ul>
            </div>
            <div class="player__tool">
              <button class="player__fullscreen" aria-label="Fullscreen">${icon.fullscreen}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="interview-transcript">
    <nav class="interview-transcript__nav">
      <button data-tab="summary">Info</button>
      <button data-tab="index">Index</button>
      <button data-tab="transcript">Transcript</button>
      <button data-tab="files">Files</button>
    </nav>
    <form class="interview-search" autocomplete="off">
      <label><span>Search</span><input type="search" name="q" /></label>
      <div class="interview-search__nav">
        <span class="interview-search__count"></span>
        <button type="button" data-search="prev" aria-label="Previous match">↑</button>
        <button type="button" data-search="next" aria-label="Next match">↓</button>
        <button type="button" data-search="close" aria-label="Clear search">✕</button>
      </div>
    </form>
    <div class="interview-transcript__content">
      <section class="interview-pane interview-text" data-pane="summary">
        <div><h3>Summary</h3>${d.summary}</div>
        <div><h3>Bio</h3>${d.bios.join("")}</div>
      </section>
      <section class="interview-pane interview-index" data-pane="index">
        ${session.index
          .map(([t, title]) => `<button class="interview-index__item" data-time="${t}"><span>${timecode(t)}</span><p>${title}</p></button>`)
          .join("")}
      </section>
      <section class="interview-pane interview-transcript__main" data-pane="transcript">
        ${session.transcript
          .map(
            ([t, html, kind]) => `
          <div class="interview-transcript__part interview-transcript__part--${kind}" data-start="${t}">
            <button class="interview-transcript__time" data-time="${t}"><span>${icon.play}${timecode(t)}</span></button>
            <div class="interview-transcript__paragraph">${html}</div>
          </div>`,
          )
          .join("")}
      </section>
      <section class="interview-pane interview-downloads" data-pane="files">
        ${d.downloads
          .map(
            (f) =>
              `<a class="interview-downloads__item" href="${f.url}" download><span>${f.name}<small>.${f.ext}</small></span><span><strong>${f.size}</strong>${icon.download}</span></a>`,
          )
          .join("")}
      </section>
    </div>
  </div>`;
}
