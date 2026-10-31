import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import SwiftMtTool from './SwiftMtTool';

const MT940 = ':20:STMT\n:60F:C260101EUR1000,00\n:62F:C260103EUR849,50';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('SwiftMtTool', () => {
  it('labels fields and shows the type', () => {
    render(<SwiftMtTool />);
    fireEvent.change(screen.getByLabelText('SWIFT MT message'), { target: { value: MT940 } });
    expect(output().value).toContain(':60F: Opening balance\n  Debit/credit: C');
    expect(output().value).toContain('Amount: 849.50');
    expect(screen.getByText('MT940')).toBeInTheDocument();
  });

  it('exports JSON', async () => {
    render(<SwiftMtTool />);
    await userEvent.click(screen.getByRole('button', { name: 'JSON' }));
    fireEvent.change(screen.getByLabelText('SWIFT MT message'), { target: { value: MT940 } });
    expect(JSON.parse(output().value)).toMatchObject({
      type: '940',
      fields: [{ tag: '20', label: 'Transaction reference', value: 'STMT' }, {}, {}],
    });
  });

  it('reports text without fields', () => {
    render(<SwiftMtTool />);
    fireEvent.change(screen.getByLabelText('SWIFT MT message'), { target: { value: 'hello' } });
    expect(screen.getByRole('alert')).toHaveTextContent('No :tag: fields');
  });

  it('previews the result of the input placeholder', () => {
    render(<SwiftMtTool />);
    expect(output().placeholder).toContain(':32A: Value date, currency, amount');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <SwiftMtTool />
      </LocaleProvider>,
    );
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
      'Cliente beneficiario',
    );
  });
});
