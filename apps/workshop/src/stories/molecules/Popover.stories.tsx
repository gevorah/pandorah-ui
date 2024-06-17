import { Button, Popover } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Popover.Root> = {
  title: 'Molecules/Popover',
  component: Popover.Root,
  subcomponents: {
    'Popover.Trigger': Popover.Trigger as any,
    'Popover.Content': Popover.Content as any,
    'Popover.Arrow': Popover.Arrow as any
  },
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    placement: {
      options: [
        'bottom',
        'bottom-end',
        'bottom-start',
        'left',
        'left-end',
        'left-start',
        'right',
        'right-end',
        'right-start',
        'top',
        'top-end',
        'top-start'
      ],
      control: { type: 'select' }
    },
    children: {
      control: { disable: true }
    }
  }
};

export default meta;

type Story = StoryObj<typeof meta>;

const Template: Story = {
  render: (args) => (
    <Popover.Root {...args}>
      <Popover.Trigger as={Button}>Trigger</Popover.Trigger>
      <Popover.Content className="min-w-36 rounded-md bg-white p-1.5 shadow-md">
        <div>Content</div>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  )
};

export const Default: Story = {
  ...Template,
  args: {
    placement: 'bottom'
  }
};
