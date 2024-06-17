import { useMergeRefs } from '@floating-ui/react';

import { polymorphicForwardRef } from '../../../lib/forward-ref';
import type { PolymorphicProps } from '../../../types/polymorphic';
import { useTooltipContext } from './Tooltip.context';

export type TooltipTriggerProps = PolymorphicProps<'button'>;

export const TooltipTrigger = polymorphicForwardRef<
  'button',
  TooltipTriggerProps
>((props, ref) => {
  const { as: Component = 'button', children, ...rest } = props;

  const context = useTooltipContext();
  const triggerRef = useMergeRefs([context.reference, ref]);

  const triggerProps = {
    ref: triggerRef,
    'data-state': context.open ? 'open' : 'closed',
    ...context.interactions.getReferenceProps(rest)
  };

  return <Component {...triggerProps}>{children}</Component>;
});

TooltipTrigger.displayName = 'TooltipTrigger';

