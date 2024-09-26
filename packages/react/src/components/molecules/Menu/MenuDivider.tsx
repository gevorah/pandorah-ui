import { cn } from '../../../lib/utils';

export type MenuDividerProps = {
  className?: string;
};

export const MenuDivider = (props: MenuDividerProps) => {
  const { className } = props;

  return (
    <hr
      role="separator"
      aria-orientation="horizontal"
      className={cn('my-1 h-px bg-black', className)}
    />
  );
};

MenuDivider.displayName = 'MenuDivider';

