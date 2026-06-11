import { Kbd } from "@workspace/ui/components/kbd";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface TiltButtonProps {
  children: React.ReactNode;
  rounded?: boolean;
  shortcut: string;
  variant?: "default" | "outline";
}

type TiltPos = "left" | "middle" | "right" | "none";

const ELEVATION = 5;
const PRESS_INSET = 4;
const TRANSITION_MS = 150;

function getTiltY(pos: TiltPos): number {
  if (pos === "left") {
    return -0.5;
  }
  if (pos === "right") {
    return 0.5;
  }
  return 0;
}

function getTranslateY(active: boolean, pos: TiltPos): number {
  if (active) {
    return PRESS_INSET;
  }
  if (pos === "none") {
    return 0;
  }
  return -1;
}

function getGlareBackground(pos: TiltPos): string {
  if (pos === "left") {
    return "linear-gradient(to right, rgba(255,255,255,0.08), transparent 60%)";
  }
  if (pos === "right") {
    return "linear-gradient(to left, rgba(255,255,255,0.08), transparent 60%)";
  }
  if (pos === "middle") {
    return "linear-gradient(to bottom, rgba(255,255,255,0.05), transparent 60%)";
  }
  return "none";
}

export function TiltButton({
  children,
  rounded = true,
  shortcut,
  variant = "default",
}: TiltButtonProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<TiltPos>("none");
  const [active, setActive] = useState(false);

  const updatePos = useCallback((clientX: number) => {
    const el = wrapperRef.current;
    if (!el) {
      return;
    }
    const { left, width } = el.getBoundingClientRect();
    const x = (clientX - left) / width;
    if (x < 0.33) {
      setPos("left");
    } else if (x > 0.66) {
      setPos("right");
    } else {
      setPos("middle");
    }
  }, []);

  const isDefault = variant === "default";
  const surfaceBg = isDefault
    ? "bg-primary text-primary-foreground"
    : "bg-background text-foreground border border-border";
  const sideBg = isDefault ? "bg-primary/70" : "bg-border";
  const radius = rounded ? "rounded-lg" : "";

  const tiltY = getTiltY(pos);
  const translateY = getTranslateY(active, pos);

  const sideHeight = active ? ELEVATION - PRESS_INSET : ELEVATION;

  return (
    <div
      className="relative z-1 select-none"
      onPointerCancel={() => {
        setPos("none");
        setActive(false);
      }}
      onPointerDown={(e) => {
        updatePos(e.clientX);
        setActive(true);
      }}
      onPointerLeave={() => {
        setPos("none");
        setActive(false);
      }}
      onPointerMove={(e) => updatePos(e.clientX)}
      onPointerUp={() => setActive(false)}
      ref={wrapperRef}
      style={{
        paddingBottom: `${ELEVATION}px`,
      }}
    >
      {/* Side wall (depth) */}
      <div
        className={cn("absolute inset-x-0 bottom-0", radius, sideBg)}
        style={{
          height: `calc(100% - ${ELEVATION - sideHeight}px)`,
          transition: `height ${TRANSITION_MS}ms ease`,
        }}
      />
      {/* Button surface */}
      <div
        className={cn(
          "relative flex h-10 cursor-pointer items-center gap-2 px-3 font-medium text-sm",
          radius,
          surfaceBg
        )}
        style={{
          transform: `translateY(${translateY}px) skewY(${tiltY}deg)`,
          transition: `transform ${TRANSITION_MS}ms ease`,
        }}
      >
        {/* Glare */}
        <div
          className={cn("pointer-events-none absolute inset-0", radius)}
          style={{
            background: getGlareBackground(pos),
            opacity: active ? 0 : 1,
            transition: `opacity ${TRANSITION_MS}ms ease`,
          }}
        />
        {children}
        <Kbd className="ml-1 border border-ring bg-current/10 text-current">
          {shortcut}
        </Kbd>
      </div>
    </div>
  );
}
