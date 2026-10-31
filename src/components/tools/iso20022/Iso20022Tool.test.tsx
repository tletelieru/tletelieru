import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import Iso20022Tool from './Iso20022Tool';

const XML =
  '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"><BkToCstmrStmt/></Document>';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('Iso20022Tool', () => {
  it('formats and names the message', () => {
    render(<Iso20022Tool />);
    fireEvent.change(screen.getByLabelText('ISO 20022 XML'), { target: { value: XML } });
    expect(output().value).toContain('\n  <BkToCstmrStmt/>\n');
    expect(screen.getByText('camt.053.001.08 · Bank to customer statement')).toBeInTheDocument();
  });

  it('minifies', async () => {
    render(<Iso20022Tool />);
    await userEvent.click(screen.getByRole('button', { name: 'Minify' }));
    fireEvent.change(screen.getByLabelText('ISO 20022 XML'), {
      target: { value: '<a>\n  <b>1</b>\n</a>' },
    });
    expect(output().value).toBe('<a><b>1</b></a>');
  });

  it('points at well-formedness errors', () => {
    render(<Iso20022Tool />);
    fireEvent.change(screen.getByLabelText('ISO 20022 XML'), {
      target: { value: '<a>\n<b></a>' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Line 2, column 4: </a> closes <b>');
  });

  it('previews the result of the input placeholder', () => {
    render(<Iso20022Tool />);
    expect(output().placeholder).toContain('      <MsgId>MSG-0001</MsgId>');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <Iso20022Tool />
      </LocaleProvider>,
    );
    fireEvent.change(screen.getByLabelText('XML ISO 20022'), { target: { value: '<a>' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Línea 1, columna 1: <a> nunca se cierra');
  });
});
