import type { ReactNode } from 'react';

import { TooltipContextProvider } from './Tooltip.context';
import { useTooltip, type UseTooltipOptions } from './useTooltip';

export type TooltipProps = { children: ReactNode } & UseTooltipOptions;

export const Tooltip = (props: TooltipProps) => {
  const {
    placement = 'top',
    strategy = 'absolute',
    middleware,
    defaultOpen = false,
    open,
    onOpenChange,
    offset = 0,
    children
  } = props;

  const tooltip = useTooltip({
    placement,
    strategy,
    middleware,
    defaultOpen,
    open,
    onOpenChange,
    offset
  });

  return (
    <TooltipContextProvider
      value={{
        context: tooltip.floating.context,
        placement: tooltip.floating.placement,
        strategy: tooltip.floating.strategy,
        x: tooltip.floating.x,
        y: tooltip.floating.y,
        floatingStyles: tooltip.floating.floatingStyles,
        reference: tooltip.floating.refs.setReference,
        floating: tooltip.floating.refs.setFloating,
        open: tooltip.open,
        setOpen: tooltip.setOpen,
        interactions: tooltip.interactions,
        arrowRef: tooltip.arrowRef
      }}
    >
      {children}
    </TooltipContextProvider>
  );
};

Tooltip.displayName = 'Tooltip';
