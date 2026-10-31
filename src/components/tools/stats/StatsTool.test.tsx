import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider } from '~/i18n/react';
import StatsTool from './StatsTool';

function output(): HTMLTextAreaElement {
  return screen.getByLabelText('Output') as HTMLTextAreaElement;
}

describe('StatsTool', () => {
  it('summarizes the list', () => {
    render(<StatsTool />);
    fireEvent.change(screen.getByLabelText('Numbers (one per line)'), {
      target: { value: '1.000,50\n2.000,50' },
    });
    expect(output().value).toContain('Sum: 3001');
    expect(output().value).toContain('Mean: 1500.5000');
  });

  it('warns about ambiguous separators and bad tokens', () => {
    render(<StatsTool />);
    fireEvent.change(screen.getByLabelText('Numbers (one per line)'), {
      target: { value: '1.234\nabc' },
    });
    const alerts = screen.getAllByRole('alert');
    expect(alerts[0]).toHaveTextContent('ambiguous');
    expect(alerts[1]).toHaveTextContent('abc');
  });

  it('previews the result of the input placeholder', () => {
    render(<StatsTool />);
    expect(output().placeholder).toContain('Sum: 5691.5');
  });

  it('renders in Spanish', () => {
    render(
      <LocaleProvider locale="es">
        <StatsTool />
      </LocaleProvider>,
    );
    expect((screen.getByLabelText('Resultado') as HTMLTextAreaElement).placeholder).toContain(
      'Suma: 5691.5',
    );
  });
});
