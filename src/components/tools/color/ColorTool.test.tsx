import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import ColorTool from './ColorTool';

function output(label = 'Output'): string {
  return (screen.getByLabelText(label) as HTMLTextAreaElement).value;
}

describe('ColorTool', () => {
  it('converts a color to every notation', () => {
    render(<ColorTool />);
    fireEvent.change(screen.getByLabelText('Color'), { target: { value: 'hsl(210 50% 40%)' } });
    expect(output()).toBe(
      '#336699\nrgb(51 102 153)\nhsl(210 50% 40%)\noklch(49.93% 0.0987 250.43)',
    );
    expect(screen.getByRole('img', { name: 'Swatch' })).toBeInTheDocument();
  });

  it('reports WCAG contrast against the background', () => {
    window.history.replaceState(null, '', '/?input=%23777&bg=%23fff');
    render(<ColorTool />);
    expect(screen.getByText('Contrast ratio 4.48:1')).toBeInTheDocument();
    expect(screen.getAllByText('fail')).toHaveLength(3);
    expect(screen.getAllByText('pass')).toHaveLength(1);
  });

  it('passes everything for black on white', () => {
    window.history.replaceState(null, '', '/?input=black');
    render(<ColorTool />);
    expect(screen.getByText('Contrast ratio 21.00:1')).toBeInTheDocument();
    expect(screen.getAllByText('pass')).toHaveLength(4);
  });

  it('shows errors for invalid colors', () => {
    render(<ColorTool />);
    fireEvent.change(screen.getByLabelText('Color'), { target: { value: 'nope' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Color: "nope" is not a color.');
    fireEvent.change(screen.getByLabelText('Contrast against'), { target: { value: '' } });
  });

  it('renders in Spanish', () => {
    window.history.replaceState(null, '', '/?input=red&bg=zzz');
    render(
      <LocaleProvider locale="es">
        <ColorTool />
      </LocaleProvider>,
    );
    expect(screen.getByLabelText('Contraste contra')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Contraste contra: "zzz" no es un color.');
    expect(output('Resultado')).toContain('#ff0000');
  });
});

describe('ColorTool output placeholder', () => {
  it('previews the placeholder color', () => {
    render(<ColorTool />);
    expect(screen.getByLabelText('Output').getAttribute('placeholder')).toBe(
      '#336699\nrgb(51 102 153)\nhsl(210 50% 40%)\noklch(49.93% 0.0987 250.43)',
    );
  });
});
