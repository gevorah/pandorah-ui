import { Button, Tooltip } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Tooltip.Root> = {
  title: 'Molecules/Tooltip',
  component: Tooltip.Root,
  subcomponents: {
    'Tooltip.Trigger': Tooltip.Trigger as any,
    'Tooltip.Content': Tooltip.Content as any
    // 'Tooltip.Arrow': Tooltip.Arrow as any
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
    <Tooltip.Root {...args}>
      <Tooltip.Trigger as={Button}>Trigger</Tooltip.Trigger>
      <Tooltip.Content className="rounded-md bg-neutral-600 p-1.5 shadow-md">
        <span>Tooltip</span>
        {/* <Tooltip.Arrow /> */}
      </Tooltip.Content>
    </Tooltip.Root>
  )
};

export const Default: Story = {
  ...Template,
  args: {
    placement: 'top'
  }
};

