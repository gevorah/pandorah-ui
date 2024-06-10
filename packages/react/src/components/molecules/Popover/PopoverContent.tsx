import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import {
  FloatingFocusManager,
  FloatingPortal,
  useMergeRefs
} from '@floating-ui/react';

import { usePopoverContext } from './Popover.context';

export type PopoverContentProps = {} & ComponentPropsWithoutRef<'div'>;

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (props, ref) => {
    const { children, style, ...rest } = props;

    const { context: floatingContext, ...context } = usePopoverContext();
    const contentRef = useMergeRefs([context.floating, ref]);

    if (!floatingContext.open) return null;

    return (
      <FloatingPortal>
        <FloatingFocusManager context={floatingContext} modal={false}>
          <div
            ref={contentRef}
            tabIndex={-1}
            data-placement={context.placement}
            style={{ ...context.floatingStyles, ...style }}
            {...context.interactions.getFloatingProps(rest)}
          >
            {children}
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    );
  }
);

