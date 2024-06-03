import { useRef, type ReactNode } from 'react';

import { PopoverContextProvider } from './Popover.context';
import { PopoverArrow } from './PopoverArrow';
import { PopoverContent } from './PopoverContent';
import { PopoverTrigger } from './PopoverTrigger';
import { usePopover, type UsePopoverOptions } from './usePopover';

export interface PopoverProps extends UsePopoverOptions {
  children: ReactNode;
}

export function Popover(props: PopoverProps) {
  const {
    placement = 'bottom',
    strategy = 'absolute',
    middleware,
    defaultOpen = false,
    open,
    onOpenChange,
    offset = 0,
    children,
    trigger
  } = props;

  const popover = usePopover({
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
    <PopoverContextProvider
      value={{
        context: popover.floating.context,
        placement: popover.floating.placement,
        strategy: popover.floating.strategy,
        x: popover.floating.x,
        y: popover.floating.y,
        floatingStyles: popover.floating.floatingStyles,
        reference: popover.floating.refs.setReference,
        floating: popover.floating.refs.setFloating,
        open: popover.open,
        setOpen: popover.setOpen,
        interactions: popover.interactions,
        arrowRef: popover.arrowRef
      }}
    >
      {children}
    </PopoverContextProvider>
  );
}

Popover.Trigger = PopoverTrigger;
Popover.Content = PopoverContent;
Popover.Arrow = PopoverArrow;
Popover.displayName = 'Popover';

