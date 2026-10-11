import type { IconAnimations } from "../types";

// 0: hub, 1: gear.
export default {
  animations: {
    default: {
      1: {
        animate: { rotate: [0, 360] },
        transition: { duration: 1.2, ease: "easeInOut" },
      },
      0: {
        animate: { scale: [1, 0.75, 1] },
        transition: { duration: 1.2, ease: "easeInOut" },
      },
    },
  },
} satisfies IconAnimations;
