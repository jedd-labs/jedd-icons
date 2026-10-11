import type { IconAnimations } from "../types";

// 0: body, 1: shackle.
export default {
  animations: {
    default: {
      1: {
        animate: { y: -1 },
        transition: { duration: 0.25, ease: "easeOut" },
      },
    },
  },
} satisfies IconAnimations;
