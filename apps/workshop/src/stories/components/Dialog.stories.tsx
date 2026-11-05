import { Dialog, type DialogRootProps } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { StyledButton } from '../../components/styled-button';
import styles from '../../styles/dialog.module.css';

function DiscardDraft({
  role,
  ...props
}: DialogRootProps & {
  role?: 'dialog' | 'alertdialog';
}) {
  return (
    <Dialog.Root {...props}>
      <Dialog.Trigger render={<StyledButton variant="outline" />}>
        Discard draft
      </Dialog.Trigger>
      <Dialog.Backdrop className={styles.backdrop}>
        <Dialog.Popup role={role} className={styles.popup}>
          <Dialog.Title className={styles.title}>Discard draft?</Dialog.Title>
          <Dialog.Description className={styles.description}>
            You will lose the changes you made since your last save.
          </Dialog.Description>
          <div className={styles.actions}>
            <Dialog.Close render={<StyledButton variant="ghost" />}>
              Keep editing
            </Dialog.Close>
            <Dialog.Close render={<StyledButton />}>Discard</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Backdrop>
    </Dialog.Root>
  );
}

const meta = {
  title: 'Dialog',
  component: DiscardDraft,
  parameters: {
    layout: 'centered',
  },
  args: {
    onOpenChange: fn(),
  },
} satisfies Meta<typeof DiscardDraft>;

export default meta;

type Story = StoryObj<typeof meta>;

// The popup renders in a portal at the end of the body, outside the canvas.
const portal = (canvasElement: HTMLElement) =>
  within(canvasElement.ownerDocument.body);

export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Discard draft' });

    await userEvent.click(trigger);
    const dialog = portal(canvasElement).getByRole('dialog', {
      name: 'Discard draft?',
    });
    await expect(dialog).toHaveAccessibleDescription(
      'You will lose the changes you made since your last save.',
    );
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(
      true,
      expect.objectContaining({ reason: 'trigger-press' }),
    );
  },
};

export const AlertDialog: Story = {
  args: {
    role: 'alertdialog',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Discard draft' }),
    );
    const body = portal(canvasElement);
    await userEvent.click(body.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() =>
      expect(body.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Discard draft' }),
      ).toHaveFocus(),
    );
  },
};
