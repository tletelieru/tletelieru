import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import MinorUnitsTool from './MinorUnitsTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('MinorUnitsTool', () => {
  it('converts amounts to minor units', () => {
    render(<MinorUnitsTool />);
    fireEvent.change(screen.getByLabelText('Amounts (one per line)'), {
      target: { value: '1234.56\n0.07' },
    });
    expect(output().value).toBe('123456\n7');
  });

  it('converts back to an amount', async () => {
    render(<MinorUnitsTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Minor units → amount' }));
    fireEvent.change(screen.getByLabelText('Minor units (one per line)'), {
      target: { value: '123456' },
    });
    expect(output().value).toBe('1234.56');
  });

  it('shows line errors', () => {
    render(<MinorUnitsTool />);
    fireEvent.change(screen.getByLabelText('Amounts (one per line)'), {
      target: { value: '1.005' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1');
  });

  it('previews the result of the input placeholder', () => {
    render(<MinorUnitsTool />);
    expect(output().placeholder).toBe('123456\n1900');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <MinorUnitsTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Monto → unidades menores' })).toBeInTheDocument();
    expect(screen.getByText('2 decimales')).toBeInTheDocument();
  });
});
