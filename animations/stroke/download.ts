import type { IconAnimations } from "../types";

// 0: shaft, 1: tray, 2: head.
export default {
  groups: { arrow: [0, 2] },
  animations: {
    default: {
      arrow: {
        animate: { y: [0, 3, 0] },
        transition: { duration: 0.6, ease: "easeInOut" },
      },
    },
  },
} satisfies IconAnimations;
