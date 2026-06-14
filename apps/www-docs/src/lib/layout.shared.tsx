import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps & { className?: string } {
  return {
    // Align the fumadocs home header with the framed content column the pages
    // render below it: constrain its inner bar to the same width as the content
    // (`max-w-6xl` = 72rem) and bump its horizontal padding from the default
    // `px-4` to `px-6` so the nav's edges line up with the content's `px-6`.
    className: "[--fd-layout-width:72rem] [&_#nd-nav_nav]:px-6",
    nav: {
      title: (
        <>
          <img
            alt={appName}
            className="block h-4 w-auto dark:hidden"
            height={24}
            src="/logo/jedd-icons-wordmark-light.svg"
            width={24}
          />
          <img
            alt={appName}
            className="hidden h-4 w-auto dark:block"
            height={24}
            src="/logo/jedd-icons-wordmark-dark.svg"
            width={24}
          />
        </>
      ),
    },
    links: [
      { text: "Icons", url: "/icons" },
      { text: "Docs", url: "/docs" },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
