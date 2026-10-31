import '@pandorah-ui/tokens/tokens.css';

import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { StyledButton } from './components/styled-button';

let container: HTMLDivElement;
let root: Root;

function render(element: ReactElement) {
  flushSync(() => root.render(element));
}

function contrast(foreground: string, background: string) {
  const luminance = (color: string) => {
    const [r, g, b] = color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map((channel) => {
        const value = Number(channel) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

const style = (element: Element) => getComputedStyle(element);

beforeEach(() => {
  container = document.body.appendChild(document.createElement('div'));
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  container.remove();
});

describe('Workshop button design', () => {
  it('styles variants, sizes, hover, disabled and pending from the tokens', async () => {
    render(
      <>
        <StyledButton>Solid</StyledButton>
        <StyledButton variant="outline" size="sm">
          Outline
        </StyledButton>
        <StyledButton disabled>Disabled</StyledButton>
        <StyledButton pending>Pending</StyledButton>
        <StyledButton disabled pending>
          Both
        </StyledButton>
      </>,
    );
    const [solid, outline, disabled, pending, both] =
      container.querySelectorAll('button');

    expect(style(solid).backgroundColor).toBe('rgb(124, 58, 237)');
    expect(style(solid).color).toBe('rgb(255, 255, 255)');
    expect(style(outline).borderColor).toBe('rgb(124, 58, 237)');
    expect(style(outline).blockSize).toBe('32px');
    expect(style(disabled).color).toBe('rgb(156, 163, 175)');
    expect(style(disabled).cursor).toBe('not-allowed');
    expect(style(pending).backgroundColor).toBe(style(solid).backgroundColor);
    expect(style(pending).cursor).toBe('progress');
    expect(style(both).backgroundColor).toBe(style(disabled).backgroundColor);
    expect(style(both).cursor).toBe('not-allowed');

    await userEvent.hover(solid);
    await expect
      .poll(() => style(solid).backgroundColor)
      .toBe('rgb(109, 40, 217)');
    await userEvent.hover(pending);
    // Waits out the color transition a hover style would start.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(pending.matches(':hover')).toBe(true);
    expect(style(pending).backgroundColor).toBe('rgb(124, 58, 237)');
  });

  it('shows a visible focus indicator for keyboard focus only', async () => {
    render(<StyledButton>Save</StyledButton>);
    const button = container.querySelector('button')!;

    await userEvent.click(button);
    expect(style(button).outlineColor).toBe('rgba(0, 0, 0, 0)');

    button.blur();
    // Focus after keyboard input is keyboard focus.
    await userEvent.keyboard('{Shift}');
    button.focus();
    expect(button.matches(':focus-visible')).toBe(true);
    expect(
      contrast(style(button).outlineColor, 'rgb(255, 255, 255)'),
    ).toBeGreaterThanOrEqual(3);
  });
});
