import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, CustomEase);

// The original registers one house curve and names it "custom"; every tween refers to it by name.
export const EASE = CustomEase.create("custom", "0.5, 0, 0.1, 1");

export { gsap, ScrollTrigger, SplitText };
