import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import InstallmentsTool from './InstallmentsTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('InstallmentsTool', () => {
  it('shows the summary and schedule', () => {
    render(<InstallmentsTool />);
    fireEvent.change(screen.getByLabelText('Rate %'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Loan amount'), { target: { value: '1000000' } });
    expect(output().value).toContain('Installment: 88849');
    expect(output().value).toContain('│   1 │       88849 │    10000 │     78849 │  921151 │');
  });

  it('reports bad parameters', () => {
    render(<InstallmentsTool />);
    fireEvent.change(screen.getByLabelText('Installments'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Loan amount'), { target: { value: '1000' } });
    expect(screen.getByRole('alert')).toHaveTextContent('between 1 and 600');
  });

  it('previews the result of the input placeholder', () => {
    render(<InstallmentsTool />);
    expect(output().placeholder).toContain('Installment: 91680');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <InstallmentsTool />
      </LocaleProvider>,
    );
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
      'Amortización',
    );
  });
});
