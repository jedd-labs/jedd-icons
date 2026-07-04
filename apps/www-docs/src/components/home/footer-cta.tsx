import { ArrowRight } from "@jedd-icons/react";
import { Link } from "@tanstack/react-router";
import { GridDots, gridColumns } from "@/components/grid-dots";
import { TiltButton } from "@/components/tilt-button";
import { appName } from "@/lib/shared";

const frameColumns = gridColumns(1);

export function FooterCta() {
  return (
    <section className="relative flex min-h-80 items-center justify-center border-border border-b px-6 py-20 text-center">
      <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
      <div>
        <h2 className="mb-2 font-heading text-3xl text-foreground md:text-4xl">
          Ready to ship?
        </h2>
        <p className="mx-auto mb-8 max-w-md text-muted-foreground">
          Install {appName} and drop sharp, consistent icons into your app in
          minutes.
        </p>
        <Link className="inline-block" params={{ _splat: "" }} to="/docs/$">
          <TiltButton rounded={false} shortcut="R">
            <ArrowRight />
            Read the docs
          </TiltButton>
        </Link>
      </div>
    </section>
  );
}
