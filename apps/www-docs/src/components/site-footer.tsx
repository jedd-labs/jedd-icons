import { ArrowUpRight } from "@jedd-icons/react";
import { Link } from "@tanstack/react-router";
import { GridDots, gridColumns } from "@/components/grid-dots";
import { appName, repoUrl } from "@/lib/shared";

const frameColumns = gridColumns(1);

interface FooterLink {
  external?: boolean;
  label: string;
  /** Internal route or external URL. External links open in a new tab. */
  to: string;
}

interface FooterColumn {
  heading: string;
  links: FooterLink[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Product",
    links: [
      { label: "Icons", to: "/icons" },
      { label: "Get started", to: "/docs" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Documentation", to: "/docs" },
      { label: "GitHub", to: repoUrl, external: true },
    ],
  },
];

function FooterNavLink({ link }: { link: FooterLink }) {
  const className =
    "inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground";

  if (link.external) {
    return (
      <a className={className} href={link.to} rel="noreferrer" target="_blank">
        {link.label}
        <ArrowUpRight className="size-3.5" />
      </a>
    );
  }

  return (
    <Link className={className} to={link.to}>
      {link.label}
    </Link>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-border border-b">
      <div className="relative grid gap-8 px-6 py-12 sm:grid-cols-[1.5fr_1fr_1fr]">
        <GridDots columns={frameColumns} row={0} y="top" />
        <div>
          <img
            alt={appName}
            className="mb-3 block h-4 w-auto dark:hidden"
            height={16}
            src="/logo/jedd-icons-wordmark-light.svg"
            width={64}
          />
          <img
            alt={appName}
            className="mb-3 hidden h-4 w-auto dark:block"
            height={16}
            src="/logo/jedd-icons-wordmark-dark.svg"
            width={64}
          />
          <p className="max-w-xs text-muted-foreground text-sm">
            Sharp, squared, open-source SVG icons for React and vanilla JS.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.heading}>
            <h3 className="mb-3 font-medium text-foreground text-xs uppercase tracking-widest">
              {column.heading}
            </h3>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <FooterNavLink link={link} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-2 border-border border-t px-6 py-4 text-muted-foreground text-xs sm:flex-row">
        <p>
          © {year} {appName}. All rights reserved.
        </p>
        <a
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          href={repoUrl}
          rel="noreferrer"
          target="_blank"
        >
          MIT Licensed · Source on GitHub
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </footer>
  );
}
