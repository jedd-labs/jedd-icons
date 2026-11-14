import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { DevOnly } from "@/components/dev-only";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    DevOnly,
    Tab,
    Tabs,
    Step,
    Steps,
    TypeTable,
    ...components,
  } satisfies MDXComponents;
}

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
