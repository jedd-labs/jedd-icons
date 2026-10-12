# @jedd-icons/react-animated

Jedd icons for React that animate, powered by [Motion](https://motion.dev).

> Not published yet: this package is a first version, private to the repo.

## Installation

```bash
pnpm add @jedd-icons/react-animated motion
```

> Requires React 17, 18 or 19 and Motion 13 (peer dependencies). Standalone:
> it needs no other Jedd package.

## Usage

Every icon from `@jedd-icons/react` is here under the same name, takes the
same props and renders the same at rest:

```tsx
import { AnimateIcon, ArrowRight } from "@jedd-icons/react-animated";

<ArrowRight animateOnHover />
<ArrowRight animateOnHover="pointing" />
<ArrowRight animate={isLoading} loop />

// Animate the icon from a larger element, e.g. a button's hover.
<AnimateIcon animateOnHover asChild>
  <button type="button">
    Next <ArrowRight />
  </button>
</AnimateIcon>
```

Every icon can play the presets — `draw`, `draw-loop`, `pulse`, `wiggle` —
and some have their own animations; `ArrowRight.animations` lists them.
`default` plays unless another is picked; for icons without their own it's
`draw`.

| Prop | Default | |
| --- | --- | --- |
| `animate` | `false` | Plays while true. A name picks the animation. |
| `animateOnHover` | `false` | Plays while hovered. |
| `animateOnTap` | `false` | Plays once per press, to the end. |
| `animateOnView` | `false` | Plays while in the viewport. |
| `animateOnViewOnce` | `true` | Only the first time it's in view. |
| `animateOnViewMargin` | | IntersectionObserver root margin. |
| `animation` | `"default"` | Which animation plays. |
| `loop` / `loopDelay` | `false` / `0` | Repeat while active, with a pause in ms. |
| `delay` | `0` | Milliseconds before it starts. |
| `completeOnStop` | `false` | Finish the run before returning to rest. |
| `persistOnAnimateEnd` | `false` | Stay at the end instead of returning to rest. |
| `initialOnAnimateEnd` | `false` | Snap back to rest when a run ends. |

Animations don't play for users who ask for reduced motion.

## Global defaults

`JeddProvider` sets defaults for every icon inside it: the styling props of
`@jedd-icons/react`'s provider (`size`, `color`, `strokeWidth`,
`absoluteStrokeWidth`), the animation options above, and `reducedMotion`
(`"user"` follows the OS setting, `"always"` never animates, `"never"` always
does). A prop on an icon still wins.

```tsx
import { JeddProvider } from "@jedd-icons/react-animated";

<JeddProvider strokeWidth={1.5} completeOnStop>
  <App />
</JeddProvider>
```

It only reaches animated icons; static icons from `@jedd-icons/react` use that
package's own `JeddProvider`. The `.jedd` CSS class styles both.

## License

[MIT](https://github.com/jedd-labs/jedd-icons/blob/main/LICENSE)
