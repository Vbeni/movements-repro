# Interview page: behavioural and visual spec

This spec covers the interview overlay at movements.incite.columbia.edu/interviews/rahsaan-thomas. It describes behaviour only, for building our own version from scratch.

Units: `rem` scales with the viewport (html font-size is 1.25vw at >=1024px, capped at 18.75px from 1500px). Reference: at 1280px wide, 1rem = 16px.
Eases:
- `EASE` = CustomEase "0.5,0,0.1,1" (used by JS tweens).
- `--easing` = cubic-bezier(.5,0,.2,1) (used by CSS transitions).
- `expo.out`, `expo.inOut` and `power2.inOut` are the GSAP built-ins.

Breakpoints: phone <=659, tablet 660-1023, desktop >=1024.
Fonts: UI default is "GeneralGrotesqueMono" (weights 200-900, with 250 also used). "Libre Franklin" is used for body copy (summary, transcript, index titles), for the `:` glyphs inside timecodes, and for the audio label.

---

## 1. Open / close

### Architecture: overlay, not a route render
- There is one persistent `<aside id="interview" class="interview">`, a sibling after `#content` and the footer on every page. It contains:
  - `.interview__main` (empty, filled from a client-side template)
  - `.interview__playlist`
  - `.interview__loader`
  - a confirmation modal
- Global PushStates turns every internal `<a>` into a click handler: `preventDefault`, then `history.pushState` (or `replaceState` if `data-history="replace"`), then `onState`. Hovering a link prefetches its HTML.
- `Site.onState` asks `currentPage.onState()` and `interview.onState(isRendered)`. If the interview claims the URL, no page load or curtain runs; the overlay opens over the current page.
- The interview claims a URL if it matches `/^\/((interviews|stories|timeline)\/[a-z0-9-]*)|(map\/m-\d*)/`. It is a playlist if it matches `/^\/(interviews|stories)\/(c|s)-/`; otherwise it is an interview.
- Direct landing on `/interviews/rahsaan-thomas`: the server renders the Interviews list into `#content`, and `interview.check()` on boot opens the overlay over it.

### Data load
- Request: `POST` to the current URL with headers `Interview-Api: true` and `Content-Type: application/x-www-form-urlencoded`, and an empty body. The response is JSON (shape in section 6).
- While the request runs, the aside has class `.is-fetching`. The request goes through an AbortController, which is aborted on close.
- On success:
  1. `document.title = data.title`.
  2. Render the interview template into `.interview__main`.
  3. Toggle `.has-no-media` (no session has video or audio) and `.is-clip-view` (any type other than interview).
  4. Bind sub-components, then run animateIn.
- On error: hide the overlay and run a "shake" animation on the `.js-tile` that links to this path, after 500ms.

### show() (overlay slides up)
1. Add `.interview.is-open` (the aside is `visibility:hidden` until then).
2. Store `scrollTop = scrollY`.
3. Tween the aside `yPercent 100 → 0`, 1s, `expo.out`. The aside is initialised with `yPercent:100` and duration 0.
4. On complete:
   - set `meta[name=theme-color]` to `#1C1C1C`;
   - add `body.is-interview-open`;
   - call `window.scrollTo(0,0)`.

   The underlying page stays visible under the sliding panel until that point.
5. `body.is-interview-open`:
   - sets body bg to `#1c1c1c`;
   - sets `#menu, #footer, #newsletter, #content` to `display:none !important`. This is the "scroll lock": the page behind is removed, not overflow-locked.

Desktop: the aside is `position:fixed; inset:0; z-index:9; bg #1c1c1c`.
Tablet and phone (<=1023): with `.is-interview-open` the aside becomes `position:relative; transform:none`, so the window scrolls the interview and the video is sticky.

### animateIn (content, after data arrives)
GSAP timeline. All tweens start at t=0 unless noted. Default ease is `EASE`, default duration 1s.

| element | from | to | dur |
|---|---|---|---|
| `.interview-head` | yPercent 50, opacity 0 | yPercent 0, opacity 1 | 1.2 |
| `.interview-related` | yPercent 100, opacity 0 | yPercent 0, opacity 1 | 1.2 |
| `.interview-info` (clip view only) | yPercent 50, opacity 0 | yPercent 0, opacity 1 | 1.2 |
| `.interview-video` | scale .9, yPercent 100, opacity 0 | scale 1, yPercent 0, opacity 1 | 1.0 |
| `.interview-transcript` (right panel) | scale .85, yPercent 110 | scale 1, yPercent 0 | 1.2 |

On complete:
- add `.is-visible`;
- call `video.play()` (autoplay);
- after 4000ms, run `transcript.seek(video.currentTime)`;
- call `navigator.vibrate([1,400,1])` (this runs when the timeline starts).

### animateOut (switching interviews, closing)
Runs only if the aside has `.is-visible`. Ease `expo.inOut`.

| element | to | dur | at |
|---|---|---|---|
| head, related, info | opacity 0, yPercent 50 (related: 100) | 0.8 | 0.1 |
| video | yPercent 100, scale .9, opacity 0 | 1.0 | 0 |
| right panel | yPercent 110, scale .85 | 0.8 | 0 |

When it finishes, remove `.is-visible`.

Switching to another interview (for example a Related click, which uses `data-history="replace"`): the overlay stays open. `animateOut` and the fetch run in parallel (`Promise.all`), then the overlay destroys the old content, builds the new content, and runs `animateIn`.

### Close
- Control: `a.interview__back[data-history=back][href=url_back]` (see the layout section). The click calls `history.back()`. Because of how the history-length check is written, this effectively always happens.
- On `popstate`: the URL no longer matches the interview pattern, so `onState(isRendered)` runs:
  - If the underlying page is still rendered: run `animateOut()` and `hide(false, true)`.
  - Otherwise: run `hide(true, false)`. The site then loads the page normally with its curtain.
- `hide()`:
  1. Set theme-color to `#FFFFFF` and remove `body.is-interview-open` (the page behind reappears immediately).
  2. Pause the video and abort the fetch.
  3. Restore the window scroll to the saved `scrollTop`. If there is none, scroll to the `a[href*=currentPath]` tile with offset 10.
  4. Tween the aside to `yPercent 100`: 0.8s `expo.inOut`. In the non-rendered case it is instant, after a 0.9s delay.
  5. On complete: remove `.is-open` and dispatch `resize`. In the non-rendered case, also destroy the content.
- There is no Escape-to-close for the overlay.

---

## 2. Layout

### Desktop grid (`.interview__main`, height 100vh)
```
grid-template: "head    transcript" auto
               "related transcript" 0
               "video   transcript" 1fr
               / 840fr 440fr;            /* 65.625% | 34.375% */
```
- Left column (dark `#1c1c1c`):
  - head, 7.625rem total;
  - video, `height: calc(100vh - 7.5625rem)`;
  - related, an absolutely positioned drawer over the top of the video.
- Right column: a light panel, full height.
- CSS vars on `.interview`:
  - `--interview-padding-inline: 2.5vw`
  - `--interview-padding-block: 2.109vw` (1.5625vw when aspect-ratio >= 1280/650)
  - `--related-height: 10.5rem` (phone: 7.25rem)
- Dark theme tokens: text `#c5c5c5`, bg `#1c1c1c`, line `#424242`.
- Greys used: `#e8e8e8`, `#f7f7f7`, `#a6a6a6`, `#7d7d7d`, `#2d2b2b`, `#efefef`.

### Header (`.interview-head`)
Colour `#c5c5c5`, font-size .875rem, line-height 1.

**Top row** (`.interview-head__top`):
- Height 4.75rem, `padding: 1.25rem 1.0625rem 1.25rem 1.25rem`, flex with space-between.
- Left block (`.interview-head__heading`): `border-left: 1px solid currentColor; padding-left: .5rem`.
  - Narrator name: 1rem, `#e8e8e8`, weight 400, `top: -.1875rem`. It is preceded by a 0.625rem gradient dot: a circle rotated 25deg, gradient `linear-gradient(360deg, #1944a7 0%, #a6a6a6 12%, #ff531c 28%, #ffd6c4 40%, #ff531c 62%)`. Gap .375rem.
  - Details (`.interview-head__details`): margin-top .25rem, text `"{date}, {location}"`, for example "June 9, 2024".
- Right: `"Interview by" + names` (`.interview-head__interviewer`). Linked names are `#f7f7f7`. Hidden on phone and in clip view.

**Bottom row** (`.interview-head__bottom`):
- Height 2.875rem, `border-top: 1px solid rgba(125,125,125,.2)`, flex with space-between and centred items.
- Tags: an empty `ul` on the left in the current template.
- Right: the Related button (`.interview-head__related-btn`):
  - "Related" + a down-arrow icon; .875rem, weight 500, letter-spacing -.03em, `#e8e8e8`, gap .5rem.
  - Expanded: the arrow rotates 180deg, and `"<strong>10</strong> Interviews"` (`.interview-head__related-amount`; mono, weight 250, strong 600) fades and slides in from `translateY(-100%)` (opacity .3s, transform .5s `--easing`). The tags slide out to `translateY(100%)`.

### Close button (`.interview__back`)
- Position: absolute top-right of the aside, `margin: 1.125rem 1.25rem`, z-index 1. It sits over the white right-panel nav.
- Colour `#2d2b2b`, .875rem, weight 500.
- Shape: `border-right: 1px solid`, height 2.25rem, padding-right .375rem. A column flex holding "Close" (top) and an x icon (bottom). The x has opacity 0, fading to 1 on hover in .3s.
- Phone: colour `#c5c5c5`, and the x is hidden.
- JS toggles `.is-overlapping` on it when it hit-tests against the transcript nav (on scroll and transitionend).

### Right panel (`.interview-transcript`, `#f7f7f7`)
- `.interview-transcript__wrap`: a column flex.
- **Nav bar**: bg `#fff`, height 7.625rem (aligned with the head), `padding-inline: 1.25rem`, `align-items: flex-end`, `justify-content: space-between`. It holds 4 tabs spread across the width.
- **Content** (`.interview-transcript__content`): `flex: 1; overflow: hidden scroll; padding-inline: 1.25rem`. Background:
  - desktop: `#fff` plus `linear-gradient(180deg, #efefef 40px, #fff 30%)` with background-size `2px 155.2vw`, repeated on x;
  - otherwise: `#efefef`.

### Tablet / phone
- Single column, with `.interview` relative in document flow. Order: head → video → transcript.
- Video: `position: sticky; top: 0; height: 65.33vw; bg #1c1c1c`. A 660-1023 rule says 31.9vw, but the later <=1023 rule overrides it.
- Phone only:
  - `.interview__main` is `sticky; top: -4.25rem`;
  - the transcript nav is `sticky; top: 65.33vw; padding-bottom: .3125rem`;
  - search is `sticky; top: 77.6vw`;
  - the panel scroll is the window, not the content div.
- Head on phone: name .875rem, details .75rem, bottom row 2.375rem.
- Related drawer on phone: 7.25rem high, 7.125×4.6875rem thumbnails, .625rem names.
- `--interview-padding-inline: 4.8vw` at <=1023.

---

## 3. Player (`.player.js-video` inside `.interview-video__wrap`)

### Structure
1. One `<video playsinline preload=auto autoplay>` per session (only the first has `.is-current`). Sources:
   - `src` (720p);
   - `srcMobile` (360p);
   - `<track>` from `captions[]`.
   Native controls are removed. `object-fit: cover`, 100% × 100%.
2. `.player__poster > .js-player-poster`: background-image = thumbnail, `cover`. It fades to opacity 0 (and scale 1.02 on desktop) over .4s once `.is-played` / `.is-started`, and comes back on `.is-ended`.
3. `.player__loader`: 6 `<q>` elements.
4. `.player__toggle`: a transparent button covering the video above the bar (`inset: 0 0 calc(2.5rem + bar-h) 0`). Click toggles play/pause; double-click toggles fullscreen.
5. `.player__bar` (the controls, below).
6. `.player__captions`: a custom caption overlay.

### Bar
- `.player__bar`:
  - absolute at the bottom, height 4.6875rem, z-index 3;
  - `::after` gradient from transparent to `rgba(0,0,0,.3)`, starting -.625rem above.
- `.player::after` (full-video vignette): transparent → `rgba(0,0,0,.6)` at opacity .667, rising to 1 while the bar is hovered.
- `.player__bar-wrap`: flex row, `nowrap`, centred items.
  - Height `--video-bar-height` = 2.1875rem (phone 1.5625rem).
  - margin-bottom 1.25rem, padding-left 1.25rem, colour `#e8e8e8`.
  - Phone: margin-bottom .625rem, padding-left 1rem.
- The CSS intends an idle auto-hide while playing (translateY 1.3125rem after a .3s delay, with the timeline fading after .8s). As compiled it is overridden (`.player {transform: translateY(0)}` wins), so **the bar is always visible**. Optional for us.

Bar items, left to right:

1. **Play/Pause** (`.player__playpause`)
   - A column flex, `height: 100%`, `border-left: 1px solid currentColor`, `padding: 0 .125rem 0 .3125rem`, font .875rem, weight 500.
   - Two stacked labels, "Play" (top) and "Pause" (bottom). Only the relevant one is shown; the other sits at `translateX(-100%)` with opacity 0 (transition .3s `--easing`).
   - Not started, or paused: "Play". `.is-playing`: "Pause".
   - Phone: the text is hidden and icon-play / icon-pause are shown instead.
2. **Big timecode** (`.player__time`)
   - font-size 3rem (48px at 1280), line-height .8333, weight 400, letter-spacing .01em.
   - min-width 10.625rem, padding-right .5rem, margin-top -.5rem, translate 0 .125rem.
   - Format: always `H:MM:SS` (`timeFormatLong`), for example `0:12:07`. Each `:` is wrapped in `<i>`, rendered in Libre Franklin.
   - Before metadata loads it shows the total duration (`1:09:28`). After that it shows the current time, updated on `timeupdate`.
   - Phone: 2.125rem, hidden while playing.
3. **Timeline** (`.player__timeline`)
   - `flex: 1; height: 100%; border-left: 1px solid rgba(166,166,166,.8); cursor: pointer`.
   - One `.player__session` per session, width = `session.duration / total * 100%`.
     - With more than one session: `padding-left: 1.5625rem`, with a CSS counter label (.75rem, `rgba(255,255,255,.8)`) at the top left, and sessions after the first separated by `border-left: 1px solid rgba(247,247,247,.7)`.
     - With a single session: no padding and no label.
   - **Tick-mark rendering.** Each layer is full height and filled with `linear-gradient(270deg, transparent 0 87.5%, #f7f7f7 87.5% 100%)` at `background-size: 8px 1px`, repeated. The result is a 1px vertical tick every 8px. The layers differ only in width and opacity:

     | layer | width | opacity |
     |---|---|---|
     | base (`::before`) | 100% | .1 |
     | `.player__hover` | follows the mouse | 0, rising to .1 on timeline hover (.2s) |
     | `.player__progress` | `current/duration` | .4 (gsap .3s linear) |
     | `.player__loaded` | buffered | (unused) |

   - Interaction:
     - Mousemove sets the hover width. Earlier sessions are filled to 100% and later ones to 0%.
     - Click seeks to `offsetX / totalWidth`.
     - Mousedown → mouseup seeks at release. There is no live drag preview, beyond the hover fill tracking the cursor.
     - Touch: touchstart, touchmove, touchend.
   - Phone: the timeline is hidden (opacity 0, no pointer events) until playing and loaded.
4. **Tools** (`.player__tools`)
   - Padding-right .75rem.
   - Each button: width 2.25rem, `padding: 0 .375rem`, `margin: 0 .1875rem`, colour `#e8e8e8`. The hovered button is `#f7f7f7`; while one is hovered, its siblings dim to `#7d7d7d` (`:has()`).
   - Order: volume, CC (only if captions exist), settings (hidden on `hover:none` devices), fullscreen.

### Popups (shared `.options`)
- `.options__list` sits above its button (`bottom: 100%`).
- Hidden state: `opacity: 0; transform: translateY(12px) scaleY(.9)`, origin bottom. Shown state: `translateY(0) scaleY(1)`, .3s `--easing`.
- Opens on hover or focus, and is forced open for 900ms via `.is-updating` after a keyboard change.
- Background: `linear-gradient(180deg, #2d2b2b 40%, transparent)`, padding `.375rem 1.125rem 1.25rem 0`.
- Items: .8125rem, line-height 2.3077, min-width 4.375rem, padding `0 .75rem`.
  - Inactive: `#a6a6a6`, `#f7f7f7` on hover.
  - Active: `#f7f7f7` at weight 800 (the bold span swaps with a `::before` copy to avoid width shift), no pointer events.

**Settings (speed):**
- Options: `0.25, 0.5, 0.75, 1 ("Normal"), 1.25, 1.5, 1.75, 2`.
- Clamped to [.25, 2], step .25. Persisted in localStorage.

**Captions (CC):**
- List: "Off" plus one entry per track label.
- Selecting a track sets `track.mode = "hidden"` and listens to `cuechange`. On enter, the cue text goes into `.player__captions` as `<span>`; on exit the overlay is hidden.
- The player gets `.has-captions-on` (otherwise the overlay has opacity 0).
- Overlay: `bottom: 3.3125rem; margin-bottom: 3%; padding: 0 10%`, centred.
  - span: 1rem / 1.5, bg `rgba(28,28,28,.7)`, padding `.15em .4em`, `text-wrap: balance`.
  - Phone: .875rem at `bottom: 2.8125rem`.
  - Fullscreen on desktop: 1.25vw.
- In fullscreen the native track is shown instead. The on/off state and track index are persisted.

**Volume:**
- Vertical popup `.volume__bar`: 7.5rem × 40px, `cursor: row-resize`, margin-bottom 1rem, with a gradient backdrop.
  - Hidden: `translateY(.75rem) scaleY(0)`, opacity 0.
  - Shown on hover: .3s `--easing`, with a .3s delay when hiding.
- Track: 1px `rgba(166,166,166,.4)`. Value: 1px `currentColor` (`#f7f7f7`), height = volume% (tweened .2s), with a .5rem round knob on top.
- Click or drag sets `1 - y/height`. The button toggles mute (`.is-muted` hides the speaker-wave path).
- Hidden on iOS. Persisted.

**Fullscreen:** `requestFullscreen` on the `.player` element (`webkitEnterFullscreen` on the video for iOS). Adds `.is-fullscreen` (bg #000).

### Keyboard (document-level; ignored when an input has focus or with ctrl/meta)
| key | action |
|---|---|
| Space, k | toggle play |
| ← / → | seek -5s / +5s |
| j / l | seek -10s / +10s |
| ↑ / ↓ | volume ±0.05 (↑ unmutes) |
| m | mute |
| `<` / `>` | speed −/+ .25 |
| 0, Home | restart and play |
| End | jump to end, pause |
| f | fullscreen |
| c | captions toggle |
| Shift+P / Shift+N | previous / next item (playlists only) |

### State classes on `.player`
| class | meaning |
|---|---|
| `is-initialized` | player set up |
| `has-controls` | controls UI present |
| `has-poster` | poster image set |
| `has-cc` | captions available |
| `has-captions-on` | captions showing |
| `is-loaded` | media data loaded |
| `is-canplay` | `canplay` fired |
| `is-played` | play has been called |
| `is-playing` | currently playing |
| `is-loading` | waiting / buffering |
| `is-started` | t > 0.001 |
| `is-ended` | playback ended |
| `is-muted` | muted |
| `is-fullscreen` | in fullscreen |
| `is-multi` | more than one session |
| `is-audio` | audio-only player |
| `is-error` | media error |

`.interview` also gets `is-video-playing` while playing.

Other behaviour:
- **Multi-session:** the videos play back to back. Time is global, i.e. session start + local time.
- **Resume:** the current position is cached per pathname in localStorage. It resets to 0 near the end.
- **URL params:** `?time=` and `?session=` seek on load.
- **Audio-only sessions:** a grey `#a6a6a6` 5rem square icon with the label "Audio only player".

---

## 4. Right panel tabs

### Tab bar
- Tabs, in order:
  1. `Info` (`#summary`)
  2. `Index` (`#index`, if `index`)
  3. `Transcript` (`#transcript`)
  4. `Files` (`#files`, if `downloads`)
- Each tab: .875rem / 1.2857, `padding-block: .875rem`, flex with gap .375rem.
- Each tab is preceded by a **dot**: `::before`, .4375rem circle, `1px solid currentColor`, margin-top 3px.
  - Inactive tab: **hollow** dot. Active tab (no pointer events): **filled** dot.
  - Hover fills the dot: background-color .3s `--easing`.
- Switching is not animated. The other panes get `display: none`, and the active pane gets `.is-open`.
- On switch, the content scroll jumps instantly (duration 0):
  - Transcript: to the current paragraph.
  - Index: to the current item.
  - Other tabs: to the top of the pane.
- The chosen tab persists in `localStorage["interview-transcript-view"]`; the default is `summary`.
- The first time the video plays, the panel switches to Transcript, unless the user is on Index.

### Info (`#summary`, class `.interview-text`)
- Font: Libre Franklin. The pane is a column flex with gap 1.1875rem and padding-bottom 1.4375rem.
- Blocks: `<div><h3>Summary</h3>{summary html}</div>`, then `<div><h3>Bio</h3>{bios}</div>`.
- Desktop: each block has `padding-left: 5.3125rem`, with the h3 absolutely positioned at the left in a gutter (mono, .75rem / 1.25, margin-top .1875rem). The second block has `border-top: 1px solid #e8e8e8; padding-top: 1.25rem`. The pane has padding-top 1rem.
- Paragraph text: .8125rem / 1.6923, weight 300, letter-spacing -.02em. Links are underlined.

### Index (`#index`), chapters
- Padding-top 1.125rem.
- Each item: `[seconds, title]` rendered as `<button data-time>` containing:
  - the time (mono .6875rem, `H:MM:SS`);
  - the title (Libre Franklin .8125rem / 1.385, weight 300).
- Layout: `padding-left: 5.375rem`, margin-bottom .9375rem.
- A 1.75rem grey `#c5c5c5` rule sits left of the title (`right: 100%`, margin-right .4375rem, top .8125rem). A dark `#2d2b2b` overlay rule scales `0 → 1` from the left on hover, and for `.is-current` (.3s `--easing`).
- Click: seek to that time and play.

### Transcript (`#transcript`)
- `.interview-transcript__main` has padding-top 4rem on desktop (room for the search bar) and 1.25rem on phone.
- Each paragraph is `[startSeconds, html, "question"|"answer"]`, where the html begins with `<strong>Speaker:</strong>`:
  ```html
  <div class="interview-transcript__part interview-transcript__part--{type} js-transcript-part">
    <button class="interview-transcript__time" data-time="{start}"><span><svg play/>0:01:02</span></button>
    <div class="interview-transcript__paragraph">{html}</div>
  </div>
  ```
- Part: `padding-left: 5.25rem; padding-bottom: 1.25rem`.
- Time button:
  - absolute at the left, `top: -.1875rem`, mono .6875rem / 2.18;
  - the play triangle is .5625rem, stroke only, filled for `.is-current` and on hover;
  - on hover the label shifts `translate .375rem` and a 1px × 2.5rem `#2d2b2b` vertical line scales in at the left (desktop).
- Paragraph text: Libre Franklin 300, .8125rem / 1.6923, letter-spacing -.02em, `#2d2b2b`, `max-width: 80ch`, padding-right 5%. `strong` is weight 500. Phone: .75rem / 1.5.
- Multi-session: a "Session N" label (with its duration in a 1.25rem `strong`) above each session's paragraphs. Times are offset by the previous sessions' durations.

**Sync** (on every player `timeupdate`, after first play or once t > 0):
1. Find the current paragraph: the last one with `time <= t` (the same for index items). Toggle `.is-current` on it.
2. Only when the current paragraph changes (and the Transcript tab is shown), auto-scroll the content div (desktop) or the window (mobile):
   - so the paragraph sits **64px** below the top (10px for index);
   - GSAP scrollTo, `power2.inOut`, 1s (0s for the first scroll).
3. There is no user-scroll override; the next paragraph change scrolls again.
4. `.has-seeked` is added to `.interview` for 1250ms after each sync.
5. The only visible "active" marker is the filled play triangle. The `::before` white rounded highlight (`inset: -.625rem -.875rem`, radius .625rem) exists at opacity 0 and is never turned on.

Clicking a time button seeks the player to `data-time` and starts playing.

### Search inside transcript
- **Visibility:** shown only on the Transcript tab (`.is-shown`).
- **Bar** (`.interview-search`): absolute at `top: 7.625rem` (right under the nav), full width, `padding-inline: 1.25rem`, bg `#efefef`, `border-top: 1px solid #fff`.
  - The input is 2.5rem high, .75rem, with `border-bottom: 1px solid #e8e8e8` (`#424242` when there are results).
  - A floating label "Search" slides `translateX(.375rem)` and fades out on focus or value (.4s).
  - Submit: a magnifier icon at the right, colour `#7d7d7d`.
- **Behaviour:**
  1. Input is debounced 500ms, with a minimum of 2 characters.
  2. Matches are wrapped in `<mark>` inside the paragraphs (case-insensitive, whole HTML; we should regex-escape).
  3. The nav replaces the submit button: `"<strong>i</strong> / N"`, then ↑ prev, ↓ next and ✕ close, with gap 1.125rem.
  4. Keys: Enter or ↓ for next, ↑ for prev, Esc to close and clear. Navigation wraps around.
  5. The current match gets `.is-selected` and is scrolled into view instantly if offscreen (offset = form height + 6px).
- **Mark styles:**
  - mark: bg `#efefef`, weight 500, padding 2px 4px;
  - selected mark: bg `#424242`, colour `#fff`.
- **URL:** `?search=word&time=s` pre-fills the search and selects the match in the paragraph at that time.

### Files (`#files`)
- Rows (`a.interview-downloads__item`): flex, space-between, `padding-block: 1.125rem`, .875rem. Rows after the first have `border-top: 1px solid #e8e8e8`.
- Left: `"Transcript" + ".PDF"`. Right: `"0.2MB"` (weight 500) plus a download icon.

---

## 5. Related drawer, Bottombar, Nav

### Related (`#interview-related`, `[data-expand]`)
- **Toggle:** the head's Related button (`aria-controls`). A `.interview-related-cover` with the same `aria-controls` closes it on click. The generic Expand widget toggles `aria-expanded` and `.is-expanded` on the target and on the button's parent.
- **Drawer:**
  - absolute in grid area `related` (just under the head), left column width, bg `#1c1c1c`, z-index 6;
  - height 0, transitioning to `var(--related-height)` = 10.5rem (`height .5s --easing`; visibility delayed .5s on close);
  - the list animates from `translateY(-100%)` with opacity 0 (.5s);
  - the video wrap simultaneously moves down by `translateY(--related-height)` (.5s `--easing`, desktop);
  - the cover (top 7.625rem, desktop width 65.625%, `#1c1c1c` at opacity .7, `cursor: n-resize`) fades in over .5s.
- **List:** a horizontal scroller with `gap: 1.25rem; padding-inline: 1.25rem`.
  - Each item: an 11.875 × 7.875rem image (cover; scales to 1.05 on hover, .3s), then a name with a .375rem dot, .875rem, weight 250, `#e8e8e8`, margin .3125rem.
  - Hovering the list dims the other items to opacity .5.
- **Arrows:** edge buttons 6.25rem wide with a gradient to `#1c1c1c`, opacity .9 (1 on hover), scrolling ±200px over .6s `EASE`. They hide via `.is-start` / `.is-end`.
- **Links:** `data-history="replace"`, so clicking loads that interview in place (section 1, Switching).

### Bottombar and Interview.Nav
`Interview.Bottombar` and `Interview.Nav` exist in JS but **the current template renders neither** (no `.js-bottombar` or `.js-interview-nav`). Skip them unless wanted:
- **Bottombar:** tab buttons open panels.
  - `.has-bottombar-open` is set, and `--interview-bottom-shift` = -panelHeight.
  - Panel items animate in: opacity 0, y 20 → 1, 0; .4s, stagger .03, delay .4.
  - Out: y -20, .3s.
  - Esc or an overlay click closes the panel.
- **Nav:** a view switcher (`full` / `video` / `text` / `info`, stored in `interview-nav-view`) with a sliding underline indicator via `--nav-current-left` / `--nav-current-width`.

---

## 6. Fake-data shape (mirrors the real `Interview-Api` JSON, trimmed)

```json
{
  "title": "Interview with Rahsaan Thomas",
  "id": "64",
  "url": "/interviews/rahsaan-thomas",
  "url_back": "/interviews",
  "date": "June 9, 2024",
  "location": "Oakland, CA",
  "thumbnail": "/media/rahsaan.jpg",
  "totalDuration": 4168,
  "narrator": { "name": ["Rahsaan Thomas"], "url": "/interviews" },
  "interviewers": [{ "name": "Adamu Chan", "url": null }, { "name": "Second Person", "url": null }],
  "summary": "<p>Rahsaan “New York” Thomas discusses…</p>",
  "bios": ["<p>Rahsaan \"New York\" Thomas is an activist…</p>"],
  "index": true,
  "tags": [{ "label": "Addiction and Recovery", "url": "/interviews?topics=addiction-and-recovery" }],
  "sessions": [
    {
      "media": "video",
      "video": {
        "src": "/media/rahsaan-720.mp4",
        "srcMobile": "/media/rahsaan-360.mp4",
        "duration": 4168,
        "captions": [{ "label": "English", "kind": "captions", "srclang": "en", "src": "/media/rahsaan.vtt" }]
      },
      "index": [
        [0, "Growing up in Brownsville, Brooklyn during a changing neighborhood climate"],
        [110, "Experiences with identity and safety amid community changes during childhood"]
      ],
      "transcript": [
        [0, "<strong>Adamu Chan:</strong> Let’s talk a little bit about where you grew up.", "question"],
        [8, "<strong>Rahsaan Thomas:</strong> I grew up in a place called Brownsville…", "answer"]
      ]
    }
  ],
  "related": [
    { "type": "interview", "title": "James Soto", "url": "/interviews/james-soto", "image": "/media/soto.jpg" }
  ],
  "downloads": [{ "name": "Transcript", "ext": "PDF", "size": "0.2MB", "url": "/media/rahsaan.pdf" }]
}
```

Notes:
- Times are integer seconds from the start of their session. The renderer adds the durations of earlier sessions.
- The real API sends `duration` as a string ("4168").
- Real JSON has 226 transcript paragraphs and 28 index entries for this interview (about 70 minutes).
- Captions are standard WebVTT with numbered cues and multi-line text:
  ```
  WEBVTT

  1
  00:00:01.080 --> 00:00:05.250
  Q: Let's talk a little bit
  about where you grew up.
  ```
- Fake endpoint: either `GET /api/interviews/:slug.json`, or mimic the real `POST <same url>` with `Interview-Api: true`.
