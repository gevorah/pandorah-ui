import {
  Popover,
  type PopoverPopupProps,
  type PopoverRootProps,
} from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { StyledButton } from '../../components/styled-button';
import styles from '../../styles/popover.module.css';

function ShareLink({
  side,
  align,
  ...props
}: PopoverRootProps & Pick<PopoverPopupProps, 'side' | 'align'>) {
  return (
    <Popover.Root {...props}>
      <Popover.Trigger render={<StyledButton variant="outline" />}>
        Share
      </Popover.Trigger>
      <Popover.Popup
        side={side}
        align={align}
        sideOffset={8}
        className={styles.popup}
      >
        <Popover.Title className={styles.title}>Share draft</Popover.Title>
        <Popover.Description className={styles.description}>
          Anyone with the link can view this draft.
        </Popover.Description>
        <label className={styles.field}>
          Link
          <input
            className={styles.input}
            readOnly
            value="https://example.com/drafts/42"
          />
        </label>
        <div className={styles.actions}>
          <Popover.Close render={<StyledButton />}>Done</Popover.Close>
        </div>
      </Popover.Popup>
    </Popover.Root>
  );
}

const meta = {
  title: 'Popover',
  component: ShareLink,
  parameters: {
    layout: 'centered',
  },
  args: {
    onOpenChange: fn(),
  },
  argTypes: {
    side: {
      control: 'inline-radio',
      options: ['top', 'right', 'bottom', 'left'],
    },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
  },
} satisfies Meta<typeof ShareLink>;

export default meta;

type Story = StoryObj<typeof meta>;

// The popup renders in a portal at the end of the body, outside the canvas.
const portal = (canvasElement: HTMLElement) =>
  within(canvasElement.ownerDocument.body);

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Share' });

    await userEvent.click(trigger);
    const popover = portal(canvasElement).getByRole('dialog', {
      name: 'Share draft',
    });
    await expect(popover).toHaveAccessibleDescription(
      'Anyone with the link can view this draft.',
    );
    await waitFor(() =>
      expect(portal(canvasElement).getByRole('textbox')).toHaveFocus(),
    );
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ reason: 'trigger-press' }),
    );
  },
};

export const ClosesWithEscape: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Share' });
    await userEvent.click(trigger);
    await waitFor(() =>
      expect(portal(canvasElement).getByRole('textbox')).toHaveFocus(),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        portal(canvasElement).queryByRole('dialog'),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
