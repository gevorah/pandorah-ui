import { useMergeRefs } from '@floating-ui/react';

import { polymorphicForwardRef } from '../../../lib/forward-ref';
import type { PolymorphicProps } from '../../../types/polymorphic';
import { useMenuContext } from './Menu.context';

export type MenuTriggerProps = PolymorphicProps<'button'>;

export const MenuTrigger = polymorphicForwardRef<'button', MenuTriggerProps>(
  (props, ref) => {
    const { as: Component = 'button', children, ...rest } = props;

    const context = useMenuContext();
    const triggerRef = useMergeRefs([context.reference, ref]);

    const triggerProps = {
      ref: triggerRef,
      'data-state': context.open ? 'open' : 'closed',
      ...context.interactions.getReferenceProps(rest)
    };

    return <Component {...triggerProps}>{children}</Component>;
  }
);

MenuTrigger.displayName = 'MenuTrigger';

