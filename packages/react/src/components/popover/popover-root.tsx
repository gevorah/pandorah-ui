'use client';

import {
  FloatingNode,
  FloatingTree,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingRootContext,
  type OpenChangeReason,
} from '@floating-ui/react';
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { exitAnimationsFinished } from '../../internal/exit-animations';
import { hasNativeEscapeOwner } from '../../internal/native-escape';
import {
  PopoverContext,
  type PopoverContextValue,
  type PopoverOpenChangeDetails,
  type PopoverOpenChangeReason,
} from './popover-context';

export interface PopoverRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: PopoverOpenChangeDetails) => void;
  children?: ReactNode;
}

export function PopoverRoot(props: PopoverRootProps) {
  const root = <PopoverNode {...props} />;
  return useFloatingParentNodeId() === null ? (
    <FloatingTree>{root}</FloatingTree>
  ) : (
    root
  );
}

type DismissReason = Extract<
  PopoverOpenChangeReason,
  'escape-key' | 'outside-press' | 'focus-out'
>;

const dismissReasons: Partial<Record<OpenChangeReason, DismissReason>> = {
  'escape-key': 'escape-key',
  'outside-press': 'outside-press',
  'focus-out': 'focus-out',
};

function PopoverNode({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: PopoverRootProps) {
  const controlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlled ? openProp : uncontrolledOpen;

  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const [trigger, setTrigger] = useState<Element | null>(null);
  const [popup, setPopup] = useState<HTMLElement | null>(null);
  const [titleId, setTitleId] = useState<string>();
  const [descriptionId, setDescriptionId] = useState<string>();
  const popupId = useId();
  const nodeId = useFloatingNodeId();
  const [openedByTouch, setOpenedByTouch] = useState(false);

  const focusLeavingRef = useRef(false);
  const focusLeavingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(focusLeavingTimerRef.current), []);

  const requestOpenChange = (
    next: boolean,
    details: PopoverOpenChangeDetails,
  ) => {
    if (details.reason === 'outside-press' || details.reason === 'focus-out') {
      focusLeavingRef.current = true;
      clearTimeout(focusLeavingTimerRef.current);
      focusLeavingTimerRef.current = setTimeout(() => {
        focusLeavingRef.current = false;
      });
    }
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next, details);
  };

  const floating = useFloatingRootContext({
    open,
    elements: { reference: trigger, floating: popup },
    onOpenChange(next, event, reason) {
      const popoverReason = reason && dismissReasons[reason];
      if (!popoverReason || !event || !popup) return;
      if (!canDismiss(popup, popoverReason, event)) return;
      requestOpenChange(next, { reason: popoverReason, event });
    },
  });

  const previousRef = useRef({ open, popup });
  const restoreFocus = useEffectEvent(() => {
    const previous = previousRef.current;
    previousRef.current = { open, popup };
    const closed = previous.open && !open;
    const removed = open && previous.popup !== null && popup === null;
    if (!(closed || removed) || focusLeavingRef.current) return;
    if (!(trigger instanceof HTMLElement)) return;
    const { activeElement, body } = trigger.ownerDocument;
    if (activeElement === body || previous.popup?.contains(activeElement)) {
      trigger.focus({ preventScroll: true });
    }
  });
  useLayoutEffect(() => restoreFocus(), [open, popup]);

  useLayoutEffect(() => {
    if (open || !mounted) return;
    let current = true;
    exitAnimationsFinished([popup]).then(() => {
      if (current) setMounted(false);
    });
    return () => {
      current = false;
    };
  }, [open, mounted, popup]);

  const value: PopoverContextValue = {
    open,
    mounted,
    requestOpenChange,
    floating,
    nodeId,
    setTrigger,
    setPopup,
    openedByTouch,
    setOpenedByTouch,
    popupId,
    titleId,
    descriptionId,
    setTitleId,
    setDescriptionId,
  };

  return (
    <FloatingNode id={nodeId}>
      <PopoverContext value={value}>{children}</PopoverContext>
    </FloatingNode>
  );
}

function canDismiss(popup: HTMLElement, reason: DismissReason, event: Event) {
  if (popup.closest('[inert]')) return false;
  if (reason === 'focus-out') return true;
  if (event.defaultPrevented) return false;
  return reason !== 'escape-key' || !hasNativeEscapeOwner(popup.ownerDocument);
}
