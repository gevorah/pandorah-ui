import {
  Button,
  DialogTrigger,
  Popover,
  PreviewTrigger,
  type DialogTriggerProps,
  type PopoverProps,
} from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

type PopoverStoryArgs = Omit<PopoverProps, 'children' | 'isOpen'> &
  Pick<DialogTriggerProps, 'isOpen'>;

const meta = {
  title: 'Molecules/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placement: {
      options: [
        'top',
        'top start',
        'top end',
        'bottom',
        'bottom start',
        'bottom end',
        'left',
        'right',
        'start',
        'end',
      ],
      control: { type: 'select' },
    },
    showArrow: { control: 'boolean' },
  },
  args: {
    placement: 'bottom',
    showArrow: false,
    'aria-label': 'Share',
  },
  render: ({ isOpen, ...popoverProps }) => (
    <DialogTrigger isOpen={isOpen}>
      <Button variant="outline">Share</Button>
      <Popover {...popoverProps}>
        <p style={{ margin: 0 }}>Anyone with the link can view.</p>
        <Button size="sm" style={{ marginTop: '0.75rem' }}>
          Copy link
        </Button>
      </Popover>
    </DialogTrigger>
  ),
} satisfies Meta<PopoverStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Interactions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Share' });

    await userEvent.click(trigger);
    const dialog = await page.findByRole('dialog', { name: 'Share' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement),
    );

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.keyboard('{Enter}');
    await page.findByRole('dialog', { name: 'Share' });
    await userEvent.tab();
    await expect(page.getByRole('button', { name: 'Copy link' })).toHaveFocus();

    await userEvent.click(canvasElement.ownerDocument.body);
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull());
  },
};

export const WithArrow: Story = {
  args: {
    isOpen: true,
    showArrow: true,
  },
};

export const Preview: Story = {
  render: (args) => (
    <PreviewTrigger delay={0} closeDelay={0}>
      <Button variant="ghost">Release notes</Button>
      <Popover {...args} aria-label="Release notes preview">
        <p style={{ margin: 0 }}>Version 2.0 adds dark mode.</p>
      </Popover>
    </PreviewTrigger>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Release notes' });

    await userEvent.pointer({ target: canvasElement });
    await userEvent.hover(trigger);
    await page.findByRole('dialog', { name: 'Release notes preview' });

    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull());
  },
};
