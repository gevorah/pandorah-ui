import {
  Button,
  DialogTrigger,
  Popover,
  Tooltip,
  TooltipTrigger,
} from '@pandorah-ui/react';
import { composeStories } from '@storybook/react';
import { clearAllMocks } from '@storybook/test';
import { createRef, type ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as ButtonStories from './atoms/Button.stories';
import * as MenuStories from './molecules/Menu.stories';
import * as PopoverStories from './molecules/Popover.stories';
import * as TooltipStories from './molecules/Tooltip.stories';

let container: HTMLDivElement;
let root: Root;

function render(element: ReactElement) {
  flushSync(() => root.render(element));
}

beforeEach(() => {
  clearAllMocks();
  container = document.body.appendChild(document.createElement('div'));
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  container.remove();
});

describe.each([
  ['Button', composeStories(ButtonStories)],
  ['Tooltip', composeStories(TooltipStories)],
  ['Popover', composeStories(PopoverStories)],
  ['Menu', composeStories(MenuStories)],
])('%s stories', (_, stories) => {
  const storiesWithPlay = Object.entries(stories).filter(
    ([, Story]) => Story.play,
  );

  it.each(storiesWithPlay)('%s', async (_, Story) => {
    render(<Story />);
    await Story.play!({ canvasElement: container });
  });
});

describe('Button', () => {
  it('passes the ref prop and DOM props to the native button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} data-testid="save" aria-label="Save draft">
        Save
      </Button>,
    );
    // @ts-expect-error
    void (<Button ref={createRef<HTMLDivElement>()}>Save</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.dataset.testid).toBe('save');
    expect(ref.current?.getAttribute('aria-label')).toBe('Save draft');
    expect(ref.current?.type).toBe('button');
  });

  it('appends className, including state functions, to the module class', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button
        ref={ref}
        variant="outline"
        size="sm"
        className={({ isDisabled }) => (isDisabled ? 'muted' : 'custom')}
      >
        Save
      </Button>,
    );

    const [moduleClass, ...rest] = ref.current?.classList ?? [];
    expect(moduleClass).toMatch(/button/);
    expect(rest).toEqual(['custom']);
    expect(ref.current?.dataset.variant).toBe('outline');
    expect(ref.current?.dataset.size).toBe('sm');
  });
});

describe('Tooltip', () => {
  it('passes the ref prop to the tooltip element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <TooltipTrigger isOpen>
        <Button>Save</Button>
        <Tooltip ref={ref}>Save changes</Tooltip>
      </TooltipTrigger>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('role')).toBe('tooltip');
  });
});

describe('Popover', () => {
  it('passes the ref prop to the popover element', () => {
    const ref = createRef<HTMLElement>();
    render(
      <DialogTrigger isOpen>
        <Button>Share</Button>
        <Popover ref={ref} aria-label="Share">
          Content
        </Popover>
      </DialogTrigger>,
    );

    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.getAttribute('role')).toBe('dialog');
  });
});
