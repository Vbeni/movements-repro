/** Tiles marked `data-video-hover` play their muted loop while hovered. */
export function bindVideoHover(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-video-hover]").forEach((tile) => {
    const video = tile.querySelector("video");
    tile.addEventListener("mouseenter", () => {
      video?.play().catch(() => {});
      tile.classList.add("is-hovered");
    });
    tile.addEventListener("mouseleave", () => {
      video?.pause();
      if (tile.dataset.videoHover === "static" && video) {
        tile.classList.remove("is-hovered");
        video.currentTime = 0;
      }
    });
  });
}
