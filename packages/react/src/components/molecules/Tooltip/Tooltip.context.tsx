import {
  createContext,
  useContext,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode
} from 'react';
import type {
  FloatingContext,
  Placement,
  Strategy,
  UseInteractionsReturn
} from '@floating-ui/react';

export type TooltipContextValue = {
  context: FloatingContext;
  placement: Placement;
  strategy: Strategy;
  x: number;
  y: number;
  floatingStyles: CSSProperties;
  reference: (node: HTMLElement | null) => void;
  floating: (node: HTMLElement | null) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  interactions: UseInteractionsReturn;
  arrowRef: MutableRefObject<SVGSVGElement | null>;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipContextProvider({
  value,
  children
}: {
  value: TooltipContextValue;
  children: ReactNode;
}) {
  return (
    <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
  );
}

export function useTooltipContext() {
  const context = useContext(TooltipContext);

  if (context === null) {
    throw new Error('Tooltip component was not found in the tree');
  }

  return context;
}

