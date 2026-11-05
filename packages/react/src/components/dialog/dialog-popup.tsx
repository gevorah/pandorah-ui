'use client';

import {
  FloatingFocusManager,
  FloatingPortal,
  useDismiss,
  useFloatingTree,
  useInteractions,
} from '@floating-ui/react';
import {
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type RefObject,
} from 'react';
import { tabbable } from 'tabbable';

import { isDevelopment } from '../../internal/composition/diagnostics';
import { useMergeRefs } from '../../internal/composition/use-merge-refs';
import {
  useRender,
  type ComposableProps,
  type UseRenderOptions,
} from '../../internal/composition/use-render';
import { DialogBackdropContext, useDialogContext } from './dialog-context';
import { isTopmostModal } from './modality';
import { lockScroll } from './scroll-lock';
import { useModalRegistration } from './use-modal-registration';

export interface DialogPopupProps
  extends Omit<ComponentPropsWithRef<'div'>, 'role'>, ComposableProps<'div'> {
  role?: 'dialog' | 'alertdialog';
  initialFocus?: RefObject<HTMLElement | null>;
}

type Interceptors = NonNullable<UseRenderOptions<'div'>['interceptors']>;
type Interceptor = (event: unknown, next: () => void) => void;

const getInsideBody = () => [document.body];

export function DialogPopup(props: DialogPopupProps) {
  const { mounted, rejected } = useDialogContext('Dialog.Popup');
  const inBackdrop = useContext(DialogBackdropContext);
  if (!mounted || rejected) return null;
  const popup = <PopupElement {...props} />;
  return inBackdrop ? popup : <FloatingPortal>{popup}</FloatingPortal>;
}

function PopupElement({
  role = 'dialog',
  initialFocus,
  render,
  ref,
  ...props
}: DialogPopupProps) {
  const {
    open,
    floating,
    nodeId,
    parentNodeId,
    pressedTriggerRef,
    setPopup,
    reject,
    popupId,
    titleId,
    descriptionId,
  } = useDialogContext('Dialog.Popup');
  const tree = useFloatingTree();

  const { getFloatingProps } = useInteractions([
    useDismiss(floating, {
      outsidePress: role !== 'alertdialog',
      outsidePressEvent: 'mousedown',
      capture: { outsidePress: false },
      bubbles: { outsidePress: false },
    }),
  ]);
  const floatingProps = splitFloatingProps(getFloatingProps());

  const elementRef = useRef<HTMLDivElement>(null);
  const popup = floating.elements.floating;
  const [opener] = useState(() => document.activeElement);
  const returnFocusRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => lockScroll(document), []);

  const requireModalElement = useEffectEvent(() => {
    const element = elementRef.current;
    if (
      element instanceof HTMLElement &&
      !(element instanceof HTMLDialogElement)
    ) {
      return;
    }
    if (isDevelopment && element) {
      console.error(
        `Dialog.Popup: rendered <${element.localName}>, which cannot hold a modal dialog. Render a <div>, a <section> or a custom element. The dialog is not shown.`,
      );
    }
    reject();
  });
  useLayoutEffect(() => requireModalElement());

  const getOpeners = () =>
    [pressedTriggerRef.current, opener, floating.elements.domReference].filter(
      (candidate): candidate is Element =>
        candidate instanceof Element &&
        candidate !== candidate.ownerDocument.body,
    );
  useModalRegistration(popup, getOpeners, reject);

  useLayoutEffect(() => {
    const parent = tree?.nodesRef.current.find(
      (node) => node.id === parentNodeId,
    );
    returnFocusRef.current =
      [...getOpeners(), parent?.context?.elements.floating].find(
        (candidate): candidate is HTMLElement =>
          candidate instanceof HTMLElement &&
          candidate.isConnected &&
          !elementRef.current?.contains(candidate),
      ) ?? null;
  });

  useEffect(() => {
    if (!popup) return;
    const document = popup.ownerDocument;
    const layer = popup.closest('[data-floating-ui-portal]') ?? popup;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented) return;
      if (!isTopmostModal(popup)) return;
      const target = event.target as Node;
      if (target !== document.body && !layer.contains(target)) return;
      const hasOpenChild = tree?.nodesRef.current.some(
        (node) => node.parentId === nodeId && node.context?.open,
      );
      if (hasOpenChild || tabbable(popup).length > 0) return;
      event.preventDefault();
      popup.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [popup, tree, nodeId]);

  const element = useRender({
    name: 'Dialog.Popup',
    tag: 'div',
    render,
    ref: useMergeRefs(ref, setPopup, elementRef),
    props: {
      tabIndex: floatingProps.tabIndex,
      ...props,
      'aria-labelledby':
        props['aria-labelledby'] ?? (props['aria-label'] ? undefined : titleId),
      'aria-describedby':
        [props['aria-describedby'], descriptionId].filter(Boolean).join(' ') ||
        undefined,
    },
    owned: {
      ...floatingProps.attributes,
      id: popupId,
      role,
      'aria-modal': 'true',
      'data-state': open ? 'open' : 'closed',
    },
    interceptors: floatingProps.interceptors,
  });

  return (
    <FloatingFocusManager
      context={floating}
      initialFocus={initialFocus ?? 0}
      returnFocus={returnFocusRef}
      getInsideElements={getInsideBody}
    >
      {element}
    </FloatingFocusManager>
  );
}

function splitFloatingProps(floatingProps: Record<string, unknown>) {
  const { tabIndex, ...rest } = floatingProps;
  const attributes: Record<string, unknown> = {};
  const interceptors: Record<string, Interceptor> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (!key.startsWith('on')) {
      attributes[key] = value;
    } else if (typeof value === 'function') {
      interceptors[key] = (event, next) => {
        next();
        value(event);
      };
    }
  }
  return {
    tabIndex: tabIndex as number | undefined,
    attributes,
    interceptors: interceptors as Interceptors,
  };
}
