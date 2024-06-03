import { Button, Popover } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Popover> = {
  title: 'Molecules/Popover',
  component: Popover,
  subcomponents: {
    'Popover.Trigger': Popover.Trigger as any,
    'Popover.Content': Popover.Content as any
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
    <Popover {...args}>
      <Popover.Trigger>
        <Button>Trigger</Button>
      </Popover.Trigger>
      <Popover.Content className="rounded-lg bg-white p-2 shadow-md">
        <div>Content</div>
        <Popover.Arrow />
      </Popover.Content>
    </Popover>
  )
};

export const Default: Story = {
  ...Template,
  args: {
    placement: 'bottom'
  }
};
