import { type ReactNode } from 'react';
import { FloatingTree } from '@floating-ui/react';

import { MenuComponent } from './MenuComponent';
import { type UseMenuOptions } from './useMenu';

export type MenuProps = {
  children: ReactNode;
} & Omit<UseMenuOptions, 'arrowRef'>;

export const Menu = (props: MenuProps) => {
  const { placement = 'bottom', trigger = 'click', children, ...rest } = props;

  return (
    <FloatingTree>
      <MenuComponent {...rest} placement={placement} trigger={trigger}>
        {children}
      </MenuComponent>
    </FloatingTree>
  );
};

Menu.displayName = 'Menu';

