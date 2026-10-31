import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import BankCodesTool from './BankCodesTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('BankCodesTool', () => {
  it('breaks down a BIC', () => {
    render(<BankCodesTool />);
    fireEvent.change(screen.getByLabelText('Codes (one per line)'), {
      target: { value: 'deutdeff500' },
    });
    expect(output().value).toContain('DEUTDEFF500 · SWIFT/BIC · valid');
    expect(output().value).toContain('Branch: 500');
  });

  it('explains an ABA checksum failure', () => {
    render(<BankCodesTool />);
    fireEvent.change(screen.getByLabelText('Codes (one per line)'), {
      target: { value: '021000022' },
    });
    expect(output().value).toContain('invalid · Checksum does not match');
  });

  it('previews the result of the input placeholder', () => {
    render(<BankCodesTool />);
    expect(output().placeholder).toContain('12-34-56 · UK sort code · valid');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <BankCodesTool />
      </LocaleProvider>,
    );
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
      'SWIFT/BIC · válido',
    );
  });
});
