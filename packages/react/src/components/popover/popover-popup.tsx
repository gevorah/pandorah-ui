'use client';

import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  shift,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  type Placement,
} from '@floating-ui/react';
import type { ComponentPropsWithRef, RefObject } from 'react';

import { useMergeRefs } from '../../internal/composition/use-merge-refs';
import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { splitFloatingProps } from '../../internal/split-floating-props';
import { usePopoverContext } from './popover-context';

export type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
export type PopoverAlign = 'start' | 'center' | 'end';

export interface PopoverPopupProps
  extends Omit<ComponentPropsWithRef<'div'>, 'role'>, ComposableProps<'div'> {
  side?: PopoverSide;
  align?: PopoverAlign;
  sideOffset?: number;
  initialFocus?: RefObject<HTMLElement | null>;
}

const popupFocus: RefObject<HTMLElement | null> = { current: null };

const sizeMiddleware = size({
  apply({ availableWidth, availableHeight, elements }) {
    const { style } = elements.floating;
    style.setProperty(
      '--pandorah-popover-available-width',
      `${availableWidth}px`,
    );
    style.setProperty(
      '--pandorah-popover-available-height',
      `${availableHeight}px`,
    );
  },
});

export function PopoverPopup(props: PopoverPopupProps) {
  const { mounted } = usePopoverContext('Popover.Popup');
  if (!mounted) return null;
  return (
    <FloatingPortal>
      <PopupElement {...props} />
    </FloatingPortal>
  );
}

function PopupElement({
  side = 'bottom',
  align = 'center',
  sideOffset = 0,
  initialFocus,
  render,
  ref,
  style,
  ...props
}: PopoverPopupProps) {
  const {
    open,
    floating,
    nodeId,
    setPopup,
    openedByTouch,
    popupId,
    titleId,
    descriptionId,
  } = usePopoverContext('Popover.Popup');
  const { context, floatingStyles, placement } = useFloating({
    rootContext: floating,
    nodeId,
    placement: (align === 'center' ? side : `${side}-${align}`) as Placement,
    middleware: [offset(sideOffset), flip(), shift(), sizeMiddleware],
    whileElementsMounted: autoUpdate,
    transform: false,
  });
  const [placedSide, placedAlign = 'center'] = placement.split('-');

  const { getFloatingProps } = useInteractions([
    useDismiss(context, {
      outsidePressEvent: 'mousedown',
      capture: { outsidePress: false },
    }),
  ]);
  const floatingProps = splitFloatingProps(getFloatingProps());

  const element = useRender({
    name: 'Popover.Popup',
    tag: 'div',
    render,
    ref: useMergeRefs(ref, setPopup),
    props: {
      tabIndex: floatingProps.tabIndex,
      ...props,
      style: { ...style, ...floatingStyles },
      'aria-labelledby':
        props['aria-labelledby'] ?? (props['aria-label'] ? undefined : titleId),
      'aria-describedby':
        [props['aria-describedby'], descriptionId].filter(Boolean).join(' ') ||
        undefined,
    },
    owned: {
      ...floatingProps.attributes,
      id: popupId,
      role: 'dialog',
      'data-state': open ? 'open' : 'closed',
      'data-side': placedSide,
      'data-align': placedAlign,
      inert: !open || undefined,
    },
    interceptors: floatingProps.interceptors,
  });

  return (
    <FloatingFocusManager
      context={context}
      modal={false}
      disabled={!open}
      initialFocus={initialFocus ?? (openedByTouch ? popupFocus : 0)}
      returnFocus={false}
    >
      {element}
    </FloatingFocusManager>
  );
}
