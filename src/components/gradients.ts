export interface GradientStop {
  color: string;
  /** Colour-stop offset at one end of the breathing animation. */
  min: number;
  /** Colour-stop offset at the other end. */
  max: number;
}

// Palette and offsets taken from the reference site's visual language (blue / grey / orange / red / sand / teal).
export const GRADIENTS: GradientStop[][] = [
  [
    { color: "#1944a7", min: 0, max: 0 },
    { color: "#a6a6a6", min: 0.12, max: 0.41 },
    { color: "#ff531c", min: 0.28, max: 0.65 },
    { color: "#ffd6c4", min: 0.4, max: 0.79 },
    { color: "#ff531c", min: 0.62, max: 1 },
  ],
  [
    { color: "#df0e27", min: 0.2, max: 0.11 },
    { color: "#ffb3a9", min: 0.35, max: 0.23 },
    { color: "#a75d19", min: 0.53, max: 0.37 },
    { color: "#c5c5c5", min: 0.74, max: 0.64 },
    { color: "#1944a7", min: 0.85, max: 0.78 },
  ],
  [
    { color: "#ffd02a", min: 0.09, max: 0.16 },
    { color: "#ffd6c4", min: 0.24, max: 0.4 },
    { color: "#ff773d", min: 0.4, max: 0.52 },
    { color: "#c5c5c5", min: 0.64, max: 0.75 },
    { color: "#1944a7", min: 0.93, max: 0.92 },
  ],
  [
    { color: "#ffd6c4", min: 0.03, max: 0 },
    { color: "#df0e27", min: 0.4, max: 0.14 },
    { color: "#ffd6c4", min: 0.63, max: 0.37 },
    { color: "#049ea8", min: 0.72, max: 0.52 },
    { color: "#1944a7", min: 0.92, max: 0.92 },
  ],
  [
    { color: "#4660ad", min: 0, max: 0 },
    { color: "#1944a7", min: 0.17, max: 0.08 },
    { color: "#a75d19", min: 0.42, max: 0.19 },
    { color: "#c5c5c5", min: 0.63, max: 0.33 },
    { color: "#ff531c", min: 0.87, max: 0.87 },
  ],
];
