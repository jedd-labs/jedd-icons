---
"@jedd-icons/core": minor
---

`createIcons` now returns a function that stops `watch: true` from observing the page, and accepts a `data-jedd-absolute-stroke-width` attribute on each placeholder. With `watch: true` it also works when called before `<body>` exists.
