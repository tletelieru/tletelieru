import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import NumberBaseTool from './NumberBaseTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('NumberBaseTool', () => {
  it('converts a number to every base with two’s complement', () => {
    render(<NumberBaseTool />);
    fireEvent.change(screen.getByLabelText('Number'), { target: { value: '-1' } });
    expect(output()).toBe(
      [
        'bin     -1',
        'oct     -1',
        'dec     -1',
        'hex     -1',
        'base36  -1',
        '',
        "two's complement (32-bit)",
        'bin       1111 1111 1111 1111 1111 1111 1111 1111',
        'hex       0xffffffff',
        'signed    -1',
        'unsigned  4294967295',
      ].join('\n'),
    );
  });

  it('reads the input base and width', async () => {
    window.history.replaceState(null, '', '/?input=ff&base=16');
    render(<NumberBaseTool />);
    await userEvent.click(screen.getByRole('button', { name: '8-bit' }));
    expect(output()).toContain('dec     255');
    expect(output()).toContain('signed    -1');
  });

  it('reports values that do not fit and invalid digits', () => {
    window.history.replaceState(null, '', '/?input=300&width=8');
    render(<NumberBaseTool />);
    expect(output()).toContain('does not fit in 8 bits');
  });

  it('shows digit errors', () => {
    window.history.replaceState(null, '', '/?input=12g');
    render(<NumberBaseTool />);
    expect(screen.getByRole('alert')).toHaveTextContent("'g' is not a valid base-10 digit.");
  });

  it('converts byte sizes', async () => {
    render(<NumberBaseTool />);
    await userEvent.click(screen.getByRole('button', { name: 'Byte sizes' }));
    fireEvent.change(screen.getByLabelText('Size (e.g. 1.5 GiB)'), { target: { value: '1536' } });
    expect(output()).toContain('KiB  1.5');
    expect(output()).toContain('KB   1.536');
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', '/?mode=bytes&input=3%20parsecs');
    render(
      <LocaleProvider locale="es">
        <NumberBaseTool />
      </LocaleProvider>,
    );
    expect(screen.getByRole('button', { name: 'Bases numéricas' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo leer "3 parsecs"');
  });
});

describe('NumberBaseTool output placeholder', () => {
  it('previews the conversion of the placeholder', async () => {
    render(<NumberBaseTool />);
    const placeholder = () => screen.getByLabelText('Output').getAttribute('placeholder');
    expect(placeholder()).toContain('bin     1111 1111');
    await userEvent.click(screen.getByRole('button', { name: 'Byte sizes' }));
    expect(placeholder()).toContain('GiB  1.5');
  });
});
