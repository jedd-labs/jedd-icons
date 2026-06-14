import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useState } from "react";
import { CodeSnippet } from "@/components/code-snippet";

interface UsageTabsProps {
  className?: string;
  /** Passed through to each <CodeSnippet> scroll box (e.g. "h-64"). */
  heightClassName?: string;
  reactSnippet: string;
  vanillaSnippet: string;
}

export function UsageTabs({
  reactSnippet,
  vanillaSnippet,
  heightClassName,
  className,
}: UsageTabsProps) {
  const [tab, setTab] = useState<"react" | "vanilla">("react");

  return (
    <Tabs
      className={className}
      onValueChange={(value) => setTab(value as "react" | "vanilla")}
      value={tab}
    >
      <TabsList variant="line">
        <TabsTrigger value="react">React</TabsTrigger>
        <TabsTrigger value="vanilla">Vanilla</TabsTrigger>
      </TabsList>
      <TabsContent value="react">
        <CodeSnippet code={reactSnippet} heightClassName={heightClassName} />
      </TabsContent>
      <TabsContent value="vanilla">
        <CodeSnippet code={vanillaSnippet} heightClassName={heightClassName} />
      </TabsContent>
    </Tabs>
  );
}
