import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import SearchDialog from "@/components/search";
import { appDescription, pageTitle, siteUrl, socialMeta } from "@/lib/shared";
import appCss from "@/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: pageTitle(),
      },
      {
        name: "description",
        content: appDescription,
      },
      // Site-wide defaults. Routes with their own head() override these by
      // emitting og/twitter tags with the same property/name (last wins).
      ...socialMeta({
        title: pageTitle(),
        description: appDescription,
        url: siteUrl,
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <RootProvider search={{ SearchDialog }}>
          <TooltipProvider delay={150}>
            <Outlet />
          </TooltipProvider>
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
