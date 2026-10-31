import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import RoundingTool from './RoundingTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('RoundingTool', () => {
  it('shows modes side by side', () => {
    render(<RoundingTool />);
    fireEvent.change(screen.getByLabelText('Decimals'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Values (one per line)'), {
      target: { value: '2.5' },
    });
    expect(output().value).toContain('Half even');
    expect(output().value).toMatch(/│\s+2\.5 │\s+3 │\s+2 │\s+2 │\s+3 │\s+2 │\s+3 │\s+2 │/);
  });

  it('reports bad values', () => {
    render(<RoundingTool />);
    fireEvent.change(screen.getByLabelText('Values (one per line)'), {
      target: { value: 'x' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1');
  });

  it('previews the result of the input placeholder', () => {
    render(<RoundingTool />);
    expect(output().placeholder).toContain('1.005');
    expect(output().placeholder).toContain('1.01');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <RoundingTool />
      </LocaleProvider>,
    );
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
      'Mitad al par',
    );
  });
});
