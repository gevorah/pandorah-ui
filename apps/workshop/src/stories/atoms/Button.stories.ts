import { Button } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

const meta: Meta<typeof Button> = {
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
      options: ['sm', 'md', 'lg'],
      control: { type: 'inline-radio' }
    }
  },
  args: {
    onClick: fn(),
    disabled: false,
    variant: 'solid',
    size: 'md',
    children: 'Button'
  }
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Solid: Story = {
  args: {
    variant: 'solid'
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
