'use client';

import type { FloatingRootContext } from '@floating-ui/react';
import { createContext, useContext } from 'react';

export type PopoverOpenChangeReason =
  | 'trigger-press'
  | 'close-press'
  | 'outside-press'
  | 'escape-key'
  | 'focus-out';

export interface PopoverOpenChangeDetails {
  reason: PopoverOpenChangeReason;
  event: Event;
}

export interface PopoverContextValue {
  open: boolean;
  mounted: boolean;
  requestOpenChange: (open: boolean, details: PopoverOpenChangeDetails) => void;
  floating: FloatingRootContext;
  nodeId: string | undefined;
  setTrigger: (element: Element | null) => void;
  setPopup: (element: HTMLElement | null) => void;
  openedByTouch: boolean;
  setOpenedByTouch: (openedByTouch: boolean) => void;
  popupId: string;
  titleId: string | undefined;
  descriptionId: string | undefined;
  setTitleId: (id: string | undefined) => void;
  setDescriptionId: (id: string | undefined) => void;
}

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopoverContext(part: string) {
  const context = useContext(PopoverContext);
  if (!context)
    throw new Error(`${part} must be rendered inside Popover.Root.`);
  return context;
}
