import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { validateCuit } from '~/lib/tools/ids/argentina';
import { validateNie } from '~/lib/tools/ids/spain';
import NationalIdTool from './NationalIdTool';

function outputValue(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('NationalIdTool', () => {
  it('validates each line for the selected document', async () => {
    window.history.replaceState(null, '', '/?country=ar&doc=ar-cuit');
    render(<NationalIdTool />);
    await userEvent.type(
      screen.getByLabelText('CUIT / CUIL values, one per line'),
      '33693450239{enter}20-12345678-5',
    );

    expect(outputValue()).toBe(
      ['33-69345023-9  ✔ valid', '20-12345678-5  ✘ wrong check digit (expected 6)'].join('\n'),
    );
    expect(screen.getByText('1 / 2 valid')).toBeInTheDocument();
  });

  it('hydrates country, document, mode and options from the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/?country=uy&doc=uy-ci&mode=format&style=plain&input=1.234.567-2',
    );
    render(<NationalIdTool />);
    expect(outputValue()).toBe('12345672');
  });

  it('generates N values and regenerates when the document changes', async () => {
    window.history.replaceState(null, '', '/?country=ar&doc=ar-cuit&mode=generate&count=4');
    render(<NationalIdTool />);
    const cuits = outputValue().split('\n');
    expect(cuits).toHaveLength(4);
    for (const value of cuits) expect(validateCuit(value).valid).toBe(true);

    await userEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    await userEvent.click(within(screen.getByRole('listbox')).getByText('Spain'));
    await userEvent.click(screen.getByRole('combobox', { name: 'Document' }));
    await userEvent.click(within(screen.getByRole('listbox')).getByText('NIE'));

    const nies = outputValue().split('\n');
    expect(nies).toHaveLength(4);
    for (const value of nies) expect(validateNie(value).valid).toBe(true);
  });

  it('renders in Spanish inside a Spanish locale', async () => {
    window.history.replaceState(null, '', '/?country=co&doc=co-cc&input=79123456%0Aabc');
    render(
      <LocaleProvider locale="es">
        <NationalIdTool />
      </LocaleProvider>,
    );
    expect(screen.getByText('Sin dígito verificador: solo largo')).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).value).toBe(
      ['79.123.456  ✔ válido', 'abc  ✘ formato de CC inválido'].join('\n'),
    );
    expect(screen.getByText('1 / 2 válidos')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'País' }));
    expect(within(screen.getByRole('listbox')).getByText('España')).toBeInTheDocument();
  });
});
