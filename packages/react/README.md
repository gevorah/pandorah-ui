# Pandorah UI

**Unstyled, composable React primitives for accessible interfaces.**

`@pandorah-ui/react` provides interaction behavior, state management, and accessibility attributes without shipping CSS. Components use native HTML elements by default, while the `render` prop lets you bring your own elements and styling.

## Installation

```bash
pnpm install @pandorah-ui/react @floating-ui/react
```

`@floating-ui/react` is a peer dependency. Keep a single copy of it and `@pandorah-ui/react` in your application so nested floating layers and dialogs share the same context and modal stack.

## Quick start

```tsx
import { Button, Dialog } from '@pandorah-ui/react';

export function Example() {
  return (
    <Dialog.Root>
      <Dialog.Trigger render={<Button />}>Open dialog</Dialog.Trigger>
      <Dialog.Backdrop className="dialog-backdrop">
        <Dialog.Popup className="dialog-popup">
          <Dialog.Title>Confirm action</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to continue?
          </Dialog.Description>
          <Dialog.Close>Cancel</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Backdrop>
    </Dialog.Root>
  );
}
```

Pandorah UI does not style these elements. Supply classes and CSS as needed:

```css
.dialog-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 0.4);
}

.dialog-popup {
  padding: 1.5rem;
  background: white;
  border-radius: 0.75rem;
}
```

## Composition and styling

Components accept standard element props and refs. Use `render` to replace their default elements without adding a wrapper:

```tsx
<Button render={<button className="primary" />}>Save</Button>
```

Custom components and render functions must forward the provided props and ref. When replacing a native control with a different HTML element, you are responsible for its appropriate semantics, focusability, and keyboard behavior. Component state can be styled with attributes such as `data-pending` on Button and `data-popup-open` on Dialog.Trigger.

Dialog.Popup and Dialog.Backdrop have `data-state="open"` while the dialog is open and `data-state="closed"` once it closes. A closing dialog stays mounted, and modal, until the finite CSS transitions and animations of the Popup and Backdrop themselves finish; animations of their descendants are not awaited. Animate entry with `@starting-style` or keyframes:

```css
.dialog-popup {
  transition: opacity 200ms;
}

@starting-style {
  .dialog-popup[data-state='open'] {
    opacity: 0;
  }
}

.dialog-popup[data-state='closed'] {
  opacity: 0;
}
```

While a modal dialog is open, the rest of the page is inert. To keep content such as toasts usable, render it in a direct child of `body` marked with `data-pandorah-modal-exempt`. A container that holds the element that opened the dialog is not exempt.
