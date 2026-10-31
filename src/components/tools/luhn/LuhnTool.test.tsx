import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import LuhnTool from './LuhnTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('LuhnTool', () => {
  it('validates and labels documented test cards', () => {
    render(<LuhnTool />);
    fireEvent.change(screen.getByLabelText('Numbers (one per line)'), {
      target: { value: '4242424242424242' },
    });
    expect(output().value).toBe('4242 4242 4242 4242 · valid · Visa · documented test card');
  });

  it('computes the check digit', async () => {
    render(<LuhnTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Check digit' }));
    fireEvent.change(screen.getByLabelText('Numbers without the check digit (one per line)'), {
      target: { value: '7992739871' },
    });
    expect(output().value).toBe('79927398713');
  });

  it('lists test cards with a warning', async () => {
    render(<LuhnTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Test cards' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Test numbers only');
    expect(output().value).toContain('5555 5555 5555 4444');
  });

  it('previews the result of the input placeholder', () => {
    render(<LuhnTool />);
    expect(output().placeholder).toContain(
      '4242 4242 4242 4241 · invalid · expected check digit 2',
    );
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <LuhnTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Tarjetas de prueba' })).toBeInTheDocument();
  });
});
