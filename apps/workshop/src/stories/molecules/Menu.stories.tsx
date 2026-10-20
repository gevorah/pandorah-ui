import {
  Button,
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
  SubmenuTrigger,
} from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  expect,
  fn,
  mocked,
  userEvent,
  waitFor,
  within,
} from '@storybook/test';

const meta = {
  title: 'Molecules/Menu',
  component: Menu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placement: {
      options: ['bottom start', 'bottom', 'bottom end', 'top start', 'top'],
      control: { type: 'select' },
    },
    showArrow: { control: 'boolean' },
  },
  args: {
    placement: 'bottom start',
    onAction: fn(),
  },
  render: (args) => (
    <MenuTrigger>
      <Button>Actions</Button>
      <Menu {...args}>
        <MenuItem id="edit">Edit</MenuItem>
        <MenuItem id="duplicate">Duplicate</MenuItem>
        <MenuItem id="archive" isDisabled>
          Archive
        </MenuItem>
        <SubmenuTrigger>
          <MenuItem id="share">Share</MenuItem>
          <Menu onAction={args.onAction}>
            <MenuItem id="email">Email</MenuItem>
            <MenuItem id="link">Copy link</MenuItem>
          </Menu>
        </SubmenuTrigger>
        <MenuSeparator />
        <MenuSection title="Danger zone">
          <MenuItem id="delete">Delete</MenuItem>
        </MenuSection>
      </Menu>
    </MenuTrigger>
  ),
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Interactions: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole('button', { name: 'Actions' });
    const item = (name: string) => page.getByRole('menuitem', { name });

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await page.findByRole('menu', { name: 'Actions' });
    await waitFor(() => expect(item('Edit')).toHaveFocus());

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(item('Share')).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(item('Email')).toHaveFocus());
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(item('Share')).toHaveFocus());
    await expect(page.getAllByRole('menu')).toHaveLength(1);

    await userEvent.keyboard('Del');
    await expect(item('Delete')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(mocked(args.onAction!).mock.lastCall?.[0]).toBe('delete');
    await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    await userEvent.click(trigger);
    await page.findByRole('menu');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());

    await userEvent.click(trigger);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Duplicate' }),
    );
    await expect(mocked(args.onAction!).mock.lastCall?.[0]).toBe('duplicate');
    await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
  },
};

export const Selection: Story = {
  render: (args) => (
    <MenuTrigger>
      <Button variant="outline">View</Button>
      <Menu {...args}>
        <MenuSection
          title="Panels"
          selectionMode="multiple"
          defaultSelectedKeys={['sidebar']}
        >
          <MenuItem id="sidebar">Sidebar</MenuItem>
          <MenuItem id="minimap">Minimap</MenuItem>
        </MenuSection>
        <MenuSeparator />
        <MenuSection
          title="Density"
          selectionMode="single"
          defaultSelectedKeys={['comfortable']}
        >
          <MenuItem id="comfortable">Comfortable</MenuItem>
          <MenuItem id="compact">Compact</MenuItem>
        </MenuSection>
      </Menu>
    </MenuTrigger>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getByRole('button', { name: 'View' }));
    const minimap = await page.findByRole('menuitemcheckbox', {
      name: 'Minimap',
    });
    await expect(
      page.getByRole('menuitemcheckbox', { name: 'Sidebar' }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(minimap).toHaveAttribute('aria-checked', 'false');
    await expect(
      page.getByRole('menuitemradio', { name: 'Comfortable' }),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(
      page.getByRole('group', { name: 'Density' }),
    ).toBeInTheDocument();

    await userEvent.click(minimap);
    await expect(
      await page.findByRole('menuitemcheckbox', { name: 'Minimap' }),
    ).toHaveAttribute('aria-checked', 'true');
  },
};
