import { Button } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: ['solid', 'outline', 'ghost'],
      control: { type: 'inline-radio' }
    },
    size: {
      options: ['sm', 'md', 'lg', 'icon'],
      control: { type: 'inline-radio' }
    },
    isDisabled: { control: 'boolean' },
    isPending: { control: 'boolean' }
  },
  args: {
    onPress: fn(),
    isDisabled: false,
    variant: 'solid',
    size: 'md',
    children: 'Button'
  }
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Solid: Story = {
  args: {
    variant: 'solid'
  },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'Button'
    });

    await userEvent.click(button);
    await expect(args.onPress).toHaveBeenCalledTimes(1);
    await expect(button).not.toHaveAttribute('data-focus-visible');

    button.blur();
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button).toHaveAttribute('data-focus-visible');

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await expect(args.onPress).toHaveBeenCalledTimes(3);
  }
};

export const Outline: Story = {
  args: {
    variant: 'outline'
  }
};

export const Ghost: Story = {
  args: {
    variant: 'ghost'
  }
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
      <Button {...args} size="icon" aria-label="Add">
        <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </Button>
    </div>
  )
};

export const Disabled: Story = {
  args: {
    isDisabled: true
  },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'Button'
    });

    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onPress).not.toHaveBeenCalled();

    await userEvent.tab();
    await expect(button).not.toHaveFocus();
  }
};
