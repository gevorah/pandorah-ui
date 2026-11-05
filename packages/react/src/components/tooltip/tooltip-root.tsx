'use client';

import {
  FloatingNode,
  FloatingTree,
  safePolygon,
  useDismiss,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingRootContext,
  useFocus,
  useHover,
  useInteractions,
  type FloatingEvents,
  type OpenChangeReason,
} from '@floating-ui/react';
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { exitAnimationsFinished } from '../../internal/exit-animations';
import { hasNativeEscapeOwner } from '../../internal/native-escape';
import {
  TooltipContext,
  type TooltipContextValue,
  type TooltipOpenChangeDetails,
  type TooltipOpenChangeReason,
} from './tooltip-context';

export interface TooltipRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: TooltipOpenChangeDetails) => void;
  children?: ReactNode;
}

export function TooltipRoot(props: TooltipRootProps) {
  const root = <TooltipNode {...props} />;
  return useFloatingParentNodeId() === null ? (
    <FloatingTree>{root}</FloatingTree>
  ) : (
    root
  );
}

const hoverDelay = { open: 600, close: 0 };

const reasons: Partial<Record<OpenChangeReason, TooltipOpenChangeReason>> = {
  hover: 'trigger-hover',
  'safe-polygon': 'trigger-hover',
  focus: 'trigger-focus',
  'reference-press': 'trigger-press',
  'escape-key': 'escape-key',
};

function TooltipNode({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: TooltipRootProps) {
  const controlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlled ? openProp : uncontrolledOpen;

  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  const [trigger, setTrigger] = useState<Element | null>(null);
  const [popup, setPopup] = useState<HTMLElement | null>(null);
  const popupId = useId();
  const nodeId = useFloatingNodeId();
  const requestEventRef = useRef<Event>(undefined);

  const floating = useFloatingRootContext({
    open,
    elements: { reference: trigger, floating: popup },
    onOpenChange(next, event, reason) {
      const tooltipReason = reason && reasons[reason];
      if (next === open || !tooltipReason || !event) return;
      if (event === requestEventRef.current) return;
      if (!next && !canClose(tooltipReason, event, trigger, popup)) return;
      requestEventRef.current = event;
      if (!controlled) setUncontrolledOpen(next);
      onOpenChange?.(next, { reason: tooltipReason, event });
    },
  });

  const focusEvents = useMemo(
    () => withoutEscape(floating.events),
    [floating.events],
  );

  const { getReferenceProps } = useInteractions([
    useHover(floating, {
      delay: hoverDelay,
      mouseOnly: true,
      move: false,
      handleClose: safePolygon(),
    }),
    useFocus({ ...floating, events: focusEvents }),
    useDismiss(floating, {
      outsidePress: false,
      referencePress: true,
      referencePressEvent: 'click',
    }),
  ]);

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

  const value: TooltipContextValue = {
    open,
    mounted,
    floating,
    nodeId,
    getReferenceProps,
    setTrigger,
    setPopup,
    popupId,
    described: open && popup !== null,
  };

  return (
    <FloatingNode id={nodeId}>
      <TooltipContext value={value}>{children}</TooltipContext>
    </FloatingNode>
  );
}

function canClose(
  reason: TooltipOpenChangeReason,
  event: Event,
  trigger: Element | null,
  popup: HTMLElement | null,
) {
  if (reason === 'trigger-hover') return !trigger?.matches(':focus-visible');
  if (reason === 'trigger-focus') {
    return !trigger?.matches(':hover') && !popup?.matches(':hover');
  }
  if (reason !== 'escape-key' || !popup) return true;
  return (
    !popup.closest('[inert]') &&
    !event.defaultPrevented &&
    !hasNativeEscapeOwner(popup.ownerDocument)
  );
}

type Listener = (data: { reason?: OpenChangeReason }) => void;

function withoutEscape(events: FloatingEvents): FloatingEvents {
  const listeners = new WeakMap<Listener, Listener>();
  return {
    emit: (name, data) => events.emit(name, data),
    on(name, listener) {
      const filtered: Listener = (data) => {
        if (data?.reason !== 'escape-key') listener(data);
      };
      listeners.set(listener, filtered);
      events.on(name, filtered);
    },
    off(name, listener) {
      events.off(name, listeners.get(listener) ?? listener);
    },
  };
}
