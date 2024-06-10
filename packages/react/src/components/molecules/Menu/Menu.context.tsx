import {
  createContext,
  useContext,
  type CSSProperties,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction
} from 'react';
import type {
  FloatingContext,
  Placement,
  Strategy,
  UseInteractionsReturn
} from '@floating-ui/react';

export type MenuContextValue = {
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
  arrowRef: Element | MutableRefObject<Element | null>;

  elementsRef: MutableRefObject<Array<HTMLElement | null>>;
  labelsRef: MutableRefObject<Array<string | null>>;
  activeIndex: number | null;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
};

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuContextProvider({
  value,
  children
}: {
  value: MenuContextValue;
  children: ReactNode;
}) {
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenuContext() {
  const context = useContext(MenuContext);

  if (context === null) {
    throw new Error('Menu component was not found in the tree');
  }

  return context;
}

