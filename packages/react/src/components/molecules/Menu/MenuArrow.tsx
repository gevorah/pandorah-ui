import { FloatingArrow } from '@floating-ui/react';

import { cn } from '../../../lib/utils';
import { useMenuContext } from './Menu.context';

export type MenuArrowProps = {
  className?: string;
  width?: number;
  height?: number;
  tipRadius?: number;
};

export const MenuArrow = (props: MenuArrowProps) => {
  const { className, width = 16, height = 8, tipRadius = 2 } = props;

  const { context: floatingContext, arrowRef } = useMenuContext();

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

MenuArrow.displayName = 'MenuArrow';

