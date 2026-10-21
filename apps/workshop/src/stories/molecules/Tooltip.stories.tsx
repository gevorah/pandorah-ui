import {
  Button,
  Tooltip,
  TooltipTrigger,
  type TooltipProps,
  type TooltipTriggerProps
} from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

async function hoverWithMouse(canvasElement: HTMLElement, target: Element) {
  await userEvent.pointer({ target: canvasElement });
  await userEvent.hover(target);
}

type TooltipStoryArgs = Omit<TooltipProps, 'children' | 'isOpen'> &
  Pick<
    TooltipTriggerProps,
    'delay' | 'closeDelay' | 'trigger' | 'isDisabled' | 'isOpen'
  > & {
    content: string;
  };

const meta = {
  title: 'Molecules/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered'
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
        'end'
      ],
      control: { type: 'select' }
    },
    trigger: {
      options: ['hover', 'focus'],
      control: { type: 'inline-radio' }
    }
  },
  args: {
    content: 'Save changes',
    placement: 'top'
  },
  render: ({
    delay,
    closeDelay,
    trigger,
    isDisabled,
    isOpen,
    content,
    ...tooltipProps
  }) => (
    <TooltipTrigger
      delay={delay}
      closeDelay={closeDelay}
      trigger={trigger}
      isDisabled={isDisabled}
      isOpen={isOpen}
    >
      <Button variant="outline">Save</Button>
      <Tooltip {...tooltipProps}>{content}</Tooltip>
    </TooltipTrigger>
  )
} satisfies Meta<TooltipStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Interactions: Story = {
  args: {
    delay: 0,
    closeDelay: 0
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Save' });

    await hoverWithMouse(canvasElement, trigger);
    const tooltip = await page.findByRole('tooltip');
    await expect(tooltip).toHaveTextContent('Save changes');
    await expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);

    await userEvent.unhover(trigger);
    await waitFor(() => expect(page.queryByRole('tooltip')).toBeNull());
    await expect(trigger).not.toHaveAttribute('aria-describedby');

    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await expect(await page.findByRole('tooltip')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(page.queryByRole('tooltip')).toBeNull());
    await expect(trigger).toHaveFocus();

    trigger.blur();
    await hoverWithMouse(canvasElement, trigger);
    await page.findByRole('tooltip');
    await userEvent.click(trigger);
    await waitFor(() => expect(page.queryByRole('tooltip')).toBeNull());
  }
};

export const Open: Story = {
  args: {
    isOpen: true,
    placement: 'right'
  }
};

export const LongContent: Story = {
  args: {
    isOpen: true,
    placement: 'top',
    content:
      'Saves the current draft and keeps a copy in the version history so it can be restored later.'
  }
};

export const IconButton: Story = {
  render: ({ content, ...tooltipProps }) => (
    <TooltipTrigger>
      <Button variant="ghost" size="icon" aria-label="Settings">
        <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
          <circle
            cx="8"
            cy="8"
            r="2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </Button>
      <Tooltip {...tooltipProps}>{content}</Tooltip>
    </TooltipTrigger>
  ),
  args: {
    content: 'Settings'
  }
};
