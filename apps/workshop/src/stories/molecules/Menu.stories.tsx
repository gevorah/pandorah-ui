import { Button, Menu } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Menu> = {
  title: 'Molecules/Menu',
  component: Menu.Root,
  subcomponents: {
    'Menu.Trigger': Menu.Trigger as any,
    'Menu.List': Menu.List as any,
    'Menu.Item': Menu.Item as any
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
    <Menu.Root {...args}>
      <Menu.Trigger as={Button} variant="solid">
        Menu
      </Menu.Trigger>
      <Menu.List className="flex min-w-36 flex-col rounded-lg bg-white p-1.5 shadow-md">
        <Menu.Item className="flex w-full items-center px-3 py-1 focus:bg-neutral-100 disabled:text-neutral-300">
          Item A
        </Menu.Item>
        <Menu.Item
          disabled
          className="flex w-full items-center px-3 py-1 focus:bg-neutral-100 disabled:text-neutral-300"
        >
          Item B
        </Menu.Item>
        <Menu.Sub>
          <Menu.SubTrigger className="flex w-full items-center px-3 py-1 focus:bg-neutral-100 disabled:text-neutral-300">
            Submenu A
          </Menu.SubTrigger>
          <Menu.List className="flex min-w-36 flex-col rounded-lg bg-white p-1.5 shadow-md">
            <Menu.Item className="flex w-full items-center px-3 py-1 focus:bg-neutral-100 disabled:text-neutral-300">
              Item X
            </Menu.Item>
            <Menu.Item className="flex w-full items-center px-3 py-1 focus:bg-neutral-100 disabled:text-neutral-300">
              Item Y
            </Menu.Item>
            <Menu.Item className="flex w-full items-center px-3 py-1 focus:bg-neutral-100 disabled:text-neutral-300">
              Item Z
            </Menu.Item>
          </Menu.List>
        </Menu.Sub>
        <Menu.Divider />
        <Menu.Group>
          <Menu.Label className="pl-3 text-xs font-medium">Group A</Menu.Label>
          <Menu.Item className="flex w-full items-center px-3 py-1 focus:bg-neutral-100 disabled:text-neutral-300">
            Item A
          </Menu.Item>
          <Menu.Item className="flex w-full items-center px-3 py-1 focus:bg-neutral-100 disabled:text-neutral-300">
            Item B
          </Menu.Item>
        </Menu.Group>
      </Menu.List>
    </Menu.Root>
  )
};

export const Default: Story = {
  ...Template,
  args: {
    placement: 'bottom'
  }
};

