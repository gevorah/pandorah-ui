import { useMergeRefs } from '@floating-ui/react';

import { polymorphicForwardRef } from '../../../lib/forward-ref';
import type { PolymorphicProps } from '../../../types/polymorphic';
import { usePopoverContext } from './Popover.context';

export type PopoverTriggerProps = PolymorphicProps<'button'>;

export const PopoverTrigger = polymorphicForwardRef<
  'button',
  PopoverTriggerProps
>((props, ref) => {
  const { as: Component = 'button', children, ...rest } = props;

  const context = usePopoverContext();
  const triggerRef = useMergeRefs([context.reference, ref]);

  const triggerProps = {
    ref: triggerRef,
    'data-state': context.open ? 'open' : 'closed',
    ...context.interactions.getReferenceProps(rest)
  };

  return <Component {...triggerProps}>{children}</Component>;
});

PopoverTrigger.displayName = 'PopoverTrigger';

