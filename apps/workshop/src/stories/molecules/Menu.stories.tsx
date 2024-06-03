import { Button, Menu } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof Menu> = {
  title: 'Molecules/Menu',
  component: Menu,
  subcomponents: {
    'Menu.Trigger': Menu.Trigger as any,
    'Menu.List': Menu.List as any
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
    <Menu {...args}>
      <Menu.Trigger>
        <Button>Menu</Button>
      </Menu.Trigger>
      <Menu.List className="flex flex-col rounded-lg bg-white p-2 shadow-md">
        <Menu.Item>Lorem</Menu.Item>
        <Menu.Item>Ipsum</Menu.Item>
        <Menu.Item>Dolor</Menu.Item>
      </Menu.List>
    </Menu>
  )
};

export const Default: Story = {
  ...Template,
  args: {
    placement: 'bottom'
  }
};

