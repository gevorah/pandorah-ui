import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { FloatingPortal, useMergeRefs } from '@floating-ui/react';

import { useTooltipContext } from './Tooltip.context';

export type TooltipContentProps = {} & ComponentPropsWithoutRef<'div'>;

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  (props, ref) => {
    const { children, style, ...rest } = props;

    const { context: floatingContext, ...context } = useTooltipContext();
    const contentRef = useMergeRefs([context.floating, ref]);

    if (!floatingContext.open) return null;

    return (
      <FloatingPortal>
        <div
          ref={contentRef}
          data-placement={context.placement}
          style={{ ...context.floatingStyles, ...style }}
          {...context.interactions.getFloatingProps(rest)}
        >
          {children}
        </div>
      </FloatingPortal>
    );
  }
);

TooltipContent.displayName = 'TooltipContent';

