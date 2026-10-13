import type { IconAnimations } from "../types";

// 0: shaft, 1: tray, 2: head.
export default {
  default: "drop",
  groups: { arrow: [0, 2] },
  animations: {
    drop: {
      arrow: {
        animate: { y: [0, 3, 0] },
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  },
} satisfies IconAnimations;
