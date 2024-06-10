import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode
} from 'react';
import { useMergeRefs } from '@floating-ui/react';

import { polymorphicForwardRef } from '../../../lib/forward-ref';
import { usePopoverContext } from './Popover.context';

export type PopoverTriggerProps = {
  children: ReactNode;
} & ComponentPropsWithoutRef<'button'>;

export const PopoverTrigger = polymorphicForwardRef<
  'button',
  PopoverTriggerProps
>((props, ref) => {
  const { children, as: Component = 'button', ...rest } = props;

  const context = usePopoverContext();
  const triggerRef = useMergeRefs([context.reference, ref]);

  const triggerProps = {
    ref: triggerRef,
    'data-state': context.open ? 'open' : 'closed',
    ...context.interactions.getReferenceProps(rest)
  };

  return <Component {...triggerProps}>{children}</Component>;
});

PopoverTrigger.displayName = 'Popover.Trigger';

