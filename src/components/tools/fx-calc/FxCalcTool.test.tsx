import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import FxCalcTool from './FxCalcTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('FxCalcTool', () => {
  it('applies the spread when the client buys', () => {
    render(<FxCalcTool />);
    fireEvent.change(screen.getByLabelText('Amounts in USD (one per line)'), {
      target: { value: '100' },
    });
    expect(output().value).toContain('Effective rate: 959.5 CLP/USD');
    expect(output().value).toContain('client pays 95950 CLP');
  });

  it('flips when the client sells', async () => {
    render(<FxCalcTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Client sells' }));
    fireEvent.change(screen.getByLabelText('Amounts in USD (one per line)'), {
      target: { value: '100' },
    });
    expect(output().value).toContain('client receives 94050 CLP');
  });

  it('asks for a valid rate', () => {
    render(<FxCalcTool />);
    fireEvent.change(screen.getByLabelText('Rate (CLP per USD)'), { target: { value: 'x' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a rate');
  });

  it('previews the result of the input placeholder', () => {
    render(<FxCalcTool />);
    expect(output().placeholder).toContain('2500.5 USD → gross 2399230');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <FxCalcTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Cliente compra' })).toBeInTheDocument();
  });
});
