'use client';

import {
  FloatingNode,
  FloatingTree,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  type OpenChangeReason,
} from '@floating-ui/react';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  DialogBackdropContext,
  DialogContext,
  type DialogContextValue,
  type DialogOpenChangeDetails,
  type DialogOpenChangeReason,
} from './dialog-context';
import { isInExemptContainer, isTopmostModal } from './modality';

export interface DialogRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: DialogOpenChangeDetails) => void;
  children?: ReactNode;
}

export function DialogRoot(props: DialogRootProps) {
  const parentNodeId = useFloatingParentNodeId();
  const root = <DialogNode {...props} parentNodeId={parentNodeId} />;
  return parentNodeId === null ? <FloatingTree>{root}</FloatingTree> : root;
}

type DismissReason = Extract<
  DialogOpenChangeReason,
  'escape-key' | 'outside-press'
>;

const dismissReasons: Partial<Record<OpenChangeReason, DismissReason>> = {
  'escape-key': 'escape-key',
  'outside-press': 'outside-press',
};

const nativeEscapeOwner =
  'dialog:modal, [popover]:popover-open:not([popover="manual"])';

function DialogNode({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  parentNodeId,
  children,
}: DialogRootProps & { parentNodeId: string | null }) {
  const controlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlled ? openProp : uncontrolledOpen;

  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const [rejected, setRejected] = useState(false);
  if (!mounted && rejected) setRejected(false);

  const [popup, setPopup] = useState<HTMLElement | null>(null);
  const [backdrop, setBackdrop] = useState<HTMLElement | null>(null);
  const [titleId, setTitleId] = useState<string>();
  const [descriptionId, setDescriptionId] = useState<string>();
  const popupId = useId();
  const pressedTriggerRef = useRef<HTMLElement>(null);
  const nodeId = useFloatingNodeId();

  const requestOpenChange = (
    next: boolean,
    details: DialogOpenChangeDetails,
  ) => {
    if (!controlled) setUncontrolledOpen(next);
    onOpenChange?.(next, details);
  };

  const { refs, context } = useFloating({
    nodeId,
    open,
    elements: { floating: popup },
    onOpenChange(next, event, reason) {
      const dialogReason = reason && dismissReasons[reason];
      if (!dialogReason || !event || !popup) return;
      if (!canDismiss(popup, dialogReason, event)) return;
      requestOpenChange(next, { reason: dialogReason, event });
    },
  });

  useLayoutEffect(() => {
    if (open || !mounted) return;
    let current = true;
    exitAnimationsFinished([popup, backdrop]).then(() => {
      if (!current) return;
      pressedTriggerRef.current = null;
      setMounted(false);
    });
    return () => {
      current = false;
    };
  }, [open, mounted, popup, backdrop]);

  const value: DialogContextValue = {
    open,
    mounted,
    rejected,
    reject: () => setRejected(true),
    requestOpenChange,
    floating: context,
    nodeId,
    parentNodeId,
    setTrigger: refs.setReference,
    pressedTriggerRef,
    setPopup,
    setBackdrop,
    popupId,
    titleId,
    descriptionId,
    setTitleId,
    setDescriptionId,
  };

  return (
    <FloatingNode id={nodeId}>
      <DialogContext value={value}>
        <DialogBackdropContext value={false}>{children}</DialogBackdropContext>
      </DialogContext>
    </FloatingNode>
  );
}

function canDismiss(popup: HTMLElement, reason: DismissReason, event: Event) {
  if (event.defaultPrevented) return false;
  if (!isTopmostModal(popup)) return false;
  if (reason === 'escape-key') {
    return !popup.ownerDocument.querySelector(nativeEscapeOwner);
  }
  return !isInExemptContainer(popup, event.target);
}

function exitAnimationsFinished(elements: (HTMLElement | null)[]) {
  const animations = elements
    .flatMap((element) => element?.getAnimations({ subtree: true }) ?? [])
    .filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      return (
        elements.includes(effect?.target as HTMLElement | null) &&
        effect?.getComputedTiming().endTime !== Infinity
      );
    });
  return Promise.allSettled(animations.map((animation) => animation.finished));
}
