import { Button, Menu } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChevronRight } from 'lucide-react';

const meta: Meta<typeof Menu.Root> = {
  title: 'Molecules/Menu',
  component: Menu.Root,
  subcomponents: {
    'Menu.Trigger': Menu.Trigger as any,
    'Menu.List': Menu.List as any,
    'Menu.Item': Menu.Item as any,
    'Menu.Sub': Menu.Sub as any,
    'Menu.SubTrigger': Menu.SubTrigger as any,
    'Menu.Divider': Menu.Divider as any,
    'Menu.Group': Menu.Group as any,
    'Menu.Label': Menu.Label as any,
    'Menu.Arrow': Menu.Arrow as any
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
    trigger: {
      options: ['click', 'hover'],
      control: { type: 'inline-radio' }
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
    <Menu.Root {...args}>
      <Menu.Trigger as={Button} variant="solid">
        Menu
      </Menu.Trigger>
      <Menu.List className="flex min-w-36 flex-col rounded-md bg-white p-1.5 shadow-md">
        <Menu.Item className="flex w-full items-center rounded-md px-1.5 py-1 focus:bg-neutral-300/30 disabled:text-neutral-300">
          Item A
        </Menu.Item>
        <Menu.Item
          disabled
          className="flex w-full items-center rounded-md px-1.5 py-1 focus:bg-neutral-300/30 disabled:text-neutral-300"
        >
          Item B
        </Menu.Item>
        <Menu.Sub>
          <Menu.SubTrigger className="flex w-full items-center justify-between rounded-md px-1.5 py-1 focus:bg-neutral-300/30 disabled:text-neutral-300 data-[state=open]:bg-neutral-300/30">
            Submenu
            <ChevronRight className="size-4" />
          </Menu.SubTrigger>
          <Menu.List className="flex min-w-36 flex-col rounded-lg bg-white p-1.5 shadow-md">
            <Menu.Item className="flex w-full items-center rounded-md px-1.5 py-1 focus:bg-neutral-300/30 disabled:text-neutral-300">
              Item X
            </Menu.Item>
            <Menu.Item className="flex w-full items-center rounded-md px-1.5 py-1 focus:bg-neutral-300/30 disabled:text-neutral-300">
              Item Y
            </Menu.Item>
            <Menu.Item className="flex w-full items-center rounded-md px-1.5 py-1 focus:bg-neutral-300/30 disabled:text-neutral-300">
              Item Z
            </Menu.Item>
          </Menu.List>
        </Menu.Sub>
        <Menu.Divider />
        <Menu.Group>
          <Menu.Label className="pl-1.5 text-xs font-medium">
            Group A
          </Menu.Label>
          <Menu.Item className="flex w-full items-center rounded-md px-1.5 py-1 focus:bg-neutral-300/30 disabled:text-neutral-300">
            Item A
          </Menu.Item>
          <Menu.Item className="flex w-full items-center rounded-md px-1.5 py-1 focus:bg-neutral-300/30 disabled:text-neutral-300">
            Item B
          </Menu.Item>
        </Menu.Group>
        <Menu.Arrow />
      </Menu.List>
    </Menu.Root>
  )
};

export const Default: Story = {
  ...Template,
  args: {
    placement: 'bottom',
    trigger: 'click'
  }
};

