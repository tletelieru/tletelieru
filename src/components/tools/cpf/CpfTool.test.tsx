import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import { validateCpf } from '~/lib/tools/cpf';
import CpfTool from './CpfTool';

function outputValue(): string {
  return (screen.getByLabelText('Output') as HTMLTextAreaElement).value;
}

describe('CpfTool', () => {
  it('validates each line and shows a summary', async () => {
    render(<CpfTool />);
    await userEvent.type(
      screen.getByLabelText('CPFs, one per line'),
      '52998224725{enter}529.982.247-26{enter}111.111.111-11',
    );

    expect(outputValue()).toBe(
      [
        '529.982.247-25  ✔ valid',
        '529.982.247-26  ✘ wrong check digit (expected 25)',
        '111.111.111-11  ✘ repeated digits',
      ].join('\n'),
    );
    expect(screen.getByText('1 / 3 valid')).toBeInTheDocument();
  });

  it('hydrates mode and options from the URL', () => {
    window.history.replaceState(null, '', '/?mode=format&style=plain&input=529.982.247-25');
    render(<CpfTool />);
    expect(outputValue()).toBe('52998224725');
  });

  it('switches between the three output styles', async () => {
    window.history.replaceState(null, '', '/?mode=format&input=52998224725');
    render(<CpfTool />);
    expect(outputValue()).toBe('529.982.247-25');
    await userEvent.click(screen.getByRole('button', { name: 'Dash only' }));
    expect(outputValue()).toBe('529982247-25');
    await userEvent.click(screen.getByRole('button', { name: 'No separators' }));
    expect(outputValue()).toBe('52998224725');
    expect(screen.getByRole('button', { name: 'Paste' })).toBeInTheDocument();
  });

  it('generates the requested amount of valid CPFs', () => {
    window.history.replaceState(null, '', '/?mode=generate&count=3');
    render(<CpfTool />);
    const values = outputValue().split('\n');
    expect(values).toHaveLength(3);
    for (const value of values) {
      expect(value).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
      expect(validateCpf(value).valid).toBe(true);
    }
  });

  it('renders in Spanish inside a Spanish locale', () => {
    window.history.replaceState(null, '', '/?input=52998224725%0A529.982.247-26%0A111.111.111-11');
    render(
      <LocaleProvider locale="es">
        <CpfTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Validar' })).toBeInTheDocument();
    expect(screen.getByLabelText('CPFs, uno por línea')).toBeInTheDocument();
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).value).toBe(
      [
        '529.982.247-25  ✔ válido',
        '529.982.247-26  ✘ dígito verificador incorrecto (esperado 25)',
        '111.111.111-11  ✘ dígitos repetidos',
      ].join('\n'),
    );
    expect(screen.getByText('1 / 3 válidos')).toBeInTheDocument();
  });
});

describe('CpfTool output placeholder', () => {
  it('previews the result of the input placeholder', () => {
    render(<CpfTool />);
    const placeholder = screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder).toContain('529.982.247-25');
    expect(placeholder).toContain('✔');
  });
});
