import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import BankAccountTool from './BankAccountTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('BankAccountTool', () => {
  it('validates and formats an IBAN', () => {
    render(<BankAccountTool />);
    fireEvent.change(screen.getByLabelText('Accounts (one per line)'), {
      target: { value: 'de89370400440532013000' },
    });
    expect(output().value).toBe(
      'DE89 3704 0044 0532 0130 00 · IBAN · valid\n  Country: DE\n  Check digits: 89',
    );
  });

  it('explains a checksum failure', () => {
    render(<BankAccountTool />);
    fireEvent.change(screen.getByLabelText('Accounts (one per line)'), {
      target: { value: '002010077777777772' },
    });
    expect(output().value).toContain('invalid · Check digits do not match (expected 1)');
  });

  it('previews the result of the input placeholder', () => {
    render(<BankAccountTool />);
    expect(output().placeholder).toContain('DE89 3704 0044 0532 0130 00 · IBAN · valid');
    expect(output().placeholder).toContain('Bank: Banco Macro');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <BankAccountTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Cuentas (una por línea)')).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
      'IBAN · válida',
    );
  });
});
