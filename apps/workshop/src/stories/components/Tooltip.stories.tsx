import { Tooltip, type TooltipPopupProps } from '@pandorah-ui/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { StyledButton } from '../../components/styled-button';
import styles from '../../styles/tooltip.module.css';

function Bold({ side, align }: Pick<TooltipPopupProps, 'side' | 'align'>) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <StyledButton variant="outline" size="icon" aria-label="Bold" />
        }
      >
        <span aria-hidden="true">B</span>
      </Tooltip.Trigger>
      <Tooltip.Popup
        side={side}
        align={align}
        sideOffset={6}
        className={styles.popup}
      >
        Bold text (⌘B)
      </Tooltip.Popup>
    </Tooltip.Root>
  );
}

const meta = {
  title: 'Tooltip',
  component: Bold,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    side: {
      control: 'inline-radio',
      options: ['top', 'right', 'bottom', 'left'],
    },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
  },
} satisfies Meta<typeof Bold>;

export default meta;

type Story = StoryObj<typeof meta>;

// The popup renders in a portal at the end of the body, outside the canvas.
const portal = (canvasElement: HTMLElement) =>
  within(canvasElement.ownerDocument.body);

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Bold' });

    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    await waitFor(() =>
      expect(portal(canvasElement).getByRole('tooltip')).toBeVisible(),
    );
    await expect(trigger).toHaveAccessibleDescription('Bold text (⌘B)');

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(portal(canvasElement).queryByRole('tooltip')).toBeNull(),
    );
    await expect(trigger).toHaveFocus();
  },
};
