'use client';

import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
  type Placement,
} from '@floating-ui/react';
import type { ComponentPropsWithRef } from 'react';

import { useMergeRefs } from '../../internal/composition/use-merge-refs';
import {
  useRender,
  type ComposableProps,
} from '../../internal/composition/use-render';
import { useTooltipContext } from './tooltip-context';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipPopupProps
  extends Omit<ComponentPropsWithRef<'div'>, 'role'>, ComposableProps<'div'> {
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
}

export function TooltipPopup(props: TooltipPopupProps) {
  const { mounted } = useTooltipContext('Tooltip.Popup');
  if (!mounted) return null;
  return (
    <FloatingPortal>
      <PopupElement {...props} />
    </FloatingPortal>
  );
}

function PopupElement({
  side = 'top',
  align = 'center',
  sideOffset = 0,
  render,
  ref,
  style,
  ...props
}: TooltipPopupProps) {
  const { open, floating, nodeId, setPopup, popupId } =
    useTooltipContext('Tooltip.Popup');
  const { floatingStyles, placement } = useFloating({
    rootContext: floating,
    nodeId,
    placement: (align === 'center' ? side : `${side}-${align}`) as Placement,
    middleware: [offset(sideOffset), flip(), shift()],
    whileElementsMounted: autoUpdate,
    transform: false,
  });
  const [placedSide, placedAlign = 'center'] = placement.split('-');

  return useRender({
    name: 'Tooltip.Popup',
    tag: 'div',
    render,
    ref: useMergeRefs(ref, setPopup),
    props: { ...props, style: { ...style, ...floatingStyles } },
    owned: {
      id: popupId,
      role: 'tooltip',
      'data-state': open ? 'open' : 'closed',
      'data-side': placedSide,
      'data-align': placedAlign,
      inert: !open || undefined,
    },
  });
}
