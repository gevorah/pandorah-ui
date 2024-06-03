import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactNode
} from 'react';
import { useMergeRefs } from '@floating-ui/react';

import { usePopoverContext } from './Popover.context';

export interface PopoverTriggerProps {
  children: ReactNode;
}

export const PopoverTrigger = forwardRef<HTMLElement, PopoverTriggerProps>(
  (props, ref) => {
    const { children } = props;

    if (!isValidElement(children)) {
      throw new Error(
        'Popover.Trigger component children should be an element or a component that accepts ref.'
      );
    }

    const context = usePopoverContext();
    const triggerRef = useMergeRefs([
      context.reference,
      ref,
      (children as any).ref
    ]);

    return cloneElement(
      children,
      context.interactions.getReferenceProps({
        ref: triggerRef,
        'data-state': context.open ? 'open' : 'closed',
        ...children.props
      })
    );
  }
);

PopoverTrigger.displayName = 'Popover.Trigger';

