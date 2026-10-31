import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import Mod11Tool from './Mod11Tool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('Mod11Tool', () => {
  it('shows the steps for a RUT', () => {
    render(<Mod11Tool />);
    fireEvent.change(screen.getByLabelText('Numbers (one per line)'), { target: { value: '12' } });
    expect(output().value).toBe(
      [
        '12',
        '  2 × 2 = 4',
        '  1 × 3 = 3',
        '  Sum = 7',
        '  7 mod 11 = 7',
        '  11 − 7 = 4',
        '  Check digit: 4',
      ].join('\n'),
    );
  });

  it('applies a preset', async () => {
    render(<Mod11Tool />);
    await userEvent.click(screen.getByRole('button', { name: 'ISBN-10' }));
    fireEvent.change(screen.getByLabelText('Numbers (one per line)'), {
      target: { value: '030640615' },
    });
    expect(output().value).toContain('Check digit: 2');
  });

  it('reports bad weights', () => {
    render(<Mod11Tool />);
    fireEvent.change(screen.getByLabelText('Weights'), { target: { value: 'x' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter weights');
  });

  it('previews the result of the input placeholder', () => {
    render(<Mod11Tool />);
    expect(output().placeholder).toContain('Check digit: 5');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <Mod11Tool />
      </LocaleProvider>,
    );
    expect(
      (screen.getByLabelText('Resultado', { selector: 'textarea' }) as HTMLTextAreaElement)
        .placeholder,
    ).toContain('Dígito verificador: 5');
  });
});
