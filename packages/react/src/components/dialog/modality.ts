import { isDevelopment } from '../../internal/composition/diagnostics';

export const MODAL_EXEMPT_ATTRIBUTE = 'data-pandorah-modal-exempt';

const exemptSelector = `body > [${MODAL_EXEMPT_ATTRIBUTE}]`;
const portalSelector = '[data-floating-ui-portal]';
const focusGuardAttribute = 'data-floating-ui-focus-guard';

const maxInertWrites = 2;

export interface Modal {
  popup: HTMLElement;
  openers: Element[];
  onIsolationFailure: () => void;
}

interface Modality {
  stack: Modal[];
  owned: Set<Element>;
  observer: MutationObserver;
  reconciling: boolean;
  stale: boolean;
  stop: () => void;
}

export interface OpenModal {
  replacePopup: (popup: HTMLElement) => void;
  close: () => void;
}

const modalities = new WeakMap<Document, Modality>();

export function openModal({
  popup,
  openers,
  onIsolationFailure,
}: Modal): OpenModal {
  const document = popup.ownerDocument;
  const modality = modalities.get(document) ?? start(document);
  const modal: Modal = { popup, openers, onIsolationFailure };
  modality.stack.push(modal);
  reconcile(modality, document);

  return {
    replacePopup(element) {
      if (element === modal.popup || !modality.stack.includes(modal)) return;
      modal.popup = element;
      reconcile(modality, document);
    },
    close() {
      const index = modality.stack.indexOf(modal);
      if (index === -1) return;
      modality.stack.splice(index, 1);
      reconcile(modality, document);
    },
  };
}

export function isTopmostModal(popup: Element) {
  return topmost(modalities.get(popup.ownerDocument))?.popup === popup;
}

export function isInExemptContainer(
  popup: Element,
  target: EventTarget | null,
) {
  const modal = modalities
    .get(popup.ownerDocument)
    ?.stack.find((candidate) => candidate.popup === popup);
  return (
    modal !== undefined &&
    target instanceof Node &&
    getExemptElements(modal).some((container) => container.contains(target))
  );
}

function getExemptElements({ popup, openers }: Modal) {
  return Array.from(
    popup.ownerDocument.querySelectorAll(exemptSelector),
  ).filter(
    (container) => !openers.some((opener) => container.contains(opener)),
  );
}

function topmost(modality: Modality | undefined) {
  return modality?.stack[modality.stack.length - 1];
}

function start(document: Document): Modality {
  const window = document.defaultView!;
  const observer = new MutationObserver((records) => {
    reconcile(modality, document, records);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['inert', MODAL_EXEMPT_ATTRIBUTE],
  });

  const onFocusIn = (event: FocusEvent) => {
    const modal = topmost(modality);
    if (!modal || isUsable(modal, event.target)) return;
    const previous = event.relatedTarget;
    const destination =
      previous instanceof HTMLElement && isUsable(modal, previous)
        ? previous
        : modal.popup;
    destination.focus({ preventScroll: true });
    if (document.activeElement === event.target) {
      (event.target as HTMLElement).blur();
    }
  };

  const onMouseDown = (event: MouseEvent) => {
    const modal = topmost(modality);
    if (modal && !isUsable(modal, event.target)) {
      keepFocusThroughPress(modality, document, event);
    }
  };

  document.addEventListener('focusin', onFocusIn, true);
  window.addEventListener('mousedown', onMouseDown, true);

  const modality: Modality = {
    stack: [],
    owned: new Set(),
    observer,
    reconciling: false,
    stale: false,
    stop() {
      observer.disconnect();
      document.removeEventListener('focusin', onFocusIn, true);
      window.removeEventListener('mousedown', onMouseDown, true);
      modalities.delete(document);
    },
  };
  modalities.set(document, modality);
  return modality;
}

function keepFocusThroughPress(
  modality: Modality,
  document: Document,
  event: MouseEvent,
) {
  const focused = document.activeElement;
  const path = event.composedPath();
  const last = path[path.length - 1];
  const press = new AbortController();
  const keepFocus = (pressed: Event) => {
    if (pressed !== event) return;
    if (!event.cancelBubble && event.currentTarget !== last) return;
    press.abort();
    event.preventDefault();
  };
  for (const target of path) {
    target.addEventListener('mousedown', keepFocus, { signal: press.signal });
  }
  document.defaultView!.setTimeout(() => {
    if (press.signal.aborted) return;
    press.abort();
    const modal = topmost(modality);
    if (
      document.activeElement === document.body &&
      focused instanceof HTMLElement &&
      modal &&
      isUsable(modal, focused)
    ) {
      focused.focus({ preventScroll: true });
    }
  });
}

function takeOwnership(modality: Modality, records: MutationRecord[]) {
  for (const record of records) {
    const target = record.target as Element;
    if (
      record.attributeName === 'inert' &&
      modality.owned.has(target) &&
      target.hasAttribute('inert')
    ) {
      modality.owned.delete(target);
    }
  }
}

function reconcile(
  modality: Modality,
  document: Document,
  records: MutationRecord[] = [],
) {
  takeOwnership(modality, records);
  if (modality.reconciling) {
    modality.stale = true;
    return;
  }
  modality.reconciling = true;
  const inertWrites = new Map<Element, number>();
  try {
    let changes = records;
    do {
      modality.stale = false;
      changes = reconcilePass(modality, document, changes, inertWrites);
    } while (changes.length > 0 || modality.stale);
  } finally {
    modality.reconciling = false;
  }
  if (modality.stack.length === 0) modality.stop();
}

function reconcilePass(
  modality: Modality,
  document: Document,
  records: MutationRecord[],
  inertWrites: Map<Element, number>,
) {
  const changes = [...records, ...readRecords(modality)];
  const modal = topmost(modality);
  const outside = modal
    ? findOutsideElements(document, getUsableElements(modal))
    : new Set<Element>();
  const queued: MutationRecord[] = [];
  const write = (element: Element, inert: boolean) => {
    queued.push(...setInert(modality, element, inert));
    return !modality.stale;
  };

  for (const element of modality.owned) {
    if (outside.has(element)) continue;
    modality.owned.delete(element);
    if (!write(element, false)) return queued;
  }
  if (!modal) return queued;

  const added = new Set(changes.flatMap((record) => [...record.addedNodes]));
  for (const element of outside) {
    if (element.hasAttribute('inert')) continue;
    const writes = inertWrites.get(element) ?? 0;
    if (writes === maxInertWrites) {
      failIsolation(modality, modal, element);
      return queued;
    }
    inertWrites.set(element, writes + 1);
    const reclaimed = modality.owned.has(element);
    if (isDevelopment && !reclaimed && added.has(element)) {
      console.warn(
        `Dialog: made <${element.localName}> inert because it was added outside the open dialog. Render it inside the popup (a portal container), or mark its top-level container with \`${MODAL_EXEMPT_ATTRIBUTE}\` to keep it usable.`,
      );
    }
    modality.owned.add(element);
    if (!write(element, true)) return queued;
  }
  return queued;
}

function failIsolation(modality: Modality, modal: Modal, element: Element) {
  if (isDevelopment) {
    console.error(
      `Dialog: <${element.localName}> removed the \`inert\` the dialog set on it, so the page behind the dialog cannot be made inert. The dialog is not shown.`,
    );
  }
  withdraw(modal);
  modality.stale = true;
  const index = modality.stack.indexOf(modal);
  if (index === -1) return;
  modality.stack.splice(index, 1);
  modal.onIsolationFailure();
}

function withdraw(modal: Modal) {
  const layer = layerOf(modal);
  layer.style.setProperty('transition-property', 'none', 'important');
  layer.style.setProperty('display', 'none', 'important');
  const focused = layer.ownerDocument.activeElement;
  if (focused instanceof HTMLElement && layer.contains(focused)) focused.blur();
}

function readRecords(modality: Modality) {
  const records = modality.observer.takeRecords();
  takeOwnership(modality, records);
  return records;
}

function setInert(modality: Modality, element: Element, inert: boolean) {
  if (element.hasAttribute('inert') === inert) return [];
  element.toggleAttribute('inert', inert);
  const [, ...others] = modality.observer.takeRecords();
  takeOwnership(modality, others);
  return others;
}

function findOutsideElements(document: Document, usable: Element[]) {
  const path = new Set<Element>();
  for (const element of usable) {
    for (let node: Element | null = element; node; node = node.parentElement) {
      path.add(node);
    }
  }
  const outside = new Set<Element>();
  const visit = (parent: Element) => {
    for (const child of parent.children) {
      if (usable.includes(child) || child.localName === 'script') continue;
      if (path.has(child)) visit(child);
      else outside.add(child);
    }
  };
  visit(document.body);
  return outside;
}

function getUsableElements(modal: Modal) {
  const siblings = Array.from(modal.popup.parentElement?.children ?? []);
  return [
    modal.popup,
    ...siblings.filter((sibling) => sibling.hasAttribute(focusGuardAttribute)),
    ...layerOf(modal).querySelectorAll(portalSelector),
    ...getExemptElements(modal),
  ];
}

function isUsable(modal: Modal, target: EventTarget | null) {
  return (
    target instanceof Node &&
    getUsableElements(modal).some((element) => element.contains(target))
  );
}

function layerOf({ popup }: Modal) {
  return popup.closest<HTMLElement>(portalSelector) ?? popup;
}
