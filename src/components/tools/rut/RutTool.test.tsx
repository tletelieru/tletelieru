import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import RutTool from './RutTool';

describe('RutTool', () => {
  it('validates each line and shows a summary', async () => {
    render(<RutTool />);
    await userEvent.type(
      screen.getByLabelText('RUTs, one per line'),
      '12345678-5{enter}12345678-9',
    );

    const output = screen.getByLabelText('Output') as HTMLTextAreaElement;
    expect(output.value).toBe(
      '12.345.678-5  ✔ valid\n12345678-9  ✘ wrong check digit (expected 5)',
    );
    expect(screen.getByText('1 / 2 valid')).toBeInTheDocument();
  });

  it('hydrates mode and options from the URL', () => {
    window.history.replaceState(null, '', '/?mode=format&style=dash&input=12.345.678-5');
    render(<RutTool />);
    expect((screen.getByLabelText('Output') as HTMLTextAreaElement).value).toBe('12345678-5');
  });

  it('switches output format and K case', async () => {
    window.history.replaceState(null, '', '/?mode=format&input=10.000.013-K%0A12.345.678-5');
    render(<RutTool />);
    await userEvent.click(screen.getByRole('button', { name: 'No separators' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Uppercase K' }));
    expect((screen.getByLabelText('Output') as HTMLTextAreaElement).value).toBe(
      '10000013k\n123456785',
    );
  });

  it('generates the requested amount of RUTs', () => {
    window.history.replaceState(null, '', '/?mode=generate&count=3');
    render(<RutTool />);
    const values = (screen.getByLabelText('Output') as HTMLTextAreaElement).value.split('\n');
    expect(values).toHaveLength(3);
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=12.345.678-5%0A12345678-9');
    render(
      <LocaleProvider locale="es">
        <RutTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Validar' })).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).value).toBe(
      '12.345.678-5  ✔ válido\n12345678-9  ✘ dígito verificador incorrecto (esperado 5)',
    );
    expect(screen.getByText('1 / 2 válidos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  });
});

describe('RutTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<RutTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain('12.345.678-5  ✔ valid');
  });

  it('has no output placeholder without an input box', () => {
    window.history.replaceState(null, '', '/?mode=generate');
    render(<RutTool />);
    expect(screen.getByLabelText('Output')).not.toHaveAttribute('placeholder');
  });
});
