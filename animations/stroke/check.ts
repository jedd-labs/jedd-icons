import type { IconAnimations } from "../types";

export default {
  animations: {
    default: {
      0: {
        animate: { pathLength: [0, 1] },
        transition: { duration: 0.45, ease: "easeOut" },
      },
    },
  },
} satisfies IconAnimations;
