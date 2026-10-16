import { gsap } from "../core/motion";

const TAB_KEY = "interview-transcript-view";
const SCROLL_OFFSET = { transcript: 64, index: 10 } as const;

/**
 * Right-hand panel: dot tabs (Info / Index / Transcript / Files), transcript + index synced to playback with
 * auto-scroll, click-to-seek, and in-transcript search with match navigation.
 */
export class Panel {
  private content: HTMLElement;
  private tabs: HTMLButtonElement[];
  private parts: HTMLElement[];
  private indexItems: HTMLElement[];
  private current = { transcript: -1, index: -1 };
  private view = "summary";
  private hasScrolled = false;

  private search: HTMLFormElement;
  private matches: HTMLElement[] = [];
  private matchIndex = 0;
  private searchTimer = 0;

  constructor(
    private el: HTMLElement,
    private seek: (t: number) => void,
  ) {
    this.content = el.querySelector(".interview-transcript__content")!;
    this.tabs = [...el.querySelectorAll<HTMLButtonElement>("[data-tab]")];
    this.parts = [...el.querySelectorAll<HTMLElement>(".interview-transcript__part")];
    this.indexItems = [...el.querySelectorAll<HTMLElement>(".interview-index__item")];
    this.search = el.querySelector(".interview-search")!;

    this.tabs.forEach((tab) => tab.addEventListener("click", () => this.show(tab.dataset.tab!)));
    el.querySelectorAll<HTMLElement>("[data-time]").forEach((b) =>
      b.addEventListener("click", () => this.seek(parseFloat(b.dataset.time!))),
    );
    this.bindSearch();

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(TAB_KEY);
    } catch {
      // ignore
    }
    this.show(saved ?? "summary");
  }

  /** First playback switches to the transcript, unless the visitor is browsing the index. */
  onFirstPlay() {
    if (this.view !== "index") this.show("transcript");
  }

  show(view: string) {
    this.view = view;
    this.tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.tab === view));
    this.el.querySelectorAll<HTMLElement>("[data-pane]").forEach((p) => p.classList.toggle("is-open", p.dataset.pane === view));
    this.search.classList.toggle("is-shown", view === "transcript");
    try {
      localStorage.setItem(TAB_KEY, view);
    } catch {
      // ignore
    }
    if (view === "transcript") this.scrollTo(this.parts[this.current.transcript], SCROLL_OFFSET.transcript, 0);
    else if (view === "index") this.scrollTo(this.indexItems[this.current.index], SCROLL_OFFSET.index, 0);
    else this.content.scrollTop = 0;
  }

  sync(t: number) {
    const find = (items: HTMLElement[]) => {
      let i = -1;
      items.forEach((el, n) => {
        if (parseFloat(el.dataset.start ?? el.dataset.time ?? "0") <= t) i = n;
      });
      return i;
    };

    const part = find(this.parts);
    if (part !== this.current.transcript) {
      this.parts[this.current.transcript]?.classList.remove("is-current");
      this.parts[part]?.classList.add("is-current");
      this.current.transcript = part;
      if (this.view === "transcript") this.scrollTo(this.parts[part], SCROLL_OFFSET.transcript, this.hasScrolled ? 1 : 0);
      this.el.closest(".interview")?.classList.add("has-seeked");
      setTimeout(() => this.el.closest(".interview")?.classList.remove("has-seeked"), 1250);
    }

    const index = find(this.indexItems);
    if (index !== this.current.index) {
      this.indexItems[this.current.index]?.classList.remove("is-current");
      this.indexItems[index]?.classList.add("is-current");
      this.current.index = index;
      if (this.view === "index") this.scrollTo(this.indexItems[index], SCROLL_OFFSET.index, 1);
    }
  }

  private scrollTo(target: HTMLElement | undefined, offset: number, duration: number) {
    if (!target) return;
    this.hasScrolled = true;
    gsap.to(this.content, { scrollTo: { y: target, offsetY: offset }, duration, ease: "power2.inOut" });
  }

  // ---------- search ----------

  private bindSearch() {
    const input = this.search.querySelector("input")!;
    input.addEventListener("input", () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = window.setTimeout(() => this.runSearch(input.value.trim()), 500);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "ArrowDown") this.step(1);
      else if (e.key === "ArrowUp") this.step(-1);
      else if (e.key === "Escape") this.clearSearch();
      else return;
      e.preventDefault();
    });
    this.search.addEventListener("submit", (e) => e.preventDefault());
    this.search.querySelector('[data-search="prev"]')!.addEventListener("click", () => this.step(-1));
    this.search.querySelector('[data-search="next"]')!.addEventListener("click", () => this.step(1));
    this.search.querySelector('[data-search="close"]')!.addEventListener("click", () => this.clearSearch());
  }

  private runSearch(query: string) {
    this.unmark();
    this.search.classList.toggle("has-value", query.length > 0);
    if (query.length < 2) return this.updateCount();

    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    this.parts.forEach((part) => {
      const p = part.querySelector(".interview-transcript__paragraph")!;
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      nodes.forEach((node) => {
        const text = node.data;
        if (!re.test(text)) return;
        re.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0;
        for (const m of text.matchAll(re)) {
          frag.append(text.slice(last, m.index));
          const mark = document.createElement("mark");
          mark.textContent = m[0];
          frag.append(mark);
          last = m.index! + m[0].length;
        }
        frag.append(text.slice(last));
        node.replaceWith(frag);
      });
    });
    this.matches = [...this.el.querySelectorAll<HTMLElement>(".interview-transcript__paragraph mark")];
    this.matchIndex = 0;
    this.select();
  }

  private step(dir: number) {
    if (!this.matches.length) return;
    this.matchIndex = (this.matchIndex + dir + this.matches.length) % this.matches.length;
    this.select();
  }

  private select() {
    this.matches.forEach((m, i) => m.classList.toggle("is-selected", i === this.matchIndex));
    this.updateCount();
    const m = this.matches[this.matchIndex];
    if (!m) return;
    const box = this.content.getBoundingClientRect();
    const r = m.getBoundingClientRect();
    if (r.top < box.top || r.bottom > box.bottom) {
      this.content.scrollTop += r.top - box.top - this.search.offsetHeight - 6;
    }
  }

  private updateCount() {
    this.search.classList.toggle("has-results", this.matches.length > 0);
    this.search.querySelector(".interview-search__count")!.innerHTML = this.matches.length
      ? `<strong>${this.matchIndex + 1}</strong> / ${this.matches.length}`
      : "";
  }

  private unmark() {
    this.el.querySelectorAll(".interview-transcript__paragraph mark").forEach((m) => m.replaceWith(m.textContent ?? ""));
    this.el.querySelectorAll(".interview-transcript__paragraph").forEach((p) => p.normalize());
    this.matches = [];
  }

  private clearSearch() {
    this.search.querySelector("input")!.value = "";
    this.search.classList.remove("has-value");
    this.unmark();
    this.updateCount();
  }
}
