import { type ReactNode } from 'react';
import { FloatingNode } from '@floating-ui/react';

import { MenuContextProvider } from './Menu.context';
import { useMenu, type UseMenuOptions } from './useMenu';

interface MenuComponentProps extends UseMenuOptions {
  children: ReactNode;
}

export function MenuComponent(props: MenuComponentProps) {
  const {
    placement,
    strategy = 'absolute',
    middleware,
    defaultOpen = false,
    open,
    onOpenChange,
    offset = 0,
    trigger,
    children
  } = props;

  const menu = useMenu({
    placement,
    strategy,
    middleware,
    defaultOpen,
    open,
    onOpenChange,
    offset,
    trigger
  });

  return (
    <FloatingNode id={menu.nodeId}>
      <MenuContextProvider
        value={{
          context: menu.floating.context,
          placement: menu.floating.placement,
          strategy: menu.floating.strategy,
          x: menu.floating.x,
          y: menu.floating.y,
          floatingStyles: menu.floating.floatingStyles,
          reference: menu.floating.refs.setReference,
          floating: menu.floating.refs.setFloating,
          open: menu.open,
          setOpen: menu.setOpen,
          interactions: menu.interactions,
          arrowRef: menu.arrowRef,
          elementsRef: menu.elementsRef,
          labelsRef: menu.labelsRef,
          activeIndex: menu.activeIndex,
          setActiveIndex: menu.setActiveIndex,
          setHasFocusInside: menu.setHasFocusInside
        }}
      >
        {children}
      </MenuContextProvider>
    </FloatingNode>
  );
}

