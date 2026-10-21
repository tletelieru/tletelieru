import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';

export interface InputHandle {
  value: string;
  set: (value: string) => void;
}

export interface OutputHandle {
  value: string;
}

interface ToolContextValue {
  slug: string | null;
  inputRef: RefObject<InputHandle | null>;
  outputRef: RefObject<OutputHandle | null>;
}

const detachedRef = { current: null };

const ToolContext = createContext<ToolContextValue>({
  slug: null,
  inputRef: detachedRef,
  outputRef: detachedRef,
});

export function ToolProvider({ slug, children }: { slug: string | null; children: ReactNode }) {
  const inputRef = useRef<InputHandle | null>(null);
  const outputRef = useRef<OutputHandle | null>(null);
  return <ToolContext value={{ slug, inputRef, outputRef }}>{children}</ToolContext>;
}

export function useToolContext(): ToolContextValue {
  return useContext(ToolContext);
}

export function useToolSlug(): string | null {
  return useContext(ToolContext).slug;
}
