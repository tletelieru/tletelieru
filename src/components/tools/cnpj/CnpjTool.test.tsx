import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { isAlphanumericCnpj, validateCnpj } from '~/lib/tools/cnpj';
import CnpjTool from './CnpjTool';

function outputValue(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('CnpjTool', () => {
  it('validates numeric and alphanumeric lines', async () => {
    render(<CnpjTool />);
    await userEvent.type(
      screen.getByLabelText('CNPJs, one per line'),
      '11222333000181{enter}12ABC34501DE35{enter}11.222.333/0001-82',
    );

    expect(outputValue()).toBe(
      [
        '11.222.333/0001-81  ✔ valid',
        '12.ABC.345/01DE-35  ✔ valid',
        '11.222.333/0001-82  ✘ wrong check digit (expected 81)',
      ].join('\n'),
    );
    expect(screen.getByText('2 / 3 valid')).toBeInTheDocument();
  });

  it('hydrates mode and options from the URL', () => {
    window.history.replaceState(null, '', '/?mode=format&style=plain&input=12.ABC.345%2F01DE-35');
    render(<CnpjTool />);
    expect(outputValue()).toBe('12ABC34501DE35');
  });

  it('generates the requested amount of CNPJs and switches to alphanumeric', async () => {
    window.history.replaceState(null, '', '/?mode=generate&count=20');
    render(<CnpjTool />);
    const numeric = outputValue().split('\n');
    expect(numeric).toHaveLength(20);
    for (const value of numeric) expect(validateCnpj(value).valid).toBe(true);

    await userEvent.click(screen.getByLabelText('Alphanumeric (2026)'));
    const alphanumeric = outputValue().split('\n');
    expect(alphanumeric).toHaveLength(20);
    for (const value of alphanumeric) expect(validateCnpj(value).valid).toBe(true);
    expect(alphanumeric.some(isAlphanumericCnpj)).toBe(true);
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?mode=generate&count=2');
    render(
      <LocaleProvider locale="es">
        <CnpjTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Generar de nuevo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Alfanumérico (2026)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solo guion' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad')).toBeInTheDocument();
  });
});

describe('CnpjTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<CnpjTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain('11.222.333/0001-81');
    expect(placeholder).toContain('✔');
  });
});
