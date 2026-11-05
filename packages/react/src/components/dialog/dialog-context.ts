'use client';

import type { FloatingRootContext } from '@floating-ui/react';
import { createContext, useContext, type RefObject } from 'react';

export type DialogOpenChangeReason =
  'trigger-press' | 'close-press' | 'outside-press' | 'escape-key';

export interface DialogOpenChangeDetails {
  reason: DialogOpenChangeReason;
  event: Event;
}

export interface DialogContextValue {
  open: boolean;
  mounted: boolean;
  rejected: boolean;
  reject: () => void;
  requestOpenChange: (open: boolean, details: DialogOpenChangeDetails) => void;
  floating: FloatingRootContext;
  nodeId: string | undefined;
  parentNodeId: string | null;
  setTrigger: (element: HTMLElement | null) => void;
  pressedTriggerRef: RefObject<HTMLElement | null>;
  setPopup: (element: HTMLElement | null) => void;
  setBackdrop: (element: HTMLElement | null) => void;
  popupId: string;
  titleId: string | undefined;
  descriptionId: string | undefined;
  setTitleId: (id: string | undefined) => void;
  setDescriptionId: (id: string | undefined) => void;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogBackdropContext = createContext(false);

export function useDialogContext(part: string) {
  const context = useContext(DialogContext);
  if (!context) throw new Error(`${part} must be rendered inside Dialog.Root.`);
  return context;
}
