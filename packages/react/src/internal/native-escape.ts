const nativeEscapeOwner =
  'dialog:modal, [popover]:popover-open:not([popover="manual"])';

export function hasNativeEscapeOwner(document: Document) {
  return document.querySelector(nativeEscapeOwner) !== null;
}
