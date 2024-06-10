import { FloatingArrow } from '@floating-ui/react';

import { cn } from '../../../lib/utils';
import { usePopoverContext } from './Popover.context';

export type PopoverArrowProps = {
  className?: string;
  width?: number;
  height?: number;
  tipRadius?: number;
};

export function PopoverArrow(props: PopoverArrowProps) {
  const { className, width = 16, height = 8, tipRadius = 2 } = props;

  const { context: floatingContext, arrowRef } = usePopoverContext();

  return (
    <FloatingArrow
      ref={arrowRef}
      context={floatingContext}
      width={width}
      height={height}
      tipRadius={tipRadius}
      className={cn('fill-white', className)}
    />
  );
}

