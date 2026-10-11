import type { IconAnimations } from "../types";

export default {
  animations: {
    default: {
      icon: {
        animate: { rotate: [0, 360] },
        transition: { duration: 0.8, ease: "easeInOut" },
      },
    },
  },
} satisfies IconAnimations;
