import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img
            alt={appName}
            className="block h-6 w-auto dark:hidden"
            height={48}
            src="/logo/jedd-icons-wordmark-light.svg"
            width={48}
          />
          <img
            alt={appName}
            className="hidden h-6 w-auto dark:block"
            height={48}
            src="/logo/jedd-icons-wordmark-dark.svg"
            width={48}
          />
        </>
      ),
    },
    links: [
      { text: "Icons", url: "/" },
      { text: "Docs", url: "/docs" },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
