'use client';

import type { Ref } from 'react';
import { composeRenderProps } from 'react-aria-components/composeRenderProps';
import {
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuSection as AriaMenuSection,
  Collection,
  Header,
  type MenuItemProps as AriaMenuItemProps,
  type MenuProps as AriaMenuProps,
  type MenuSectionProps as AriaMenuSectionProps,
} from 'react-aria-components/Menu';
import {
  Separator,
  type SeparatorProps,
} from 'react-aria-components/Separator';

import { Popover, type PopoverProps } from '../Popover';
import styles from './Menu.module.css';

export type MenuProps<T> = AriaMenuProps<T> &
  Pick<PopoverProps, 'placement' | 'offset' | 'showArrow'> & {
    ref?: Ref<HTMLDivElement>;
  };

export function Menu<T extends object>({
  placement,
  offset,
  showArrow,
  className,
  ...props
}: MenuProps<T>) {
  return (
    <Popover
      placement={placement}
      offset={offset}
      showArrow={showArrow}
      className={styles.popover}
    >
      <AriaMenu
        {...props}
        className={composeRenderProps(className, (className) =>
          className ? `${styles.menu} ${className}` : styles.menu,
        )}
      />
    </Popover>
  );
}

export type MenuItemProps<T> = AriaMenuItemProps<T> & {
  ref?: Ref<HTMLDivElement>;
};

export function MenuItem<T extends object>({
  className,
  children,
  textValue,
  ...props
}: MenuItemProps<T>) {
  return (
    <AriaMenuItem
      {...props}
      textValue={
        textValue ?? (typeof children === 'string' ? children : undefined)
      }
      className={composeRenderProps(className, (className) =>
        className ? `${styles.item} ${className}` : styles.item,
      )}
    >
      {composeRenderProps(
        children,
        (children, { selectionMode, isSelected, hasSubmenu }) => (
          <>
            {selectionMode !== 'none' && (
              <span className={styles.indicator}>
                {isSelected && (
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    {selectionMode === 'multiple' ? (
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <circle cx="8" cy="8" r="3" fill="currentColor" />
                    )}
                  </svg>
                )}
              </span>
            )}
            <span className={styles.label}>{children}</span>
            {hasSubmenu && (
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className={styles.chevron}
              >
                <path
                  d="M6 3.5 10.5 8 6 12.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </>
        ),
      )}
    </AriaMenuItem>
  );
}

export type MenuSectionProps<T> = AriaMenuSectionProps<T> & {
  ref?: Ref<HTMLElement>;
  title?: string;
};

export function MenuSection<T extends object>({
  title,
  items,
  children,
  className,
  ...props
}: MenuSectionProps<T>) {
  return (
    <AriaMenuSection
      {...props}
      className={className ? `${styles.section} ${className}` : styles.section}
    >
      {title && <Header className={styles.header}>{title}</Header>}
      <Collection items={items}>{children}</Collection>
    </AriaMenuSection>
  );
}

export type MenuSeparatorProps = SeparatorProps & {
  ref?: Ref<HTMLElement>;
};

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return (
    <Separator
      {...props}
      className={
        className ? `${styles.separator} ${className}` : styles.separator
      }
    />
  );
}
