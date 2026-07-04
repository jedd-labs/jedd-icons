import { ArrowRight } from "@jedd-icons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { BoxIcon } from "lucide-react";
import { GridDots, gridColumns } from "@/components/grid-dots";
import { TiltButton } from "@/components/tilt-button";

const frameColumns = gridColumns(1);

export function HeroSection({ totalIcons }: { totalIcons: number }) {
  return (
    <>
      <div className="relative border-border border-b px-6 py-3 text-center">
        <GridDots columns={frameColumns} row={0} y="top" />
        <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
        <span className="text-muted-foreground text-sm">
          <Badge className="mr-2" variant="secondary">
            Open Source
          </Badge>
          {totalIcons} sharp, squared icons — free for any project
        </span>
      </div>
      <section className="relative border-border border-b px-6 py-20 text-center">
        <GridDots columns={frameColumns} row="100%" y="outer-bottom" />
        <h1 className="relative mx-auto mb-4 max-w-2xl font-heading text-4xl text-foreground md:text-5xl">
          Sharp, squared icons{" "}
          <span className="text-muted-foreground">for modern interfaces</span>
        </h1>
        <p className="relative mx-auto mb-8 max-w-lg text-muted-foreground">
          {totalIcons} free, open-source SVG icons as React components and
          vanilla JS modules. Customize size, stroke, and color, then copy the
          code.
        </p>
        <div className="relative flex justify-center gap-3">
          <Link to="/icons">
            <TiltButton rounded={false} shortcut="E">
              <BoxIcon />
              Explore icons
            </TiltButton>
          </Link>
          <Link params={{ _splat: "" }} to="/docs/$">
            <TiltButton rounded={false} shortcut="R" variant="outline">
              <ArrowRight />
              Get started
            </TiltButton>
          </Link>
        </div>
      </section>
    </>
  );
}
