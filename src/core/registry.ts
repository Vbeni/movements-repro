import { Arrow } from "../components/Arrow";
import { AudioGraph } from "../components/AudioGraph";
import { Tiles } from "../components/Tiles";
import type { ComponentClass } from "./Component";

export const components: Record<string, ComponentClass> = {
  Tiles,
  Arrow,
  AudioGraph: AudioGraph as unknown as ComponentClass,
};
