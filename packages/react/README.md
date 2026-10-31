# @pandorah-ui/react

Unstyled, accessible React components for Pandorah UI. Each component renders a native HTML element with its semantics and behavior, and leaves styling to your app: the package ships no CSS.

## Usage

`Button` renders a native `<button>` and accepts its props and `ref`.

```tsx
import { Button } from '@pandorah-ui/react';

function SaveButton({ saving, save }: { saving: boolean; save: () => void }) {
  return (
    <Button className="save-button" pending={saving} onClick={save}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
  );
}
```

- `type` defaults to `"button"`, so a `Button` inside a form doesn't submit it. Pass `type="submit"` when it should.
- `pending` marks an operation in progress. The button stays focusable, but `Button` prevents its normal activation and marks it with `aria-disabled="true"` and `data-pending` for styling. Showing progress, such as a spinner, is up to you.

## Composition

The `render` prop replaces the `<button>` that `Button` renders with your own element, without adding wrappers. Pass an element to reuse a component, or a function to control the markup.

### Element

```tsx
import type { ComponentPropsWithRef } from 'react';

function OutlineButton(props: ComponentPropsWithRef<'button'>) {
  return <button {...props} data-variant="outline" />;
}

<Button render={<OutlineButton />}>Save</Button>;
```

`Button` merges its props, behavior and `ref` into the element, so the component must pass all of them to the `<button>` it renders. Spreading `props` is enough, since `ref` is a prop. The element must render a `<button>`; for navigation, use a link instead.

### Function

```tsx
<Button
  render={(props) => (
    <button {...props}>
      <span aria-hidden="true">+</span>
      {props.children}
    </button>
  )}
>
  Add
</Button>
```

The function receives the props `Button` prepared, including its `ref`, and must forward all of them to the `<button>` it returns. Overriding one, for example with a handler written after `{...props}`, replaces `Button`'s, so pass your own props and handlers to `Button`. The function is called rather than rendered as a component, so it can't use Hooks.
