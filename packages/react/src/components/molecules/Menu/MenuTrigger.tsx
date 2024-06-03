import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactNode
} from 'react';
import { useMergeRefs } from '@floating-ui/react';

import { useMenuContext } from './Menu.context';

export interface MenuTriggerProps {
  children: ReactNode;
}

export const MenuTrigger = forwardRef<HTMLElement, MenuTriggerProps>(
  (props, ref) => {
    const { children } = props;

    if (!isValidElement(children)) {
      throw new Error(
        'Menu.Trigger component children should be an element or a component that accepts ref.'
      );
    }

    const context = useMenuContext();
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

