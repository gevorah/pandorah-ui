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

export type PopoverContextValue = {
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

const PopoverContext = createContext<PopoverContextValue | null>(null);

export function PopoverContextProvider({
  value,
  children
}: {
  value: PopoverContextValue;
  children: ReactNode;
}) {
  return (
    <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
  );
}

export function usePopoverContext() {
  const context = useContext(PopoverContext);

  if (context === null) {
    throw new Error('Popover component was not found in the tree');
  }

  return context;
}

