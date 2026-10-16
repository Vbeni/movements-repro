# movements-repro

A UX fidelity test: a from-scratch rebuild of the home page and interview overlay of an oral-history archive site,
using only placeholder text and synthetic media. Built to see how closely motion, layout and interaction can be
reproduced by reading a live site's shipped code for values (timings, eases, sizes) and writing our own.

```bash
npm install
npm run media   # regenerate placeholder video/audio with ffmpeg (already committed)
npm run dev     # http://localhost:5173
npm run build
```

## What's reproduced

- **Boot:** grey cover wipes down, header wordmark/menu slide in, headline words rise in sequence.
- **Hero visualiser** (`src/components/AudioGraph.ts`): uneven bars around the headline baseline with breathing
  gradients and drifting light streaks. Idle signal until first click; then the hero video unmutes and the bars
  follow its real frequency spectrum (Web Audio `AnalyserNode`). Palette and caption change per loop segment.
- **Scroll reveals** (`src/scroll/`): SplitText line reveals with the site's custom ease `0.5, 0, 0.1, 1`.
- **Interview grid:** 3-column stagger, hover plays a muted loop, caption lifts, role swaps for description.
- **Interview overlay** (`src/interview/`): slides up over the page (expo.out), staged content entrance,
  custom player (stacked Play/Pause, big H:MM:SS timecode, 8px tick-mark timeline, volume/CC/speed popups,
  fullscreen, keyboard shortcuts), dot tabs, transcript/index sync with auto-scroll, click-to-seek, transcript
  search, related drawer, Close restores scroll position.

## Approximations

- Fonts: Geist Mono stands in for the original's commercial mono face; Libre Franklin is the same.
- Bar widths/directions and the idle signal are generated rather than taken from the original's data tables.
- Not built: menu overlay, search overlay, other pages, playlists/multi-session, mobile-specific polish.

See `docs/interview-spec.md` for the extracted interview behaviour spec.
