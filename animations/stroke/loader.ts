import type { IconAnimations } from "../types";

// Eight spokes; clockwise from the top they're elements 5, 4, 3, 2, 1, 6, 7, 0.
const CLOCKWISE = [5, 4, 3, 2, 1, 6, 7, 0];

export default {
  default: "spin",
  animations: {
    spin: {
      icon: {
        animate: { rotate: [0, 360] },
        transition: { duration: 1, ease: "linear" },
      },
    },
    fade: Object.fromEntries(
      CLOCKWISE.map((part, i) => [
        part,
        {
          animate: { opacity: [1, 0.25, 1] },
          transition: { duration: 0.8, delay: i * 0.1, ease: "easeInOut" },
        },
      ])
    ),
  },
} satisfies IconAnimations;
