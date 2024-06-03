import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import {
  FloatingFocusManager,
  FloatingList,
  FloatingPortal,
  useMergeRefs
} from '@floating-ui/react';

import { useMenuContext } from './Menu.context';

export interface MenuListProps extends ComponentPropsWithoutRef<'div'> {}

export const MenuList = forwardRef<HTMLDivElement, MenuListProps>(
  (props, ref) => {
    const { children, style, ...rest } = props;

    const { context: floatingContext, ...context } = useMenuContext();
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
            <FloatingList
              elementsRef={context.elementsRef}
              labelsRef={context.labelsRef}
            >
              {children}
            </FloatingList>
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    );
  }
);

