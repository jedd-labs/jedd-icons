import type { IconAnimations } from "../types";

export default {
  animations: {
    default: {
      icon: {
        animate: { scale: [1, 1.2, 0.95, 1.08, 1] },
        transition: { duration: 0.8, ease: "easeInOut" },
      },
    },
  },
} satisfies IconAnimations;
