import { FloatingArrow } from '@floating-ui/react';

import { cn } from '../../../lib/utils';
import { useTooltipContext } from './Tooltip.context';

export type TooltipArrowProps = {
  className?: string;
  width?: number;
  height?: number;
  tipRadius?: number;
};

export const TooltipArrow = (props: TooltipArrowProps) => {
  const { className, width = 16, height = 8, tipRadius = 2 } = props;

  const { context: floatingContext, arrowRef } = useTooltipContext();

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
};

TooltipArrow.displayName = 'TooltipArrow';

