import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { StyledButton } from '../../components/styled-button';

const meta = {
  title: 'Button',
  component: StyledButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: ['solid', 'outline', 'ghost'],
      control: { type: 'inline-radio' },
    },
    size: {
      options: ['sm', 'md', 'lg', 'icon'],
      control: { type: 'inline-radio' },
    },
  },
  args: {
    variant: 'solid',
    size: 'md',
    children: 'Button',
    onClick: fn(),
  },
} satisfies Meta<typeof StyledButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Solid: Story = {
  args: {
    variant: 'solid',
  },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'Button',
    });

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);

    button.blur();
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button.matches(':focus-visible')).toBe(true);

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <StyledButton {...args} size="sm">
        Small
      </StyledButton>
      <StyledButton {...args} size="md">
        Medium
      </StyledButton>
      <StyledButton {...args} size="lg">
        Large
      </StyledButton>
      <StyledButton {...args} size="icon" aria-label="Add">
        <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
          <path
            d="M8 3v10M3 8h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </StyledButton>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'Button',
    });

    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();

    await userEvent.tab();
    await expect(button).not.toHaveFocus();
  },
};

export const Pending: Story = {
  args: {
    pending: true,
  },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'Button',
    });

    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await expect(button).toHaveAttribute('data-pending');
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
